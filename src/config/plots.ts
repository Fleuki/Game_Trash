import { GRID_WIDTH } from './grid';

/**
 * Участки. Три максимум — GDD §11, все видны на одном экране без прокрутки.
 * Стартуешь на одном, докупаешь два.
 */
export const PLOT_COUNT = 3;

/** Ширина участка в клетках. */
export const PLOT_WIDTH = 10;

/** Полоса между участками: по ней не строят, она разделяет площадки визуально. */
export const PLOT_GAP = 1;

/** Цена участка, ₽. GDD §11. */
export const PLOT_COST = 5000;

/** Содержание каждого дополнительного участка, ₽ в день. GDD §11. */
export const PLOT_UPKEEP = 100;

/** Колонки участка: от и до включительно. */
export function plotColumns(index: number): { from: number; to: number } {
  const from = index * (PLOT_WIDTH + PLOT_GAP);
  return { from, to: Math.min(from + PLOT_WIDTH - 1, GRID_WIDTH - 1) };
}

/** Какому участку принадлежит колонка. null — разделительная полоса. */
export function plotOfColumn(cx: number): number | null {
  const step = PLOT_WIDTH + PLOT_GAP;
  const index = Math.floor(cx / step);
  if (index >= PLOT_COUNT) return null;
  return cx - index * step < PLOT_WIDTH ? index : null;
}
