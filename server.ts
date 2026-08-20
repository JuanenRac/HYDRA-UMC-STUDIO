// =============================================================================
// HYDRA-UMC STUDIO - Express Backend and API Server: server.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
// =============================================================================

import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import fs from "fs";
import http from "http";
import os from "os";
import { execSync } from "child_process";
import { WebSocketServer, WebSocket } from "ws";
import { calculateJoints } from "./kinematics";
import Bonjour from 'bonjour-service';
import jwt from 'jsonwebtoken';
import { ensureSeedUser, findUser, verifyPassword, listUsers, createUser, updateUser, deleteUser, type UserRole } from './users';

const JWT_SECRET = "hydra_industrial_secret_2026"; // In production, move to .env

// Bonjour/mDNS service for instant discovery
const bonjour = new Bonjour();
let mdnsService: any = null;

function setupDiscovery(serverName: string) {
  if (mdnsService) mdnsService.stop();
  mdnsService = bonjour.publish({ name: serverName, type: 'hydra', port: 3000 });
  console.log(`[mDNS] Advertising as ${serverName}.local (_hydra._tcp)`);
}

// Log rotation utility
const LOG_FILE = path.join(process.cwd(), "data", "logs", "server.log");
if (!fs.existsSync(path.dirname(LOG_FILE))) fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });

function industrialLog(msg: string) {
  const entry = `[${new Date().toISOString()}] ${msg}\n`;
  console.log(msg);
  fs.appendFileSync(LOG_FILE, entry);
}

// wifi/ethernet: read from /sys/class/net/<iface>/operstate, Linux-only (real
// on a CM5, absent on Windows/macOS dev machines - null there rather than a
// guess). bluetooth: presence of any /sys/class/bluetooth/hci* controller
// with an "up" state file is the closest cheap signal without a native BLE
// dependency. Each check is independently wrapped so one missing interface
// (e.g. no onboard Wi-Fi) doesn't blank out the other two.
function readInterfaceUp(iface: string): boolean | null {
  try {
    const state = fs.readFileSync(`/sys/class/net/${iface}/operstate`, "utf-8").trim();
    return state === "up";
  } catch {
    return null;
  }
}

function readBluetoothUp(): boolean | null {
  try {
    const controllers = fs.readdirSync("/sys/class/bluetooth").filter(n => n.startsWith("hci"));
    if (controllers.length === 0) return null;
    return controllers.some(c => {
      try { return fs.readFileSync(`/sys/class/bluetooth/${c}/../../power/runtime_status`, "utf-8").trim() !== "suspended"; }
      catch { return true; } // controller present but state file layout differs by kernel - assume present means available
    });
  } catch {
    return null;
  }
}

function readNetworkStatus() {
  return {
    wifi: readInterfaceUp("wlan0"),
    ethernet: readInterfaceUp("eth0"),
    bluetooth: readBluetoothUp(),
  };
}

// The real wire shape POST/GET /api/settings and the WS "settings"/"delta"
// payload all use is { settings: SystemSettings, controllers, activeControllerId }
// (see docs/REMOTE_API.md section 2c, src/store.tsx's own POST body) - every
// SystemSettings field (serverName, remoteAccess, modelSubmissions, ...)
// lives ONE LEVEL DEEPER than `controllers`/`activeControllerId`. Reading
// lastKnownSettings.serverName / lastKnownSettings.remoteAccess directly
// (instead of lastKnownSettings.settings.serverName /
// lastKnownSettings.settings.remoteAccess) is always undefined against the
// real payload shape - a trap it's easy to fall into at any call site that
// reads lastKnownSettings (the mDNS name at startup/on every write, and
// this exact remoteAccessAllowed() call), which would silently make the
// per-client Remote Access toggles do nothing (remoteAccessAllowed() would
// always see `settings` as undefined and therefore always return true) and
// make a server rename from Config > Identity never actually update its
// own mDNS advertisement. This helper is the one place that gets it right,
// used everywhere below instead of reaching into either shape directly.
function realSettings(payload: any): any {
  return payload?.settings ?? payload;
}

// Per-client remote-access toggles (Config > Remote Access in the browser
// UI, src/store.tsx's own SystemSettings.remoteAccess) - 3 independent
// toggles (SUITE/Android/iOS) instead of one combined switch, so e.g.
// Android access can be revoked without also blocking SUITE. Each of the 3 real clients sends its
// own `X-Hydra-Client: suite|android|ios` request header (see each
// project's own network client) - a request with NO such header (a plain
// browser tab, curl, or any other unidentified caller) is never gated here,
// since this check only exists to control the 3 named remote apps, not
// this same server's own browser UI (which never sends that header and
// reaches this same route from About.tsx's own version check).
function remoteAccessAllowed(settings: any, clientType: string | undefined): boolean {
  if (clientType !== "suite" && clientType !== "android" && clientType !== "ios") return true;
  const ra = settings?.remoteAccess;
  if (!ra) return true; // no config saved at all yet - matches this feature's own original always-on default
  const specific = ra[clientType];
  if (specific !== undefined) return specific !== false;
  return ra.enabled !== false; // legacy singular toggle, only consulted if this client's own flag was never set
}

// Bumped whenever the /api/hydra-info or /ws message contract changes in a
// way a remote client (HYDRA-UMC SUITE, the mobile control apps) might need
// to branch on - NOT the same number as package.json's own app version.
const REMOTE_API_VERSION = 1;

// Middleware to verify JWT token - the decoded payload now carries
// {username, role}, not just {username}, so requireAdmin below can gate
// the routes an "operator" account shouldn't reach.
function authenticate(req: any, res: any, next: any) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: "Access denied: No token provided" });

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return res.status(403).json({ error: "Access denied: Invalid token" });
    req.user = user;
    next();
  });
}

/** Chain after authenticate() - rejects anyone whose token role isn't "admin".
 * Gates POST /api/settings (full-tree overwrite) and every /api/users route -
 * an "operator" account can still drive robots via the atomic
 * /api/robot/:id/command endpoint, just can't touch global config or accounts. */
function requireAdmin(req: any, res: any, next: any) {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ error: "Access denied: admin privileges required" });
  }
  next();
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "50mb" }));

  // Create data directory if it doesn't exist
  const dataPath = path.join(process.cwd(), "data");
  if (!fs.existsSync(dataPath)) {
    fs.mkdirSync(dataPath, { recursive: true });
  }

  // First-ever start seeds data/users.json with a single admin/admin
  // account - see users.ts's own header comment for why this replaced the
  // old hardcoded "demo"/"demo" check below.
  ensureSeedUser();

  const getSettingsPath = () => {
    return path.join(dataPath, "settings.json");
  };

  let pkgVersion = "0.0.0";
  try {
    pkgVersion = JSON.parse(fs.readFileSync(path.join(process.cwd(), "package.json"), "utf-8")).version || pkgVersion;
  } catch {
    // package.json missing/unreadable - keep the placeholder version rather than fail startup over it
  }

  // In-memory mirror of the last settings write, kept for /api/hydra-info's
  // own cheap robot/controller counts (see that route below) and as the
  // payload broadcastSettings() sends to newly-(re)connecting WebSocket
  // clients. Seeded from disk at startup so a remote client scanning right
  // after a server restart still sees real counts, not zeros.
  let lastKnownSettings: any = {};
  try {
    const settingsPath = getSettingsPath();
    if (fs.existsSync(settingsPath)) {
      lastKnownSettings = JSON.parse(fs.readFileSync(settingsPath, "utf-8"));
    }
  } catch {
    // corrupt/unreadable settings.json - start from an empty object rather than crash the server
  }

  // Every open WebSocket client (the browser UI itself, plus any remote
  // clients - HYDRA-UMC SUITE, the mobile control apps) - broadcastSettings()
  // pushes to all of them on every write, whichever path (REST POST or a
  // WS "settings" message, see the WebSocketServer setup below) produced
  // it. This is what makes "modify a running job from SUITE" actually
  // show up live in an already-open browser tab instead of only on that
  // tab's own next 500ms debounced re-fetch (which never happens today -
  // the browser client only fetches /api/settings once, on mount).
  const wsClients = new Set<WebSocket>();
  function broadcastSettings(payload: any, deltaOnly: boolean = false, originator?: WebSocket) {
    lastKnownSettings = payload;
    const type = deltaOnly ? "delta" : "settings";
    const msg = JSON.stringify({ type, payload });
    for (const client of wsClients) {
      if (client !== originator && client.readyState === WebSocket.OPEN) {
        client.send(msg);
      }
    }
    const newServerName = realSettings(payload)?.serverName;
    if (newServerName) setupDiscovery(newServerName);
  }

  // Serve static data files (like WORKS/) at the root level - but never
  // settings.json itself, which holds controller IPs, CAN-OTA config, and
  // full per-robot state and has no business being reachable by a plain
  // unauthenticated GET. Client code only ever fetches WORKS/*, never
  // settings.json directly (it goes through /api/settings below).
  app.use((req, res, next) => {
    if (req.path === "/settings.json" || req.path === "/users.json") {
      res.status(404).end();
      return;
    }
    next();
  });
  app.use(express.static(dataPath));

  app.post("/api/login", (req, res) => {
    const { username, password } = req.body || {};
    if (typeof username !== "string" || typeof password !== "string") {
      return res.status(400).json({ error: "username and password required" });
    }
    const user = findUser(username);
    if (!user || !verifyPassword(password, user.passwordHash)) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    // 30 days, not 24h - the session should stay signed in for a good while
    // rather than re-prompt daily; this is a trusted-LAN tool, not a public
    // multi-tenant service, so a long-lived token doesn't change the real
    // security posture much either way.
    const token = jwt.sign({ username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ success: true, token, role: user.role });
  });

  // Account management - admin-only (requireAdmin, chained after
  // authenticate), backed by the users.ts module - lets an admin
  // rename/re-password their own account from Config > Users
  // instead of the account being permanently stuck as "admin"/"admin", and
  // create additional lower-privilege "operator" accounts for day-to-day
  // robot operation without exposing settings writes or user management.
  app.get("/api/users", authenticate, requireAdmin, (req, res) => {
    res.json({ users: listUsers() });
  });

  app.post("/api/users", authenticate, requireAdmin, (req, res) => {
    const { username, password, role } = req.body || {};
    const safeRole: UserRole = role === "operator" ? "operator" : "admin";
    if (typeof username !== "string" || typeof password !== "string") {
      return res.status(400).json({ error: "username and password required" });
    }
    const result = createUser(username, password, safeRole);
    if (!result.ok) return res.status(400).json({ error: result.error });
    res.json({ success: true });
  });

  app.put("/api/users/:username", authenticate, requireAdmin, (req, res) => {
    const { newUsername, password, role } = req.body || {};
    const safeRole: UserRole | undefined = role === "operator" || role === "admin" ? role : undefined;
    const result = updateUser(req.params.username, { newUsername, password, role: safeRole });
    if (!result.ok) return res.status(400).json({ error: result.error });
    res.json({ success: true });
  });

  app.delete("/api/users/:username", authenticate, requireAdmin, (req, res) => {
    const result = deleteUser(req.params.username);
    if (!result.ok) return res.status(400).json({ error: result.error });
    res.json({ success: true });
  });

  // API routes FIRST
  app.get("/api/settings", (req, res) => {
    const settingsPath = getSettingsPath();
    try {
      if (fs.existsSync(settingsPath)) {
        const data = fs.readFileSync(settingsPath, "utf-8");
        res.json(JSON.parse(data));
      } else {
        res.json({});
      }
    } catch (e) {
      console.error("Error reading settings", e);
      res.status(500).json({ error: "Failed to read settings" });
    }
  });

  app.post("/api/settings", authenticate, requireAdmin, async (req, res) => {
    const settingsPath = getSettingsPath();
    try {
      const payload = req.body;
      await fs.promises.writeFile(settingsPath, JSON.stringify(payload, null, 2), "utf-8");
      broadcastSettings(payload);
      res.json({ success: true });
    } catch (e) {
      console.error("Error writing settings", e);
      res.status(500).json({ error: "Failed to save settings" });
    }
  });

  // Direct Atomic API for Industrial Control
  app.post("/api/robot/:id/command", authenticate, async (req, res) => {
    const robotId = parseInt(req.params.id);
    const { command, params } = req.body;

    if (!lastKnownSettings.controllers) {
      return res.status(400).json({ error: "No settings loaded" });
    }

    let targetRobot: any = null;
    lastKnownSettings.controllers.forEach((c: any) => {
      const r = c.robots?.find((r: any) => r.id === robotId);
      if (r) targetRobot = r;
    });

    if (!targetRobot) {
      return res.status(404).json({ error: "Robot not found" });
    }

    // Identify all robots that should receive this command (Self + Combined)
    const affectedIds = [robotId, ...(targetRobot.combinedWith || [])];

    lastKnownSettings.controllers.forEach((controller: any) => {
      controller.robots?.forEach((robot: any) => {
        if (affectedIds.includes(robot.id)) {
          switch (command) {
            case "stop":
              robot.playbackState = { ...robot.playbackState, isPlaying: false, activeStep: -1, isPaused: false, paused: false };
              break;
            case "play":
              robot.playbackState = { ...robot.playbackState, isPlaying: true, activeStep: 0, isPaused: false, paused: false };
              break;
            case "pause":
              const newPauseState = !robot.playbackState.isPaused;
              robot.playbackState = { ...robot.playbackState, isPaused: newPauseState, paused: newPauseState };
              break;
            case "jog":
              if (params?.axis && params?.amount) {
                const target = params.target || "robot";
                if (target === "robot") {
                  robot.pos[params.axis] += params.amount;
                  const calculated = calculateJoints(robot.pos);
                  robot.joints = calculated;
                } else if (target === "xytable" && robot.xyTable) {
                  const axis = params.axis === "x" ? "x" : (params.axis === "y" ? "y" : null);
                  if (axis) robot.xyTable.pos[axis] += params.amount;
                }
              }
              break;
            case "tool":
              if (params?.tool) robot.tool = params.tool;
              break;
            case "valve":
              if (typeof params?.index === "number" && typeof params?.state === "boolean") {
                if (!robot.valves) robot.valves = [false, false];
                robot.valves[params.index] = params.state;
              }
              break;
            case "pump":
              if (typeof params?.index === "number" && typeof params?.state === "boolean") {
                if (!robot.pumps) robot.pumps = [false, false];
                robot.pumps[params.index] = params.state;
              }
              break;
            case "speed":
              if (typeof params?.speed === "number") {
                if (!robot.playbackState) robot.playbackState = { isPlaying: false, activeStep: 0, speed: 100 };
                robot.playbackState.speed = params.speed;
              }
              if (typeof params?.acceleration === "number") {
                if (!robot.playbackState) robot.playbackState = { isPlaying: false, activeStep: 0, speed: 100 };
                robot.playbackState.acceleration = params.acceleration;
              }
              break;
            // Lets a remote client (the Android app's own Camera
            // screen) toggle a robot's vision system without a full
            // POST /api/settings overwrite - mirrors the same 2 fields
            // src/Dashboard.tsx's OverviewPanel already writes locally
            // (visionEnabled on the robot, connected on its paired camera entry).
            case "vision":
              if (typeof params?.enabled === "boolean") {
                robot.visionEnabled = params.enabled;
                const cam = (controller.cameras || []).find((c: any) => c.assignedRobotId === robot.id || c.id === robot.id);
                if (cam) cam.connected = params.enabled;
              }
              break;
          }
        }
      });
    });

    industrialLog(`Command: ${command} on Robot ${robotId}`);

    await fs.promises.writeFile(getSettingsPath(), JSON.stringify(lastKnownSettings, null, 2), "utf-8");
    broadcastSettings(lastKnownSettings, true); // Use Delta-Sync for commands
    res.json({ success: true, affectedCount: affectedIds.length });
  });

  // Industrial Native Streaming Server (MJPEG Proxy Placeholder)
  // Allows the Android app to show video directly from the CM5
  app.get("/api/camera/:id/stream", (req, res) => {
    res.writeHead(200, {
      'Content-Type': 'multipart/x-mixed-replace; boundary=--boundary',
      'Cache-Control': 'no-cache',
      'Connection': 'close',
      'Pragma': 'no-cache'
    });

    // In a real CM5 implementation, this would pipe from a libcamera or ffmpeg process
    // For now, we send a "Camera Offline" placeholder frame periodically
    const interval = setInterval(() => {
      const frame = Buffer.from("placeholder_frame_data");
      res.write(`--boundary\r\nContent-Type: image/jpeg\r\nContent-Length: ${frame.length}\r\n\r\n`);
      res.write(frame);
      res.write("\r\n");
    }, 100);

    req.on('close', () => clearInterval(interval));
  });

  // System Metrics API for industrial monitoring - powers the Overview
  // footer's CPU/memory/temp/network readout (Dashboard.tsx StatusFooter).
  app.get("/api/system/metrics", (req, res) => {
    // Real read on a CM5/Pi host; throws (command not found) on any other OS,
    // in which case we fall back to a clearly-mocked value rather than lie.
    let temp: number | null = null;
    let tempIsReal = false;
    try {
      // stdio explicit: execSync's default inherits the child's stderr straight to
      // this process' own console - without it, "vcgencmd not found" on any non-Pi
      // dev machine (Windows/macOS/a plain Linux desktop) would print to every
      // `npm run dev` terminal on every single poll, not just fail silently here.
      const out = execSync("vcgencmd measure_temp", { timeout: 500, stdio: ["ignore", "pipe", "ignore"] }).toString();
      const match = out.match(/temp=([\d.]+)/);
      if (match) { temp = parseFloat(match[1]); tempIsReal = true; }
    } catch {
      temp = 45 + Math.random() * 10; // Mock - vcgencmd isn't available on this host (not a Pi, or dev machine)
    }

    res.json({
      cpu_load: Math.round(os.loadavg()[0] * 10), // simplified load
      memory_usage: Math.round((1 - os.freemem() / os.totalmem()) * 100),
      temp,
      temp_is_real: tempIsReal,
      uptime: Math.round(process.uptime()),
      network: readNetworkStatus(),
    });
  });

  // Discovery/identity endpoint - what a remote client (HYDRA-UMC SUITE
  // scanning a subnet for controllers, or one of the mobile control apps)
  // hits first to confirm a given host/IP is actually running HYDRA-UMC
  // STUDIO before trying to talk the real API to it. Deliberately cheap
  // (no settings.json read) so a swarm scan across many IPs stays fast -
  // robot/controller counts come from the same in-memory cache the
  // WebSocket broadcast path already maintains, not a fresh disk read
  // per request.
  app.get("/api/hydra-info", (req, res) => {
    // Real enable/disable gate (Config > Remote Access in the browser UI,
    // src/store.tsx's own SystemSettings.remoteAccess) - per-client (see
    // remoteAccessAllowed()'s own header comment above for
    // the X-Hydra-Client header each real client sends). When disabled for
    // that client, this endpoint responds 404 - the same as a plain "not
    // running HYDRA-UMC STUDIO" host looks like to a scanning client (each
    // client's own discovery code already treats a non-200 as "not
    // found", no client-side change needed beyond sending the header) -
    // the server becomes undiscoverable/unidentifiable to THAT app's own
    // scan, without touching GET/POST /api/settings or /ws (this SAME
    // browser tab's own connection to its own server also goes through
    // those, so gating them would break the core web UI, not just remote
    // apps - see that settings field's own comment in store.tsx).
    if (!remoteAccessAllowed(realSettings(lastKnownSettings), req.headers["x-hydra-client"] as string | undefined)) {
      res.status(404).end();
      return;
    }
    const s = lastKnownSettings;
    res.json({
      product: realSettings(lastKnownSettings)?.serverName || "HYDRA-UMC STUDIO",
      remoteApiVersion: REMOTE_API_VERSION,
      appVersion: pkgVersion,
      hostname: os.hostname(),
      controllerCount: Array.isArray(s?.controllers) ? s.controllers.length : 0,
      robotCount: Array.isArray(s?.controllers)
        ? s.controllers.reduce((n: number, c: any) => n + (Array.isArray(c.robots) ? c.robots.length : 0), 0)
        : 0,
      uptimeSeconds: Math.round(process.uptime()),
    });
  });

  // authenticate (not requireAdmin): saving/loading a robot's own
  // trajectory files is an operational action, same tier as POST
  // /api/robot/:id/command below - it writes to disk so it must not be
  // reachable by a fully anonymous caller, but an "operator" account
  // shouldn't need admin rights just to save a work file. This route was
  // previously missing ANY auth check at all (every other disk-writing
  // route in this file requires at least authenticate) - see
  // src/components/AuthGate.tsx's own header comment, which already
  // enumerated POST /api/settings and POST /api/robot/:id/command as the
  // writes gated behind login and never mentioned this one.
  app.post("/api/upload-work", authenticate, (req, res) => {
    try {
      const { folderPath, fileName, content } = req.body || {};
      if (typeof folderPath !== "string" || typeof fileName !== "string") {
        return res.status(400).json({ error: "folderPath and fileName required" });
      }

      // Sanitize folderPath to prevent Path Traversal
      const sanitizedFolderPath = folderPath.replace(/\.\./g, "");
      const absoluteFolderPath = path.resolve(dataPath, sanitizedFolderPath);

      if (!absoluteFolderPath.startsWith(dataPath)) {
        return res.status(403).json({ error: "Access denied: Path traversal detected" });
      }

      // fileName only ever needed the SAME guard folderPath gets above, but
      // never got it - it was joined into the write path as-is, so a value
      // like "../../../../etc/cron.d/evil" would walk the write target back
      // out of absoluteFolderPath (already validated to sit inside dataPath)
      // and out of dataPath entirely, the exact path-traversal risk the
      // folderPath check exists to stop. path.basename() strips any
      // directory component - "../x", "/etc/passwd", and embedded
      // separators all collapse to a bare filename that can only land
      // inside the already-validated folder.
      const safeFileName = path.basename(fileName);
      if (!safeFileName || safeFileName === "." || safeFileName === "..") {
        return res.status(400).json({ error: "Invalid file name" });
      }

      if (!fs.existsSync(absoluteFolderPath)) {
        fs.mkdirSync(absoluteFolderPath, { recursive: true });
      }

      const filePath = path.join(absoluteFolderPath, safeFileName);
      fs.writeFileSync(filePath, JSON.stringify(content, null, 2));

      // update index.json
      const indexPath = path.join(absoluteFolderPath, "index.json");
      let index: string[] = [];
      if (fs.existsSync(indexPath)) {
        index = JSON.parse(fs.readFileSync(indexPath, "utf-8"));
      }
      if (!index.includes(safeFileName)) {
        index.push(safeFileName);
        fs.writeFileSync(indexPath, JSON.stringify(index, null, 2));
      }

      res.json({ success: true });
    } catch (e: any) {
      console.error("Error uploading work", e);
      res.status(500).json({ error: e.message || "Error saving file" });
    }
  });

  // =========================================================================
  // Model submissions - the server side of HYDRA-UMC-EDITOR-URDF
  // (github.com/JuanenRac/HYDRA-UMC-EDITOR-URDF). That project
  // is a graphical URDF creator/editor meant to push a finished robot/
  // machine (3D meshes + kinematics) straight into this server's own
  // catalog instead of the manual "hand-add files to public/models/" pass
  // every robot in this ecosystem's own history got so far. Off by default
  // (settings.modelSubmissions.enabled) - an admin opts in from Config,
  // same gate philosophy as remoteAccess above: nothing lands on disk
  // just because a client asked.
  // =========================================================================
  const MODEL_SUBMISSIONS_INDEX_PATH = () => path.join(dataPath, "model_submissions.json");

  function readModelSubmissionsIndex(): any[] {
    try {
      const raw = fs.readFileSync(MODEL_SUBMISSIONS_INDEX_PATH(), "utf-8");
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function writeModelSubmissionsIndex(entries: any[]): void {
    fs.writeFileSync(MODEL_SUBMISSIONS_INDEX_PATH(), JSON.stringify(entries, null, 2), "utf-8");
  }

  function slugify(name: string): string {
    const slug = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    return slug || "model";
  }

  // Same path-traversal guard POST /api/upload-work already applies above,
  // reused here for both the submission folder itself and every individual
  // mesh filename inside it (a malicious/malformed filename like
  // "../../../etc/passwd" must not escape the model's own folder either).
  function resolveWithinDataDir(...segments: string[]): string | null {
    const sanitized = segments.map(s => String(s).replace(/\.\./g, ""));
    const resolved = path.resolve(dataPath, ...sanitized);
    return resolved.startsWith(dataPath) ? resolved : null;
  }

  app.post("/api/models/submit", authenticate, requireAdmin, (req, res) => {
    try {
      const submissions = realSettings(lastKnownSettings)?.modelSubmissions;
      if (!submissions?.enabled) {
        return res.status(403).json({ error: "This server isn't accepting model submissions right now - enable it from Config > Models first." });
      }
      const { name, category, urdfFilename, urdfXml, meshFiles, overwrite } = req.body || {};
      if (typeof name !== "string" || !name.trim() || typeof category !== "string" || typeof urdfXml !== "string") {
        return res.status(400).json({ error: "name, category, and urdfXml are required" });
      }
      const slug = slugify(name);
      const destFolderRel = String(submissions.destinationFolder || "models/submitted");
      const destFolder = resolveWithinDataDir(destFolderRel, category, slug);
      if (!destFolder) {
        return res.status(403).json({ error: "Access denied: path traversal detected" });
      }

      const index = readModelSubmissionsIndex();
      const existing = index.find((e: any) => e.slug === slug && e.category === category);
      if (existing && !overwrite) {
        return res.status(409).json({ error: `A model named "${slug}" already exists in category "${category}" - resubmit with overwrite:true to replace it, or pick a different name.`, slug });
      }

      fs.mkdirSync(destFolder, { recursive: true });
      fs.writeFileSync(path.join(destFolder, urdfFilename || `${slug}.urdf`), urdfXml, "utf-8");

      const meshDir = path.join(destFolder, "meshes");
      if (Array.isArray(meshFiles) && meshFiles.length > 0) {
        fs.mkdirSync(meshDir, { recursive: true });
        for (const mf of meshFiles) {
          if (!mf || typeof mf.filename !== "string" || typeof mf.base64 !== "string") continue;
          const meshPath = resolveWithinDataDir(destFolderRel, category, slug, "meshes", mf.filename);
          if (!meshPath) continue; // silently skip a traversal attempt in one file rather than aborting the whole submission
          fs.writeFileSync(meshPath, Buffer.from(mf.base64, "base64"));
        }
      }

      const entry = { slug, name: name.trim(), category, submittedAt: new Date().toISOString(), folder: path.relative(dataPath, destFolder).split(path.sep).join("/") };
      const nextIndex = existing ? index.map((e: any) => (e.slug === slug && e.category === category ? entry : e)) : [...index, entry];
      writeModelSubmissionsIndex(nextIndex);

      res.json({ success: true, slug });
    } catch (e: any) {
      console.error("Error accepting model submission", e);
      res.status(500).json({ error: e.message || "Error saving submitted model" });
    }
  });

  app.get("/api/models", (req, res) => {
    res.json({ models: readModelSubmissionsIndex() });
  });

  app.get("/api/models/:category/:slug/download", (req, res) => {
    const submissions = realSettings(lastKnownSettings)?.modelSubmissions;
    if (!submissions?.enabled) {
      return res.status(403).json({ error: "This server isn't accepting model submissions right now - enable it from Config > Models first." });
    }
    const { category, slug } = req.params;
    const index = readModelSubmissionsIndex();
    const entry = index.find((e: any) => e.slug === slug && e.category === category);
    if (!entry) {
      return res.status(404).json({ error: "No such submitted model" });
    }
    const folder = resolveWithinDataDir(entry.folder);
    if (!folder || !fs.existsSync(folder)) {
      return res.status(404).json({ error: "Submitted model is recorded in the index but its files are missing on disk" });
    }
    try {
      const files = fs.readdirSync(folder);
      const urdfFile = files.find(f => f.endsWith(".urdf"));
      const urdfXml = urdfFile ? fs.readFileSync(path.join(folder, urdfFile), "utf-8") : "";
      const meshDir = path.join(folder, "meshes");
      const meshFiles = fs.existsSync(meshDir)
        ? fs.readdirSync(meshDir).map(filename => ({ filename, base64: fs.readFileSync(path.join(meshDir, filename)).toString("base64") }))
        : [];
      res.json({ slug, name: entry.name, category, urdfFilename: urdfFile || "", urdfXml, meshFiles });
    } catch (e: any) {
      console.error("Error reading submitted model", e);
      res.status(500).json({ error: e.message || "Error reading submitted model" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*all", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Wrapping express in a plain http.Server (instead of app.listen's own
  // implicit one) is what lets the WebSocketServer below share the same
  // port - a remote client only has to know one endpoint (host:3000) for
  // both the REST API and live sync, not a second port to discover/open
  // through a firewall separately.
  const httpServer = http.createServer(app);
  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });

  wss.on("connection", (ws, req) => {
    // Extract token from query string (?token=...)
    const url = new URL(req.url || "", "http://localhost");
    const token = url.searchParams.get("token");

    if (!token) {
      ws.send(JSON.stringify({ error: "Access denied: No token provided" }));
      setTimeout(() => ws.close(1008, "Access denied: No token provided"), 100);
      return;
    }

    jwt.verify(token, JWT_SECRET, (err: any, decoded: any) => {
      if (err) {
        ws.send(JSON.stringify({ error: "Access denied: Invalid token" }));
        setTimeout(() => ws.close(1008, "Access denied: Invalid token"), 100);
        return;
      }

      wsClients.add(ws);
      // New connection immediately gets the current state, same shape as a
      // broadcast - a client (e.g. HYDRA-UMC SUITE, freshly connected to one
      // controller in a swarm) doesn't have to also do a separate REST GET
      // /api/settings just to get its first real payload.
      ws.send(JSON.stringify({ type: "settings", payload: lastKnownSettings }));

      ws.on("message", async (raw) => {
        try {
          const msg = JSON.parse(raw.toString());
          if (msg && msg.type === "settings" && msg.payload) {
            // This WS path is a second route to the exact
            // same full-tree overwrite the REST POST /api/settings performs,
            // and jwt.verify() above only checks
            // signature validity - not role - so without this check an
            // "operator" token could just open a WebSocket and send this
            // message to do the one thing requireAdmin exists to stop it
            // from doing over REST. Same admin-only rule, enforced here too.
            if (decoded?.role !== "admin") {
              ws.send(JSON.stringify({ error: "Access denied: admin privileges required" }));
              return;
            }
            await fs.promises.writeFile(getSettingsPath(), JSON.stringify(msg.payload, null, 2), "utf-8");
            broadcastSettings(msg.payload, false, ws); // Skip originator to avoid echo
          }
        } catch (e) {
          console.error("Malformed WebSocket message", e);
        }
      });

      ws.on("close", () => wsClients.delete(ws));
      ws.on("error", () => wsClients.delete(ws));
    });
  });

  httpServer.listen(PORT, "0.0.0.0", () => {
    const serverName = realSettings(lastKnownSettings)?.serverName || "HYDRA-UMC STUDIO";
    setupDiscovery(serverName);
    industrialLog(`=================================================`);
    industrialLog(` HYDRA-UMC SERVER: ${serverName}`);
    industrialLog(` STATUS: Running on port ${PORT}`);
    industrialLog(` DISCOVERY: Active (mDNS + HTTP + WS)`);
    industrialLog(`=================================================`);
  });
}

startServer();
