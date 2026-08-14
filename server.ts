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
import { WebSocketServer, WebSocket } from "ws";

// Bumped whenever the /api/hydra-info or /ws message contract changes in a
// way a remote client (HYDRA-UMC SUITE, the mobile control apps) might need
// to branch on - NOT the same number as package.json's own app version.
const REMOTE_API_VERSION = 1;

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
  function broadcastSettings(payload: any) {
    lastKnownSettings = payload;
    const msg = JSON.stringify({ type: "settings", payload });
    for (const client of wsClients) {
      if (client.readyState === WebSocket.OPEN) client.send(msg);
    }
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

  app.post("/api/settings", (req, res) => {
    const settingsPath = getSettingsPath();
    try {
      fs.writeFileSync(settingsPath, JSON.stringify(req.body, null, 2), "utf-8");
      broadcastSettings(req.body);
      res.json({ success: true });
    } catch (e) {
      console.error("Error writing settings", e);
      res.status(500).json({ error: "Failed to save settings" });
    }
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
    const s = lastKnownSettings;
    res.json({
      product: "HYDRA-UMC STUDIO",
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
      const absoluteFolderPath = path.resolve(dataPath, folderPath);
      
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

  wss.on("connection", (ws) => {
    wsClients.add(ws);
    // New connection immediately gets the current state, same shape as a
    // broadcast - a client (e.g. HYDRA-UMC SUITE, freshly connected to one
    // controller in a swarm) doesn't have to also do a separate REST GET
    // /api/settings just to get its first real payload.
    ws.send(JSON.stringify({ type: "settings", payload: lastKnownSettings }));

    ws.on("message", (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        if (msg && msg.type === "settings" && msg.payload) {
          fs.writeFileSync(getSettingsPath(), JSON.stringify(msg.payload, null, 2), "utf-8");
          broadcastSettings(msg.payload);
        }
      } catch (e) {
        console.error("Malformed WebSocket message", e);
      }
    });

    ws.on("close", () => wsClients.delete(ws));
    ws.on("error", () => wsClients.delete(ws));
  });

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT} (HTTP + WebSocket /ws)`);
  });
}

startServer();
