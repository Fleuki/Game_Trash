import type { BuildMode } from './buildTool';

interface ToolbarButton {
  mode: BuildMode;
  label: string;
  hint: string;
}

const BUTTONS: readonly ToolbarButton[] = [
  { mode: 'build', label: 'Лента', hint: 'B — тянуть ленту' },
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
