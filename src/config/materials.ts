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
