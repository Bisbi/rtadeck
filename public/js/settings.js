import { api } from './api.js';

let overlay = null;
let onSave = null;

export function initSettings(saveCallback) {
  onSave = saveCallback;
  overlay = document.getElementById('settings-overlay');
  document.getElementById('settings-close').addEventListener('click', close);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });

  document.getElementById('settings-add-page').addEventListener('click', addPage);
  document.getElementById('settings-cols').addEventListener('change', updateGrid);
  document.getElementById('settings-rows').addEventListener('change', updateGrid);

  // Profile buttons
  document.getElementById('settings-add-profile').addEventListener('click', addProfile);
  document.getElementById('settings-dup-profile').addEventListener('click', dupProfile);
  document.getElementById('settings-migrate-profile').addEventListener('click', migrateProfiles);
}

export async function open() {
  const config = await api.getConfig();

  document.getElementById('settings-cols').value = config.settings.columns || 5;
  document.getElementById('settings-rows').value = config.settings.rows || 3;
  document.getElementById('settings-port').value = config.settings.port || 3000;

  renderProfilesList(config);
  renderPagesList(config);

  overlay.classList.remove('hidden');
}

function close() {
  overlay.classList.add('hidden');
}

// ---- Profiles ----

function renderProfilesList(config) {
  const list = document.getElementById('settings-profiles-list');
  const badge = document.getElementById('settings-profile-badge');
  list.innerHTML = '';

  if (!config.profiles?.length) {
    list.innerHTML = '<p class="settings-hint">No profiles yet. Click "Migrate" to convert current pages.</p>';
    badge.textContent = '(legacy)';
    document.getElementById('settings-dup-profile').disabled = true;
    return;
  }

  document.getElementById('settings-dup-profile').disabled = false;
  const activeId = config.settings.activeProfile || config.profiles[0].id;
  const activeProfile = config.profiles.find(p => p.id === activeId);
  badge.textContent = activeProfile ? `(${activeProfile.name})` : '';

  for (const profile of config.profiles) {
    const row = document.createElement('div');
    row.className = 'settings-page-row' + (profile.id === activeId ? ' active-profile' : '');

    const icon = document.createElement('span');
    icon.className = 'settings-page-icon';
    icon.textContent = profile.icon || '';

    const name = document.createElement('span');
    name.className = 'settings-page-name';
    name.textContent = `${profile.name} (${profile.pages.length}p)`;
    if (profile.id === activeId) name.style.color = '#FFEC27';

    const actions = document.createElement('span');
    actions.className = 'settings-page-actions';

    if (profile.id !== activeId) {
      const activateBtn = document.createElement('button');
      activateBtn.className = 'nes-btn is-primary settings-sm-btn';
      activateBtn.textContent = 'Use';
      activateBtn.addEventListener('click', () => activateProfile(profile.id));
      actions.appendChild(activateBtn);
    }

    const renameBtn = document.createElement('button');
    renameBtn.className = 'nes-btn is-warning settings-sm-btn';
    renameBtn.textContent = 'Edit';
    renameBtn.addEventListener('click', () => renameProfile(profile));
    actions.appendChild(renameBtn);

    if (config.profiles.length > 1) {
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'nes-btn is-error settings-sm-btn';
      deleteBtn.textContent = 'Del';
      deleteBtn.addEventListener('click', () => removeProfile(profile.id));
      actions.appendChild(deleteBtn);
    }

    row.appendChild(icon);
    row.appendChild(name);
    row.appendChild(actions);
    list.appendChild(row);
  }
}

async function activateProfile(id) {
  try {
    await api.activateProfile(id);
    close();
    if (onSave) onSave();
  } catch (err) { alert(`Error: ${err.message}`); }
}

async function addProfile() {
  const name = prompt('Profile name:');
  if (!name) return;
  const icon = prompt('Icon (emoji):', '\uD83D\uDCE6');
  const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  if (!id) return;

  try {
    await api.createProfile({ id, name, icon: icon || '', pages: [] });
    const config = await api.getConfig();
    renderProfilesList(config);
    renderPagesList(config);
  } catch (err) { alert(`Error: ${err.message}`); }
}

async function dupProfile() {
  const config = await api.getConfig();
  const activeId = config.settings.activeProfile || config.profiles?.[0]?.id;
  if (!activeId) return;

  const name = prompt('Name for the copy:', `${config.profiles.find(p => p.id === activeId)?.name} Copy`);
  if (!name) return;
  const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  if (!id) return;

  try {
    await api.duplicateProfile(activeId, id, name);
    const newConfig = await api.getConfig();
    renderProfilesList(newConfig);
  } catch (err) { alert(`Error: ${err.message}`); }
}

async function renameProfile(profile) {
  const name = prompt('New name:', profile.name);
  if (!name || name === profile.name) return;
  const icon = prompt('Icon (emoji):', profile.icon || '');

  try {
    await api.updateProfile(profile.id, { name, icon: icon ?? profile.icon });
    const config = await api.getConfig();
    renderProfilesList(config);
  } catch (err) { alert(`Error: ${err.message}`); }
}

async function removeProfile(id) {
  if (!confirm('Delete this profile and all its pages?')) return;
  try {
    await api.deleteProfile(id);
    close();
    if (onSave) onSave();
  } catch (err) { alert(`Error: ${err.message}`); }
}

async function migrateProfiles() {
  try {
    await api.migrateToProfiles();
    close();
    if (onSave) onSave();
  } catch (err) { alert(`Error: ${err.message}`); }
}

// ---- Pages ----

function renderPagesList(config) {
  const list = document.getElementById('settings-pages-list');
  list.innerHTML = '';

  // Get pages from active profile or legacy
  let pages;
  if (config.profiles?.length) {
    const activeId = config.settings.activeProfile || config.profiles[0].id;
    const profile = config.profiles.find(p => p.id === activeId);
    pages = profile?.pages || [];
  } else {
    pages = config.pages || [];
  }

  for (const page of pages) {
    const row = document.createElement('div');
    row.className = 'settings-page-row';

    const icon = document.createElement('span');
    icon.className = 'settings-page-icon';
    icon.textContent = page.icon || '';

    const name = document.createElement('span');
    name.className = 'settings-page-name';
    name.textContent = `${page.name} (${page.buttons.length})`;

    const actions = document.createElement('span');
    actions.className = 'settings-page-actions';

    const renameBtn = document.createElement('button');
    renameBtn.className = 'nes-btn is-warning settings-sm-btn';
    renameBtn.textContent = 'Rename';
    renameBtn.addEventListener('click', () => renamePage(page));

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'nes-btn is-error settings-sm-btn';
    deleteBtn.textContent = 'Del';
    if (pages.length <= 1) deleteBtn.disabled = true;
    deleteBtn.addEventListener('click', () => deletePage(page.id));

    actions.appendChild(renameBtn);
    actions.appendChild(deleteBtn);

    row.appendChild(icon);
    row.appendChild(name);
    row.appendChild(actions);
    list.appendChild(row);
  }
}

async function addPage() {
  const name = prompt('Page name:');
  if (!name) return;
  const icon = prompt('Page icon (emoji):', '\uD83D\uDCC1');
  const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  if (!id) return;

  try {
    await api.createPage({ id, name, icon: icon || '', buttons: [] });
    close();
    if (onSave) onSave();
  } catch (err) { alert(`Error: ${err.message}`); }
}

async function renamePage(page) {
  const name = prompt('New name:', page.name);
  if (!name || name === page.name) return;
  const icon = prompt('Icon (emoji):', page.icon || '');

  try {
    await api.updatePage(page.id, { ...page, name, icon: icon ?? page.icon });
    close();
    if (onSave) onSave();
  } catch (err) { alert(`Error: ${err.message}`); }
}

async function deletePage(pageId) {
  if (!confirm('Delete this page and all its buttons?')) return;
  try {
    await api.deletePage(pageId);
    close();
    if (onSave) onSave();
  } catch (err) { alert(`Error: ${err.message}`); }
}

async function updateGrid() {
  const cols = parseInt(document.getElementById('settings-cols').value, 10);
  const rows = parseInt(document.getElementById('settings-rows').value, 10);
  if (isNaN(cols) || isNaN(rows) || cols < 1 || rows < 1) return;

  try {
    const config = await api.getConfig();
    config.settings.columns = cols;
    config.settings.rows = rows;
    await api.putConfig(config);
    if (onSave) onSave();
  } catch (err) { alert(`Error: ${err.message}`); }
}
