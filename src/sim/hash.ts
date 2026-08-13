import { MATERIAL_IDS } from '../config/materials';
import type { WorldState } from './types';

/**
 * Отпечаток состояния мира.
 *
 * Нужен ровно для одного: доказать, что симуляция зависит только от тиков.
 * Два прогона с одним сидом и одной последовательностью команд обязаны давать
 * одинаковый отпечаток на одном и том же тике — хоть на x1, хоть на x4.
 *
 * Числа складываются в строку целиком, без округления: округление скрыло бы
 * именно ту разницу, которую отпечаток и должен ловить.
 *
 * Счётчик тиков в отпечаток не входит: он считает и паузы, а сколько игрок
 * простоял в утренней фазе — не свойство симуляции. Положение в симуляции
 * задают день, фаза и дневной тик, и они в отпечатке есть.
 */
export function hashWorld(world: WorldState): string {
  let hash = 0x811c9dc5;

  const push = (value: string | number | boolean): void => {
    const text = String(value);
    for (let i = 0; i < text.length; i++) {
      hash ^= text.charCodeAt(i);
      hash = Math.imul(hash, 0x01000193);
    }
    hash ^= 0x2c;
    hash = Math.imul(hash, 0x01000193);
  };

  push(world.day);
  push(world.phase);
  push(world.dayTicks);
  push(world.delivered);
  push(world.rngState);
  push(world.nextItemId);
  push(world.beltSpeed);

  for (let index = 0; index < world.cells.length; index++) {
    const cell = world.cells[index];
    if (cell.kind === 'empty' && cell.items.length === 0) continue;

    push(index);
    push(cell.kind);
    push(cell.dir);
    push(cell.machine ?? '-');
    push(cell.cooldown);
    push(cell.altOut);
    push(cell.filter.join('+'));
    push(cell.broken);
    for (const id of MATERIAL_IDS) push(cell.collected[id]);

    for (const item of cell.items) {
      push(item.id);
      push(item.material);
      push(item.t);
      push(item.dirIn);
      push(item.exitSide);
      push(item.broken);
    }
  }

  return (hash >>> 0).toString(16).padStart(8, '0');
}
