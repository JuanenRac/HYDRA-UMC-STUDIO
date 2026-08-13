// =============================================================================
// HYDRA-UMC STUDIO - Express Backend and API Server: server.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
// =============================================================================

import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import fs from "fs";

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

  // Serve static data files (like WORKS/) at the root level
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
      res.json({ success: true });
    } catch (e) {
      console.error("Error writing settings", e);
      res.status(500).json({ error: "Failed to save settings" });
    }
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

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
