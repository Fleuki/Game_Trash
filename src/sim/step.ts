import type { Command } from '../commands/types';
import { buildCost, crafterCost, refundFor, valueOf } from './economy';
import { cellIndex, inBounds, isBuildable } from './grid';
import { defaultMachineFilter } from '../config/machines';
import { emptyCollected } from './world';
import { advancePhase, dayCycle } from './systems/dayCycle';
import { selectOffer } from './systems/market';
import { applyShipment, takeContract } from './systems/contracts';
import { disposeWaste, isUnderPile } from './pile';
import { allowedMaterials, isBuildUnlocked, isPlotUnlocked } from './tutorial';
import { DISPOSAL_COST_PER_UNIT } from '../config/waste';
import { PLOT_COST, PLOT_COUNT } from '../config/plots';
import { FREE_MODE_MONEY } from '../config/certification';
import { transport } from './systems/transport';
import type { WorldState } from './types';

/**
 * Применить одну команду. Единственное место, где мир меняется по воле игрока.
 */
function applyCommand(world: WorldState, command: Command): void {
  // Очередь уже отсеяла невалидное, но симуляция никому не верит на слово:
  // команда может прийти из сейва или, в будущем, по сети.
  if (command.type === 'SET_BELT_SPEED') {
    world.beltSpeed = command.value;
    return;
  }

  if (command.type === 'ADVANCE_PHASE') {
    advancePhase(world);
    return;
  }

  if (command.type === 'SELECT_OFFER') {
    selectOffer(world, command.index);
    return;
  }

  if (command.type === 'TAKE_CONTRACT') {
    takeContract(world, command.index);
    return;
  }

  if (command.type === 'ENTER_FREE_MODE') {
    if (!world.certificate || world.freeMode) return;
    world.freeMode = true;
    world.money += FREE_MODE_MONEY;
    // Незакрытые заказы больше не висят: сроков в свободном режиме нет.
    for (const contract of world.contracts) {
      if (contract.status === 'active') contract.status = 'done';
    }
    world.contractOffers = [];
    return;
  }

  if (command.type === 'BUY_PLOT') {
    if (!isPlotUnlocked(world.day)) return;
    if (world.plots >= PLOT_COUNT || world.money < PLOT_COST) return;
    world.money -= PLOT_COST;
    world.today.spent += PLOT_COST;
    world.plots++;
    world.revision++;
    return;
  }

  if (command.type === 'MOVE_CELL') {
    // Перенос — это снятие модуля и установка его на новое место, а не покупка:
    // денег он не стоит. GDD §10: нельзя наказывать за хорошо сделанную работу.
    const fromIndex = cellIndex(command.cx, command.cy);
    const toIndex = cellIndex(command.toCx, command.toCy);
    if (fromIndex === toIndex) return;

    const source = world.cells[fromIndex];
    const target = world.cells[toIndex];
    if (!source || !target || source.kind === 'empty' || target.kind !== 'empty') return;
    if (!isBuildable(command.toCx, world.plots)) return;
    if (isUnderPile(world, toIndex)) return;

    target.kind = source.kind;
    target.dir = source.dir;
    target.machine = source.machine;
    target.crafter = source.crafter;
    target.filter = [...source.filter];
    target.fromPile = source.fromPile;
    target.altOut = source.altOut;
    target.cooldown = source.cooldown;
    target.collected = { ...source.collected };
    target.broken = source.broken;
    target.value = source.value;
    // Предметы едут вместе с клеткой: они уже оплачены и никуда не пропадают.
    target.items = source.items;

    source.kind = 'empty';
    source.machine = null;
    source.crafter = null;
    source.filter = [];
    source.fromPile = false;
    source.cooldown = 0;
    source.collected = emptyCollected();
    source.broken = 0;
    source.value = 0;
    source.items = [];

    world.revision++;
    return;
  }

  if (command.type === 'DISPOSE_WASTE') {
    disposeWaste(world, command.units, DISPOSAL_COST_PER_UNIT);
    return;
  }

  if (!inBounds(command.cx, command.cy)) return;

  const cell = world.cells[cellIndex(command.cx, command.cy)];
  if (!cell) return;

  // Постройка стоит денег. Замена того, что уже стоит, возвращает часть
  // прежней стоимости: игрок не должен бояться передумать.
  if (command.type === 'PLACE_BELT' || command.type === 'PLACE_INLET' ||
      command.type === 'PLACE_OUTLET' || command.type === 'PLACE_SPLITTER' ||
      command.type === 'PLACE_SORTER' || command.type === 'PLACE_WASTE' ||
      command.type === 'PLACE_CRAFTER') {
    // Под кучей не строят: она занимает место, пока её не вывезут.
    if (isUnderPile(world, cellIndex(command.cx, command.cy))) return;
    // За границами открытых участков и на разделительных полосах — тоже.
    if (!isBuildable(command.cx, world.plots)) return;

    const machine = command.type === 'PLACE_SORTER' ? command.machine : null;
    const crafter = command.type === 'PLACE_CRAFTER' ? command.crafter : null;
    const kind =
      command.type === 'PLACE_BELT'
        ? 'belt'
        : command.type === 'PLACE_INLET'
          ? 'inlet'
          : command.type === 'PLACE_OUTLET'
            ? 'outlet'
            : command.type === 'PLACE_SPLITTER'
              ? 'splitter'
              : command.type === 'PLACE_WASTE'
                ? 'waste'
                : command.type === 'PLACE_CRAFTER'
                  ? 'crafter'
                  : 'sorter';

    // Ещё не открытое не строится, даже если команда пришла мимо панели —
    // GDD §13. Проверка здесь, а не в интерфейсе: правило одно на всех, а
    // панель — только его отражение. У сортировщика и станка открывается
    // конкретная машина, у прочего — сама клетка.
    if (kind !== 'sorter' && kind !== 'crafter' && !isBuildUnlocked(kind, world.day)) return;
    if (machine && !isBuildUnlocked(machine, world.day)) return;
    if (crafter && !isBuildUnlocked(crafter, world.day)) return;

    // Повторная постройка того же самого ничего не меняет и денег не стоит.
    const same = cell.kind === kind && cell.machine === machine && cell.crafter === crafter;
    if (same && kind !== 'belt') return;
    if (same && cell.dir === command.dir) return;

    const cost = crafter ? crafterCost(crafter) : buildCost(kind, machine);
    const refund = refundFor(cell);
    if (world.money + refund < cost) return;

    world.money += refund - cost;
    world.today.spent += cost;
    world.today.refunded += refund;
  }

  switch (command.type) {
    case 'PLACE_BELT':
      cell.kind = 'belt';
      cell.dir = command.dir;
      world.revision++;
      break;

    case 'PLACE_INLET': {
      // Разгрузочная площадка одна на весь завод — GDD §11. Новая не ставится
      // рядом, а переезжает: всё приезжает в одну точку, и линии дерутся за неё.
      const previous = world.cells.findIndex((other) => other.kind === 'inlet');
      const moving = previous >= 0;
      if (moving) {
        const old = world.cells[previous];
        if (old) {
          old.kind = 'empty';
          old.items.length = 0;
          cell.fromPile = old.fromPile;
          // Переезд не покупка: деньги за вторую разгрузку не берём.
          world.money += buildCost('inlet', null);
          world.today.spent -= buildCost('inlet', null);
        }
      } else {
        cell.fromPile = false;
      }
      cell.kind = 'inlet';
      cell.dir = command.dir;
      world.revision++;
      break;
    }

    case 'PLACE_CRAFTER':
      cell.kind = 'crafter';
      cell.dir = command.dir;
      cell.crafter = command.crafter;
      cell.cooldown = 0;
      world.revision++;
      break;

    case 'PLACE_WASTE':
      cell.kind = 'waste';
      cell.dir = command.dir;
      cell.items.length = 0;
      world.revision++;
      break;

    case 'PLACE_OUTLET':
      cell.kind = 'outlet';
      cell.dir = command.dir;
      // Приёмник забирает предметы мгновенно, держать их в себе ему незачем.
      cell.items.length = 0;
      cell.collected = emptyCollected();
      cell.broken = 0;
      cell.value = 0;
      // Приёмник без назначенной фракции ничего не значит, поэтому по умолчанию
      // он принимает ПЭТ — базовый материал.
      cell.filter = ['pet'];
      world.revision++;
      break;

    case 'SHIP_OUTLET': {
      if (cell.kind !== 'outlet') return;
      const shipment = valueOf(cell);
      if (!shipment) return;

      // Сначала контракты: за отданное по заказу платят наградой при закрытии,
      // а остаток уходит на рынок по обычной цене.
      const material = shipment.material as typeof cell.filter[number];
      const toContracts = applyShipment(world, material, shipment.units, shipment.purity);
      const onMarket = shipment.units - toContracts;
      const revenue = shipment.units === 0 ? 0 : Math.round((shipment.revenue * onMarket) / shipment.units);

      world.money += revenue;
      world.today.earned += revenue;
      world.totalShipped += shipment.units;
      world.totalPurityUnits += shipment.purity * shipment.units;
      world.today.shipments.push({
        material,
        units: shipment.units,
        purity: shipment.purity,
        revenue,
        toContracts,
      });
      cell.collected = emptyCollected();
      cell.broken = 0;
      cell.value = 0;
      break;
    }

    case 'PLACE_SPLITTER':
      cell.kind = 'splitter';
      cell.dir = command.dir;
      // Развилка материалов не различает: опознавать их умеют только машины.
      cell.filter = [];
      cell.altOut = false;
      world.revision++;
      break;

    case 'PLACE_SORTER':
      cell.kind = 'sorter';
      cell.dir = command.dir;
      cell.machine = command.machine;
      // По умолчанию машина пропускает прямо всё, что умеет выбирать.
      // Настраивать машину под фракцию, которой ещё нет в городе, нельзя:
      // по умолчанию она берёт всё, что уже приезжает — GDD §13.
      cell.filter = defaultMachineFilter(command.machine, allowedMaterials(world.day));
      cell.cooldown = 0;
      world.revision++;
      break;

    case 'SET_INLET_SOURCE':
      if (cell.kind !== 'inlet') return;
      cell.fromPile = command.fromPile;
      world.revision++;
      break;

    case 'SET_FILTER':
      if (cell.kind !== 'sorter' && cell.kind !== 'outlet') return;
      cell.filter = [...command.filter];
      world.revision++;
      break;

    case 'REMOVE_CELL': {
      if (cell.kind === 'empty') return;
      const refund = refundFor(cell);
      world.money += refund;
      world.today.refunded += refund;
      cell.kind = 'empty';
      cell.machine = null;
      cell.crafter = null;
      cell.cooldown = 0;
      cell.collected = emptyCollected();
      cell.broken = 0;
      cell.value = 0;
      // Предметы, стоявшие на снесённой клетке, исчезают вместе с ней.
      cell.items.length = 0;
      world.revision++;
      break;
    }
  }
}

/**
 * Применить команды игрока, не двигая симуляцию.
 *
 * Нужно на паузе: пауза останавливает завод, а не игрока. Утро и вечер по
 * GDD §4 существуют именно для того, чтобы строить и перенастраивать без спешки,
 * и молча копить команды до снятия паузы — значит врать игроку.
 */
export function applyCommands(world: WorldState, commands: readonly Command[]): void {
  for (const command of commands) applyCommand(world, command);
}

/**
 * Один шаг симуляции.
 *
 * Детерминирован: не читает часы, не трогает DOM, не использует Math.random.
 * Один и тот же мир и одна и та же последовательность команд дают один и тот же результат.
 */
export function step(world: WorldState, commands: readonly Command[]): void {
  for (const command of commands) applyCommand(world, command);
  dayCycle(world);
  // Завод работает только днём: утро и вечер — паузы для решений.
  if (world.phase === 'day') transport(world);
  world.tick++;
}
