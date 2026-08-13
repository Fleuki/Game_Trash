import type { MaterialId } from './materials';

/**
 * Районы, откуда возят мусор. Составы из GDD §8.
 *
 * Игрок выбирает не апгрейд, а откуда возить: каждый район — это своя задача,
 * а не те же числа побольше. Цены здесь нет: платить пока нечем, деньги в S11.
 */
export type DistrictId = 'residential' | 'business' | 'private' | 'construction' | 'dump';

export interface District {
  label: string;
  /** Чем этот район отличается от прочих. Видно игроку до покупки. */
  note: string;
  /** Доли материалов, в сумме единица. null — состав каждый раз новый (свалка). */
  composition: Record<MaterialId, number> | null;
  /** Разброс объёма партии в единицах. */
  volume: readonly [number, number];
}

export const DISTRICTS: Record<DistrictId, District> = {
  residential: {
    label: 'Спальный район',
    note: 'Стабильно и скучно',
    composition: { pet: 0.5, glass: 0.2, organic: 0.25, aluminium: 0.05 },
    volume: [300, 420],
  },
  business: {
    label: 'Бизнес-центр',
    note: 'Много объёма, мало примесей',
    composition: { pet: 0.7, aluminium: 0.15, organic: 0.1, glass: 0.05 },
    volume: [450, 600],
  },
  private: {
    label: 'Частный сектор',
    note: 'Дорогое содержимое, но липкое месиво',
    composition: { aluminium: 0.3, glass: 0.2, pet: 0.2, organic: 0.3 },
    volume: [250, 350],
  },
  construction: {
    label: 'Стройка',
    note: 'Однородное и тяжёлое',
    composition: { glass: 0.6, aluminium: 0.25, pet: 0.15, organic: 0 },
    volume: [350, 450],
  },
  dump: {
    label: 'Старая свалка',
    note: 'Лотерея: может повезти, может нет',
    composition: null,
    volume: [200, 500],
  },
};

export const DISTRICT_IDS: readonly DistrictId[] = [
  'residential',
  'business',
  'private',
  'construction',
  'dump',
];

/** Сколько предложений на рынке каждое утро. */
export const OFFERS_MIN = 4;
export const OFFERS_MAX = 5;
