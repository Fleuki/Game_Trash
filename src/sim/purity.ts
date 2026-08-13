import { BROKEN_GLASS_WEIGHT, IMPURITY_WEIGHT } from '../config/contamination';
import { MATERIAL_IDS } from '../config/materials';
import type { Cell } from './types';

/** Сколько всего единиц накопил приёмник. */
export function collectedTotal(cell: Cell): number {
  let total = cell.broken;
  for (const id of MATERIAL_IDS) total += cell.collected[id];
  return total;
}

/**
 * Чистота накопленной партии, 0..1.
 *
 *   чистота = нужное / (нужное + Σ примесь × вес)
 *
 * Пустая партия считается чистой: делить нечего, и показывать 0% там, где ещё
 * ничего не приехало, — врать игроку.
 */
export function purityOf(cell: Cell): number {
  const target = cell.filter[0];
  if (!target) return 1;

  const wanted = cell.collected[target];
  // Бой — примесь в любой партии, даже в стеклянной: это уже не стекло.
  let impurity = cell.broken * BROKEN_GLASS_WEIGHT;
  for (const id of MATERIAL_IDS) {
    if (id === target) continue;
    impurity += cell.collected[id] * IMPURITY_WEIGHT[id];
  }

  if (wanted + impurity === 0) return 1;
  return wanted / (wanted + impurity);
}
