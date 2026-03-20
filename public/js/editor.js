import { api } from './api.js';

const overlay = document.getElementById('editor-overlay');
const form = document.getElementById('editor-form');
const deleteBtn = document.getElementById('ed-delete');
const cancelBtn = document.getElementById('ed-cancel');
const sizeBtns = document.querySelectorAll('.size-btn');
const actionType = document.getElementById('ed-action-type');

let currentButton = null;
let currentSlot = null;
let currentPageId = null;
let currentSize = 'M';
let onSave = null;

// Placeholder/label hints per action type
const ACTION_HINTS = {
  url:   { target: 'URL (es. https://...)',        targetLabel: 'URL',     cwd: false, terminal: false },
  open:  { target: 'Program (es. code, calc.exe)', targetLabel: 'Program', cwd: false, terminal: false },
  keys:  { target: 'Key combo (es. ctrl+shift+p)', targetLabel: 'Keys',    cwd: false, terminal: false },
  cli:   { target: 'Command (es. npm run dev)',     targetLabel: 'Command', cwd: true,  terminal: false },
  agent: { target: 'Agent command (es. claude)',    targetLabel: 'Command', cwd: true,  terminal: true,
           cwdLabel: 'Project Folder', cwdPlaceholder: 'C:\\Users\\...\\MyProject' }
};

export function initEditor(saveCallback) {
  onSave = saveCallback;

  form.addEventListener('submit', handleSave);
  deleteBtn.addEventListener('click', handleDelete);
  cancelBtn.addEventListener('click', close);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });

  sizeBtns.forEach(btn => {
    btn.addEventListener('click', () => setSize(btn.dataset.size));
  });

  actionType.addEventListener('change', updateActionFields);
}

function setSize(size) {
  currentSize = size;
  sizeBtns.forEach(btn => {
    btn.classList.toggle('is-primary', btn.dataset.size === size);
  });
}

function updateActionFields() {
  const type = actionType.value;
  const hints = ACTION_HINTS[type] || ACTION_HINTS.url;

  document.getElementById('ed-target').placeholder = hints.target;
  document.getElementById('ed-target-label').textContent = hints.targetLabel;

  // CWD row
  const cwdRow = document.getElementById('ed-row-cwd');
  cwdRow.style.display = hints.cwd ? '' : 'none';
  if (hints.cwdLabel) {
    document.getElementById('ed-cwd-label').textContent = hints.cwdLabel;
    document.getElementById('ed-cwd').placeholder = hints.cwdPlaceholder || '';
  } else {
    document.getElementById('ed-cwd-label').textContent = 'CWD';
    document.getElementById('ed-cwd').placeholder = 'Working directory (optional)';
  }

  // Terminal row
  document.getElementById('ed-row-terminal').style.display = hints.terminal ? '' : 'none';
}

export function open(button, slot, pageId) {
  currentButton = button;
  currentSlot = slot;
  currentPageId = pageId;

  if (button) {
    document.getElementById('ed-display-type').value = button.display.type;
    document.getElementById('ed-content').value = button.display.content;
    document.getElementById('ed-label').value = button.display.label || '';
    setSize(button.display.size || 'M');
    document.getElementById('ed-bg-color').value = button.display.bgColor || '#1D2B53';
    document.getElementById('ed-color').value = button.display.color || '#FFF1E8';
    document.getElementById('ed-action-type').value = button.action.type;
    document.getElementById('ed-target').value = button.action.target;
    document.getElementById('ed-cwd').value = button.action.cwd || '';
    // Terminal for agent
    if (button.action.type === 'agent' && button.action.args?.[0]) {
      document.getElementById('ed-terminal').value = button.action.args[0];
    } else {
      document.getElementById('ed-terminal').value = 'cmd';
    }
    deleteBtn.style.display = '';
  } else {
    form.reset();
    setSize('M');
    document.getElementById('ed-bg-color').value = '#1D2B53';
    document.getElementById('ed-color').value = '#FFF1E8';
    document.getElementById('ed-terminal').value = 'cmd';
    deleteBtn.style.display = 'none';
  }

  updateActionFields();
  overlay.classList.remove('hidden');
}

function close() {
  overlay.classList.add('hidden');
  currentButton = null;
}

function generateId() {
  return 'btn-' + Date.now().toString(36);
}

async function handleSave(e) {
  e.preventDefault();

  const type = document.getElementById('ed-action-type').value;

  const buttonData = {
    slot: currentSlot,
    display: {
      type: document.getElementById('ed-display-type').value,
      content: document.getElementById('ed-content').value,
      label: document.getElementById('ed-label').value || undefined,
      size: currentSize,
      color: document.getElementById('ed-color').value,
      bgColor: document.getElementById('ed-bg-color').value
    },
    action: {
      type,
      target: document.getElementById('ed-target').value,
      cwd: document.getElementById('ed-cwd').value || undefined,
    }
  };

  // Add terminal as args for agent type
  if (type === 'agent') {
    const terminal = document.getElementById('ed-terminal').value;
    buttonData.action.args = [terminal];
  }

  if (!buttonData.display.label) delete buttonData.display.label;
  if (!buttonData.action.cwd) delete buttonData.action.cwd;

  const id = currentButton?.id || generateId();

  try {
    await api.putButton(id, { ...buttonData, pageId: currentPageId });
    close();
    if (onSave) onSave();
  } catch (err) {
    console.error('[rtaDeck] Save failed:', err.message);
  }
}

async function handleDelete() {
  if (!currentButton) return;
  try {
    await api.deleteButton(currentButton.id);
    close();
    if (onSave) onSave();
  } catch (err) {
    console.error('[rtaDeck] Delete failed:', err.message);
  }
}
