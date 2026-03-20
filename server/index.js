import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { networkInterfaces } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import QRCode from 'qrcode';
import { createConnection } from 'node:net';
import { loadConfig, watchConfig, getConfig, getActivePages } from './services/config.js';
import { setupWebSocket, broadcast, onMessage } from './services/ws.js';
import { generateApiKey, getApiKey, setApiKey, authMiddleware } from './services/auth.js';
import configRoutes from './routes/config.js';
import pagesRoutes from './routes/pages.js';
import buttonsRoutes from './routes/buttons.js';
import actionsRoutes from './routes/actions.js';
import profilesRoutes from './routes/profiles.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, '..', 'public');
const indexHtmlPath = path.join(publicDir, 'index.html');

function getLanIP() {
  const nets = networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return 'localhost';
}

function isPortFree(port, host) {
  return new Promise((resolve) => {
    const sock = createConnection({ port, host: host === '0.0.0.0' ? '127.0.0.1' : host });
    sock.once('connect', () => { sock.destroy(); resolve(false); });
    sock.once('error', () => { sock.destroy(); resolve(true); });
  });
}

async function findFreePort(startPort, host, maxAttempts = 20) {
  for (let i = 0; i < maxAttempts; i++) {
    const port = startPort + i;
    if (await isPortFree(port, host)) return port;
  }
  throw new Error(`No free port found in range ${startPort}-${startPort + maxAttempts - 1}`);
}

// Serve index.html with API key injected
function serveIndex(req, res) {
  let html = readFileSync(indexHtmlPath, 'utf-8');
  // Inject API key as a global before app.js loads
  const keyScript = `<script>window.__RTADECK_KEY__=${JSON.stringify(getApiKey() || '')};</script>`;
  html = html.replace('</head>', `${keyScript}\n</head>`);
  res.type('html').send(html);
}

export async function startServer(options = {}) {
  const configDir = options.configDir || process.cwd();
  const config = await loadConfig(configDir);
  const port = options.port || config.settings.port || 3000;
  const host = process.env.RTADECK_HOST || config.settings.host || '127.0.0.1';

  // API key: from env, or generate new one
  const key = process.env.RTADECK_API_KEY || generateApiKey();
  if (process.env.RTADECK_API_KEY) setApiKey(key);

  const app = express();
  app.use(express.json());

  // Static files (CSS, JS, icons) — no auth needed
  app.use(express.static(publicDir, {
    etag: false,
    lastModified: false,
    index: false, // We serve index.html ourselves to inject the key
    setHeaders: (res) => { res.set('Cache-Control', 'no-store'); }
  }));

  // Auth middleware on all /api/ routes
  app.use('/api', authMiddleware);

  // API routes
  app.use(configRoutes);
  app.use(pagesRoutes);
  app.use(buttonsRoutes);
  app.use(actionsRoutes);
  app.use(profilesRoutes);

  // Index: inject API key, serve for / and SPA fallback
  app.get('/', serveIndex);
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api/')) {
      serveIndex(req, res);
    } else {
      next();
    }
  });

  const server = createServer(app);

  // WebSocket
  const wss = setupWebSocket(server);

  // Handle WebSocket messages
  onMessage('button:press', async (ws, msg) => {
    const { getButton } = await import('./services/config.js');
    const { executeAction } = await import('./services/executor.js');
    const result = getButton(msg.buttonId);
    if (result) {
      try {
        const actionResult = await executeAction(result.button.action);
        broadcast('action:result', { buttonId: msg.buttonId, result: actionResult });
      } catch (err) {
        broadcast('action:result', { buttonId: msg.buttonId, result: { ok: false, error: err.message } });
      }
    }
  });

  onMessage('page:switch', (ws, msg) => {
    broadcast('page:switch', { pageId: msg.pageId });
  });

  // Watch config for external changes
  watchConfig((newConfig) => {
    broadcast('config:updated', { config: newConfig });
    console.log('\x1b[33m[rtaDeck]\x1b[0m Config updated externally');
  });

  const actualPort = await findFreePort(port, host);
  const isLan = host === '0.0.0.0';

  return new Promise((resolve) => {
    server.listen(actualPort, host, async () => {
      const ip = getLanIP();
      const lanUrl = `http://${ip}:${actualPort}`;
      const keyParam = `?key=${key}`;

      console.log('');
      console.log('\x1b[36m  ╔══════════════════════════════════════╗\x1b[0m');
      console.log('\x1b[36m  ║\x1b[0m   \x1b[1m\x1b[35mrtaDeck\x1b[0m \x1b[33m- Rule Them All + Deck\x1b[0m   \x1b[36m║\x1b[0m');
      console.log('\x1b[36m  ╚══════════════════════════════════════╝\x1b[0m');
      console.log('');
      if (actualPort !== port) {
        console.log(`  \x1b[33m⚠\x1b[0m  Port ${port} was busy, using \x1b[1m${actualPort}\x1b[0m`);
      }
      console.log(`  \x1b[32m➜\x1b[0m  Local:   \x1b[1mhttp://localhost:${actualPort}\x1b[0m`);
      if (isLan) {
        console.log(`  \x1b[32m➜\x1b[0m  Network: \x1b[1m${lanUrl}\x1b[0m`);
        console.log(`  \x1b[32m➜\x1b[0m  Key:     \x1b[33m${key}\x1b[0m`);
      } else {
        console.log(`  \x1b[90m➜  Network: disabled (set host: "0.0.0.0" in config to enable)\x1b[0m`);
      }
      console.log('');

      if (isLan) {
        try {
          const qr = await QRCode.toString(`${lanUrl}${keyParam}`, { type: 'terminal', small: true });
          console.log('  \x1b[90mScan to open on your phone (key included in URL):\x1b[0m');
          console.log(qr);
        } catch { /* QR generation failed */ }
      }

      const pages = getActivePages();
      console.log(`  \x1b[90mPages: ${pages.length} | Buttons: ${pages.reduce((sum, p) => sum + p.buttons.length, 0)}\x1b[0m`);
      if (isLan) console.log('  \x1b[90mSecurity: API key required for LAN access\x1b[0m');
      console.log('');

      resolve({ server, url: isLan ? lanUrl : `http://localhost:${actualPort}`, port: actualPort, key });
    });
  });
}
