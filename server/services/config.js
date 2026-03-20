import { readFile, writeFile, watch } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv from 'ajv';

const CONFIG_NAME = 'rtadeck.config.json';
const SCHEMA_NAME = 'rtadeck.config.schema.json';

let configPath = '';
let schemaPath = '';
let config = null;
let validate = null;
let watchers = [];
let onChange = null;
let internalSave = false;

const DEFAULT_CONFIG = {
  $schema: './rtadeck.config.schema.json',
  _docs: {
    actions: 'Action types: open (program), url (browser), keys (shortcut), cli (command), agent (AI agent)',
    display: 'Display types: emoji, text. Sizes: S, M, L. Colors: hex #RRGGBB',
    slots: 'Grid slots 0-14 (5x3). Top-left=0, top-right=4, bottom-right=14'
  },
  settings: {
    port: 3000,
    host: '0.0.0.0',
    defaultPage: 'main',
    columns: 5,
    rows: 3
  },
  pages: [
    {
      id: 'main',
      name: 'Main',
      icon: '\u2B50',
      buttons: [
        {
          id: 'open-browser',
          slot: 0,
          display: { type: 'emoji', content: '\uD83C\uDF10', label: 'Browser', size: 'M', color: '#29ADFF', bgColor: '#1D2B53' },
          action: { type: 'url', target: 'https://google.com' }
        },
        {
          id: 'open-terminal',
          slot: 1,
          display: { type: 'emoji', content: '\uD83D\uDCBB', label: 'Terminal', size: 'M', color: '#00E436', bgColor: '#1D2B53' },
          action: { type: 'open', target: 'wt.exe' }
        },
        {
          id: 'open-vscode',
          slot: 2,
          display: { type: 'emoji', content: '\uD83D\uDCDD', label: 'VS Code', size: 'M', color: '#29ADFF', bgColor: '#1D2B53' },
          action: { type: 'open', target: 'code' }
        },
        {
          id: 'copy-paste',
          slot: 5,
          display: { type: 'emoji', content: '\uD83D\uDCCB', label: 'Copy', size: 'M', color: '#FFA300', bgColor: '#1D2B53' },
          action: { type: 'keys', target: 'ctrl+c' }
        },
        {
          id: 'undo',
          slot: 6,
          display: { type: 'emoji', content: '\u21A9\uFE0F', label: 'Undo', size: 'M', color: '#FF77A8', bgColor: '#1D2B53' },
          action: { type: 'keys', target: 'ctrl+z' }
        },
        {
          id: 'save',
          slot: 7,
          display: { type: 'emoji', content: '\uD83D\uDCBE', label: 'Save', size: 'M', color: '#FFEC27', bgColor: '#1D2B53' },
          action: { type: 'keys', target: 'ctrl+s' }
        },
        {
          id: 'git-status',
          slot: 10,
          display: { type: 'text', content: 'GIT', label: 'Status', size: 'M', color: '#FF004D', bgColor: '#1D2B53' },
          action: { type: 'cli', target: 'git status' }
        },
        {
          id: 'npm-dev',
          slot: 11,
          display: { type: 'text', content: 'NPM', label: 'Dev', size: 'M', color: '#00E436', bgColor: '#1D2B53' },
          action: { type: 'cli', target: 'npm run dev' }
        }
      ]
    },
    {
      id: 'tools',
      name: 'Tools',
      icon: '\uD83D\uDD27',
      buttons: [
        {
          id: 'screenshot',
          slot: 0,
          display: { type: 'emoji', content: '\uD83D\uDCF7', label: 'Screenshot', size: 'M', color: '#FFEC27', bgColor: '#1D2B53' },
          action: { type: 'keys', target: 'win+shift+s' }
        },
        {
          id: 'task-manager',
          slot: 1,
          display: { type: 'emoji', content: '\uD83D\uDCCA', label: 'Tasks', size: 'M', color: '#FF004D', bgColor: '#1D2B53' },
          action: { type: 'keys', target: 'ctrl+shift+escape' }
        },
        {
          id: 'lock-screen',
          slot: 4,
          display: { type: 'emoji', content: '\uD83D\uDD12', label: 'Lock', size: 'M', color: '#7E2553', bgColor: '#1D2B53' },
          action: { type: 'keys', target: 'win+l' }
        }
      ]
    }
  ]
};

function getConfigPath(dir) {
  return path.join(dir || process.cwd(), CONFIG_NAME);
}

function getSchemaPath() {
  // Schema is bundled with the package
  const thisDir = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(thisDir, '..', '..', SCHEMA_NAME);
}

async function initSchema() {
  if (validate) return;
  schemaPath = getSchemaPath();
  try {
    const schemaText = await readFile(schemaPath, 'utf-8');
    const schema = JSON.parse(schemaText);
    const ajv = new Ajv({ allErrors: true, useDefaults: true });
    validate = ajv.compile(schema);
  } catch {
    // Schema not found — skip validation
    validate = () => true;
    validate.errors = null;
  }
}

export async function loadConfig(dir) {
  await initSchema();
  configPath = getConfigPath(dir);

  if (!existsSync(configPath)) {
    throw new Error(`Config not found: ${configPath}\nRun "rtadeck init" to create one.`);
  }

  const text = await readFile(configPath, 'utf-8');
  config = JSON.parse(text);

  const valid = validate(config);
  if (!valid) {
    const errors = validate.errors.map(e => `  ${e.instancePath} ${e.message}`).join('\n');
    throw new Error(`Invalid config:\n${errors}`);
  }

  return config;
}

export async function saveConfig(newConfig, dir) {
  await initSchema();
  const target = dir ? getConfigPath(dir) : configPath;

  const valid = validate(newConfig);
  if (!valid) {
    const errors = validate.errors.map(e => `  ${e.instancePath} ${e.message}`).join('\n');
    throw new Error(`Invalid config:\n${errors}`);
  }

  config = newConfig;
  internalSave = true;
  await writeFile(target, JSON.stringify(config, null, 2) + '\n', 'utf-8');
  setTimeout(() => { internalSave = false; }, 500);
  return config;
}

export function getConfig() {
  return config;
}

// ---- Profile helpers ----

// Get active profile, or null if using legacy pages
export function getActiveProfile() {
  if (!config?.profiles?.length) return null;
  const id = config.settings.activeProfile || config.profiles[0].id;
  return config.profiles.find(p => p.id === id) || config.profiles[0];
}

// Get pages from active profile (or legacy top-level pages)
export function getActivePages() {
  const profile = getActiveProfile();
  return profile ? profile.pages : (config?.pages || []);
}

// Switch active profile
export async function switchProfile(profileId) {
  const profile = config.profiles?.find(p => p.id === profileId);
  if (!profile) throw new Error(`Profile not found: ${profileId}`);
  config.settings.activeProfile = profileId;
  await saveConfig(config);
  return profile;
}

// Create a new profile
export async function createProfile({ id, name, icon, pages }) {
  if (!config.profiles) config.profiles = [];
  if (config.profiles.some(p => p.id === id)) {
    throw new Error(`Profile already exists: ${id}`);
  }
  const profile = { id, name, icon: icon || '', pages: pages || [] };
  config.profiles.push(profile);
  await saveConfig(config);
  return profile;
}

// Delete a profile
export async function deleteProfile(profileId) {
  if (!config.profiles?.length) throw new Error('No profiles to delete');
  if (config.profiles.length <= 1) throw new Error('Cannot delete last profile');
  const idx = config.profiles.findIndex(p => p.id === profileId);
  if (idx === -1) throw new Error(`Profile not found: ${profileId}`);
  config.profiles.splice(idx, 1);
  if (config.settings.activeProfile === profileId) {
    config.settings.activeProfile = config.profiles[0].id;
  }
  await saveConfig(config);
}

// Rename a profile
export async function updateProfile(profileId, data) {
  const profile = config.profiles?.find(p => p.id === profileId);
  if (!profile) throw new Error(`Profile not found: ${profileId}`);
  if (data.name !== undefined) profile.name = data.name;
  if (data.icon !== undefined) profile.icon = data.icon;
  await saveConfig(config);
  return profile;
}

// Duplicate a profile
export async function duplicateProfile(sourceId, newId, newName) {
  const source = config.profiles?.find(p => p.id === sourceId);
  if (!source) throw new Error(`Profile not found: ${sourceId}`);
  const clone = JSON.parse(JSON.stringify(source));
  clone.id = newId;
  clone.name = newName;
  config.profiles.push(clone);
  await saveConfig(config);
  return clone;
}

// Migrate legacy config (pages at top level) to profiles format
export async function migrateToProfiles() {
  if (config.profiles?.length) return; // Already has profiles
  if (!config.pages?.length) return;

  config.profiles = [{
    id: 'default',
    name: 'Default',
    icon: '\u2B50',
    pages: config.pages
  }];
  config.settings.activeProfile = 'default';
  delete config.pages;
  await saveConfig(config);
}

export async function createDefaultConfig(dir) {
  const target = getConfigPath(dir);
  if (existsSync(target)) {
    throw new Error(`Config already exists: ${target}`);
  }
  await writeFile(target, JSON.stringify(DEFAULT_CONFIG, null, 2) + '\n', 'utf-8');
  return target;
}

export function watchConfig(callback) {
  onChange = callback;
  const ac = new AbortController();
  (async () => {
    try {
      const watcher = watch(configPath, { signal: ac.signal });
      let debounce = null;
      for await (const event of watcher) {
        if (event.eventType === 'change') {
          clearTimeout(debounce);
          debounce = setTimeout(async () => {
            if (internalSave) return; // Skip self-triggered changes
            try {
              const text = await readFile(configPath, 'utf-8');
              const newConfig = JSON.parse(text);
              const valid = validate(newConfig);
              if (valid) {
                config = newConfig;
                if (onChange) onChange(config);
              }
            } catch {
              // Ignore parse errors during external edits
            }
          }, 300);
        }
      }
    } catch (err) {
      if (err.name !== 'AbortError') throw err;
    }
  })();

  watchers.push(ac);
  return () => ac.abort();
}

export function getPage(pageId) {
  const pages = getActivePages();
  return pages.find(p => p.id === pageId) || null;
}

export function getButton(buttonId) {
  const pages = getActivePages();
  for (const page of pages) {
    const btn = page.buttons.find(b => b.id === buttonId);
    if (btn) return { button: btn, page };
  }
  return null;
}
