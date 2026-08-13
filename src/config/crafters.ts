import type { MaterialId } from './materials';

/**
 * Крафт-станки из GDD §10. Цены оттуда же, скорости придуманы: в таблице их нет.
 *
 * Каждый станок делает одно превращение. Что ему не по зубам — проезжает
 * насквозь, но занимает его время: поставить станок на общую ленту не бесплатно.
 */
export type CraftKind = 'press' | 'composter' | 'extruder';

/** Во что превращён предмет. Сырьё — то, что приехало с района. */
export type ItemForm = 'raw' | 'pressed' | 'granulate' | 'compost';

interface CrafterInfo {
  label: string;
  cost: number;
  /** Предметов в секунду. */
  throughput: number;
  /** Что берёт в работу. null — любой материал. */
  input: MaterialId | null;
  /** Из каких форм умеет делать. */
  from: readonly ItemForm[];
  output: ItemForm;
  note: string;
  color: number;
}

export const CRAFTERS: Record<CraftKind, CrafterInfo> = {
  press: {
    label: 'Пресс',
    cost: 1200,
    throughput: 6,
    input: null,
    from: ['raw'],
    output: 'pressed',
    note: 'уплотняет любую фракцию, ×1.3 к цене',
    color: 0x6a6a72,
  },
  composter: {
    label: 'Компостер',
    cost: 900,
    throughput: 4,
    input: 'organic',
    from: ['raw', 'pressed'],
    output: 'compost',
    note: 'органика → компост, единственный способ её продать',
    color: 0x5c6b45,
  },
  extruder: {
    label: 'Экструдер',
    cost: 3000,
    throughput: 3,
    input: 'pet',
    from: ['raw', 'pressed'],
    output: 'granulate',
    note: 'ПЭТ → гранулят, ×2.5 к цене',
    color: 0x4a5a72,
  },
};

export const CRAFT_KINDS: readonly CraftKind[] = ['press', 'composter', 'extruder'];

/** Множитель цены за форму. Компост считается отдельно: у органики цена ноль. */
export const FORM_MULTIPLIER: Record<ItemForm, number> = {
  raw: 1,
  pressed: 1.3,
  granulate: 2.5,
  compost: 1,
};

/** Цена компоста за единицу, ₽. GDD §5. */
export const COMPOST_PRICE = 2;

export function craftCooldownTicks(kind: CraftKind): number {
  return Math.round(60 / CRAFTERS[kind].throughput);
}
