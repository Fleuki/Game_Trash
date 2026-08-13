import { sideDirection } from './grid';
import type { Cell, Direction, Item } from './types';

/**
 * Куда клетка отправляет конкретный предмет.
 *
 * Развилка и сортировщик решают это один раз, при въезде предмета, и решение
 * лежит на самом предмете. Функция нужна и симуляции, и рендеру: предмет во
 * второй половине клетки должен рисоваться уже повёрнутым туда, куда поедет.
 */
export function exitDirection(cell: Cell, item: Item): Direction {
  if (cell.kind !== 'splitter' && cell.kind !== 'sorter') return cell.dir;
  return item.exitSide ? sideDirection(cell.dir) : cell.dir;
}
