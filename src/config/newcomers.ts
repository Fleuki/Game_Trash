import type { MaterialId } from './materials';

/**
 * Новое в потоке — GDD §12, третья страховка от «идеал достигнут, игра кончилась».
 *
 * ВСЕ ЧИСЛА ЧЕРНОВЫЕ. Доли подобраны так, чтобы новичков было мало по объёму,
 * но много по деньгам: полпроцента потока не заметишь глазом, а в отчёте
 * потеря видна сразу.
 */
export const NEWCOMER_DAY = 20;

/** Какую долю потока новички отбирают у старых фракций. */
export const NEWCOMER_SHARE: Record<'battery' | 'electronics', number> = {
  battery: 0.04,
  electronics: 0.02,
};

/** Доля в потоке для этого материала на этот день. 0 — ещё не приезжает. */
export function newcomerShare(material: MaterialId, day: number): number {
  if (day < NEWCOMER_DAY) return 0;
  if (material === 'battery') return NEWCOMER_SHARE.battery;
  if (material === 'electronics') return NEWCOMER_SHARE.electronics;
  return 0;
}
