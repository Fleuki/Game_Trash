import { DAY_LENGTH_TICKS } from '../../config/balance';
import { generateMarket } from './market';
import { checkDeadlines, generateContractOffers } from './contracts';
import { emptyDayStats } from '../world';
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
    // Постройка утром уже посчитана в расходах дня, а вот привезённое и
    // отгруженное считается с этого момента.
    world.today.arrived = 0;
    world.today.processed = 0;
    world.today.shipments = [];
    world.today.earned = 0;
    return;
  }
  if (world.phase === 'evening') {
    world.phase = 'morning';
    world.day++;
    world.dayTicks = 0;
    world.today = emptyDayStats();
    // Сроки проверяются уже в новом дне: контракт «к 4-му дню» живёт весь
    // четвёртый день и срывается утром пятого.
    checkDeadlines(world);
    // Недовезённое сегодня просто не приезжает: куча отходов появится в S13,
    // и вот тогда остаток начнёт где-то оседать.
    generateMarket(world);
    generateContractOffers(world);
  }
}
