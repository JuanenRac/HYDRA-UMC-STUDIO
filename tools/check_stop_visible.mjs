#!/usr/bin/env node
/**
 * The global STOP is always on screen and can always be pressed: Studio in a real browser (headless Chromium, touch) against a real HYDRA-UMC SERVER started in a
 * throw-away folder with a made-up administrator and no robots. Every window, dialog, tour, assistant and notice is opened at several screen sizes; in each one a STOP
 * button must be reachable at its centre and sides, a tap on it must send POST /api/stop-all, and nothing of a full-screen window may sit under the floating STOP.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 *
 *   npm run build                                   Studio built (dist/); the SERVER built next to it (npm ci && npm run build)
 *   node tools/check_stop_visible.mjs               exit 1 when a STOP is covered; pictures in stop-visible/
 *   node tools/check_stop_visible.mjs --out DIR     pictures in DIR
 *   node tools/check_stop_visible.mjs --report-only  lists what is covered and exits 0 (to picture a build that is known to fail)
 *
 * Playwright comes from e2e/node_modules or PLAYWRIGHT_DIR; HYDRA_UMC_SERVER_DIR names the server folder; port 3000 must be free.
 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import net from "node:net";
import path from "node:path";
import crypto from "node:crypto";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const studio = path.resolve(here, "..");
const serverDir = process.env.HYDRA_UMC_SERVER_DIR ?? path.join(studio, "..", "HYDRA-UMC-SERVER");
const require = createRequire(path.join(process.env.PLAYWRIGHT_DIR ?? path.join(studio, "e2e"), "package.json"));
const { chromium } = require("@playwright/test");
const reportOnly = process.argv.includes("--report-only");
const outIndex = process.argv.indexOf("--out");
const out = path.resolve(outIndex > 0 ? process.argv[outIndex + 1] : path.join(studio, "stop-visible"));
fs.mkdirSync(out, { recursive: true });

/** The screens: desktop, laptop, kiosk panels (touch) and a phone in both orientations. */
const SIZES = [[1920, 1080], [1366, 768], [1280, 800], [1024, 600], [800, 480], [390, 844], [844, 390]];
const EMBEDDED_SIZES = [[390, 844], [844, 390]];
// a build without the guard has no marks: the test id of the header and footer buttons stands in when only reporting
const CANDIDATES = reportOnly ? "[data-stop-global], [data-testid=stop-all], [data-testid=stop-floating]" : "[data-stop-global], [data-testid=stop-floating]";

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const portFree = port => new Promise(resolve => { const probe = net.createServer(); probe.once("error", () => resolve(false)); probe.listen(port, "127.0.0.1", () => probe.close(() => resolve(true))); });
const work = fs.mkdtempSync(path.join(os.tmpdir(), "hydra-stop-"));
const children = [];
const start = (command, args, options) => { const child = spawn(command, args, { stdio: "ignore", ...options }); children.push(child); return child; };
const password = crypto.randomBytes(18).toString("base64url");
const studioPort = 5198;
if (!(await portFree(3000)) || !(await portFree(studioPort))) throw new Error(`ports 3000 and ${studioPort} must be free`);

const failures = [];
let checked = 0;
let browser;
try {
  fs.mkdirSync(path.join(work, "data"));
  start(process.execPath, [path.join(serverDir, "dist", "server.cjs")], {
    cwd: work,
    env: { ...process.env, JWT_SECRET: crypto.randomBytes(32).toString("hex"), HYDRA_UMC_BOOTSTRAP_ADMIN_USERNAME: "admin", HYDRA_UMC_BOOTSTRAP_ADMIN_PASSWORD: password },
  });
  start(process.execPath, [path.join(studio, "node_modules", "vite", "bin", "vite.js"), "preview", "--host", "127.0.0.1", "--port", String(studioPort), "--strictPort"], { cwd: studio });
  const origin = `http://127.0.0.1:${studioPort}`;
  for (let tries = 0; tries < 120; tries += 1) { try { await fetch("http://127.0.0.1:3000/api/login", { method: "OPTIONS" }); await fetch(origin + "/"); break; } catch { await sleep(250); } }

  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, hasTouch: true, locale: "en-US" });
  // the app asks for full screen on the first press, and a full-screen window of the browser cannot be resized
  await context.addInitScript(() => { Element.prototype.requestFullscreen = () => Promise.resolve(); });
  const page = await context.newPage();
  await page.goto(origin + "/?skipSplash=true");
  await page.locator("input[type=password]").waitFor({ timeout: 60000 });
  await page.getByPlaceholder("Username").fill("admin");
  await page.locator("input[type=password]").fill(password);
  await page.locator("button[type=submit]").click();
  await page.getByText(/^overview$/i).first().waitFor({ timeout: 30000 });

  // opening a window is done with a DOM click: what is checked is the STOP, not whether the opener fits on this screen
  const press = locator => locator.first().evaluate(element => element.click(), undefined, { timeout: 8000 });
  const button = text => page.locator("button").filter({ hasText: text });
  const help = () => press(page.locator('[data-tour="help"]'));
  const settings = () => press(page.locator('[data-tour="settings"]'));
  const robot = () => press(button(/Robot A1/));

  const open = {
    "main-screen": async () => {},
    "help": help,
    "help-guides": async () => { await help(); await press(button(/step-by-step/i)); },
    "settings": settings,
    "settings-confirm": async () => { await settings(); await press(button(/factory reset/i)); },
    "about": () => press(button(/^about$/i)),
    "shutdown-confirm": () => press(button(/^\s*shut down\s*$/i)),
    "tour": async () => { await help(); await press(page.getByTestId("help-start-tour")); await page.getByTestId("tour-card").waitFor(); },
    "tour-last-steps": async () => { await help(); await press(page.getByTestId("help-start-tour")); for (let i = 0; i < 3; i += 1) { await press(page.getByTestId("tour-next")); await page.waitForTimeout(400); } },
    "assistant": () => press(page.locator(".assistant-mascot")),
    "stop-report": () => press(page.locator("[data-stop-global]").or(page.getByTestId("stop-all"))),
    "stop-not-confirmed": async () => { await page.route("**/api/stop-all", route => route.abort()); await press(page.locator("[data-stop-global]").or(page.getByTestId("stop-all"))); await page.waitForTimeout(1500); },
    "robot-screen": robot,
    "robot-confirm": async () => { await robot(); await press(page.locator('button[title="HOME"]')); await page.getByRole("dialog").waitFor(); },
    // any window added later: something that covers the whole page, known by nothing in Studio
    "unknown-overlay": () => page.evaluate(() => { const cover = document.createElement("div"); cover.id = "unknown-overlay"; cover.style.cssText = "position:fixed;inset:0;z-index:100000;background:rgba(80,0,120,.55)"; document.body.appendChild(cover); }),
    // the mascot put on top of the STOP of the header
    "mascot-on-stop": async () => {
      await page.evaluate(() => {
        const stop = document.querySelector("[data-testid=stop-all]")?.getBoundingClientRect();
        const x = stop ? Math.min(stop.left + stop.width / 2 - 28, window.innerWidth - 70) : window.innerWidth / 2;
        localStorage.setItem("hydra_assistant_prefs", JSON.stringify({ assistantX: Math.max(0, x) / window.innerWidth, assistantY: 0 }));
      });
      await page.reload();
      await page.locator(".assistant-mascot").waitFor({ timeout: 30000 });
    },
  };

  /** The first STOP that a finger reaches: inside the window, and on top at its centre and four points half way to its sides. */
  const reachable = () => page.evaluate(selector => {
    for (const element of document.querySelectorAll(selector)) {
      const box = element.getBoundingClientRect();
      if (box.width <= 0 || box.height <= 0 || box.left < -0.5 || box.top < -0.5 || box.right > innerWidth + 0.5 || box.bottom > innerHeight + 0.5) continue;
      const points = [[0.5, 0.5], [0.2, 0.5], [0.8, 0.5], [0.5, 0.2], [0.5, 0.8]];
      if (points.every(([x, y]) => { const hit = document.elementFromPoint(box.left + box.width * x, box.top + box.height * y); return hit !== null && element.contains(hit); })) {
        return { x: box.left + box.width / 2, y: box.top + box.height / 2, floating: element.getAttribute("data-testid") === "stop-floating" };
      }
    }
    return null;
  }, CANDIDATES);

  /** Windows that fill the screen whose content reaches under the floating STOP. */
  const underFloating = () => page.evaluate(() => {
    const stop = document.querySelector("[data-testid=stop-floating]")?.getBoundingClientRect();
    if (!stop) return 0;
    return [...document.querySelectorAll("[data-stop-clear] > :not([data-stop-clear])")].filter(card => {
      const box = card.getBoundingClientRect();
      return box.top < stop.bottom - 0.5 && box.bottom > stop.top && box.left < stop.right && box.right > stop.left;
    }).length;
  });

  const check = async (name) => {
    checked += 1;
    await page.waitForTimeout(900);
    let target = await reachable();
    for (let tries = 0; !target && tries < 10; tries += 1) { await page.waitForTimeout(150); target = await reachable(); }
    await page.screenshot({ path: path.join(out, name + ".png") });
    if (!target) { failures.push(`${name}: no STOP can be pressed`); return; }
    const hidden = await underFloating();
    if (hidden) failures.push(`${name}: ${hidden} window(s) reach under the floating STOP`);
    const sent = page.waitForRequest(request => request.method() === "POST" && request.url().endsWith("/api/stop-all"), { timeout: 5000 }).then(() => true, () => false);
    await page.touchscreen.tap(target.x, target.y);
    if (!(await sent)) failures.push(`${name}: a tap on the STOP sent nothing`);
  };

  const run = async (width, height, scenario, action, address) => {
    const name = `${width}x${height}-${scenario}`;
    try {
      await page.unroute("**/api/stop-all");
      await page.setViewportSize({ width, height });
      await page.evaluate(() => localStorage.removeItem("hydra_assistant_prefs"));
      await page.goto(origin + address);
      await page.locator("main").waitFor({ timeout: 30000 });
      await page.waitForTimeout(700);
      await action();
      await check(name);
    } catch (error) {
      failures.push(`${name}: the scenario could not be run (${String(error.message ?? error).split("\n")[0]})`);
      await page.screenshot({ path: path.join(out, name + "-error.png") }).catch(() => {});
    }
  };

  for (const [width, height] of SIZES) for (const [scenario, action] of Object.entries(open)) await run(width, height, scenario, action, "/?skipSplash=true");
  // the embedded 3D view of the Android app: no header and no footer
  for (const [width, height] of EMBEDDED_SIZES) {
    await run(width, height, "embedded", async () => {}, "/?hideUI=true&robotId=1");
    await run(width, height, "embedded-stop-report", () => press(page.locator('[data-stop-global], button[title="STOP ALL"]')), "/?hideUI=true&robotId=1");
  }
} finally {
  await browser?.close();
  for (const child of children) try { child.kill(); } catch { /* already gone */ }
  await sleep(500);
  fs.rmSync(work, { recursive: true, force: true });
}

const report = [`checked ${checked} screens, ${failures.length} problem(s)`, ...failures].join("\n");
fs.writeFileSync(path.join(out, "report.txt"), report + "\n");
console.log(report);
console.log(`STOP_VISIBLE=${failures.length ? "FAIL" : "PASS"}`);
process.exitCode = failures.length && !reportOnly ? 1 : 0;
