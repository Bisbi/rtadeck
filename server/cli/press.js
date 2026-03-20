import { loadConfig, getConfig, getButton } from '../services/config.js';

export async function press(buttonId) {
  try {
    await loadConfig(process.cwd());
    const result = getButton(buttonId);
    if (!result) {
      console.error(`\x1b[31mButton not found:\x1b[0m ${buttonId}`);
      process.exit(1);
    }

    const config = getConfig();
    const port = config.settings.port || 3000;

    // Press via REST API on running server
    const res = await fetch(`http://localhost:${port}/api/buttons/${buttonId}/press`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    const data = await res.json();
    if (data.ok) {
      console.log(`\x1b[32mPressed:\x1b[0m ${buttonId} → ${result.button.action.type}: ${result.button.action.target}`);
    } else {
      console.error(`\x1b[31mAction failed:\x1b[0m ${data.error || data.message}`);
    }
  } catch (err) {
    if (err.cause?.code === 'ECONNREFUSED') {
      console.error('\x1b[31mCould not connect to rtaDeck server.\x1b[0m Is it running?');
    } else {
      console.error(`\x1b[31mError:\x1b[0m ${err.message}`);
    }
    process.exit(1);
  }
}
