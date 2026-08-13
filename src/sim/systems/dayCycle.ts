import { DAY_LENGTH_TICKS } from '../../config/balance';
import type { WorldState } from '../types';

/**
 * Ход дня.
 *
 * Время идёт только в дневной фазе. Утро и вечер — паузы, из которых выводит
 * сам игрок командой: в утро он строит без спешки, вечером читает отчёт.
 * Поэтому длительность паузы ничем не ограничена, а день кончается сам.
 */
export function dayCycle(world: WorldState): void {
  if (world.phase !== 'day') return;

  world.dayTicks++;
  if (world.dayTicks >= DAY_LENGTH_TICKS) {
    world.dayTicks = DAY_LENGTH_TICKS;
    world.phase = 'evening';
  }
}

/** Перейти к следующей фазе по воле игрока. День сам не начинается и не повторяется. */
export function advancePhase(world: WorldState): void {
  if (world.phase === 'morning') {
    world.phase = 'day';
    world.dayTicks = 0;
    return;
  }
  if (world.phase === 'evening') {
    world.phase = 'morning';
    world.day++;
    world.dayTicks = 0;
  }
}
