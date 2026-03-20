import { Router } from 'express';
import { getConfig, saveConfig, getButton } from '../services/config.js';
import { broadcast } from '../services/ws.js';

const router = Router();

// Get button
router.get('/api/buttons/:id', (req, res) => {
  const result = getButton(req.params.id);
  if (!result) return res.status(404).json({ error: 'Button not found' });
  res.json(result.button);
});

// Create/Update button
router.put('/api/buttons/:id', async (req, res) => {
  try {
    const config = getConfig();
    const { pageId, ...buttonData } = req.body;
    const targetPageId = pageId || config.settings.defaultPage;
    const page = config.pages.find(p => p.id === targetPageId);
    if (!page) return res.status(404).json({ error: 'Page not found' });

    const existingIdx = page.buttons.findIndex(b => b.id === req.params.id);
    const button = { id: req.params.id, ...buttonData };

    if (existingIdx >= 0) {
      page.buttons[existingIdx] = button;
    } else {
      page.buttons.push(button);
    }

    await saveConfig(config);
    broadcast('config:updated', { config });
    res.json(button);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Delete button
router.delete('/api/buttons/:id', async (req, res) => {
  try {
    const config = getConfig();
    for (const page of config.pages) {
      const idx = page.buttons.findIndex(b => b.id === req.params.id);
      if (idx >= 0) {
        page.buttons.splice(idx, 1);
        await saveConfig(config);
        broadcast('config:updated', { config });
        return res.status(204).end();
      }
    }
    res.status(404).json({ error: 'Button not found' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
