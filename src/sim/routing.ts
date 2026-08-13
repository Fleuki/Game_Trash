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
  if (cell.kind !== 'splitter' && cell.kind !== 'sorter') return cell.dir;

  const matched = cell.filter.includes(item.material);
  // Ошибка сортировщика переворачивает решение: предмет уезжает не туда.
  // У развилки ошибок нет, она просто разводит поток.
  const forward = cell.kind === 'sorter' ? matched !== item.misrouted : matched;
  return forward ? cell.dir : sideDirection(cell.dir);
}
