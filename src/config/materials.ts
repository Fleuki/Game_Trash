/**
 * Материалы. Четыре базовых — GDD §5, выбраны по тому, как конфликтуют
 * между собой.
 *
 * С 20-го дня к ним добавляются батарейки и электроника — третья страховка
 * из GDD §12: вылизанная линия их не узнаёт, потому что в её фильтрах их нет,
 * и гонит самое дорогое в брак. Правило «не добавлять материал без назначения»
 * соблюдено: назначение новичков — ломать отлаженную систему.
 *
 * Цены живут в config/economy.ts, вес примеси — в config/contamination.ts.
 */

export type MaterialId = 'pet' | 'aluminium' | 'glass' | 'organic' | 'battery' | 'electronics';

/** Что едет в потоке с первого дня. */
export const BASE_MATERIAL_IDS: readonly MaterialId[] = ['pet', 'aluminium', 'glass', 'organic'];

/** Что появляется в потоке позже. День — в config/newcomers.ts. */
export const NEWCOMER_IDS: readonly MaterialId[] = ['battery', 'electronics'];

export const MATERIAL_IDS: readonly MaterialId[] = [...BASE_MATERIAL_IDS, ...NEWCOMER_IDS];

interface MaterialInfo {
  label: string;
  /** Цвет предмета на ленте. Формы различаются в S21, пока только цвет. */
  color: number;
}

export const MATERIALS: Record<MaterialId, MaterialInfo> = {
  pet: { label: 'ПЭТ', color: 0x7fb3d5 },
  aluminium: { label: 'Алюминий', color: 0xd8d8d2 },
  glass: { label: 'Стекло', color: 0x86c9a8 },
  organic: { label: 'Органика', color: 0x8a6b3f },
  battery: { label: 'Батарейки', color: 0xd8b455 },
  electronics: { label: 'Электроника', color: 0xa07ab5 },
};
