import { sideDirection } from './grid';
import type { Cell, Direction, Item } from './types';

/**
 * Куда клетка отправляет конкретный предмет.
 *
 * Для всех клеток это просто их направление. Для развилки — направление зависит
 * от материала: попал в список — едет прямо, не попал — уходит вбок.
 *
 * Функция нужна и симуляции, и рендеру: предмет во второй половине клетки должен
 * рисоваться уже повёрнутым туда, куда он на самом деле поедет.
 */
export function exitDirection(cell: Cell, item: Item): Direction {
  if (cell.kind !== 'splitter') return cell.dir;
  return cell.filter.includes(item.material) ? cell.dir : sideDirection(cell.dir);
}
