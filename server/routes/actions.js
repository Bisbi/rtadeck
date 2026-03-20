import { Router } from 'express';
import { getButton } from '../services/config.js';
import { executeAction } from '../services/executor.js';
import { broadcast } from '../services/ws.js';

const router = Router();

// Execute inline action
router.post('/api/actions/exec', async (req, res) => {
  try {
    const result = await executeAction(req.body);
    res.json(result);
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Press button (execute its action)
router.post('/api/buttons/:id/press', async (req, res) => {
  try {
    const result = getButton(req.params.id);
    if (!result) return res.status(404).json({ error: 'Button not found' });

    const { button } = result;
    broadcast('button:press', { buttonId: button.id });

    const actionResult = await executeAction(button.action);
    broadcast('action:result', { buttonId: button.id, result: actionResult });
    res.json(actionResult);
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

export default router;
