import type { Command } from '../commands/types';
import { cellIndex, inBounds } from './grid';
import type { WorldState } from './types';

/**
 * Применить одну команду. Единственное место, где мир меняется по воле игрока.
 */
function applyCommand(world: WorldState, command: Command): void {
  // Очередь уже отсеяла невалидное, но симуляция никому не верит на слово:
  // команда может прийти из сейва или, в будущем, по сети.
  if (!inBounds(command.cx, command.cy)) return;

  const cell = world.cells[cellIndex(command.cx, command.cy)];
  if (!cell) return;

  switch (command.type) {
    case 'PLACE_BELT':
      cell.kind = 'belt';
      cell.dir = command.dir;
      world.revision++;
      break;

    case 'REMOVE_CELL':
      if (cell.kind === 'empty') return;
      cell.kind = 'empty';
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
  world.tick++;
}
