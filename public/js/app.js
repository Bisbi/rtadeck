import { api, connectWs, onWsMessage } from './api.js';
import { renderGrid } from './grid.js';
import { initTabs, switchTo, switchToFromRemote, getCurrentPageId, setSettingsHandler } from './pages.js';
import { initEditor, open as openEditor } from './editor.js';
import { initSettings, open as openSettings } from './settings.js';

let config = null;

// Resolve pages from active profile or legacy top-level
function getPages() {
  if (config.profiles?.length) {
    const activeId = config.settings.activeProfile || config.profiles[0].id;
    const profile = config.profiles.find(p => p.id === activeId) || config.profiles[0];
    return profile.pages;
  }
  return config.pages || [];
}

function pageChangeHandler(pageId) {
  const pages = getPages();
  const page = pages.find(p => p.id === pageId);
  if (page) renderGrid(page, config.settings, handleLongPress);
}

async function init() {
  try {
    config = await api.getConfig();
  } catch (err) {
    document.body.innerHTML = `<div style="color:#FF004D;padding:20px;font-family:monospace">
      Failed to load config: ${err.message}</div>`;
    return;
  }

  // Init editor & settings
  initEditor(refresh);
  initSettings(refresh);
  setSettingsHandler(openSettings);

  // Init tabs and page navigation
  const pages = getPages();
  initTabs(pages, config.settings.defaultPage, pageChangeHandler);

  // WebSocket
  connectWs();

  onWsMessage('config:updated', (msg) => {
    config = msg.config;
    const pages = getPages();
    const currentId = getCurrentPageId();
    initTabs(pages, currentId, pageChangeHandler);
  });

  onWsMessage('page:switch', (msg) => {
    switchToFromRemote(msg.pageId);
  });

  onWsMessage('action:result', (msg) => {
    const el = document.querySelector(`[data-id="${msg.buttonId}"]`);
    if (el) {
      el.classList.add('flash');
      setTimeout(() => el.classList.remove('flash'), 300);
    }
  });
}

function handleLongPress(button, slot) {
  const pageId = getCurrentPageId();
  openEditor(button, slot, pageId);
}

async function refresh() {
  config = await api.getConfig();
  const pages = getPages();
  const currentId = getCurrentPageId();
  // If current page doesn't exist in new profile, go to first page
  const validId = pages.some(p => p.id === currentId) ? currentId : pages[0]?.id;
  initTabs(pages, validId, pageChangeHandler);
}

init();
