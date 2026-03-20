import { createButtonElement } from './button.js';

const container = document.getElementById('grid-container');

export function renderGrid(page, settings, onLongPress) {
  const cols = settings.columns || 5;
  const rows = settings.rows || 3;
  const totalSlots = cols * rows;

  container.innerHTML = '';
  container.style.setProperty('--cols', cols);
  container.style.setProperty('--rows', rows);

  // Create a map of slot -> button
  const slotMap = new Map();
  if (page?.buttons) {
    for (const btn of page.buttons) {
      slotMap.set(btn.slot, btn);
    }
  }

  // Render all slots
  for (let i = 0; i < totalSlots; i++) {
    const button = slotMap.get(i) || null;
    const el = createButtonElement(button, i, onLongPress);
    container.appendChild(el);
  }
}
