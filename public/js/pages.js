import { sendWs } from './api.js';

const tabBar = document.getElementById('tab-bar');
let currentPageId = null;
let onPageChange = null;
let onSettingsOpen = null;

export function setSettingsHandler(handler) {
  onSettingsOpen = handler;
}

export function initTabs(pages, defaultPageId, onChange) {
  onPageChange = onChange;
  tabBar.innerHTML = '';

  for (const page of pages) {
    const btn = document.createElement('button');
    btn.className = 'tab-btn';
    btn.dataset.pageId = page.id;

    if (page.icon) {
      const icon = document.createElement('span');
      icon.className = 'tab-icon';
      icon.textContent = page.icon;
      btn.appendChild(icon);
    }

    const label = document.createElement('span');
    label.className = 'tab-label';
    label.textContent = page.name;
    btn.appendChild(label);

    btn.addEventListener('click', () => switchTo(page.id, true));
    tabBar.appendChild(btn);
  }

  // Settings button
  const setBtn = document.createElement('button');
  setBtn.className = 'tab-btn settings-btn';
  setBtn.textContent = '\u2699';
  setBtn.addEventListener('click', () => { if (onSettingsOpen) onSettingsOpen(); });
  tabBar.appendChild(setBtn);

  // Fullscreen toggle
  const fsBtn = document.createElement('button');
  fsBtn.className = 'tab-btn fullscreen-btn';
  fsBtn.textContent = '\u26F6';
  fsBtn.addEventListener('click', toggleFullscreen);
  tabBar.appendChild(fsBtn);

  // Initial page — local only, no broadcast
  applySwitch(defaultPageId || pages[0]?.id);
}

// Internal: just update UI, no WS
function applySwitch(pageId) {
  if (!pageId || pageId === currentPageId) return;
  currentPageId = pageId;

  tabBar.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.pageId === pageId);
  });

  if (onPageChange) onPageChange(pageId);
}

// User-initiated switch: update UI + broadcast to other clients
export function switchTo(pageId, broadcast = false) {
  if (pageId === currentPageId) return;
  applySwitch(pageId);
  if (broadcast) {
    sendWs('page:switch', { pageId });
  }
}

// Called from WS message — just apply locally
export function switchToFromRemote(pageId) {
  applySwitch(pageId);
}

export function getCurrentPageId() {
  return currentPageId;
}

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen?.();
  } else {
    document.exitFullscreen?.();
  }
}

// Swipe navigation
export function initSwipe(pages) {
  let startX = 0;
  const threshold = 60;

  document.addEventListener('touchstart', (e) => {
    startX = e.touches[0].clientX;
  }, { passive: true });

  document.addEventListener('touchend', (e) => {
    const dx = e.changedTouches[0].clientX - startX;
    if (Math.abs(dx) < threshold) return;

    const ids = pages.map(p => p.id);
    const idx = ids.indexOf(currentPageId);
    if (idx === -1) return;

    if (dx < -threshold && idx < ids.length - 1) {
      switchTo(ids[idx + 1], true);
    } else if (dx > threshold && idx > 0) {
      switchTo(ids[idx - 1], true);
    }
  }, { passive: true });
}
