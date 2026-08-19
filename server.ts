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

// Bumped whenever the /api/hydra-info or /ws message contract changes in a
// way a remote client (HYDRA-UMC SUITE, the mobile control apps) might need
// to branch on - NOT the same number as package.json's own app version.
const REMOTE_API_VERSION = 1;

// Middleware to verify JWT token
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

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "50mb" }));

  // Create data directory if it doesn't exist
  const dataPath = path.join(process.cwd(), "data");
  if (!fs.existsSync(dataPath)) {
    fs.mkdirSync(dataPath, { recursive: true });
  }

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
    if (payload.serverName) setupDiscovery(payload.serverName);
  }

  // Serve static data files (like WORKS/) at the root level - but never
  // settings.json itself, which holds controller IPs, CAN-OTA config, and
  // full per-robot state and has no business being reachable by a plain
  // unauthenticated GET. Client code only ever fetches WORKS/*, never
  // settings.json directly (it goes through /api/settings below).
  app.use((req, res, next) => {
    if (req.path === "/settings.json") {
      res.status(404).end();
      return;
    }
    next();
  });
  app.use(express.static(dataPath));

  app.post("/api/login", (req, res) => {
    const { username, password } = req.body;
    // Industrial logic: for now we use demo/demo, but with JWT overhead.
    // 30 days, not 24h - the project owner explicitly wants this session to
    // stay signed in "a good while" (2026-08-19) rather than re-prompt daily;
    // this is a trusted-LAN tool with a single hardcoded demo account, not a
    // public multi-tenant service, so a long-lived token doesn't change the
    // real security posture much either way.
    if (username === "demo" && password === "demo") {
      const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '30d' });
      res.json({ success: true, token });
    } else {
      res.status(401).json({ error: "Invalid credentials" });
    }
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

  app.post("/api/settings", authenticate, async (req, res) => {
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
    // Real enable/disable gate (Settings -> Integrations -> "Remote App
    // Access" in the browser UI, src/store.tsx's own SystemSettings.remoteAccess) -
    // defaults to true (undefined settings.remoteAccess treated the same
    // as enabled, so an existing settings.json predating this feature
    // doesn't silently stop working for anyone already using SUITE).
    // When disabled, this endpoint responds 404 - the same as a plain
    // "not running HYDRA-UMC STUDIO" host looks like to a scanning
    // client (HYDRA-UMC SUITE's own discovery.py's own probe_host()
    // already treats a non-200 as "not found", no client-side change
    // needed) - the server becomes undiscoverable/unidentifiable to a
    // remote app's own scan, without touching GET/POST /api/settings or
    // /ws (this SAME browser tab's own connection to its own server also
    // goes through those, so gating them would break the core web UI,
    // not just remote apps - see that settings field's own comment in
    // store.tsx for the full reasoning).
    if (lastKnownSettings?.remoteAccess?.enabled === false) {
      res.status(404).end();
      return;
    }
    const s = lastKnownSettings;
    res.json({
      product: lastKnownSettings.serverName || "HYDRA-UMC STUDIO",
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

  app.post("/api/upload-work", (req, res) => {
    try {
      const { folderPath, fileName, content } = req.body;

      // Sanitize folderPath to prevent Path Traversal
      const sanitizedFolderPath = folderPath.replace(/\.\./g, "");
      const absoluteFolderPath = path.resolve(dataPath, sanitizedFolderPath);

      if (!absoluteFolderPath.startsWith(dataPath)) {
        return res.status(403).json({ error: "Access denied: Path traversal detected" });
      }
      
      if (!fs.existsSync(absoluteFolderPath)) {
        fs.mkdirSync(absoluteFolderPath, { recursive: true });
      }
      
      const filePath = path.join(absoluteFolderPath, fileName);
      fs.writeFileSync(filePath, JSON.stringify(content, null, 2));
      
      // update index.json
      const indexPath = path.join(absoluteFolderPath, "index.json");
      let index: string[] = [];
      if (fs.existsSync(indexPath)) {
        index = JSON.parse(fs.readFileSync(indexPath, "utf-8"));
      }
      if (!index.includes(fileName)) {
        index.push(fileName);
        fs.writeFileSync(indexPath, JSON.stringify(index, null, 2));
      }
      
      res.json({ success: true });
    } catch (e: any) {
      console.error("Error uploading work", e);
      res.status(500).json({ error: e.message || "Error saving file" });
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

    jwt.verify(token, JWT_SECRET, (err: any) => {
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
    const serverName = lastKnownSettings.serverName || "HYDRA-UMC STUDIO";
    setupDiscovery(serverName);
    industrialLog(`=================================================`);
    industrialLog(` HYDRA-UMC SERVER: ${serverName}`);
    industrialLog(` STATUS: Running on port ${PORT}`);
    industrialLog(` DISCOVERY: Active (mDNS + HTTP + WS)`);
    industrialLog(`=================================================`);
  });
}

startServer();
