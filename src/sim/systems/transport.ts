import { ITEM_GAP, SPAWN_INTERVAL_TICKS, STEP } from '../../config/balance';
import { CRAFTERS, craftCooldownTicks } from '../../config/crafters';
import { cooldownTicks } from '../../config/machines';
import { MATERIAL_IDS, type MaterialId } from '../../config/materials';
import { neighbourIndex, sideDirection } from '../grid';
import { addToPile, takeFromPile } from '../pile';
import { unitPrice } from '../economy';
import { nextFloat } from '../rng';
import { errorChance, glassBreakChance } from '../sorting';
import { exitDirection } from '../routing';
import type { Cell, Direction, Item, WorldState } from '../types';

/** Намерение предмета покинуть клетку. Применяется после прохода по всем клеткам. */
interface Transfer {
  item: Item;
  from: number;
  /** В какую клетку переходит. */
  to: number;
  /** Приёмник забирает предмет из мира, а не пропускает дальше. */
  consumed: boolean;
  /** Каким направлением вышел: у развилки оно зависит от материала. */
  exit: Direction;
}

/** Материал очередного предмета по составу купленной партии. */
function rollMaterial(world: WorldState, composition: Record<MaterialId, number>): MaterialId {
  let roll = nextFloat(world);
  for (const id of MATERIAL_IDS) {
    roll -= composition[id];
    if (roll < 0) return id;
  }
  return 'pet';
}

/** Есть ли куда положить предмет в соседе по этому направлению. */
function roomIn(world: WorldState, index: number, dir: Direction): boolean {
  const nextIndex = neighbourIndex(index, dir);
  const next = nextIndex === null ? undefined : world.cells[nextIndex];
  if (!accepts(next)) return false;
  if (next.kind === 'outlet') return true;
  const last = next.items[next.items.length - 1];
  return !last || last.t >= ITEM_GAP;
}

/**
 * Развилка выбирает выход для головного предмета.
 *
 * Обычно она чередует стороны, чтобы делить поток поровну. Но если выбранная
 * сторона забита, а вторая свободна — предмет уходит во вторую: делитель,
 * который встаёт из-за затора в одной ветке, бесполезен.
 */
function chooseSplitterExit(world: WorldState, index: number, cell: Cell): void {
  const head = cell.items[0];
  if (!head) return;

  const preferred = head.exitSide ? sideDirection(cell.dir) : cell.dir;
  if (roomIn(world, index, preferred)) return;

  const other = head.exitSide ? cell.dir : sideDirection(cell.dir);
  if (roomIn(world, index, other)) head.exitSide = !head.exitSide;
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

    if (cell.fromPile) {
      // Раскопка: что свалили вчера, то и достаём, вместе с боем.
      const dug = takeFromPile(world);
      if (!dug) continue;
      world.today.dug++;
      cell.items.push({
        id: world.nextItemId++,
        material: dug.material,
        t: 0,
        dirIn: cell.dir,
        exitSide: false,
        broken: dug.broken,
        form: 'raw',
      });
      continue;
    }

    const batch = world.batch;
    // Партия кончилась — источник молчит: возить больше нечего.
    if (!batch || batch.remaining <= 0) continue;
    batch.remaining--;
    world.today.arrived++;
    cell.items.push({
      id: world.nextItemId++,
      material: rollMaterial(world, batch.composition),
      t: 0,
      dirIn: cell.dir,
      exitSide: false,
      broken: false,
      form: 'raw',
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
  if ((cell.kind === 'sorter' || cell.kind === 'crafter') && cell.cooldown > 0) return 1;

  const nextIndex = neighbourIndex(index, exitDirection(cell, item));
  const next = nextIndex === null ? undefined : world.cells[nextIndex];

  // Конец ленты: стена. Предмет упирается в край клетки и стоит.
  if (!accepts(next)) return 1;

  // Сток принимает всегда и мгновенно.
  if (next.kind === 'outlet' || next.kind === 'waste') return Number.POSITIVE_INFINITY;

  const lastInNext = next.items[next.items.length - 1];
  if (!lastInNext) return 2;
  return 1 + lastInNext.t - ITEM_GAP;
}

function move(world: WorldState): void {
  const distance = world.beltSpeed * STEP;
  // Бой стекла: на разогнанной ленте оно не выдерживает. Считаем шанс один раз
  // на шаг, он одинаков для всех — зависит только от скорости.
  const breakChance = glassBreakChance(world);
  const transfers: Transfer[] = [];

  for (let index = 0; index < world.cells.length; index++) {
    const cell = world.cells[index];
    // Машина отсчитывает своё время даже пустая: иначе первый предмет после
    // простоя проходил бы мгновенно.
    if ((cell.kind === 'sorter' || cell.kind === 'crafter') && cell.cooldown > 0) cell.cooldown--;
    if (cell.items.length === 0) continue;
    if (cell.kind === 'splitter') chooseSplitterExit(world, index, cell);

    for (let position = 0; position < cell.items.length; position++) {
      const item = cell.items[position];
      if (!item) continue;

      if (breakChance > 0 && item.material === 'glass' && !item.broken) {
        item.broken = nextFloat(world) < breakChance;
      }

      item.t = Math.min(item.t + distance, limitFor(world, index, cell, position, item));

      // Уйти из клетки может только головной: остальных держит зазор.
      if (position !== 0 || item.t < 1) continue;

      // Машина ещё не отсчитала своё время. Предел хода уже прижал предмет к
      // выходу, но выпускать его рано: без этой проверки пропускная способность
      // не работает вовсе, потому что упереться в предел и перейти — одно и то же.
      if ((cell.kind === 'sorter' || cell.kind === 'crafter') && cell.cooldown > 0) continue;

      const exit = exitDirection(cell, item);
      const nextIndex = neighbourIndex(index, exit);
      const next = nextIndex === null ? undefined : world.cells[nextIndex];
      if (nextIndex === null || !accepts(next)) continue;

      transfers.push({
        item,
        from: index,
        to: nextIndex,
        consumed: next.kind === 'outlet' || next.kind === 'waste',
        exit,
      });
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
    if (from.kind === 'crafter' && from.crafter) {
      from.cooldown = craftCooldownTicks(from.crafter);
      // Превращение происходит на выходе: что станку не по зубам — проезжает
      // насквозь, но время его всё равно занимает.
      const info = CRAFTERS[from.crafter];
      const suits =
        (info.input === null || info.input === transfer.item.material) &&
        info.from.includes(transfer.item.form);
      if (suits) transfer.item.form = info.output;
    }

    const to = world.cells[transfer.to];
    if (!to) continue;

    // Приёмник забирает предмет и запоминает его материал: из этого потом
    // считается чистота партии.
    if (transfer.consumed) {
      if (to.kind === 'waste') {
        // Сброс: всё уезжает в кучу и оттуда никуда не девается — GDD §7.
        addToPile(world, transfer.item.material, transfer.item.broken);
        world.today.processed++;
        continue;
      }
      // Бой считается отдельно: это уже не стекло, продать его как стекло нельзя.
      if (transfer.item.broken) to.broken++;
      else {
        to.collected[transfer.item.material]++;
        to.value += unitPrice(transfer.item.material, transfer.item.form);
      }
      world.delivered++;
      world.today.processed++;
      continue;
    }

    transfer.item.t -= 1;
    transfer.item.dirIn = transfer.exit;

    // Решение о выходе принимается один раз, на въезде: дальше предмет едет по
    // нему, и рендер показывает то же самое, что посчитает симуляция.
    if (to.kind === 'sorter' && to.machine) {
      const wantsForward = to.filter.includes(transfer.item.material);
      const wrong = nextFloat(world) < errorChance(world, to, transfer.item);
      transfer.item.exitSide = wrong ? wantsForward : !wantsForward;
    } else if (to.kind === 'splitter') {
      // Делитель чередует стороны: поток расходится поровну.
      transfer.item.exitSide = to.altOut;
      to.altOut = !to.altOut;
    } else {
      transfer.item.exitSide = false;
    }

    // В конец: предмет въезжает сзади и оказывается дальше всех от выхода.
    to.items.push(transfer.item);
  }
}

export function transport(world: WorldState): void {
  spawn(world);
  move(world);
}
