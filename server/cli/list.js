import { loadConfig, getConfig, getActivePages, getActiveProfile } from '../services/config.js';

export async function list(options) {
  try {
    await loadConfig(process.cwd());
    const config = getConfig();
    const pages = getActivePages();
    const profile = getActiveProfile();
    const json = options.json;

    if (options.pages) {
      const data = pages.map(p => ({
        id: p.id,
        name: p.name,
        icon: p.icon,
        buttons: p.buttons.length
      }));
      if (json) {
        console.log(JSON.stringify(data, null, 2));
      } else {
        if (profile) console.log(`\n\x1b[1mProfile: ${profile.name}\x1b[0m`);
        console.log('\x1b[1mPages:\x1b[0m');
        for (const p of data) {
          console.log(`  ${p.icon || ' '} ${p.id} (${p.name}) - ${p.buttons} buttons`);
        }
        console.log('');
      }
      return;
    }

    if (options.buttons) {
      const buttons = [];
      for (const page of pages) {
        for (const btn of page.buttons) {
          buttons.push({ ...btn, pageId: page.id });
        }
      }
      if (json) {
        console.log(JSON.stringify(buttons, null, 2));
      } else {
        console.log('\n\x1b[1mButtons:\x1b[0m');
        for (const btn of buttons) {
          const icon = btn.display.type === 'emoji' ? btn.display.content : `[${btn.display.content}]`;
          console.log(`  ${icon} ${btn.id} (page: ${btn.pageId}, slot: ${btn.slot}) → ${btn.action.type}: ${btn.action.target}`);
        }
        console.log('');
      }
      return;
    }

    // Default: show everything
    if (json) {
      console.log(JSON.stringify(config, null, 2));
    } else {
      console.log('\n\x1b[1mrtaDeck Configuration\x1b[0m');
      console.log(`  Port: ${config.settings.port}`);
      console.log(`  Default page: ${config.settings.defaultPage}`);
      console.log(`  Grid: ${config.settings.columns || 5}x${config.settings.rows || 3}`);
      if (profile) console.log(`  Profile: ${profile.icon || ''} ${profile.name} (${profile.id})`);
      if (config.profiles?.length > 1) {
        console.log(`  Profiles: ${config.profiles.map(p => p.id).join(', ')}`);
      }
      console.log('');
      for (const page of pages) {
        console.log(`  \x1b[36m${page.icon || ' '} ${page.name}\x1b[0m (${page.id})`);
        for (const btn of page.buttons) {
          const icon = btn.display.type === 'emoji' ? btn.display.content : `[${btn.display.content}]`;
          const extra = btn.action.type === 'agent' ? ` [${btn.action.args?.[0] || 'cmd'}] in ${btn.action.cwd || '.'}` : '';
          console.log(`    ${icon} ${btn.id} [slot ${btn.slot}] → ${btn.action.type}: ${btn.action.target}${extra}`);
        }
      }
      console.log('');
    }
  } catch (err) {
    console.error(`\x1b[31mError:\x1b[0m ${err.message}`);
    process.exit(1);
  }
}
