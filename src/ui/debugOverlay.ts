
import type { CellCoord } from '../sim/types';
import type { BuildMode } from './buildTool';

/** Показания цикла и камеры за последний замер. */
export interface DebugStats {
  /** Абсолютный счётчик шагов симуляции. */
  tick: number;
  /** Шагов в секунду за последнюю секунду. Должно быть 60. */
  tps: number;
  /** Кадров в секунду за последнюю секунду. */
  fps: number;
  /** Среднее время одного шага симуляции, мс. Бюджет из PLAN §7 — до 8 мс. */
  stepMs: number;
  /**
   * Дрейф в тиках: сколько шагов сделано минус сколько причиталось за время,
   * что вкладка была видима. Держится в пределах одного шага — значит, 60 Гц ровные.
   */
  drift: number;
  /** Сколько шагов отброшено клампом: уход в фон, фризы вкладки. */
  skipped: number;
  backend: string;
  /** Клетка под курсором. */
  hover: CellCoord | null;
  /** Последняя клетка, по которой кликнули или тапнули. */
  lastTap: CellCoord | null;
  zoom: number;
  mode: BuildMode;
  /** Сколько клеток занято лентой. */
  belts: number;
  /** Предметов на лентах прямо сейчас. */
  items: number;
  /** Скорость ленты, клеток в секунду. */
  beltSpeed: number;
  /** Сколько предметов ушло через стоки. */
  delivered: number;
}

const MODE_LABEL: Record<BuildMode, string> = {
  belt: 'лента',
  inlet: 'источник',
  outlet: 'сток',
  splitter: 'развилка',
  manual: 'стол',
  magnet: 'магнит',
  optical: 'оптика',
  erase: 'снос',
  hand: 'рука',
};

const UPDATE_INTERVAL_MS = 250;

function pad(label: string, value: string): string {
  return label.padEnd(11) + value;
}

function formatCell(cell: CellCoord | null): string {
  return cell ? `${cell.cx}, ${cell.cy}` : '—';
}

/**
 * Отладочный оверлей. Обычный DOM поверх канваса (PLAN §3.1), обновляется четыре раза
 * в секунду — чаще незачем, а на каждый кадр это лишняя работа с текстом.
 */
export function createDebugOverlay(element: HTMLElement): { update(stats: DebugStats): void } {
  let lastUpdate = -Infinity;

  return {
    update(stats: DebugStats): void {
      const now = performance.now();
      if (now - lastUpdate < UPDATE_INTERVAL_MS) return;
      lastUpdate = now;

      element.textContent = [
        pad('тик', String(stats.tick)),
        pad('TPS', stats.tps.toFixed(1)),
        pad('FPS', stats.fps.toFixed(1)),
        pad('шаг сим', `${stats.stepMs.toFixed(3)} мс`),
        pad('дрейф', `${stats.drift.toFixed(2)} тика`),
        pad('фон', `${Math.round(stats.skipped)} тиков отброшено`),
        pad('рендер', stats.backend),
        '',
        pad('курсор', formatCell(stats.hover)),
        pad('клик', formatCell(stats.lastTap)),
        pad('зум', `×${stats.zoom.toFixed(2)}`),
        pad('режим', MODE_LABEL[stats.mode]),
        pad('лент', String(stats.belts)),
        pad('предметов', String(stats.items)),
        pad('скорость', `${stats.beltSpeed.toFixed(1)} кл/с`),
        pad('в стоки', String(stats.delivered)),
      ].join('\n');
    },
  };
}
