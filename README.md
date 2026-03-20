# rtaDeck

**Rule Them All + Deck** — A retro 8-bit Stream Deck for touch screens, smartphones, and tablets.

![Node.js](https://img.shields.io/badge/Node.js-%3E%3D18-green)
![License](https://img.shields.io/badge/License-MIT-blue)

---

## The Story

It started with a cheap 7" touch screen, an HDMI cable, and a question: *"What if I could build my own Stream Deck?"*

Not the $150 Elgato kind. Not a polished commercial product. Something **personal** — a command center that lives on my desk, launches my apps, fires off keyboard shortcuts, and most importantly, spawns AI coding agents across all my projects with a single tap.

I'm a developer. I have Claude Code running on three different machines, each with a dozen projects. I wanted one button to open a terminal in the right folder, with the right agent, ready to go. I wanted another button to toggle my microphone, another to open the docs I always need, and a page full of shortcuts I can never remember.

The commercial solutions didn't fit. Too rigid, too expensive, or too locked-in. So I built rtaDeck — in Node.js, with 6 dependencies, zero build steps, and a retro 8-bit aesthetic that makes me smile every time I look at it.

**The twist?** It's not just for the touch screen on your desk. Set `host: "0.0.0.0"` and your phone becomes a wireless Stream Deck too. Scan the QR code that appears in the terminal, and you're in. Same interface, same buttons, real-time sync.

It's a tool built by a developer, for developers. The config is a single JSON file — edit it by hand, let an AI agent modify it, or use the built-in touch editor. Your choice.

If you've ever wished you could have a custom control panel for your dev workflow — one that works exactly the way you think — this is it.

---

## Features

- **5x3 button grid** (configurable up to 10x6) with emoji or text labels
- **5 action types**: open programs, URLs, keyboard shortcuts, CLI commands, AI agent terminals
- **Retro 8-bit UI** powered by NES.css + PICO-8 color palette
- **Multi-page** navigation with tab bar and swipe gestures
- **Profiles** for per-machine configurations (work PC, home PC, laptop)
- **Live config editing** — long-press any button to edit, or modify the JSON file directly
- **LAN access** — use your phone as a wireless Stream Deck via QR code
- **PWA** — install on your phone's home screen for a native app experience
- **AI-agent friendly** — JSON config, `--json` CLI output, file watcher for external edits
- **Secure** — API key authentication for LAN access, localhost always trusted
- **Cross-platform** — Windows, macOS, Linux
- **Zero build step** — vanilla HTML/CSS/JS frontend, no bundler needed
- **6 dependencies** — minimal footprint

---

## Quick Start

### npm (recommended)

```bash
npm install -g rtadeck

# Create a config file in the current directory
rtadeck init

# Start the server
rtadeck serve
```

### npx (no install)

```bash
npx rtadeck init
npx rtadeck serve
```

### From source

```bash
git clone https://github.com/user/rtadeck.git
cd rtadeck
npm install
npm start
```

---

## Configuration

rtaDeck uses a single JSON file: `rtadeck.config.json`. The file supports JSON Schema for autocomplete in editors (VS Code, JetBrains, etc.).

### Minimal example

```json
{
  "$schema": "./rtadeck.config.schema.json",
  "settings": {
    "port": 3000,
    "host": "0.0.0.0",
    "defaultPage": "main",
    "columns": 5,
    "rows": 3
  },
  "profiles": [
    {
      "id": "default",
      "name": "Default",
      "icon": "🎮",
      "pages": [
        {
          "id": "main",
          "name": "Main",
          "icon": "🏠",
          "buttons": [
            {
              "id": "open-browser",
              "slot": 0,
              "display": { "type": "emoji", "content": "🌐", "size": "M" },
              "action": { "type": "url", "target": "https://google.com" }
            }
          ]
        }
      ]
    }
  ]
}
```

### Settings

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `port` | integer | `3000` | Server port (auto-detects next free port if busy) |
| `host` | string | `127.0.0.1` | Bind address. Use `0.0.0.0` for LAN access |
| `defaultPage` | string | — | Page shown on startup |
| `columns` | integer | `5` | Grid columns (1-10) |
| `rows` | integer | `3` | Grid rows (1-6) |
| `activeProfile` | string | — | Active profile ID |

### Button display

| Field | Type | Description |
|-------|------|-------------|
| `type` | `emoji` \| `text` | Content type |
| `content` | string | Emoji character or text label |
| `label` | string | Optional subtitle below the icon |
| `size` | `S` \| `M` \| `L` | Display size |
| `color` | hex string | Text/emoji color (e.g. `#FF004D`) |
| `bgColor` | hex string | Background color |

### Action types

#### `open` — Launch a program

```json
{ "type": "open", "target": "C:\\Program Files\\Notepad++\\notepad++.exe" }
```

#### `url` — Open a URL in the default browser

```json
{ "type": "url", "target": "https://github.com" }
```

#### `keys` — Send keyboard shortcuts

```json
{ "type": "keys", "target": "ctrl+shift+p" }
```

Supported modifiers: `ctrl`, `alt`, `shift`, `win`/`cmd`/`super`. Separate combos with `+`.

#### `cli` — Run a shell command

```json
{ "type": "cli", "target": "npm run build", "cwd": "C:\\Projects\\my-app" }
```

The command runs in the background. Output is captured for up to 10 seconds.

#### `agent` — Open a terminal with a command

Opens a **visible terminal window** in a specific folder with a command. Designed for launching AI coding agents (Claude Code, Cursor, etc.) but works for any terminal task.

```json
{
  "type": "agent",
  "target": "claude",
  "cwd": "C:\\Projects\\my-app",
  "args": ["wt"]
}
```

| Field | Description |
|-------|-------------|
| `target` | Command to run in the terminal |
| `cwd` | Working directory |
| `args[0]` | Terminal to use: `cmd`, `powershell`/`pwsh`, `wt` (Windows Terminal) |

On macOS, opens Terminal.app. On Linux, uses `x-terminal-emulator`.

---

## Profiles

Profiles let you maintain different button layouts per machine or context.

```json
{
  "settings": { "activeProfile": "work" },
  "profiles": [
    { "id": "work", "name": "Work PC", "icon": "💼", "pages": [...] },
    { "id": "home", "name": "Home PC", "icon": "🏠", "pages": [...] }
  ]
}
```

Switch profiles from the settings panel (gear icon) or via the API:

```bash
curl -X POST http://localhost:3000/api/profiles/home/activate
```

---

## Frontend

The web UI is a responsive PWA with a retro 8-bit design.

### Touch gestures

| Gesture | Action |
|---------|--------|
| **Tap** | Execute button action |
| **Long-press** (500ms) on button | Open editor overlay |
| **Long-press** on empty slot | Create new button |

### Tab bar

The bottom bar shows page tabs, a fullscreen toggle, and a settings gear. Pages are switchable by tapping the tabs.

### Editor

Long-press any button to open the editor overlay:
- Change emoji/text, label, colors, size (S/M/L)
- Configure action type and target
- Agent type shows terminal selector and folder field
- Delete button

### Settings panel

The gear icon opens the settings panel:
- **Profiles**: list, activate, add, duplicate, rename, delete
- **Pages**: list, add, rename, delete
- **Grid**: adjust columns and rows
- **Migrate**: convert legacy (non-profile) configs to profile format

### PWA installation

On Android/iOS, tap "Add to Home Screen" in the browser menu. The app opens in standalone mode (no browser chrome), landscape orientation.

---

## Security

rtaDeck uses API key authentication to protect LAN access.

### How it works

1. On startup, the server generates a random API key (24 bytes, base64url-encoded)
2. **Localhost** connections (`127.0.0.1`, `::1`) are always trusted — no key needed
3. **LAN** connections must provide the key via:
   - `X-API-Key` HTTP header (for REST API calls)
   - `?key=` URL parameter (for browser/WebSocket)
4. The QR code printed at startup includes the key in the URL
5. The server injects the key into the HTML page, so the frontend handles auth automatically

### Persistent API key

By default, a new key is generated on each restart. To keep the same key:

```bash
export RTADECK_API_KEY=my-secret-key
rtadeck serve
```

### Security model

| Connection | Auth required | How |
|------------|--------------|-----|
| `localhost:3000` (same PC) | No | Trusted automatically |
| `192.168.x.x:3000` (LAN) | Yes | API key in header, URL param, or QR code |
| WebSocket (localhost) | No | Trusted automatically |
| WebSocket (LAN) | Yes | `?key=` in connection URL |

### Recommendations

- Keep `host: "127.0.0.1"` (default) if you don't need LAN access — no key is needed at all
- Set `host: "0.0.0.0"` to enable LAN access — the key system activates automatically
- Use `RTADECK_API_KEY` env var for a stable key across restarts
- Never expose the port to the public internet without additional security (reverse proxy, firewall)

---

## CLI

```
rtadeck serve [--port 3000]          Start the server
rtadeck init                          Create default config file
rtadeck exec <button-id>              Execute a button's action
rtadeck list [--pages|--buttons]      List configuration
rtadeck list --json                   JSON output (for AI agents)
rtadeck switch <page-id>              Switch page on the display
rtadeck press <button-id>             Simulate a button press
```

### JSON output for AI agents

```bash
# List all pages as JSON
rtadeck list --pages --json

# List all buttons as JSON
rtadeck list --buttons --json

# Full config as JSON
rtadeck list --json
```

---

## REST API

All `/api/` routes require the `X-API-Key` header for non-localhost requests.

### Config

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/config` | Get full configuration |
| `PUT` | `/api/config` | Replace entire configuration |

### Pages

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/pages` | List all pages (active profile) |
| `GET` | `/api/pages/:id` | Get a specific page |
| `POST` | `/api/pages` | Create a new page |
| `PUT` | `/api/pages/:id` | Update a page |
| `DELETE` | `/api/pages/:id` | Delete a page |

### Buttons

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/buttons/:id` | Get a button |
| `PUT` | `/api/buttons/:id` | Update a button |
| `DELETE` | `/api/buttons/:id` | Delete a button |
| `POST` | `/api/buttons/:id/press` | Execute a button's action |

### Actions

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/actions/exec` | Execute an inline action |

### Profiles

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/profiles` | List all profiles |
| `POST` | `/api/profiles` | Create a new profile |
| `POST` | `/api/profiles/:id/activate` | Activate a profile |
| `PUT` | `/api/profiles/:id` | Update a profile |
| `POST` | `/api/profiles/:id/duplicate` | Duplicate a profile |
| `DELETE` | `/api/profiles/:id` | Delete a profile |
| `POST` | `/api/profiles/migrate` | Migrate legacy config to profiles |

### Examples

```bash
# Press a button
curl -X POST http://localhost:3000/api/buttons/open-browser/press

# Execute an inline action
curl -X POST http://localhost:3000/api/actions/exec \
  -H "Content-Type: application/json" \
  -d '{"type":"url","target":"https://github.com"}'

# Create a new page
curl -X POST http://localhost:3000/api/pages \
  -H "Content-Type: application/json" \
  -d '{"id":"tools","name":"Tools","icon":"🔧","buttons":[]}'

# LAN access (include API key)
curl -H "X-API-Key: YOUR_KEY" http://192.168.1.10:3000/api/config
```

---

## WebSocket Events

Connect via `ws://localhost:3000` (or `ws://192.168.x.x:3000?key=YOUR_KEY` for LAN).

| Event | Direction | Payload |
|-------|-----------|---------|
| `config:updated` | Server → Client | `{ config }` — config changed (external edit or API) |
| `page:switch` | Bidirectional | `{ pageId }` — page navigation |
| `button:press` | Client → Server | `{ buttonId }` — button pressed |
| `action:result` | Server → Client | `{ buttonId, result }` — action execution result |

---

## Architecture

```
rtaDeck/
├── bin/rtadeck.js              # CLI entry point
├── server/
│   ├── index.js                # Express + WebSocket + auth + QR code
│   ├── routes/                 # REST API routes
│   ├── services/
│   │   ├── config.js           # Config load/save/validate/watch
│   │   ├── executor.js         # Action execution engine
│   │   ├── keys.js             # Cross-platform key simulation
│   │   ├── auth.js             # API key generation + middleware
│   │   └── ws.js               # WebSocket manager
│   └── cli/                    # CLI commands
├── public/
│   ├── index.html              # HTML shell (NES.css + fonts)
│   ├── css/style.css           # PICO-8 dark theme
│   ├── js/
│   │   ├── app.js              # Init + state
│   │   ├── api.js              # REST + WebSocket client
│   │   ├── grid.js             # Button grid renderer
│   │   ├── button.js           # Button component
│   │   ├── editor.js           # Button editor overlay
│   │   ├── pages.js            # Page navigation
│   │   ├── settings.js         # Settings panel
│   │   └── gestures.js         # Touch handling
│   └── manifest.json           # PWA manifest
├── rtadeck.config.json         # User configuration (gitignored)
└── rtadeck.config.schema.json  # JSON Schema
```

### Dependencies (6 total)

| Package | Purpose |
|---------|---------|
| `express` | HTTP server + routing |
| `ws` | WebSocket server |
| `commander` | CLI parsing |
| `ajv` | JSON Schema validation |
| `open` | Cross-platform open URLs/programs |
| `qrcode` | QR code in terminal for phone access |

---

## Cross-Platform Notes

### Key simulation

- **Windows**: PowerShell `SendKeys` + `keybd_event` P/Invoke (for Win key combos)
- **macOS**: `osascript` (AppleScript key events)
- **Linux**: `xdotool` (must be installed: `sudo apt install xdotool`)

### Primary monitor

On Windows, programs launched via rtaDeck open on the **primary monitor** (not the touch screen). This is handled automatically by moving the cursor to the primary monitor before launching.

### Agent terminals

| OS | Terminal options |
|----|-----------------|
| Windows | `cmd` (default), `powershell`/`pwsh`, `wt` (Windows Terminal) |
| macOS | Terminal.app |
| Linux | `x-terminal-emulator` (configurable) |

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `RTADECK_API_KEY` | Persistent API key (skips random generation) |
| `RTADECK_HOST` | Override bind address |

---

## FAQ

### Is rtaDeck a free alternative to Elgato Stream Deck?

Yes. rtaDeck is an open-source, free alternative to the Elgato Stream Deck. It works with any touch screen (7", 10", tablets) or even your smartphone over Wi-Fi. No proprietary hardware required — just plug in a cheap HDMI touch display and run `npx rtadeck serve`.

### Can I use rtaDeck with a Raspberry Pi?

Absolutely. rtaDeck runs on any device with Node.js 18+. A Raspberry Pi with a touch screen makes a perfect dedicated Stream Deck. Install with `npm install -g rtadeck`, set `host: "0.0.0.0"` to access it from other devices, and you have a standalone control panel.

### Can I use my phone as a Stream Deck?

Yes. Set `host: "0.0.0.0"` in your config, start the server, and scan the QR code printed in the terminal. Your phone connects instantly over Wi-Fi with full authentication. You can even install it as a PWA ("Add to Home Screen") for a native app experience.

### How do I launch AI agents (Claude Code, Cursor) with one button?

Use the `agent` action type. Configure a button with `"type": "agent"`, set `"target"` to the command (e.g., `"claude"`), `"cwd"` to your project folder, and `"args"` to your preferred terminal (`"wt"`, `"cmd"`, `"powershell"`). One tap opens a terminal in the right folder with your agent running.

### Does rtaDeck work on Windows, macOS, and Linux?

Yes. rtaDeck is fully cross-platform. Keyboard shortcuts use PowerShell on Windows, AppleScript on macOS, and xdotool on Linux. Program launching, URL opening, and terminal spawning all adapt to the OS automatically.

### Can an AI agent modify rtaDeck's configuration?

Yes. The config file (`rtadeck.config.json`) is a standard JSON file with a published schema. rtaDeck watches it for changes — any external edit (by an AI agent, a script, or a text editor) is instantly reflected in the UI. The CLI also provides `--json` output for machine-readable data.

### How is rtaDeck different from other open-source Stream Decks?

rtaDeck is purpose-built for developers: it has first-class support for launching AI coding agents, running CLI commands, sending keyboard shortcuts, and managing multiple profiles per machine. It's also the only one with a retro 8-bit NES aesthetic, zero build step (vanilla JS), and just 6 npm dependencies.

---

## License

MIT
