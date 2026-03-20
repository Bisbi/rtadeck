import { Router } from 'express';
import { getConfig, saveConfig } from '../services/config.js';
import { broadcast } from '../services/ws.js';

const router = Router();

router.get('/api/config', (req, res) => {
  res.json(getConfig());
});

router.put('/api/config', async (req, res) => {
  try {
    const config = await saveConfig(req.body);
    broadcast('config:updated', { config });
    res.json(config);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
