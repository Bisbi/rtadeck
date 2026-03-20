import { randomBytes } from 'node:crypto';

let apiKey = null;

export function generateApiKey() {
  apiKey = randomBytes(24).toString('base64url');
  return apiKey;
}

export function getApiKey() {
  return apiKey;
}

// Set key from env or config (for Docker/persistent setups)
export function setApiKey(key) {
  apiKey = key;
}

// Express middleware: check API key on all /api/ routes
// Localhost (127.0.0.1 / ::1) is trusted and skips auth
export function authMiddleware(req, res, next) {
  if (!apiKey) return next(); // No key set = auth disabled

  // Trust localhost connections (same machine)
  const ip = req.ip || req.connection?.remoteAddress || '';
  if (isLocalhost(ip)) return next();

  // Check header or query param
  const provided = req.headers['x-api-key'] || req.query.key;
  if (provided === apiKey) return next();

  res.status(401).json({ error: 'Unauthorized. Provide X-API-Key header or ?key= param.' });
}

// WebSocket auth: first message must contain the key (for non-localhost)
export function wsAuth(ws, req) {
  const ip = req.socket?.remoteAddress || '';
  if (isLocalhost(ip)) return true;

  const url = new URL(req.url, 'http://localhost');
  const key = url.searchParams.get('key');
  return key === apiKey;
}

function isLocalhost(ip) {
  return ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1';
}
