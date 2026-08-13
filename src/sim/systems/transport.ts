import { SPAWN_INTERVAL_TICKS, STEP } from '../../config/balance';
import { neighbourIndex } from '../grid';
import type { WorldState } from '../types';

/** Источники выпускают по предмету разом, когда истёк общий интервал. */
function spawn(world: WorldState): void {
  world.spawnTimer++;
  if (world.spawnTimer < SPAWN_INTERVAL_TICKS) return;
  world.spawnTimer = 0;

  for (let index = 0; index < world.cells.length; index++) {
    const cell = world.cells[index];
    if (!cell || cell.kind !== 'inlet') continue;
    world.items.push({ id: world.nextItemId++, cell: index, t: 0, dirIn: cell.dir });
  }
}

/**
 * Движение предметов по лентам.
 *
 * Предмет живёт в клетке и хранит прогресс внутри неё. Дошёл до конца — переходит
 * в следующую по направлению клетки. Некуда идти — исчезает: пока это конец линии,
 * очередь и обратное давление появятся в S4, а куча отходов — в S13.
 */
function move(world: WorldState): void {
  const distance = world.beltSpeed * STEP;
  const survivors: typeof world.items = [];

  for (const item of world.items) {
    item.t += distance;

    let alive = true;
    // while, а не if: на большой скорости за один шаг можно пройти несколько клеток.
    while (item.t >= 1) {
      const cell = world.cells[item.cell];
      if (!cell) {
        alive = false;
        break;
      }

      const nextIndex = neighbourIndex(item.cell, cell.dir);
      const next = nextIndex === null ? undefined : world.cells[nextIndex];
      if (nextIndex === null || !next || next.kind === 'empty') {
        alive = false;
        break;
      }

      item.dirIn = cell.dir;
      item.cell = nextIndex;
      item.t -= 1;
    }

    if (alive) survivors.push(item);
  }

  world.items = survivors;
}

export function transport(world: WorldState): void {
  spawn(world);
  move(world);
}
