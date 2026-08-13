import { DAY_LENGTH_TICKS } from '../../config/balance';
import { generateMarket } from './market';
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
    // Без выбранной партии день начинать нечем.
    if (!world.batch) return;
    world.phase = 'day';
    world.dayTicks = 0;
    return;
  }
  if (world.phase === 'evening') {
    world.phase = 'morning';
    world.day++;
    world.dayTicks = 0;
    // Недовезённое сегодня просто не приезжает: куча отходов появится в S13,
    // и вот тогда остаток начнёт где-то оседать.
    generateMarket(world);
  }
}
