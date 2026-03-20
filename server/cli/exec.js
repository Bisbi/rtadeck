import { loadConfig, getButton } from '../services/config.js';
import { executeAction } from '../services/executor.js';

export async function exec(buttonId) {
  try {
    await loadConfig(process.cwd());
    const result = getButton(buttonId);
    if (!result) {
      console.error(`\x1b[31mButton not found:\x1b[0m ${buttonId}`);
      process.exit(1);
    }
    const actionResult = await executeAction(result.button.action);
    console.log(JSON.stringify(actionResult, null, 2));
  } catch (err) {
    console.error(`\x1b[31mError:\x1b[0m ${err.message}`);
    process.exit(1);
  }
}
