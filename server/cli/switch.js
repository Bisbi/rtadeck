import { loadConfig, getPage } from '../services/config.js';

export async function switchPage(pageId) {
  try {
    await loadConfig(process.cwd());
    const page = getPage(pageId);
    if (!page) {
      console.error(`\x1b[31mPage not found:\x1b[0m ${pageId}`);
      process.exit(1);
    }

    // Send switch command to running server via HTTP
    const config = (await import('../services/config.js')).getConfig();
    const port = config.settings.port || 3000;
    const url = `http://localhost:${port}/api/config`;

    // We just need to broadcast — use a quick WebSocket connection
    const { WebSocket } = await import('ws');
    const ws = new WebSocket(`ws://localhost:${port}`);

    ws.on('open', () => {
      ws.send(JSON.stringify({ type: 'page:switch', pageId }));
      console.log(`\x1b[32mSwitched to page:\x1b[0m ${pageId} (${page.name})`);
      ws.close();
    });

    ws.on('error', () => {
      console.error('\x1b[31mCould not connect to rtaDeck server.\x1b[0m Is it running?');
      process.exit(1);
    });
  } catch (err) {
    console.error(`\x1b[31mError:\x1b[0m ${err.message}`);
    process.exit(1);
  }
}
