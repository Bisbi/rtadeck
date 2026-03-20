// REST API helpers
const BASE = '';

// Read API key injected by server or from URL params (for phone access via QR)
const API_KEY = window.__RTADECK_KEY__ || new URLSearchParams(location.search).get('key') || '';

export async function fetchJSON(url, options = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (API_KEY) headers['X-API-Key'] = API_KEY;

  const res = await fetch(`${BASE}${url}`, {
    headers,
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  if (res.status === 204) return null;
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export const api = {
  getConfig: () => fetchJSON('/api/config'),
  putConfig: (config) => fetchJSON('/api/config', { method: 'PUT', body: config }),
  getPages: () => fetchJSON('/api/pages'),
  getPage: (id) => fetchJSON(`/api/pages/${id}`),
  createPage: (page) => fetchJSON('/api/pages', { method: 'POST', body: page }),
  updatePage: (id, data) => fetchJSON(`/api/pages/${id}`, { method: 'PUT', body: data }),
  deletePage: (id) => fetchJSON(`/api/pages/${id}`, { method: 'DELETE' }),
  getButton: (id) => fetchJSON(`/api/buttons/${id}`),
  putButton: (id, data) => fetchJSON(`/api/buttons/${id}`, { method: 'PUT', body: data }),
  deleteButton: (id) => fetchJSON(`/api/buttons/${id}`, { method: 'DELETE' }),
  pressButton: (id) => fetchJSON(`/api/buttons/${id}/press`, { method: 'POST' }),
  execAction: (action) => fetchJSON('/api/actions/exec', { method: 'POST', body: action }),
  // Profiles
  getProfiles: () => fetchJSON('/api/profiles'),
  activateProfile: (id) => fetchJSON(`/api/profiles/${id}/activate`, { method: 'POST' }),
  createProfile: (data) => fetchJSON('/api/profiles', { method: 'POST', body: data }),
  updateProfile: (id, data) => fetchJSON(`/api/profiles/${id}`, { method: 'PUT', body: data }),
  duplicateProfile: (id, newId, newName) => fetchJSON(`/api/profiles/${id}/duplicate`, { method: 'POST', body: { newId, newName } }),
  deleteProfile: (id) => fetchJSON(`/api/profiles/${id}`, { method: 'DELETE' }),
  migrateToProfiles: () => fetchJSON('/api/profiles/migrate', { method: 'POST' })
};

// WebSocket client
let ws = null;
let reconnectTimer = null;
const handlers = new Map();

export function onWsMessage(type, handler) {
  if (!handlers.has(type)) handlers.set(type, []);
  handlers.get(type).push(handler);
}

function dispatch(msg) {
  const cbs = handlers.get(msg.type) || [];
  cbs.forEach(cb => cb(msg));
}

export function connectWs() {
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  const keyParam = API_KEY ? `?key=${encodeURIComponent(API_KEY)}` : '';
  ws = new WebSocket(`${proto}://${location.host}${keyParam}`);

  ws.onopen = () => {
    clearTimeout(reconnectTimer);
    console.log('[rtaDeck] WebSocket connected');
  };

  ws.onmessage = (e) => {
    try {
      dispatch(JSON.parse(e.data));
    } catch { /* ignore */ }
  };

  ws.onclose = () => {
    console.log('[rtaDeck] WebSocket disconnected, reconnecting...');
    reconnectTimer = setTimeout(connectWs, 2000);
  };

  ws.onerror = () => ws.close();
}

export function sendWs(type, data = {}) {
  if (ws?.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type, ...data }));
  }
}
