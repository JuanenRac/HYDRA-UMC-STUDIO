#!/usr/bin/env node
/**
 * Takes the screenshots of the README: Studio in a real browser (headless Microsoft Edge) against a real HYDRA-UMC SERVER started on this computer in a
 * throw-away folder. The server has a made-up administrator and no real robots: Studio shows its built-in sample machines. Nothing real is behind the pictures.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 *
 *   npm run build                                Studio built (dist/); the SERVER built next to it (npm ci && npm run build)
 *   node tools/make_screenshots.mjs              writes images/screenshots/<name>.png at 1920x1080
 *   node tools/make_screenshots.mjs --out DIR    writes them in DIR instead, to look at them before they replace the ones in the repository
 *
 * It needs Edge (the one Windows has) and Playwright, which it takes from e2e/node_modules, or from PLAYWRIGHT_DIR (a folder that has node_modules/@playwright/test).
 * The server listens on port 3000 (the port the Studio preview forwards to): stop whatever uses it first. It takes no mouse or keyboard of the desktop: the
 * browser has no window. Everything it starts is stopped at the end and its folder is deleted.
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
const root = path.resolve(studio, "..");
const serverDir = process.env.HYDRA_UMC_SERVER_DIR ?? path.join(root, "HYDRA-UMC-SERVER");
const playwrightDir = process.env.PLAYWRIGHT_DIR ?? path.join(studio, "e2e");
const require = createRequire(path.join(playwrightDir, "package.json"));
const { chromium } = require("@playwright/test");
const outIndex = process.argv.indexOf("--out");
const out = path.resolve(outIndex > 0 ? process.argv[outIndex + 1] : path.join(studio, "images", "screenshots"));
fs.mkdirSync(out, { recursive: true });

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const portFree = port => new Promise(resolve => { const probe = net.createServer(); probe.once("error", () => resolve(false)); probe.listen(port, "127.0.0.1", () => probe.close(() => resolve(true))); });
const work = fs.mkdtempSync(path.join(os.tmpdir(), "hydra-shots-"));
const children = [];
const start = (command, args, options) => { const child = spawn(command, args, { stdio: "ignore", ...options }); children.push(child); return child; };
const password = crypto.randomBytes(18).toString("base64url");
const studioPort = 5199;
if (!(await portFree(3000)) || !(await portFree(studioPort))) throw new Error(`ports 3000 and ${studioPort} must be free`);
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

  browser = await chromium.launch({ channel: "msedge", headless: true });
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1, locale: "en-US" });
  const page = await context.newPage();
  await page.goto(origin + "/");
  await page.locator("input[type=password]").waitFor({ timeout: 60000 });
  await page.getByPlaceholder("Username").fill("admin");
  await page.locator("input[type=password]").fill(password);
  await page.locator("button[type=submit]").click();
  await page.getByText(/^overview$/i).first().waitFor({ timeout: 30000 });
  const hideBanner = () => page.evaluate(() => { for (const element of document.querySelectorAll("*")) if (element.children.length === 0 && /^Showing sample data/.test(element.textContent ?? "")) element.parentElement?.style.setProperty("visibility", "hidden"); });
  const shot = async (file, action) => { if (action) await action(); await page.waitForTimeout(3500); await hideBanner(); await page.mouse.move(1000, 1075); await page.screenshot({ path: path.join(out, file + ".png") }); console.log("wrote", path.join(out, file + ".png")); };
  const click = text => () => page.locator("button").filter({ hasText: new RegExp(text, "i") }).first().evaluate(element => element.click());

  const group = async (name, item) => { await click(name)(); await page.waitForTimeout(800); await click(item)(); };
  const root = async () => { await click("BACK TO ROOT")(); await page.waitForTimeout(500); };
  await shot("overview", async () => { await page.waitForTimeout(3000); });
  await shot("robot-view", click("Robot A1"));
  await shot("xy-table", () => group("INDUSTRIAL", "^XY TABLE$"));
  await root();
  await shot("flasher-studio", () => group("URTC", "^FLASHER STUDIO$"));
  await shot("tester-center", click("^TESTER CENTER$"));
  await root();
  await shot("safety-limits", () => group("HYDRA-UMC", "^SAFETY LIMITS$"));} finally {
  await browser?.close();
  for (const child of children) try { child.kill(); } catch { /* already gone */ }
  await sleep(500);
  fs.rmSync(work, { recursive: true, force: true });
}
