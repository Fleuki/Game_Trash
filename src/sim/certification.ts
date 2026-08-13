import { LEVELS, type CertificationLevel } from '../config/certification';
import { pileTotal } from './pile';
import type { WorldState } from './types';

export interface CertificationResult {
  level: CertificationLevel;
  label: string;
  recycled: number;
  purity: number;
  pile: number;
}

/**
 * Итог месяца.
 *
 * Доля переработки считается от всего, что приехало за партию: поднятое из
 * кучи и проданное тоже идёт в зачёт, поэтому разгребание старых завалов
 * улучшает оценку — ровно как обещает GDD §7.
 */
export function evaluateCertification(world: WorldState): CertificationResult {
  const recycled = world.totalArrived > 0 ? world.totalShipped / world.totalArrived : 0;
  const purity = world.totalShipped > 0 ? world.totalPurityUnits / world.totalShipped : 0;
  const pile = pileTotal(world);

  for (const level of LEVELS) {
    if (recycled >= level.recycled && purity >= level.purity && pile <= level.pile) {
      return { level: level.id, label: level.label, recycled, purity, pile };
    }
  }
  return { level: 'none', label: 'Не сдано', recycled, purity, pile };
}
