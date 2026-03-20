import { WebSocketServer } from 'ws';
import { wsAuth } from './auth.js';

let wss = null;

export function setupWebSocket(server) {
  wss = new WebSocketServer({ server });

  wss.on('connection', (ws, req) => {
    // Auth check for non-localhost connections
    if (!wsAuth(ws, req)) {
      ws.close(4401, 'Unauthorized');
      return;
    }

    ws.isAlive = true;
    ws.on('pong', () => { ws.isAlive = true; });

    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data);
        handleMessage(ws, msg);
      } catch {
        // Ignore invalid messages
      }
    });
  });

  // Heartbeat every 30s
  const interval = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (!ws.isAlive) return ws.terminate();
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  wss.on('close', () => clearInterval(interval));
  return wss;
}

const messageHandlers = new Map();

export function onMessage(type, handler) {
  messageHandlers.set(type, handler);
}

function handleMessage(ws, msg) {
  const handler = messageHandlers.get(msg.type);
  if (handler) handler(ws, msg);
}

export function broadcast(type, data) {
  if (!wss) return;
  const msg = JSON.stringify({ type, ...data });
  wss.clients.forEach((client) => {
    if (client.readyState === 1) {
      client.send(msg);
    }
  });
}

export function send(ws, type, data) {
  if (ws.readyState === 1) {
    ws.send(JSON.stringify({ type, ...data }));
  }
}
