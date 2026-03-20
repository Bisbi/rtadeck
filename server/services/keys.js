import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

const PLATFORM = process.platform;

// Map common key names to platform-specific identifiers
const KEY_MAP_POWERSHELL = {
  'ctrl': '^',
  'shift': '+',
  'alt': '%',
  'win': '^{ESC}', // Special handling needed
  'enter': '{ENTER}',
  'tab': '{TAB}',
  'escape': '{ESC}',
  'backspace': '{BACKSPACE}',
  'delete': '{DELETE}',
  'up': '{UP}',
  'down': '{DOWN}',
  'left': '{LEFT}',
  'right': '{RIGHT}',
  'home': '{HOME}',
  'end': '{END}',
  'pageup': '{PGUP}',
  'pagedown': '{PGDN}',
  'space': ' ',
  'f1': '{F1}', 'f2': '{F2}', 'f3': '{F3}', 'f4': '{F4}',
  'f5': '{F5}', 'f6': '{F6}', 'f7': '{F7}', 'f8': '{F8}',
  'f9': '{F9}', 'f10': '{F10}', 'f11': '{F11}', 'f12': '{F12}'
};

function parseKeyCombo(combo) {
  return combo.toLowerCase().split('+').map(k => k.trim());
}

async function sendKeysWindows(combo) {
  const keys = parseKeyCombo(combo);

  // Check if this uses Win key — needs special PowerShell approach
  if (keys.includes('win')) {
    const nonWinKeys = keys.filter(k => k !== 'win');
    // Use PowerShell's SendKeys with Win key via keybd_event
    const script = buildWindowsWinKeyScript(nonWinKeys);
    await execAsync(`powershell -NoProfile -NonInteractive -Command "${script}"`);
    return;
  }

  // Build SendKeys string
  let sendKeysStr = '';
  const modifiers = [];
  const regularKeys = [];

  for (const key of keys) {
    if (key === 'ctrl') modifiers.push('^');
    else if (key === 'shift') modifiers.push('+');
    else if (key === 'alt') modifiers.push('%');
    else if (KEY_MAP_POWERSHELL[key]) regularKeys.push(KEY_MAP_POWERSHELL[key]);
    else regularKeys.push(key);
  }

  const modStr = modifiers.join('');
  const keyStr = regularKeys.join('');

  if (modifiers.length > 0) {
    sendKeysStr = `${modStr}(${keyStr})`;
  } else {
    sendKeysStr = keyStr;
  }

  const ps = `Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('${sendKeysStr}')`;
  await execAsync(`powershell -NoProfile -NonInteractive -Command "${ps}"`);
}

function buildWindowsWinKeyScript(otherKeys) {
  // Use keybd_event for Win key combinations
  const VK_LWIN = '0x5B';
  const lines = [
    `$sig = '[DllImport("user32.dll")] public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);'`,
    `$type = Add-Type -MemberDefinition $sig -Name WinAPI -Namespace KeySim -PassThru`,
    `$type::keybd_event(${VK_LWIN}, 0, 0, [UIntPtr]::Zero)` // Win down
  ];

  for (const key of otherKeys) {
    const vk = getVirtualKeyCode(key);
    if (vk) {
      lines.push(`$type::keybd_event(${vk}, 0, 0, [UIntPtr]::Zero)`);   // key down
      lines.push(`$type::keybd_event(${vk}, 0, 2, [UIntPtr]::Zero)`);   // key up
    }
  }

  lines.push(`$type::keybd_event(${VK_LWIN}, 0, 2, [UIntPtr]::Zero)`); // Win up
  return lines.join('; ');
}

function getVirtualKeyCode(key) {
  const map = {
    'a': '0x41', 'b': '0x42', 'c': '0x43', 'd': '0x44', 'e': '0x45',
    'f': '0x46', 'g': '0x47', 'h': '0x48', 'i': '0x49', 'j': '0x4A',
    'k': '0x4B', 'l': '0x4C', 'm': '0x4D', 'n': '0x4E', 'o': '0x4F',
    'p': '0x50', 'q': '0x51', 'r': '0x52', 's': '0x53', 't': '0x54',
    'u': '0x55', 'v': '0x56', 'w': '0x57', 'x': '0x58', 'y': '0x59', 'z': '0x5A',
    '0': '0x30', '1': '0x31', '2': '0x32', '3': '0x33', '4': '0x34',
    '5': '0x35', '6': '0x36', '7': '0x37', '8': '0x38', '9': '0x39',
    'shift': '0x10', 'ctrl': '0x11', 'alt': '0x12',
    'enter': '0x0D', 'tab': '0x09', 'escape': '0x1B', 'space': '0x20',
    'backspace': '0x08', 'delete': '0x2E',
    'up': '0x26', 'down': '0x28', 'left': '0x25', 'right': '0x27',
    'f1': '0x70', 'f2': '0x71', 'f3': '0x72', 'f4': '0x73',
    'f5': '0x74', 'f6': '0x75', 'f7': '0x76', 'f8': '0x77',
    'f9': '0x78', 'f10': '0x79', 'f11': '0x7A', 'f12': '0x7B'
  };
  return map[key.toLowerCase()] || null;
}

async function sendKeysMac(combo) {
  const keys = parseKeyCombo(combo);
  const parts = [];

  for (const key of keys) {
    if (key === 'ctrl') parts.push('control down');
    else if (key === 'shift') parts.push('shift down');
    else if (key === 'alt') parts.push('option down');
    else if (key === 'cmd' || key === 'win') parts.push('command down');
    else parts.push(`keystroke "${key}"`);
  }

  const modifiers = parts.filter(p => p.endsWith(' down'));
  const keystrokes = parts.filter(p => p.startsWith('keystroke'));

  let script = '';
  if (keystrokes.length > 0 && modifiers.length > 0) {
    script = `${keystrokes[0]} using {${modifiers.join(', ')}}`;
  } else if (keystrokes.length > 0) {
    script = keystrokes[0];
  }

  if (script) {
    await execAsync(`osascript -e 'tell application "System Events" to ${script}'`);
  }
}

async function sendKeysLinux(combo) {
  const keys = parseKeyCombo(combo);
  const xdoKeys = keys.map(k => {
    const map = {
      'ctrl': 'ctrl', 'shift': 'shift', 'alt': 'alt', 'win': 'super',
      'enter': 'Return', 'tab': 'Tab', 'escape': 'Escape',
      'backspace': 'BackSpace', 'delete': 'Delete', 'space': 'space',
      'up': 'Up', 'down': 'Down', 'left': 'Left', 'right': 'Right',
      'f1': 'F1', 'f2': 'F2', 'f3': 'F3', 'f4': 'F4',
      'f5': 'F5', 'f6': 'F6', 'f7': 'F7', 'f8': 'F8',
      'f9': 'F9', 'f10': 'F10', 'f11': 'F11', 'f12': 'F12'
    };
    return map[k] || k;
  });

  await execAsync(`xdotool key ${xdoKeys.join('+')}`);
}

export async function sendKeys(combo) {
  switch (PLATFORM) {
    case 'win32': return sendKeysWindows(combo);
    case 'darwin': return sendKeysMac(combo);
    case 'linux': return sendKeysLinux(combo);
    default: throw new Error(`Unsupported platform: ${PLATFORM}`);
  }
}
