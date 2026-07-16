#!/usr/bin/env node
/**
 * verify.mjs — course-wide verification harness.
 *
 * Promise 1 of the course: everything was actually executed. This file is
 * how we keep that promise. It checks, for every chapter snapshot:
 *
 *   1. Syntax gate — the <script> body of every snapshot passes `node --check`.
 *   2. Milestone gate — from Chapter 6 on, the snapshot's code is evaluated
 *      headlessly (browser APIs stubbed) and the chapter's physics/gameplay
 *      milestone is asserted with real numbers.
 *   3. Equivalence gate (Chapter 14) — the final snapshot deep-equals the
 *      answer key's CONFIG, declares the same classes, and passes every
 *      assertion the answer key passes.
 *
 * The answer key itself runs through the full battery on every invocation:
 * if the harness and the frozen game ever disagree, the harness is wrong.
 *
 * Usage:
 *   node verify/verify.mjs        # verify everything present
 *   node verify/verify.mjs 09     # verify chapters 00..09 (a chapter is only
 *                                 # "done" when it AND all previous are green)
 *
 * Verified with Node v24.11.1. Zero dependencies.
 */

import { readFileSync, readdirSync, existsSync, writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const ANSWER_KEY = join(ROOT, "answer-key", "basketball-js.html");
const CHAPTERS_DIR = join(ROOT, "chapters");

/* ===================================================================== *
 * Tiny test runner
 * ===================================================================== */

let passCount = 0;
let failCount = 0;
const failures = [];

function check(label, fn) {
  try {
    fn();
    passCount += 1;
    console.log(`  ok    ${label}`);
  } catch (err) {
    failCount += 1;
    failures.push(label);
    console.log(`  FAIL  ${label}`);
    console.log(`        ${err.message}`);
  }
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function approx(actual, expected, eps, msg) {
  assert(
    Math.abs(actual - expected) <= eps,
    `${msg}: got ${actual}, expected ${expected} ± ${eps}`
  );
}

/* ===================================================================== *
 * Extraction and syntax gate
 * ===================================================================== */

/** Pull the (last) <script> body out of an HTML file. */
function extractScript(htmlPath) {
  const html = readFileSync(htmlPath, "utf8");
  const matches = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
  assert(matches.length > 0, `${htmlPath}: no <script> block found`);
  return matches[matches.length - 1][1];
}

/**
 * Everything after the Boot marker is side effects (DOM lookups, wiring,
 * starting the loop). Headless evaluation strips it and re-wires by hand.
 */
function stripBoot(js) {
  const idx = js.indexOf("/* ---------- Boot ----------");
  return idx === -1 ? js : js.slice(0, idx);
}

const tmpDir = mkdtempSync(join(tmpdir(), "js-course-verify-"));

function syntaxCheck(js, label) {
  const file = join(tmpDir, label.replace(/[^a-z0-9-]/gi, "_") + ".js");
  writeFileSync(file, js);
  execFileSync(process.execPath, ["--check", file], { stdio: "pipe" });
}

/* ===================================================================== *
 * Headless browser stubs
 *
 * The game touches: document, canvas, 2D context, performance.now,
 * requestAnimationFrame, localStorage. Each check group gets a fresh
 * environment; the game code resolves these globals at call time, so
 * swapping stubs between checks re-targets already-evaluated classes.
 * ===================================================================== */

function makeCtx() {
  const gradient = { addColorStop() {} };
  return new Proxy(
    {},
    {
      get(target, prop) {
        if (typeof prop === "symbol") return undefined;
        if (prop in target) return target[prop];
        return () => gradient; // every method is a no-op returning a gradient
      },
      set(target, prop, value) {
        target[prop] = value;
        return true;
      },
    }
  );
}

function makeElement(id) {
  const el = {
    id,
    textContent: "",
    value: "",
    listeners: {},
    addEventListener(type, fn) {
      (el.listeners[type] ??= []).push(fn);
    },
    appendChild(child) {
      if (el.options) el.options.push(child);
    },
  };
  if (id === "playerSelect") el.options = [];
  return el;
}

function makeEnv() {
  const env = { now: 0 };
  env.performance = { now: () => env.now };
  env.rafQueue = [];
  env.requestAnimationFrame = (cb) => {
    env.rafQueue.push(cb);
    return env.rafQueue.length;
  };
  const map = new Map();
  env.storageMap = map;
  env.localStorage = {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => void map.set(k, String(v)),
    removeItem: (k) => void map.delete(k),
  };
  env.ctx = makeCtx();
  env.canvas = {
    width: 920,
    height: 540,
    listeners: {},
    getContext: () => env.ctx,
    addEventListener(type, fn) {
      (env.canvas.listeners[type] ??= []).push(fn);
    },
    setPointerCapture() {},
    releasePointerCapture() {},
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 920, height: 540 }),
    style: {},
  };
  const els = new Map();
  env.document = {
    getElementById(id) {
      if (id === "court") return env.canvas;
      if (!els.has(id)) els.set(id, makeElement(id));
      return els.get(id);
    },
    createElement: (tag) => ({ tagName: tag, value: "", textContent: "" }),
  };
  return env;
}

/** localStorage that refuses everything — the "blocked storage" scenario. */
function blockStorage(env) {
  env.localStorage = {
    getItem() { throw new Error("storage blocked"); },
    setItem() { throw new Error("storage blocked"); },
    removeItem() { throw new Error("storage blocked"); },
  };
}

function installStubs(env) {
  for (const name of ["document", "performance", "requestAnimationFrame", "localStorage"]) {
    Object.defineProperty(globalThis, name, { value: env[name], writable: true, configurable: true });
  }
  // Chapters before the class refactor declare `canvas`/`ctx` in the Boot
  // section (stripped here); free references fall through to these.
  Object.defineProperty(globalThis, "canvas", { value: env.canvas, writable: true, configurable: true });
  Object.defineProperty(globalThis, "ctx", { value: env.ctx, writable: true, configurable: true });
}

/**
 * Evaluate a (boot-stripped) script and hand back the named declarations.
 * const/class declarations inside eval are scoped to the eval, so the
 * export line rides along inside the same evaluation.
 */
function evalExports(code, names) {
  const src = `${code}\n;globalThis.__exports = { ${names.join(", ")} };`;
  (0, eval)(src);
  const out = globalThis.__exports;
  delete globalThis.__exports;
  return out;
}

/* ===================================================================== *
 * Driving the game headlessly (class-mode: answer key, chapters 12–14)
 * ===================================================================== */

function fireCanvas(env, type, x, y) {
  for (const fn of env.canvas.listeners["pointer" + type] ?? []) {
    fn({ clientX: x, clientY: y, pointerId: 1 });
  }
}

function clickButton(env, id) {
  for (const fn of env.document.getElementById(id).listeners.click ?? []) fn();
}

/** Run n animation frames, advancing the shared clock by dtMs each. */
function stepFrames(env, n, dtMs = 1000 / 60, onFrame = null) {
  for (let i = 0; i < n; i++) {
    env.now += dtMs;
    const cbs = env.rafQueue.splice(0);
    for (const cb of cbs) cb(env.now);
    if (onFrame) onFrame();
  }
}

/**
 * Charge and release a shot through the real pointer pipeline.
 * Direction comes from the pointer's position relative to the ball;
 * speed from the hold duration — exactly like a player's finger.
 */
function shoot(env, game, CONFIG, angleRad, speed) {
  const { minLaunchSpeed, maxLaunchSpeed } = CONFIG.physics;
  const power = Math.min(Math.max((speed - minLaunchSpeed) / (maxLaunchSpeed - minLaunchSpeed), 0), 1);
  const holdMs = power >= 1
    ? CONFIG.input.chargeTime * 1000 + 100 // past full charge — power caps at 1
    : power * CONFIG.input.chargeTime * 1000;
  const px = game.ball.x + Math.cos(angleRad) * 60;
  const py = game.ball.y - Math.sin(angleRad) * 60; // canvas y grows down
  fireCanvas(env, "down", px, py);
  const steps = Math.max(1, Math.ceil(holdMs / 20));
  stepFrames(env, steps, holdMs / steps); // hold: clock advances, frames render
  fireCanvas(env, "up", 0, 0);
}

function flyUntilRest(env, game, onFrame = null, maxFrames = 6000) {
  let frames = 0;
  while (game.state === "flight" && frames < maxFrames) {
    stepFrames(env, 1, 1000 / 60, onFrame);
    frames += 1;
  }
  assert(frames < maxFrames, "ball never came to rest");
}

/* ===================================================================== *
 * The shared assertion battery (class mode).
 *
 * Chapter 14's equivalence gate is, by construction, "this battery" —
 * the final snapshot and the answer key both run it, identically.
 * ===================================================================== */

const CLASS_NAMES = [
  "CONFIG", "Ball", "Hoop", "InputController", "PlayerStore",
  "PlayerPanel", "Renderer", "Scoreboard", "Game",
];

function classModeBattery(label, strippedJs) {
  let X = null;
  check(`${label}: declares CONFIG and all 8 classes`, () => {
    installStubs(makeEnv());
    X = evalExports(strippedJs, CLASS_NAMES);
    assert(Object.isFrozen(X.CONFIG), "CONFIG must be Object.freeze'd");
  });
  if (!X) return null; // nothing else can run

  const C = X.CONFIG;

  check(`${label}: ch06 milestone — gravity pulls the ball down`, () => {
    const b = new X.Ball();
    const y0 = b.y;
    for (let i = 0; i < 10; i++) b.integrate(1 / 60);
    assert(b.vy > 0, `vy should grow positive (down); got ${b.vy}`);
    assert(b.y > y0, `y should increase under gravity; got ${b.y} from ${y0}`);
  });

  check(`${label}: ch06 milestone — a floor bounce reverses vy`, () => {
    const env = makeEnv();
    installStubs(env);
    const game = new X.Game(env.canvas);
    shoot(env, game, C, Math.PI / 2, C.physics.minLaunchSpeed); // straight up
    let sawFallThenRise = false;
    let prevVy = 0;
    flyUntilRest(env, game, () => {
      if (prevVy > 200 && game.ball.vy < 0) sawFallThenRise = true;
      prevVy = game.ball.vy;
    });
    assert(sawFallThenRise, "never observed falling fast then moving up (bounce)");
  });

  check(`${label}: ch08 milestone — power is 0 at press, 0.5 at half charge, capped at 1`, () => {
    const env = makeEnv();
    installStubs(env);
    const ball = { x: C.ball.startX, y: C.ball.startY };
    const ic = new X.InputController(env.canvas, ball, () => true, () => {});
    env.now = 5000;
    fireCanvas(env, "down", ball.x, ball.y - 150);
    approx(ic.power(), 0, 1e-12, "power at the instant of pressing");
    env.now += (C.input.chargeTime / 2) * 1000;
    approx(ic.power(), 0.5, 1e-9, "power at half chargeTime");
    env.now += C.input.chargeTime * 5000;
    approx(ic.power(), 1, 1e-12, "power beyond full charge");
  });

  check(`${label}: ch08 milestone — launch speed scales min→max, angle matches pointer`, () => {
    const env = makeEnv();
    installStubs(env);
    const ball = { x: C.ball.startX, y: C.ball.startY };
    const ic = new X.InputController(env.canvas, ball, () => true, () => {});
    env.now = 1000;
    fireCanvas(env, "down", ball.x + 100, ball.y - 100); // 45° up-right
    let v = ic.launchVelocity();
    approx(Math.hypot(v.vx, v.vy), C.physics.minLaunchSpeed, 1e-6, "speed at zero charge");
    approx(Math.atan2(v.vy, v.vx), Math.atan2(-100, 100), 1e-9, "aim angle");
    env.now += C.input.chargeTime * 1000 + 50;
    v = ic.launchVelocity();
    approx(Math.hypot(v.vx, v.vy), C.physics.maxLaunchSpeed, 1e-6, "speed at full charge");
  });

  check(`${label}: ch08 milestone — pointer sitting on the ball returns null (no shot)`, () => {
    const env = makeEnv();
    installStubs(env);
    const ball = { x: 400, y: 300 };
    let launched = false;
    const ic = new X.InputController(env.canvas, ball, () => true, () => { launched = true; });
    fireCanvas(env, "down", 400, 300);
    assert(ic.launchVelocity() === null, "launchVelocity should be null on the ball");
    fireCanvas(env, "up", 400, 300);
    assert(!launched, "release on the ball must not fire a shot");
  });

  check(`${label}: ch09 milestone — the rim deflects a 400 px/s ball`, () => {
    const b = new X.Ball();
    const hoop = new X.Hoop();
    b.x = C.hoop.rimFrontX - 15;
    b.y = C.hoop.rimY;
    b.vx = 400;
    b.vy = 0;
    hoop.collide(b);
    assert(b.vx < 0, `ball should be pushed back; vx = ${b.vx}`);
    approx(Math.abs(b.vx), 400 * C.physics.rimRestitution, 1e-6, "rim restitution applied");
    const dist = Math.hypot(b.x - C.hoop.rimFrontX, b.y - C.hoop.rimY);
    approx(dist, b.radius + C.hoop.rimThickness, 1e-6, "ball pushed out of overlap");
  });

  check(`${label}: ch09 milestone — the backboard reflects an 800 px/s ball`, () => {
    const b = new X.Ball();
    const hoop = new X.Hoop();
    b.x = C.hoop.boardX - b.radius + 2; // overlapping the board face
    b.y = (C.hoop.boardTop + C.hoop.boardBottom) / 2;
    b.vx = 800;
    b.vy = 0;
    hoop.collide(b);
    approx(b.vx, -800 * C.physics.boardRestitution, 1e-6, "board restitution applied");
    approx(b.x, C.hoop.boardX - b.radius, 1e-6, "ball snapped out of the board");
  });

  check(`${label}: ch09 milestone — 13 max-power shots never leave the world (900 steps each)`, () => {
    const env = makeEnv();
    installStubs(env);
    const game = new X.Game(env.canvas);
    for (let i = 0; i < 13; i++) {
      clickButton(env, "newSessionButton"); // fresh session, ball back on the line
      const angle = (i * 2 * Math.PI) / 13;
      shoot(env, game, C, angle, C.physics.maxLaunchSpeed);
      stepFrames(env, 900, 1000 / 60, () => {
        const { x, y } = game.ball;
        assert(
          x >= 0 && x <= C.world.width && y >= 0 && y <= C.world.height,
          `shot ${i} (${((angle * 180) / Math.PI).toFixed(1)}°): center escaped to (${x.toFixed(1)}, ${y.toFixed(1)})`
        );
      });
    }
  });

  check(`${label}: ch10 milestone — isScore fires exactly on a downward crossing inside the opening`, () => {
    const b = new X.Ball();
    const hoop = new X.Hoop();
    const midX = (C.hoop.rimFrontX + C.hoop.rimBackX) / 2;
    b.x = midX; b.y = C.hoop.rimY + 5; b.vy = 300;
    assert(hoop.isScore(b, C.hoop.rimY - 5), "clean downward crossing should score");
    assert(!hoop.isScore(b, C.hoop.rimY + 2), "already below the rim line must not score");
    b.vy = -300;
    assert(!hoop.isScore(b, C.hoop.rimY - 5), "moving upward must not score");
    b.vy = 300; b.x = C.hoop.rimFrontX; // on the front rim, outside the opening
    assert(!hoop.isScore(b, C.hoop.rimY - 5), "crossing outside the opening must not score");
  });

  check(`${label}: ch10 milestone — scoring sweep lands at least 20 baskets`, () => {
    const env = makeEnv();
    installStubs(env);
    const game = new X.Game(env.canvas);
    let baskets = 0;
    let shots = 0;
    for (let speed = 900; speed <= 1500; speed += 50) {
      for (let deg = 45; deg <= 75; deg += 3) {
        clickButton(env, "newSessionButton"); // every shot from the free-throw spot
        shoot(env, game, C, (deg * Math.PI) / 180, speed);
        flyUntilRest(env, game);
        shots += 1;
        if (game.session.score > 0) baskets += 1;
      }
    }
    assert(baskets >= 20, `only ${baskets} baskets in ${shots} shots (need ≥ 20)`);
    console.log(`        (sweep: ${baskets}/${shots} baskets)`);
  });

  check(`${label}: ch10 milestone — one swish scores exactly one point`, () => {
    // scoredThisShot guard: replay the sweep's best-known make and assert +1, not +2.
    const env = makeEnv();
    installStubs(env);
    const game = new X.Game(env.canvas);
    let made = null;
    outer: for (let speed = 1000; speed <= 1500; speed += 50) {
      for (let deg = 45; deg <= 75; deg += 3) {
        clickButton(env, "newSessionButton");
        shoot(env, game, C, (deg * Math.PI) / 180, speed);
        flyUntilRest(env, game);
        if (game.session.score > 0) { made = game.session.score; break outer; }
      }
    }
    assert(made !== null, "no basket found to test the guard with");
    assert(made === 1, `a single made shot must score exactly 1 point, got ${made}`);
  });

  check(`${label}: ch11 milestone — after ${C.session.shotLimit} shots the session is over and shooting is refused`, () => {
    const env = makeEnv();
    installStubs(env);
    const game = new X.Game(env.canvas);
    for (let i = 0; i < C.session.shotLimit; i++) {
      assert(game.state === "ready", `state before shot ${i + 1} should be ready, got ${game.state}`);
      shoot(env, game, C, Math.PI / 2, 600); // straight up, resolves quickly
      flyUntilRest(env, game);
    }
    assert(game.state === "sessionOver", `state should be sessionOver, got ${game.state}`);
    assert(game.session.shotsLeft === 0, `shotsLeft should be 0, got ${game.session.shotsLeft}`);
    const statusText = env.document.getElementById("sessionStatus").textContent;
    assert(statusText.length > 0, "session results line should be shown");
    const shotsBefore = game.session.shotsLeft;
    shoot(env, game, C, Math.PI / 2, 600); // must be refused
    assert(game.state === "sessionOver", "shooting while sessionOver must be refused");
    assert(game.session.shotsLeft === shotsBefore, "a refused shot must not consume shots");
    clickButton(env, "newSessionButton");
    assert(game.state === "ready", "New session should return to ready");
    assert(game.session.shotsLeft === C.session.shotLimit, "New session should refill shots");
  });

  check(`${label}: ch14 milestone — PlayerStore honors one contract in both storage modes`, () => {
    // Persistent mode: data survives into a brand-new instance.
    const envA = makeEnv();
    installStubs(envA);
    const a1 = new X.PlayerStore();
    assert(a1.persistent === true, "localStorage available → persistent mode");
    a1.save("Ana", { bestStreak: 4, bestSession: 7 });
    const a2 = new X.PlayerStore();
    assert(a2.loadAll().Ana.bestSession === 7, "persistent mode: second instance reads saved data");
    // Blocked mode: identical API, in-memory fallback, no crash.
    const envB = makeEnv();
    blockStorage(envB);
    installStubs(envB);
    const b1 = new X.PlayerStore();
    assert(b1.persistent === false, "blocked localStorage → fallback mode");
    b1.save("Ana", { bestStreak: 4, bestSession: 7 });
    assert(b1.loadAll().Ana.bestStreak === 4, "fallback mode: same save/load contract");
  });

  return X;
}

/* ===================================================================== *
 * Per-chapter milestone tests (pre-class chapters get theirs added as
 * each chapter is written; the registry below grows with the course).
 * Key: two-digit chapter number → function(strippedJs, answerKeyExports).
 * ===================================================================== */

const CHAPTER_TESTS = {
  // 02–05: syntax gate only (declarations and drawing, no simulation yet).
  // 06+: added as each chapter is built.
};

/* ===================================================================== *
 * Runner
 * ===================================================================== */

const onlyUpTo = process.argv[2] ?? null;

console.log("verify.mjs — JavaScript basketball course harness");
console.log(`Node ${process.version}\n`);

// --- Answer key: syntax + full battery (the harness's own ground truth) ---
console.log("answer-key/basketball-js.html");
const keyScript = extractScript(ANSWER_KEY);
check("answer-key: script passes node --check", () => syntaxCheck(keyScript, "answer-key"));
const keyStripped = stripBoot(keyScript);
const KEY = classModeBattery("answer-key", keyStripped);

// --- Chapter snapshots ---
const chapterDirs = existsSync(CHAPTERS_DIR)
  ? readdirSync(CHAPTERS_DIR).filter((d) => /^\d\d-/.test(d)).sort()
  : [];

for (const dir of chapterDirs) {
  const nn = dir.slice(0, 2);
  if (onlyUpTo !== null && nn > onlyUpTo) continue;
  const snapshot = join(CHAPTERS_DIR, dir, "snapshot", "index.html");
  if (!existsSync(snapshot)) continue; // chapters 00–01 have no code
  console.log(`\nchapters/${dir}`);
  const js = extractScript(snapshot);
  check(`ch${nn}: script passes node --check`, () => syntaxCheck(js, `ch${nn}`));
  const test = CHAPTER_TESTS[nn];
  if (test) test(stripBoot(js), KEY);
}

// --- Summary ---
rmSync(tmpDir, { recursive: true, force: true });
console.log(`\n${passCount + failCount} checks: ${passCount} passed, ${failCount} failed`);
if (failCount > 0) {
  console.log("Failed:");
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}
