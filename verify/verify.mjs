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

function classModeBattery(label, strippedJs, withStore = true) {
  const names = withStore ? CLASS_NAMES : CLASS_NAMES.filter((n) => n !== "PlayerStore");
  let X = null;
  check(`${label}: declares CONFIG and all ${names.length - 1} classes`, () => {
    installStubs(makeEnv());
    X = evalExports(strippedJs, names);
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

  if (!withStore) return X; // chapters before persistence stop here

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

/** Assert every key of `part` exists in `whole` with a deep-equal value. */
function subsetEqual(part, whole, path) {
  for (const [k, v] of Object.entries(part)) {
    const w = whole?.[k];
    if (typeof v === "object" && v !== null) {
      subsetEqual(v, w, `${path}.${k}`);
    } else {
      assert(w === v, `${path}.${k} is ${v}, answer key says ${w}`);
    }
  }
}

const CHAPTER_TESTS = {
  // 02–03: syntax gate only (first script, first rectangles).

  "04": (js, KEY) => {
    check("ch04: CONFIG is frozen and matches the answer key's world and ball", () => {
      installStubs(makeEnv());
      const { CONFIG } = evalExports(js, ["CONFIG"]);
      assert(Object.isFrozen(CONFIG), "CONFIG must be Object.freeze'd");
      subsetEqual(CONFIG, KEY.CONFIG, "CONFIG");
    });
  },

  "05": (js, KEY) => {
    check("ch05: drawCourt/drawBall/drawHoop exist; CONFIG.hoop matches the answer key", () => {
      installStubs(makeEnv());
      const X = evalExports(js, ["CONFIG", "drawCourt", "drawBall", "drawHoop"]);
      for (const f of ["drawCourt", "drawBall", "drawHoop"]) {
        assert(typeof X[f] === "function", `${f} must be a function`);
      }
      subsetEqual(X.CONFIG, KEY.CONFIG, "CONFIG");
    });
  },

  "06": (js, KEY) => gravityAndBounceChecks("06", js, KEY),

  "07": (js, KEY) => {
    gravityAndBounceChecks("07", js, KEY);
    check("ch07: the full scene's draw functions exist", () => {
      installStubs(makeEnv());
      const X = evalExports(js, ["drawBackground", "drawCourt", "drawHoopBack", "drawHoopFront", "drawBall"]);
      for (const [name, fn] of Object.entries(X)) {
        assert(typeof fn === "function", `${name} must be a function`);
      }
    });
  },

  "08": (js, KEY) => {
    gravityAndBounceChecks("08", js, KEY);
    holdToChargeChecks("08", js);
  },

  "09": (js, KEY) => {
    const load = () => {
      installStubs(makeEnv());
      return evalExports(js, [
        "CONFIG", "ball", "integrateBall", "ballSpeed",
        "collideHoop", "collideBounds",
      ]);
    };
    check("ch09: CONFIG matches the answer key", () => {
      subsetEqual(load().CONFIG, KEY.CONFIG, "CONFIG");
    });
    check("ch09: milestone — the rim deflects a 400 px/s ball", () => {
      const X = load();
      const h = X.CONFIG.hoop;
      X.ball.x = h.rimFrontX - 15;
      X.ball.y = h.rimY;
      X.ball.vx = 400;
      X.ball.vy = 0;
      X.collideHoop();
      assert(X.ball.vx < 0, `ball should be pushed back; vx = ${X.ball.vx}`);
      approx(Math.abs(X.ball.vx), 400 * X.CONFIG.physics.rimRestitution, 1e-6, "rim restitution applied");
      const dist = Math.hypot(X.ball.x - h.rimFrontX, X.ball.y - h.rimY);
      approx(dist, X.ball.radius + h.rimThickness, 1e-6, "ball pushed out of overlap");
    });
    check("ch09: milestone — the backboard reflects an 800 px/s ball", () => {
      const X = load();
      const h = X.CONFIG.hoop;
      X.ball.x = h.boardX - X.ball.radius + 2;
      X.ball.y = (h.boardTop + h.boardBottom) / 2;
      X.ball.vx = 800;
      X.ball.vy = 0;
      X.collideHoop();
      approx(X.ball.vx, -800 * X.CONFIG.physics.boardRestitution, 1e-6, "board restitution applied");
      approx(X.ball.x, h.boardX - X.ball.radius, 1e-6, "ball snapped out of the board");
    });
    check("ch09: milestone — 13 max-power shots never leave the world (900 steps each)", () => {
      const X = load();
      const C = X.CONFIG;
      for (let i = 0; i < 13; i++) {
        const angle = (i * 2 * Math.PI) / 13;
        X.ball.x = C.ball.startX;
        X.ball.y = C.ball.startY;
        X.ball.vx = Math.cos(angle) * C.physics.maxLaunchSpeed;
        X.ball.vy = Math.sin(angle) * C.physics.maxLaunchSpeed;
        for (let s = 0; s < 900; s++) {
          X.integrateBall(1 / 60);
          X.collideHoop();
          X.collideBounds();
          assert(
            X.ball.x >= 0 && X.ball.x <= C.world.width && X.ball.y >= 0 && X.ball.y <= C.world.height,
            `shot ${i} (${((angle * 180) / Math.PI).toFixed(1)}°), step ${s}: center escaped to (${X.ball.x.toFixed(1)}, ${X.ball.y.toFixed(1)})`
          );
        }
      }
    });
    check("ch09: floor bounce still reverses vy and rests (no regression)", () => {
      const X = load();
      X.ball.x = 180;
      X.ball.y = 80;
      X.ball.vx = 120;
      X.ball.vy = 0;
      let sawBounce = false;
      let steps = 0;
      while (X.ballSpeed() > 0 || steps === 0) {
        const vyBefore = X.ball.vy;
        X.integrateBall(1 / 60);
        X.collideHoop();
        X.collideBounds();
        if (vyBefore > 200 && X.ball.vy < 0) sawBounce = true;
        steps += 1;
        assert(steps < 4000, "ball never came to rest");
      }
      assert(sawBounce, "never observed a bounce");
    });
    holdToChargeChecks("09", js);
  },

  "10": (js, KEY) => {
    const load = () => {
      const env = makeEnv();
      installStubs(env);
      const X = evalExports(js, [
        "CONFIG", "ball", "game", "input", "shoot", "updateFlight", "isScore",
        "onPointerDown", "onPointerMove", "onPointerUp", "power",
        "launchVelocity", "integrateBall", "ballSpeed", "collideHoop", "collideBounds",
      ]);
      return { env, X };
    };
    /** Fire one shot from the free-throw spot and run flight to rest. */
    const playShot = (X, angleRad, speed) => {
      X.ball.x = X.CONFIG.ball.startX;
      X.ball.y = X.CONFIG.ball.startY;
      X.ball.vx = 0;
      X.ball.vy = 0;
      X.game.state = "ready";
      X.shoot(Math.cos(angleRad) * speed, -Math.sin(angleRad) * speed);
      let t = 0;
      let frames = 0;
      while (X.game.state === "flight" && frames < 6000) {
        t += 1000 / 60;
        X.updateFlight(1 / 60, t);
        frames += 1;
      }
      assert(frames < 6000, "shot never resolved");
    };
    check("ch10: CONFIG matches the answer key", () => {
      subsetEqual(load().X.CONFIG, KEY.CONFIG, "CONFIG");
    });
    check("ch10: rim and backboard physics unchanged (no regression)", () => {
      const { X } = load();
      const h = X.CONFIG.hoop;
      X.ball.x = h.rimFrontX - 15;
      X.ball.y = h.rimY;
      X.ball.vx = 400;
      X.ball.vy = 0;
      X.collideHoop();
      approx(X.ball.vx, -400 * X.CONFIG.physics.rimRestitution, 1e-6, "rim restitution");
      X.ball.x = h.boardX - X.ball.radius + 2;
      X.ball.y = (h.boardTop + h.boardBottom) / 2;
      X.ball.vx = 800;
      X.ball.vy = 0;
      X.collideHoop();
      approx(X.ball.vx, -800 * X.CONFIG.physics.boardRestitution, 1e-6, "board restitution");
    });
    check("ch10: milestone — scoring sweep lands ≥20 baskets, one point per swish", () => {
      const { X } = load();
      let baskets = 0;
      let shots = 0;
      for (let speed = 900; speed <= 1500; speed += 50) {
        for (let deg = 45; deg <= 75; deg += 3) {
          const before = X.game.score;
          playShot(X, (deg * Math.PI) / 180, speed);
          const gained = X.game.score - before;
          assert(gained === 0 || gained === 1, `shot gained ${gained} points (guard broken?)`);
          baskets += gained;
          shots += 1;
        }
      }
      assert(baskets >= 20, `only ${baskets} baskets in ${shots} shots (need ≥ 20)`);
      console.log(`        (sweep: ${baskets}/${shots} baskets)`);
    });
    check("ch10: milestone — the state machine refuses aiming mid-flight", () => {
      const { X } = load();
      X.shoot(600, -600);
      assert(X.game.state === "flight", "shoot should enter flight");
      X.onPointerDown({ clientX: 400, clientY: 300, pointerId: 1 });
      assert(X.input.isCharging === false, "charging must be refused mid-flight");
      let t = 0;
      let frames = 0;
      while (X.game.state === "flight" && frames < 6000) {
        t += 1000 / 60;
        X.updateFlight(1 / 60, t);
        frames += 1;
      }
      assert(X.game.state === "ready", "flight should end back in ready");
      const restX = X.ball.x;
      X.onPointerDown({ clientX: restX + 80, clientY: X.ball.y - 80, pointerId: 1 });
      assert(X.input.isCharging === true, "aiming allowed again once ready");
      const v = X.launchVelocity();
      assert(v !== null && v.vx > 0 && v.vy < 0, "next shot aims from where the ball stopped");
    });
    holdToChargeChecks("10", js);
  },

  "11": (js, KEY) => {
    check("ch11: CONFIG matches the answer key", () => {
      installStubs(makeEnv());
      subsetEqual(evalExports(js, ["CONFIG"]).CONFIG, KEY.CONFIG, "CONFIG");
    });
    sessionChecks("11", js);
    holdToChargeChecks("11", js);
  },

  "12": (js, KEY) => {
    const load = () => {
      installStubs(makeEnv());
      return evalExports(js, ["CONFIG", "Ball", "Hoop"]);
    };
    check("ch12: CONFIG matches the answer key; Ball and Hoop are classes", () => {
      const X = load();
      subsetEqual(X.CONFIG, KEY.CONFIG, "CONFIG");
      assert(typeof X.Ball === "function" && typeof X.Hoop === "function", "Ball and Hoop must be classes");
    });
    check("ch12: equivalence — Ball behaves identically to the answer key's Ball", () => {
      const X = load();
      const a = new X.Ball();
      const b = new KEY.Ball();
      a.launch(637, -1002);
      b.launch(637, -1002);
      for (let i = 0; i < 300; i++) {
        a.integrate(1 / 60);
        b.integrate(1 / 60);
      }
      assert(
        a.x === b.x && a.y === b.y && a.vx === b.vx && a.vy === b.vy,
        `Ball diverged: (${a.x}, ${a.y}, ${a.vx}, ${a.vy}) vs (${b.x}, ${b.y}, ${b.vx}, ${b.vy})`
      );
      assert(a.speed() === b.speed(), "speed() diverged");
      a.reset();
      b.reset();
      assert(a.x === b.x && a.y === b.y && a.vx === 0 && b.vx === 0, "reset() diverged");
    });
    check("ch12: equivalence — Hoop collisions and isScore identical to the answer key's", () => {
      const X = load();
      const C = X.CONFIG;
      const scenarios = [
        { x: C.hoop.rimFrontX - 15, y: C.hoop.rimY, vx: 400, vy: 0 },
        { x: C.hoop.rimFrontX - 10, y: C.hoop.rimY - 18, vx: 300, vy: 420 },
        { x: C.hoop.boardX - 16, y: 250, vx: 800, vy: -50 },
        { x: C.hoop.rimBackX + 3, y: C.hoop.rimY + 8, vx: -250, vy: -100 },
      ];
      const xh = new X.Hoop();
      const kh = new KEY.Hoop();
      for (const s of scenarios) {
        const a = new X.Ball();
        const b = new KEY.Ball();
        Object.assign(a, s);
        Object.assign(b, s);
        xh.collide(a);
        kh.collide(b);
        assert(
          a.x === b.x && a.y === b.y && a.vx === b.vx && a.vy === b.vy,
          `Hoop diverged on ${JSON.stringify(s)}`
        );
      }
      const mid = (C.hoop.rimFrontX + C.hoop.rimBackX) / 2;
      const a = new X.Ball();
      const b = new KEY.Ball();
      Object.assign(a, { x: mid, y: C.hoop.rimY + 5, vy: 300 });
      Object.assign(b, { x: mid, y: C.hoop.rimY + 5, vy: 300 });
      assert(
        xh.isScore(a, C.hoop.rimY - 5) === kh.isScore(b, C.hoop.rimY - 5) &&
        xh.isScore(a, C.hoop.rimY - 5) === true,
        "isScore diverged"
      );
    });
    sessionChecks("12", js);
    holdToChargeChecks("12", js);
  },

  "13": (js) => {
    classModeBattery("ch13", js, false);
  },

  "14": (js, KEY) => {
    check("ch14: equivalence gate — CONFIG deep-equals the answer key's", () => {
      installStubs(makeEnv());
      const X = evalExports(js, ["CONFIG"]);
      subsetEqual(X.CONFIG, KEY.CONFIG, "CONFIG");
      subsetEqual(KEY.CONFIG, X.CONFIG, "CONFIG(reverse)");
    });
    check("ch14: equivalence gate — the class list matches the answer key exactly", () => {
      const declared = [...js.matchAll(/^class (\w+)/gm)].map((m) => m[1]).sort();
      const expected = CLASS_NAMES.filter((n) => n !== "CONFIG").sort();
      assert(
        JSON.stringify(declared) === JSON.stringify(expected),
        `classes declared: [${declared}] — answer key has: [${expected}]`
      );
    });
    // "Every assertion the answer key passes, the snapshot passes":
    classModeBattery("ch14", js, true);
  },
};

/**
 * Chapter 11's session/player milestones, re-run on later function-mode
 * snapshots (the ch12 class refactor must not change any behavior).
 */
function sessionChecks(nn, js) {
  const load = () => {
    const env = makeEnv();
    installStubs(env);
    const X = evalExports(js, [
      "CONFIG", "ball", "game", "input", "shoot", "updateFlight",
      "newSession", "switchPlayer", "addPlayerFromInput",
      "onPointerDown", "onPointerUp", "power", "launchVelocity",
    ]);
    return { env, X };
  };
  const resolveShot = (X) => {
    let t = 0;
    let frames = 0;
    while (X.game.state === "flight" && frames < 6000) {
      t += 1000 / 60;
      X.updateFlight(1 / 60, t);
      frames += 1;
    }
    assert(frames < 6000, "shot never resolved");
  };
  check(`ch${nn}: milestone — after the shot limit the session is over and shooting is refused`, () => {
      const { env, X } = load();
      X.switchPlayer("Player 1"); // what the boot section does
      for (let i = 0; i < X.CONFIG.session.shotLimit; i++) {
        assert(X.game.state === "ready", `state before shot ${i + 1} should be ready, got ${X.game.state}`);
        env.now += 100;
        X.onPointerDown({ clientX: X.ball.x + 60, clientY: X.ball.y - 80, pointerId: 1 });
        env.now += 200;
        X.onPointerUp();
        assert(X.game.state === "flight", `shot ${i + 1} should fire`);
        resolveShot(X);
      }
      assert(X.game.state === "sessionOver", `state should be sessionOver, got ${X.game.state}`);
      assert(X.game.session.shotsLeft === 0, "shotsLeft should be 0");
      const statusText = env.document.getElementById("sessionStatus").textContent;
      assert(statusText.length > 0, "session results line should be shown");
      X.onPointerDown({ clientX: X.ball.x + 60, clientY: X.ball.y - 80, pointerId: 1 });
      assert(X.input.isCharging === false, "charging must be refused while sessionOver");
      X.onPointerUp();
      assert(X.game.state === "sessionOver", "shooting while sessionOver must be refused");
      assert(X.game.session.shotsLeft === 0, "a refused shot must not consume shots");
      X.newSession();
      assert(X.game.state === "ready", "New session should return to ready");
      assert(X.game.session.shotsLeft === X.CONFIG.session.shotLimit, "New session should refill shots");
      assert(X.ball.x === X.CONFIG.ball.startX, "New session puts the ball back on the line");
    });
  check(`ch${nn}: scoring sweep still lands ≥20 baskets (fresh session per shot)`, () => {
      const { X } = load();
      X.switchPlayer("Sweep");
      let baskets = 0;
      let shots = 0;
      for (let speed = 900; speed <= 1500; speed += 50) {
        for (let deg = 45; deg <= 75; deg += 3) {
          X.newSession();
          X.shoot(Math.cos((deg * Math.PI) / 180) * speed, -Math.sin((deg * Math.PI) / 180) * speed);
          resolveShot(X);
          assert(X.game.session.score === 0 || X.game.session.score === 1, "one point per swish");
          baskets += X.game.session.score;
          shots += 1;
        }
      }
      assert(baskets >= 20, `only ${baskets} baskets in ${shots} shots`);
      console.log(`        (sweep: ${baskets}/${shots} baskets)`);
    });
  check(`ch${nn}: switching players swaps records and starts a fresh session`, () => {
      const { X } = load();
      X.switchPlayer("Ana");
      X.game.records.bestStreak = 5;
      X.game.records.bestSession = 7;
      X.switchPlayer("Ben");
      assert(X.game.records.bestStreak === 0, "Ben starts with fresh records");
      assert(X.game.session.shotsLeft === X.CONFIG.session.shotLimit, "Ben starts a fresh session");
      X.switchPlayer("Ana");
      assert(X.game.records.bestStreak === 5 && X.game.records.bestSession === 7, "Ana's records survived the switch");
    });
  check(`ch${nn}: duplicate or blank player names are refused`, () => {
      const { env, X } = load();
      const nameInput = env.document.getElementById("playerNameInput");
      const select = env.document.getElementById("playerSelect");
      nameInput.value = "  Ana  ";
      X.addPlayerFromInput();
      assert(select.options.length === 1 && select.options[0].value === "Ana", "trimmed name added once");
      nameInput.value = "Ana";
      X.addPlayerFromInput();
      assert(select.options.length === 1, "duplicate name refused");
      nameInput.value = "   ";
      X.addPlayerFromInput();
      assert(select.options.length === 1, "blank name refused");
    });
}

/** Chapter 8's hold-to-charge milestones, re-run on later snapshots. */
function holdToChargeChecks(nn, js) {
  const load = () => {
    const env = makeEnv();
    installStubs(env);
    const X = evalExports(js, [
      "CONFIG", "ball", "input", "onPointerDown", "onPointerMove",
      "onPointerUp", "power", "launchVelocity",
    ]);
    return { env, X };
  };
  check(`ch${nn}: milestone — power is 0 at press, 0.5 at half charge, capped at 1`, () => {
    const { env, X } = load();
    env.now = 5000;
    X.onPointerDown({ clientX: X.ball.x, clientY: X.ball.y - 150, pointerId: 1 });
    approx(X.power(), 0, 1e-12, "power at the instant of pressing");
    env.now += (X.CONFIG.input.chargeTime / 2) * 1000;
    approx(X.power(), 0.5, 1e-9, "power at half chargeTime");
    env.now += X.CONFIG.input.chargeTime * 5000;
    approx(X.power(), 1, 1e-12, "power beyond full charge");
  });
  check(`ch${nn}: milestone — launch speed scales min→max, aim angle matches the pointer`, () => {
    const { env, X } = load();
    env.now = 1000;
    X.onPointerDown({ clientX: X.ball.x + 100, clientY: X.ball.y - 100, pointerId: 1 });
    let v = X.launchVelocity();
    approx(Math.hypot(v.vx, v.vy), X.CONFIG.physics.minLaunchSpeed, 1e-6, "speed at zero charge");
    approx(Math.atan2(v.vy, v.vx), Math.atan2(-100, 100), 1e-9, "aim angle");
    env.now += X.CONFIG.input.chargeTime * 1000 + 50;
    v = X.launchVelocity();
    approx(Math.hypot(v.vx, v.vy), X.CONFIG.physics.maxLaunchSpeed, 1e-6, "speed at full charge");
  });
  check(`ch${nn}: milestone — a pointer sitting on the ball fires no shot`, () => {
    const { X } = load();
    X.ball.vx = 0;
    X.ball.vy = 0;
    X.onPointerDown({ clientX: X.ball.x, clientY: X.ball.y, pointerId: 1 });
    assert(X.launchVelocity() === null, "launchVelocity should be null on the ball");
    X.onPointerUp();
    assert(X.ball.vx === 0 && X.ball.vy === 0, "release on the ball must not launch");
    assert(X.input.isCharging === false, "charge should end on release");
  });
}

/**
 * Chapter 6's physics milestones, reusable by later pre-class chapters
 * (the scene changes; gravity and the floor must not regress).
 */
function gravityAndBounceChecks(nn, js, KEY) {
  const load = () => {
    installStubs(makeEnv());
    return evalExports(js, ["CONFIG", "ball", "integrateBall", "collideFloor", "ballSpeed"]);
  };
  check(`ch${nn}: CONFIG matches the answer key`, () => {
    subsetEqual(load().CONFIG, KEY.CONFIG, "CONFIG");
  });
  check(`ch${nn}: milestone — y increases under gravity`, () => {
    const X = load();
    const y0 = X.ball.y;
    for (let i = 0; i < 10; i++) X.integrateBall(1 / 60);
    assert(X.ball.vy > 0, `vy should grow positive (down); got ${X.ball.vy}`);
    assert(X.ball.y > y0, `y should increase; got ${X.ball.y} from ${y0}`);
  });
  check(`ch${nn}: milestone — a floor bounce reverses vy, then the ball rests`, () => {
    const X = load();
    let sawBounce = false;
    let steps = 0;
    while (X.ballSpeed() > 0 || steps === 0) {
      const vyBefore = X.ball.vy;
      X.integrateBall(1 / 60);
      X.collideFloor();
      if (vyBefore > 200 && X.ball.vy < 0) sawBounce = true;
      steps += 1;
      assert(steps < 4000, "ball never came to rest");
    }
    assert(sawBounce, "never observed a bounce (fast fall then upward vy)");
    approx(X.ball.y, X.CONFIG.world.floorY - X.ball.radius, 1e-6, "resting on the floor");
  });
}

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
