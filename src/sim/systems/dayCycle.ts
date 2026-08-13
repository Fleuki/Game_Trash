import { DAY_LENGTH_TICKS } from '../../config/balance';
import { generateMarket } from './market';
import { checkDeadlines, generateContractOffers } from './contracts';
import { MATERIAL_IDS } from '../../config/materials';
import { pileTotal } from '../pile';
import { PLOT_UPKEEP } from '../../config/plots';
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
  if (world.dayTicks < DAY_LENGTH_TICKS) return;

  world.dayTicks = DAY_LENGTH_TICKS;
  world.phase = 'evening';

  // Что не успели принять — не исчезает: партия куплена, и остаток ложится
  // в кучу. GDD §7: поток входит всегда, готов ты или нет.
  const batch = world.batch;
  if (!batch || batch.remaining <= 0) return;

  let left = batch.remaining;
  for (const id of MATERIAL_IDS) {
    const share = Math.min(left, Math.round(batch.remaining * batch.composition[id]));
    world.pile[id] += share;
    left -= share;
  }
  if (left > 0) world.pile.pet += left;
  batch.remaining = 0;
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
    world.today.pileAtStart = pileTotal(world);
    // Содержание берут за каждый участок сверх первого — GDD §11.
    const upkeep = (world.plots - 1) * PLOT_UPKEEP;
    if (upkeep > 0) {
      world.money -= upkeep;
      world.today.upkeep = upkeep;
    }
    // Сроки проверяются уже в новом дне: контракт «к 4-му дню» живёт весь
    // четвёртый день и срывается утром пятого.
    checkDeadlines(world);
    // Недовезённое сегодня просто не приезжает: куча отходов появится в S13,
    // и вот тогда остаток начнёт где-то оседать.
    generateMarket(world);
    generateContractOffers(world);
  }
}
