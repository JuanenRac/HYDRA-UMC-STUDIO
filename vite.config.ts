import { defineConfig } from 'vite'
import type { ViteDevServer } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import fs from 'fs'
import path from 'path'
import type { IncomingMessage, ServerResponse } from 'http'

const worksApiPlugin = () => ({
  name: 'works-api',
  configureServer(server: ViteDevServer) {
    server.middlewares.use(async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
      
      if (req.url === '/api/save-settings' && req.method === 'POST') {
        let body = '';
        req.on('data', (chunk: any) => { body += chunk.toString(); });
        req.on('end', () => {
          try {
            const absoluteFolderPath = path.resolve(process.cwd(), 'public');
            if (!fs.existsSync(absoluteFolderPath)) {
              fs.mkdirSync(absoluteFolderPath, { recursive: true });
            }
            const filePath = path.join(absoluteFolderPath, 'settings.json');
            fs.writeFileSync(filePath, JSON.stringify(JSON.parse(body), null, 2));
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true }));
          } catch (e: any) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: e.message || 'Error saving file' }));
          }
        });
        return;
      }
      if (req.url === '/api/upload-work' && req.method === 'POST') {
        let body = '';
        req.on('data', (chunk: any) => {
          body += chunk.toString();
        });
        req.on('end', () => {
          try {
            const { folderPath, fileName, content } = JSON.parse(body);
            const absoluteFolderPath = path.resolve(process.cwd(), 'public', folderPath);
            if (!fs.existsSync(absoluteFolderPath)) {
              fs.mkdirSync(absoluteFolderPath, { recursive: true });
            }
            const filePath = path.join(absoluteFolderPath, fileName);
            fs.writeFileSync(filePath, JSON.stringify(content, null, 2));

            // update index.json
            const indexPath = path.join(absoluteFolderPath, 'index.json');
            let index: string[] = [];
            if (fs.existsSync(indexPath)) {
              index = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
            }
            if (!index.includes(fileName)) {
              index.push(fileName);
              fs.writeFileSync(indexPath, JSON.stringify(index, null, 2));
            }

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true }));
          } catch (e: any) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: e.message || 'Error saving file' }));
          }
        });
        return;
      }
      next();
    });
  }
})

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), worksApiPlugin()],
  server: {
    host: '0.0.0.0',
    port: 3000,
    strictPort: true,
  }
})
