import type { MaterialId } from './materials';

/**
 * Вес примеси при расчёте чистоты партии.
 *
 * Органика считается вдвое — GDD §6. Это то, что делает её «ключевым материалом»:
 * из-за неё появляется смысл в очистке, а у остальных фракций — риск.
 */
export const IMPURITY_WEIGHT: Record<MaterialId, number> = {
  pet: 1,
  aluminium: 1,
  glass: 1,
  organic: 2,
};
