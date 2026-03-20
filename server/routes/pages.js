import { Router } from 'express';
import { getConfig, saveConfig, getActivePages } from '../services/config.js';
import { broadcast } from '../services/ws.js';

const router = Router();

// Get the pages array reference from the active profile (or legacy)
function getPagesRef() {
  const config = getConfig();
  if (config.profiles?.length) {
    const activeId = config.settings.activeProfile || config.profiles[0].id;
    const profile = config.profiles.find(p => p.id === activeId) || config.profiles[0];
    return profile.pages;
  }
  return config.pages;
}

// Set pages on the active profile (or legacy)
function setPagesRef(pages) {
  const config = getConfig();
  if (config.profiles?.length) {
    const activeId = config.settings.activeProfile || config.profiles[0].id;
    const profile = config.profiles.find(p => p.id === activeId) || config.profiles[0];
    profile.pages = pages;
  } else {
    config.pages = pages;
  }
}

// List all pages
router.get('/api/pages', (req, res) => {
  res.json(getActivePages());
});

// Get single page
router.get('/api/pages/:id', (req, res) => {
  const pages = getActivePages();
  const page = pages.find(p => p.id === req.params.id);
  if (!page) return res.status(404).json({ error: 'Page not found' });
  res.json(page);
});

// Create page
router.post('/api/pages', async (req, res) => {
  try {
    const config = getConfig();
    const pages = getPagesRef();
    const page = { buttons: [], ...req.body };
    if (pages.some(p => p.id === page.id)) {
      return res.status(409).json({ error: 'Page already exists' });
    }
    pages.push(page);
    await saveConfig(config);
    broadcast('config:updated', { config });
    res.status(201).json(page);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Update page
router.put('/api/pages/:id', async (req, res) => {
  try {
    const config = getConfig();
    const pages = getPagesRef();
    const idx = pages.findIndex(p => p.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Page not found' });
    pages[idx] = { ...pages[idx], ...req.body };
    await saveConfig(config);
    broadcast('config:updated', { config });
    res.json(pages[idx]);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Delete page
router.delete('/api/pages/:id', async (req, res) => {
  try {
    const config = getConfig();
    const pages = getPagesRef();
    const idx = pages.findIndex(p => p.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Page not found' });
    if (pages.length <= 1) return res.status(400).json({ error: 'Cannot delete last page' });
    pages.splice(idx, 1);
    await saveConfig(config);
    broadcast('config:updated', { config });
    res.status(204).end();
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
