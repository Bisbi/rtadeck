import { api } from './api.js';

export function createButtonElement(button, slot, onLongPress) {
  const el = document.createElement('div');
  el.className = 'deck-btn';
  el.dataset.slot = slot;

  if (!button) {
    el.classList.add('empty');
    el.dataset.empty = 'true';
    setupGestures(el, null, onLongPress);
    return el;
  }

  el.dataset.id = button.id;
  const { display } = button;

  // Apply colors
  if (display.bgColor) el.style.background = display.bgColor;
  if (display.color) el.style.borderColor = display.color + '44';

  // Icon
  const icon = document.createElement('span');
  icon.className = `btn-icon size-${display.size || 'M'}`;
  if (display.color) icon.style.color = display.color;
  icon.textContent = display.content;
  el.appendChild(icon);

  // Label
  if (display.label) {
    const label = document.createElement('span');
    label.className = 'btn-label';
    label.textContent = display.label;
    el.appendChild(label);
  }

  setupGestures(el, button, onLongPress);
  return el;
}

function setupGestures(el, button, onLongPress) {
  let longPressTimer = null;
  let isLongPress = false;

  const startPress = (e) => {
    isLongPress = false;
    longPressTimer = setTimeout(() => {
      isLongPress = true;
      el.classList.remove('pressing');
      onLongPress(button, parseInt(el.dataset.slot));
    }, 500);
    if (button) el.classList.add('pressing');
  };

  const endPress = () => {
    clearTimeout(longPressTimer);
    el.classList.remove('pressing');
    if (!isLongPress && button) {
      pressButton(el, button);
    }
  };

  const cancelPress = () => {
    clearTimeout(longPressTimer);
    el.classList.remove('pressing');
  };

  el.addEventListener('pointerdown', startPress);
  el.addEventListener('pointerup', endPress);
  el.addEventListener('pointerleave', cancelPress);
  el.addEventListener('pointercancel', cancelPress);

  // Prevent context menu on long press
  el.addEventListener('contextmenu', (e) => e.preventDefault());
}

async function pressButton(el, button) {
  el.classList.add('flash');
  setTimeout(() => el.classList.remove('flash'), 300);

  try {
    await api.pressButton(button.id);
  } catch (err) {
    console.error(`[rtaDeck] Action failed: ${err.message}`);
  }
}
