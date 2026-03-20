import { startServer } from '../index.js';

export async function serve(options) {
  try {
    await startServer({
      port: options.port ? parseInt(options.port, 10) : undefined,
      configDir: process.cwd()
    });
  } catch (err) {
    console.error(`\x1b[31m[rtaDeck] Error:\x1b[0m ${err.message}`);
    process.exit(1);
  }
}
