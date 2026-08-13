import { DAY_LENGTH_TICKS, TIME_SPEEDS } from '../config/balance';
import type { DayPhase } from '../sim/types';

const PHASE_LABEL: Record<DayPhase, string> = {
  morning: 'утро',
  day: 'день',
  evening: 'вечер',
};

/** Что предлагает кнопка в паузе. Днём кнопки нет: день кончается сам. */
const ADVANCE_LABEL: Record<DayPhase, string> = {
  morning: 'Начать день',
  day: '',
  evening: 'Следующий день',
};

export interface DayBarState {
  day: number;
  phase: DayPhase;
  dayTicks: number;
  speed: number;
}

export interface DayBar {
  update(state: DayBarState): void;
}

/**
 * Верхняя полоса: какой день, какая фаза, сколько дня осталось и с какой
 * скоростью идёт время.
 */
export function createDayBar(
  element: HTMLElement,
  onAdvance: () => void,
  onSpeed: (speed: number) => void,
): DayBar {
  const title = document.createElement('div');
  title.className = 'day-title';

  const track = document.createElement('div');
  track.className = 'day-track';
  const fill = document.createElement('div');
  fill.className = 'day-fill';
  track.appendChild(fill);

  const speeds = document.createElement('div');
  speeds.className = 'day-speeds';
  const speedButtons = new Map<number, HTMLButtonElement>();
  for (const speed of TIME_SPEEDS) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = speed === 0 ? '❚❚' : `×${speed}`;
    button.title = speed === 0 ? 'Пауза' : `Ускорение ×${speed}`;
    button.addEventListener('click', () => onSpeed(speed));
    speeds.appendChild(button);
    speedButtons.set(speed, button);
  }

  const advance = document.createElement('button');
  advance.type = 'button';
  advance.className = 'day-advance';
  advance.addEventListener('click', onAdvance);

  element.append(title, track, speeds, advance);

  let lastLabel = '';

  return {
    update(state: DayBarState): void {
      const label = `День ${state.day} · ${PHASE_LABEL[state.phase]}`;
      if (label !== lastLabel) {
        title.textContent = label;
        lastLabel = label;
        advance.textContent = ADVANCE_LABEL[state.phase];
        advance.hidden = state.phase === 'day';
      }

      fill.style.width = `${Math.min(100, (state.dayTicks / DAY_LENGTH_TICKS) * 100)}%`;

      for (const [speed, button] of speedButtons) {
        button.classList.toggle('is-active', speed === state.speed);
      }
    },
  };
}
