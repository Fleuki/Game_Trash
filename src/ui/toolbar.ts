import type { BuildMode } from './buildTool';

interface ToolbarButton {
  mode: BuildMode;
  label: string;
  hint: string;
}

const BUTTONS: readonly ToolbarButton[] = [
  { mode: 'belt', label: 'Лента', hint: 'B — тянуть ленту' },
  { mode: 'inlet', label: 'Источник', hint: 'I — ставить источник' },
  { mode: 'splitter', label: 'Развилка', hint: 'R — ставить развилку' },
  { mode: 'manual', label: 'Стол', hint: '1 — ручной стол: 2 ед/с, точность 85%' },
  { mode: 'magnet', label: 'Магнит', hint: '2 — магнит: 6 ед/с, точность 98%, только металл' },
  { mode: 'optical', label: 'Оптика', hint: '3 — оптический: 4 ед/с, точность 92%' },
  { mode: 'outlet', label: 'Сток', hint: 'O — ставить сток' },
  { mode: 'erase', label: 'Снос', hint: 'E — сносить' },
  { mode: 'hand', label: 'Рука', hint: 'H — двигать поле' },
];

export interface Toolbar {
  setMode(mode: BuildMode): void;
}

/**
 * Панель режимов. На телефоне это единственный способ переключиться на снос:
 * правой кнопки там нет.
 */
export function createToolbar(element: HTMLElement, onPick: (mode: BuildMode) => void): Toolbar {
  const buttons = new Map<BuildMode, HTMLButtonElement>();

  for (const item of BUTTONS) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = item.label;
    button.title = item.hint;
    button.addEventListener('click', () => onPick(item.mode));
    element.appendChild(button);
    buttons.set(item.mode, button);
  }

  return {
    setMode(mode: BuildMode): void {
      for (const [buttonMode, button] of buttons) {
        button.classList.toggle('is-active', buttonMode === mode);
      }
    },
  };
}
