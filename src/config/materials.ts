/**
 * Материалы. Четыре и только четыре — GDD §5.
 *
 * Цены здесь сознательно нет: продавать пока некому, а число, которое никто не
 * читает, — ложное обещание. Цены придут в S11 вместе с отгрузкой.
 */

export type MaterialId = 'pet' | 'aluminium' | 'glass' | 'organic';

export const MATERIAL_IDS: readonly MaterialId[] = ['pet', 'aluminium', 'glass', 'organic'];

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
};

/**
 * Состав потока из источника. Веса взяты у спального района из GDD §8:
 * ПЭТ 50, стекло 20, органика 25, алюминий 5.
 *
 * Временно: в S10 состав будет приходить от района, у которого купили партию,
 * и этот список исчезнет.
 */
export const SPAWN_MIX: readonly { material: MaterialId; weight: number }[] = [
  { material: 'pet', weight: 50 },
  { material: 'glass', weight: 20 },
  { material: 'organic', weight: 25 },
  { material: 'aluminium', weight: 5 },
];

export const SPAWN_MIX_TOTAL = SPAWN_MIX.reduce((sum, entry) => sum + entry.weight, 0);
