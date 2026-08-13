import { ITEM_GAP, SPAWN_INTERVAL_TICKS, STEP } from '../../config/balance';
import { MACHINES, cooldownTicks } from '../../config/machines';
import { SPAWN_MIX, SPAWN_MIX_TOTAL, type MaterialId } from '../../config/materials';
import { neighbourIndex } from '../grid';
import { nextFloat } from '../rng';
import { exitDirection } from '../routing';
import type { Cell, Direction, Item, WorldState } from '../types';

/** Намерение предмета покинуть клетку. Применяется после прохода по всем клеткам. */
interface Transfer {
  item: Item;
  from: number;
  /** Куда переходит. null — уходит в сток и покидает мир. */
  to: number | null;
  /** Каким направлением вышел: у развилки оно зависит от материала. */
  exit: Direction;
}

/** Материал очередного предмета по весам состава. */
function rollMaterial(world: WorldState): MaterialId {
  let roll = nextFloat(world) * SPAWN_MIX_TOTAL;
  for (const entry of SPAWN_MIX) {
    roll -= entry.weight;
    if (roll < 0) return entry.material;
  }
  return SPAWN_MIX[SPAWN_MIX.length - 1]?.material ?? 'pet';
}

/** Принимает ли клетка предметы. Пустая — не принимает, это конец ленты. */
function accepts(cell: Cell | undefined): cell is Cell {
  return cell !== undefined && cell.kind !== 'empty';
}

/**
 * Источники выпускают по предмету, если у них есть куда его положить.
 * Забился вход — источник встаёт вместе с линией, а не сыплет предметы друг в друга.
 */
function spawn(world: WorldState): void {
  world.spawnTimer++;
  if (world.spawnTimer < SPAWN_INTERVAL_TICKS) return;
  world.spawnTimer = 0;

  for (const cell of world.cells) {
    if (cell.kind !== 'inlet') continue;
    const last = cell.items[cell.items.length - 1];
    if (last && last.t < ITEM_GAP) continue;
    cell.items.push({
      id: world.nextItemId++,
      material: rollMaterial(world),
      t: 0,
      dirIn: cell.dir,
      misrouted: false,
    });
  }
}

/**
 * Докуда предмету разрешено доехать в этой клетке.
 *
 * Это единственное место, где возникает затор: предел головного предмета зависит
 * от того, что творится дальше по линии, а предел остальных — от впередиидущего
 * в той же клетке. Обратное давление появляется само, отдельного кода для него нет.
 */
function limitFor(
  world: WorldState,
  index: number,
  cell: Cell,
  position: number,
  item: Item,
): number {
  const ahead = cell.items[position - 1];
  if (ahead) return ahead.t - ITEM_GAP;

  // Сортировщик обрабатывает предметы по одному: пока не отсчитал своё время,
  // головной предмет стоит у выхода. Отсюда берётся пропускная способность.
  if (cell.kind === 'sorter' && cell.cooldown > 0) return 1;

  const nextIndex = neighbourIndex(index, exitDirection(cell, item));
  const next = nextIndex === null ? undefined : world.cells[nextIndex];

  // Конец ленты: стена. Предмет упирается в край клетки и стоит.
  if (!accepts(next)) return 1;

  // Сток принимает всегда и мгновенно.
  if (next.kind === 'outlet') return Number.POSITIVE_INFINITY;

  const lastInNext = next.items[next.items.length - 1];
  if (!lastInNext) return 2;
  return 1 + lastInNext.t - ITEM_GAP;
}

function move(world: WorldState): void {
  const distance = world.beltSpeed * STEP;
  const transfers: Transfer[] = [];

  for (let index = 0; index < world.cells.length; index++) {
    const cell = world.cells[index];
    // Машина отсчитывает своё время даже пустая: иначе первый предмет после
    // простоя проходил бы мгновенно.
    if (cell.kind === 'sorter' && cell.cooldown > 0) cell.cooldown--;
    if (cell.items.length === 0) continue;

    for (let position = 0; position < cell.items.length; position++) {
      const item = cell.items[position];
      if (!item) continue;

      item.t = Math.min(item.t + distance, limitFor(world, index, cell, position, item));

      // Уйти из клетки может только головной: остальных держит зазор.
      if (position !== 0 || item.t < 1) continue;

      // Машина ещё не отсчитала своё время. Предел хода уже прижал предмет к
      // выходу, но выпускать его рано: без этой проверки пропускная способность
      // не работает вовсе, потому что упереться в предел и перейти — одно и то же.
      if (cell.kind === 'sorter' && cell.cooldown > 0) continue;

      const exit = exitDirection(cell, item);
      const nextIndex = neighbourIndex(index, exit);
      const next = nextIndex === null ? undefined : world.cells[nextIndex];
      if (!accepts(next)) continue;

      transfers.push({ item, from: index, to: next.kind === 'outlet' ? null : nextIndex, exit });
    }
  }

  // Переходы применяются после прохода: иначе предмет, перешедший в клетку с
  // большим индексом, поехал бы второй раз в том же шаге.
  for (const transfer of transfers) {
    const from = world.cells[transfer.from];
    if (!from) continue;
    from.items.shift();

    // Машина отпустила предмет — заводим её паузу до следующего.
    if (from.kind === 'sorter' && from.machine) {
      from.cooldown = cooldownTicks(from.machine);
    }

    if (transfer.to === null) {
      world.delivered++;
      continue;
    }

    const to = world.cells[transfer.to];
    if (!to) continue;
    transfer.item.t -= 1;
    transfer.item.dirIn = transfer.exit;

    // Решение принимается один раз, на въезде: дальше предмет едет по нему,
    // и рендер показывает то же самое, что посчитает симуляция.
    if (to.kind === 'sorter' && to.machine) {
      transfer.item.misrouted = nextFloat(world) >= MACHINES[to.machine].accuracy;
    } else {
      transfer.item.misrouted = false;
    }

    // В конец: предмет въезжает сзади и оказывается дальше всех от выхода.
    to.items.push(transfer.item);
  }
}

export function transport(world: WorldState): void {
  spawn(world);
  move(world);
}
