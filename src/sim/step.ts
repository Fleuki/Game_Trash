import type { Command } from '../commands/types';
import { cellIndex, inBounds } from './grid';
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

    case 'REMOVE_CELL': {
      if (cell.kind === 'empty') return;
      cell.kind = 'empty';
      // Предметы, стоявшие на снесённой клетке, исчезают вместе с ней.
      const removedIndex = cellIndex(command.cx, command.cy);
      world.items = world.items.filter((item) => item.cell !== removedIndex);
      world.revision++;
      break;
    }
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
