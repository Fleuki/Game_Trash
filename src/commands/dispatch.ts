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
  return inBounds(command.cx, command.cy);
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
