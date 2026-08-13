import { BELT_SPEED_MAX, BELT_SPEED_MIN } from '../config/balance';
import { MATERIAL_IDS } from '../config/materials';
import { inBounds } from '../sim/grid';
import type { Command } from './types';

export interface CommandQueue {
  /** Поставить команду в очередь. Невалидная отбрасывается, возвращается false. */
  push(command: Command): boolean;
  /**
   * Забрать всё накопленное и очистить очередь.
   * Вызывается на границе тика: команда применяется между шагами, а не посреди шага.
   */
  drain(): Command[];
  readonly size: number;
}

/** Заведомо невыполнимые команды отсеиваем здесь, чтобы симуляция не разбирала мусор. */
function isValid(command: Command): boolean {
  switch (command.type) {
    case 'PLACE_BELT':
    case 'PLACE_INLET':
    case 'PLACE_OUTLET':
    case 'PLACE_SPLITTER':
    case 'PLACE_SORTER':
    case 'RESET_OUTLET':
    case 'REMOVE_CELL':
      return inBounds(command.cx, command.cy);
    case 'SET_FILTER':
      return (
        inBounds(command.cx, command.cy) &&
        command.filter.every((material) => MATERIAL_IDS.includes(material))
      );
    case 'ADVANCE_PHASE':
      return true;
    case 'SET_BELT_SPEED':
      return (
        Number.isFinite(command.value) &&
        command.value >= BELT_SPEED_MIN &&
        command.value <= BELT_SPEED_MAX
      );
  }
}

export function createCommandQueue(): CommandQueue {
  let pending: Command[] = [];

  return {
    push(command: Command): boolean {
      if (!isValid(command)) return false;
      pending.push(command);
      return true;
    },

    drain(): Command[] {
      if (pending.length === 0) return [];
      const drained = pending;
      pending = [];
      return drained;
    },

    get size(): number {
      return pending.length;
    },
  };
}
