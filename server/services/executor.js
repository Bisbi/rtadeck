import { spawn, exec } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import open from 'open';
import { sendKeys } from './keys.js';

const execAsync = promisify(exec);
const IS_WIN = process.platform === 'win32';

// PowerShell: move cursor to primary monitor center, output old position as "X,Y"
const PS_CURSOR_TO_PRIMARY = `
Add-Type -TypeDefinition 'using System; using System.Runtime.InteropServices; public class Cur { [DllImport("user32.dll")] public static extern bool SetCursorPos(int X, int Y); [DllImport("user32.dll")] public static extern bool GetCursorPos(out POINT p); [StructLayout(LayoutKind.Sequential)] public struct POINT { public int X; public int Y; } }' -ErrorAction SilentlyContinue
$p = New-Object Cur+POINT; [Cur]::GetCursorPos([ref]$p) | Out-Null
Add-Type -AssemblyName System.Windows.Forms
$s = [System.Windows.Forms.Screen]::PrimaryScreen.WorkingArea
[Cur]::SetCursorPos([int]($s.X + $s.Width / 2), [int]($s.Y + $s.Height / 2)) | Out-Null
Write-Output "$($p.X),$($p.Y)"
`.trim().replace(/\n/g, ' ');

function psRestoreCursor(x, y) {
  return `Add-Type -TypeDefinition 'using System; using System.Runtime.InteropServices; public class Cur { [DllImport("user32.dll")] public static extern bool SetCursorPos(int X, int Y); }' -ErrorAction SilentlyContinue; [Cur]::SetCursorPos(${x}, ${y}) | Out-Null`;
}

async function withCursorOnPrimary(fn) {
  if (!IS_WIN) return fn();

  let oldPos = null;
  try {
    const { stdout } = await execAsync(
      `powershell -NoProfile -NonInteractive -Command "${PS_CURSOR_TO_PRIMARY}"`,
      { timeout: 3000 }
    );
    const parts = stdout.trim().split(',');
    if (parts.length === 2) oldPos = { x: parts[0], y: parts[1] };
  } catch { /* continue anyway */ }

  const result = await fn();

  // Restore cursor back after the app has had time to spawn its window
  if (oldPos) {
    setTimeout(async () => {
      try {
        await execAsync(
          `powershell -NoProfile -NonInteractive -Command "${psRestoreCursor(oldPos.x, oldPos.y)}"`,
          { timeout: 3000 }
        );
      } catch { /* ignore */ }
    }, 2000);
  }

  return result;
}

export async function executeAction(action) {
  const { type, target, cwd, args = [] } = action;

  switch (type) {
    case 'open':
      return withCursorOnPrimary(() => execOpen(target, args));
    case 'url':
      return withCursorOnPrimary(() => execUrl(target));
    case 'keys':
      return execKeys(target);
    case 'cli':
      return withCursorOnPrimary(() => execCli(target, cwd, args));
    case 'agent':
      return execAgent(target, cwd, args);
    default:
      throw new Error(`Unknown action type: ${type}`);
  }
}

async function execOpen(target, args) {
  await open(target, { app: { arguments: args } });
  return { ok: true, message: `Opened: ${target}` };
}

async function execUrl(target) {
  await open(target);
  return { ok: true, message: `Opened URL: ${target}` };
}

async function execKeys(combo) {
  await sendKeys(combo);
  return { ok: true, message: `Sent keys: ${combo}` };
}

function execCli(command, cwd, args) {
  return new Promise((resolve, reject) => {
    const fullCmd = args.length > 0 ? `${command} ${args.join(' ')}` : command;
    const workDir = cwd ? path.resolve(cwd) : process.cwd();

    const child = spawn(fullCmd, {
      shell: true,
      cwd: workDir,
      detached: true,
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', (d) => { stdout += d.toString(); });
    child.stderr?.on('data', (d) => { stderr += d.toString(); });

    const timeout = setTimeout(() => {
      child.unref();
      resolve({ ok: true, message: `CLI running: ${fullCmd}`, stdout: stdout.slice(0, 2000), stderr: stderr.slice(0, 2000) });
    }, 10000);

    child.on('close', (code) => {
      clearTimeout(timeout);
      if (code === 0) {
        resolve({ ok: true, message: `CLI completed: ${fullCmd}`, stdout: stdout.slice(0, 2000) });
      } else {
        resolve({ ok: false, message: `CLI exited with code ${code}`, stderr: stderr.slice(0, 2000) });
      }
    });

    child.on('error', (err) => {
      clearTimeout(timeout);
      reject(new Error(`CLI failed: ${err.message}`));
    });
  });
}

async function execAgent(target, cwd, args) {
  // target = command to run (e.g. "claude")
  // cwd = folder to open in
  // args[0] = terminal to use (cmd, powershell, wt). Default: cmd
  const workDir = cwd ? path.resolve(cwd) : process.cwd();
  const command = target || 'claude';
  const terminal = (args && args[0]) || 'cmd';

  if (process.platform === 'win32') {
    return execAgentWindows(command, workDir, terminal);
  } else if (process.platform === 'darwin') {
    return execAgentMac(command, workDir);
  } else {
    return execAgentLinux(command, workDir, terminal);
  }
}

function execAgentWindows(command, workDir, terminal) {
  return new Promise((resolve, reject) => {
    let spawnCmd, spawnArgs, spawnOpts;

    const baseOpts = {
      detached: true,
      windowsHide: false,
      stdio: 'ignore',
      cwd: workDir
    };

    switch (terminal.toLowerCase()) {
      case 'wt':
      case 'windows-terminal':
        spawnCmd = 'wt.exe';
        spawnArgs = ['-d', workDir, 'cmd', '/k', command];
        spawnOpts = baseOpts;
        break;
      case 'powershell':
      case 'pwsh':
        spawnCmd = terminal + '.exe';
        spawnArgs = ['-NoExit', '-Command', `Set-Location '${workDir}'; ${command}`];
        spawnOpts = baseOpts;
        break;
      case 'cmd':
      default:
        spawnCmd = 'cmd.exe';
        spawnArgs = ['/k', command];
        spawnOpts = baseOpts;
        break;
    }

    const child = spawn(spawnCmd, spawnArgs, spawnOpts);
    child.unref();

    child.on('error', (err) => {
      reject(new Error(`Failed to open terminal: ${err.message}`));
    });

    setTimeout(() => {
      resolve({ ok: true, message: `Agent started: ${command} in ${workDir} (${terminal})` });
    }, 500);
  });
}

function execAgentMac(command, workDir) {
  return new Promise((resolve, reject) => {
    const script = `tell application "Terminal"
      activate
      do script "cd '${workDir}' && ${command}"
    end tell`;

    const child = spawn('osascript', ['-e', script], {
      detached: true,
      stdio: 'ignore'
    });
    child.unref();
    child.on('error', (err) => reject(new Error(`Failed: ${err.message}`)));
    setTimeout(() => resolve({ ok: true, message: `Agent started: ${command} in ${workDir}` }), 500);
  });
}

function execAgentLinux(command, workDir, terminal) {
  return new Promise((resolve, reject) => {
    const term = terminal || 'x-terminal-emulator';
    const child = spawn(term, ['-e', `bash -c 'cd "${workDir}" && ${command}; exec bash'`], {
      detached: true,
      stdio: 'ignore'
    });
    child.unref();
    child.on('error', (err) => reject(new Error(`Failed: ${err.message}`)));
    setTimeout(() => resolve({ ok: true, message: `Agent started: ${command} in ${workDir}` }), 500);
  });
}

