import { GRID_HEIGHT, GRID_WIDTH } from '../config/grid';
import { MATERIAL_IDS, type MaterialId } from '../config/materials';
import { PILE_CELL_CAPACITY } from '../config/waste';
import { cellIndex, isBuildable } from './grid';
import { cellCoord } from './grid';
import { nextInt } from './rng';
import type { WorldState } from './types';

/** Сколько всего лежит в куче. */
export function pileTotal(world: WorldState): number {
  let total = world.pileBroken;
  for (const id of MATERIAL_IDS) total += world.pile[id];
  return total;
}

/**
 * Порядок, в котором куча занимает клетки: расползается пятном из левого
 * нижнего угла. Полоса по краю читалась бы как элемент интерфейса, а куча
 * должна выглядеть кучей.
 */
const CLAIM_ORDER: readonly number[] = (() => {
  const cells: { index: number; rank: number; cx: number }[] = [];
  for (let cy = 0; cy < GRID_HEIGHT; cy++) {
    for (let cx = 0; cx < GRID_WIDTH; cx++) {
      cells.push({ index: cellIndex(cx, cy), rank: cx + (GRID_HEIGHT - 1 - cy), cx });
    }
  }
  cells.sort((a, b) => a.rank - b.rank || a.cx - b.cx);
  return cells.map((cell) => cell.index);
})();

/**
 * Какие клетки занимает куча прямо сейчас.
 *
 * Всё построенное куча обходит: она ложится туда, где свободно, и отъедает
 * место под будущие линии. Строить на занятых клетках нельзя — это и есть
 * «занимает место» из GDD §7.
 */
export function pileCells(world: WorldState): number[] {
  const needed = Math.ceil(pileTotal(world) / PILE_CELL_CAPACITY);
  if (needed === 0) return [];

  const claimed: number[] = [];
  for (const index of CLAIM_ORDER) {
    if (claimed.length >= needed) break;
    const cell = world.cells[index];
    if (!cell || cell.kind !== 'empty') continue;
    // Куча лежит на своей территории и не расползается на закрытые участки.
    if (!isBuildable(cellCoord(index).cx, world.plots)) continue;
    claimed.push(index);
  }
  return claimed;
}

/** Занята ли клетка кучей. */
export function isUnderPile(world: WorldState, index: number): boolean {
  return pileCells(world).includes(index);
}

/** Свалить единицу в кучу. */
export function addToPile(world: WorldState, material: MaterialId, broken: boolean): void {
  if (broken) world.pileBroken++;
  else world.pile[material]++;
}

/**
 * Вывезти часть кучи за деньги.
 *
 * Забирается пропорционально составу: мусоровоз не выбирает, что грузить.
 * Не хватило денег — вывозим столько, на сколько хватает.
 */
export function disposeWaste(world: WorldState, requested: number, costPerUnit: number): number {
  const total = pileTotal(world);
  const affordable = costPerUnit > 0 ? Math.floor(world.money / costPerUnit) : requested;
  const units = Math.max(0, Math.min(requested, total, affordable));
  if (units === 0) return 0;

  let left = units;
  const share = units / total;

  for (const id of MATERIAL_IDS) {
    const take = Math.min(left, Math.round(world.pile[id] * share));
    world.pile[id] -= take;
    left -= take;
  }
  if (left > 0) {
    const take = Math.min(left, world.pileBroken);
    world.pileBroken -= take;
    left -= take;
  }
  // Округление могло не добрать: доснимаем с того, где ещё есть.
  for (const id of MATERIAL_IDS) {
    if (left <= 0) break;
    const take = Math.min(left, world.pile[id]);
    world.pile[id] -= take;
    left -= take;
  }

  const disposed = units - left;
  const cost = disposed * costPerUnit;
  world.money -= cost;
  world.today.disposedUnits += disposed;
  world.today.disposalCost += cost;
  return disposed;
}

/**
 * Достать единицу из кучи.
 *
 * Что попадётся — то и попадётся: куча помнит, что в неё свалили, поэтому
 * раскопка возвращает ровно вчерашний состав, включая бой. Это и есть петля
 * из GDD §7: провал не наказывает, а откладывается в актив.
 */
export function takeFromPile(world: WorldState): { material: MaterialId; broken: boolean } | null {
  const total = pileTotal(world);
  if (total === 0) return null;

  let roll = nextInt(world, total);
  for (const id of MATERIAL_IDS) {
    if (roll < world.pile[id]) {
      world.pile[id]--;
      return { material: id, broken: false };
    }
    roll -= world.pile[id];
  }

  if (world.pileBroken > 0) {
    world.pileBroken--;
    return { material: 'glass', broken: true };
  }
  return null;
}
