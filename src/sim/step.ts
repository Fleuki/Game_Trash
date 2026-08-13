import type { Command } from '../commands/types';
import { buildCost, refundFor, valueOf } from './economy';
import { cellIndex, inBounds } from './grid';
import { defaultMachineFilter } from '../config/machines';
import { MATERIAL_IDS } from '../config/materials';
import { emptyCollected } from './world';
import { advancePhase, dayCycle } from './systems/dayCycle';
import { selectOffer } from './systems/market';
import { applyShipment, takeContract } from './systems/contracts';
import { disposeWaste, isUnderPile } from './pile';
import { DISPOSAL_COST_PER_UNIT } from '../config/waste';
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
      command.type === 'PLACE_SORTER' || command.type === 'PLACE_WASTE') {
    // Под кучей не строят: она занимает место, пока её не вывезут.
    if (isUnderPile(world, cellIndex(command.cx, command.cy))) return;

    const machine = command.type === 'PLACE_SORTER' ? command.machine : null;
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
                : 'sorter';

    // Повторная постройка того же самого ничего не меняет и денег не стоит.
    if (cell.kind === kind && cell.machine === machine && kind !== 'belt') return;
    if (cell.kind === kind && cell.machine === machine && cell.dir === command.dir) return;

    const cost = buildCost(kind, machine);
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

    case 'PLACE_INLET':
      cell.kind = 'inlet';
      cell.dir = command.dir;
      cell.fromPile = false;
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
      world.today.shipments.push({
        material,
        units: shipment.units,
        purity: shipment.purity,
        revenue,
        toContracts,
      });
      cell.collected = emptyCollected();
      cell.broken = 0;
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
      cell.filter = defaultMachineFilter(command.machine, MATERIAL_IDS);
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
      cell.cooldown = 0;
      cell.collected = emptyCollected();
      cell.broken = 0;
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
