import type { WorldState } from './types';

/**
 * Генератор случайных чисел с сидом (mulberry32).
 *
 * Math.random в симуляции запрещён — правило 3 из PLAN §3.3, и линт за этим следит.
 * Состояние генератора лежит в мире, а не в замыкании: иначе его нельзя ни сохранить,
 * ни воспроизвести. Один сид и одна последовательность команд обязаны давать
 * одинаковый прогон — на этом держится вся отладка баланса.
 */
export function nextFloat(world: WorldState): number {
  world.rngState = (world.rngState + 0x6d2b79f5) | 0;
  let t = world.rngState;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/** Целое в диапазоне [0, bound). */
export function nextInt(world: WorldState, bound: number): number {
  return Math.floor(nextFloat(world) * bound);
}
