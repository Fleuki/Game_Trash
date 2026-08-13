import { MATERIAL_IDS, type MaterialId } from '../config/materials';
import {
  BUILD_UNLOCK_DAY,
  MATERIAL_UNLOCK_DAY,
  PLOT_UNLOCK_DAY,
  type BuildableKind,
} from '../config/tutorial';

/**
 * Расписание первых дней — GDD §13.
 *
 * Одно место, где день превращается в «что уже доступно». Всё остальное
 * спрашивает здесь и не хранит собственных представлений о прогрессии.
 */

/** Какие фракции уже приезжают в потоке. */
export function allowedMaterials(day: number): readonly MaterialId[] {
  return MATERIAL_IDS.filter((id) => day >= MATERIAL_UNLOCK_DAY[id]);
}

/** Можно ли уже это строить. */
export function isBuildUnlocked(kind: BuildableKind, day: number): boolean {
  return day >= BUILD_UNLOCK_DAY[kind];
}

/** Можно ли уже покупать участки. */
export function isPlotUnlocked(day: number): boolean {
  return day >= PLOT_UNLOCK_DAY;
}
