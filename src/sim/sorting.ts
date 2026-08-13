import {
  CONFUSABLE,
  GLASS_BREAK_PER_SPEED,
  GLASS_SAFE_SPEED,
  MAX_ERROR_CHANCE,
  NOMINAL_BELT_SPEED,
  SPEED_ACCURACY_PENALTY,
} from '../config/contamination';
import { MACHINES } from '../config/machines';
import type { MaterialId } from '../config/materials';
import type { Cell, Item, WorldState } from './types';

/**
 * Стоит ли похожий на этот материал по другую сторону правила машины.
 *
 * Отделять стекло от органики просто. Отделять стекло от прозрачного ПЭТ —
 * нет, и вот тогда машина начинает промахиваться заметно чаще.
 */
function confusedHere(filter: readonly MaterialId[], material: MaterialId): boolean {
  const wanted = filter.includes(material);
  for (const [a, b] of CONFUSABLE) {
    const twin = a === material ? b : b === material ? a : null;
    if (twin === null) continue;
    if (filter.includes(twin) !== wanted) return true;
  }
  return false;
}

/**
 * Вероятность, что машина отправит предмет не туда.
 *
 * Складывается из трёх причин, и все три — выбор игрока, а не невезение:
 * паспортная точность машины, разгон ленты сверх номинала и похожесть материалов.
 */
export function errorChance(world: WorldState, cell: Cell, item: Item): number {
  if (!cell.machine) return 0;
  const info = MACHINES[cell.machine];

  let error = 1 - info.accuracy;
  error += SPEED_ACCURACY_PENALTY * Math.max(0, world.beltSpeed / NOMINAL_BELT_SPEED - 1);
  if (confusedHere(cell.filter, item.material)) error += info.confusion;

  return Math.min(error, MAX_ERROR_CHANCE);
}

/**
 * Точность машины при текущей скорости ленты, без учёта конкретного материала.
 * Нужна панели: игрок должен видеть, что разгон ленты стоит ему точности.
 */
export function effectiveAccuracy(world: WorldState, cell: Cell): number {
  if (!cell.machine) return 1;
  const info = MACHINES[cell.machine];
  const error = 1 - info.accuracy + SPEED_ACCURACY_PENALTY * Math.max(0, world.beltSpeed / NOMINAL_BELT_SPEED - 1);
  return 1 - Math.min(error, MAX_ERROR_CHANCE);
}

/** Шанс на тик разбить единицу стекла при текущей скорости ленты. */
export function glassBreakChance(world: WorldState): number {
  return Math.max(0, world.beltSpeed - GLASS_SAFE_SPEED) * GLASS_BREAK_PER_SPEED;
}
