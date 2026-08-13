import type { Command } from '../commands/types';
import { cellIndex, inBounds } from './grid';
import { defaultMachineFilter } from '../config/machines';
import { MATERIAL_IDS } from '../config/materials';
import { defaultFilter, emptyCollected } from './world';
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

  if (!inBounds(command.cx, command.cy)) return;

  const cell = world.cells[cellIndex(command.cx, command.cy)];
  if (!cell) return;

  switch (command.type) {
    case 'PLACE_BELT':
      cell.kind = 'belt';
      cell.dir = command.dir;
      world.revision++;
      break;

    case 'PLACE_INLET':
      cell.kind = 'inlet';
      cell.dir = command.dir;
      world.revision++;
      break;

    case 'PLACE_OUTLET':
      cell.kind = 'outlet';
      cell.dir = command.dir;
      // Приёмник забирает предметы мгновенно, держать их в себе ему незачем.
      cell.items.length = 0;
      cell.collected = emptyCollected();
      // Приёмник без назначенной фракции ничего не значит, поэтому по умолчанию
      // он принимает ПЭТ — базовый материал.
      cell.filter = ['pet'];
      world.revision++;
      break;

    case 'RESET_OUTLET':
      if (cell.kind !== 'outlet') return;
      cell.collected = emptyCollected();
      break;

    case 'PLACE_SPLITTER':
      cell.kind = 'splitter';
      cell.dir = command.dir;
      // Свежая развилка пропускает всё прямо: пока её не настроили, она ведёт
      // себя как обычная лента и ничего не делает исподтишка.
      cell.filter = defaultFilter();
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

    case 'SET_FILTER':
      if (cell.kind !== 'splitter' && cell.kind !== 'sorter' && cell.kind !== 'outlet') return;
      cell.filter = [...command.filter];
      world.revision++;
      break;

    case 'REMOVE_CELL':
      if (cell.kind === 'empty') return;
      cell.kind = 'empty';
      cell.machine = null;
      cell.cooldown = 0;
      cell.collected = emptyCollected();
      // Предметы, стоявшие на снесённой клетке, исчезают вместе с ней.
      cell.items.length = 0;
      world.revision++;
      break;
  }
}

/**
 * Один шаг симуляции.
 *
 * Детерминирован: не читает часы, не трогает DOM, не использует Math.random.
 * Один и тот же мир и одна и та же последовательность команд дают один и тот же результат.
 */
export function step(world: WorldState, commands: readonly Command[]): void {
  for (const command of commands) applyCommand(world, command);
  transport(world);
  world.tick++;
}
