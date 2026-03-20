import { Command } from 'commander';
import { createDefaultConfig } from '../services/config.js';

const program = new Command();

program
  .name('rtadeck')
  .description('Retro 8-bit Stream Deck for touch screens and smartphones')
  .version('0.1.0');

program
  .command('serve')
  .description('Start the rtaDeck server')
  .option('-p, --port <port>', 'Server port')
  .action(async (options) => {
    const { serve } = await import('./serve.js');
    await serve(options);
  });

program
  .command('init')
  .description('Create a default config file')
  .action(async () => {
    try {
      const filePath = await createDefaultConfig(process.cwd());
      console.log(`\x1b[32mCreated:\x1b[0m ${filePath}`);
    } catch (err) {
      console.error(`\x1b[31mError:\x1b[0m ${err.message}`);
      process.exit(1);
    }
  });

program
  .command('exec <button-id>')
  .description('Execute a button action directly')
  .action(async (buttonId) => {
    const { exec } = await import('./exec.js');
    await exec(buttonId);
  });

program
  .command('list')
  .description('List pages and buttons')
  .option('--pages', 'List pages only')
  .option('--buttons', 'List buttons only')
  .option('--json', 'Output as JSON (for AI agents)')
  .action(async (options) => {
    const { list } = await import('./list.js');
    await list(options);
  });

program
  .command('switch <page-id>')
  .description('Switch to a page on the display')
  .action(async (pageId) => {
    const { switchPage } = await import('./switch.js');
    await switchPage(pageId);
  });

program
  .command('press <button-id>')
  .description('Simulate pressing a button')
  .action(async (buttonId) => {
    const { press } = await import('./press.js');
    await press(buttonId);
  });

export { program };
