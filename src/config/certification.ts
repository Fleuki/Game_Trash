/**
 * Сертификация из GDD §12.
 *
 * Три показателя меряются одновременно, и они тянут в разные стороны: гонишь
 * объём — падает чистота, держишь чистоту — растёт куча, разгребаешь кучу — не
 * успеваешь по объёму. Все три должны быть хороши сразу.
 */
export const CERTIFICATION_DAY = 30;

export type CertificationLevel = 'platinum' | 'gold' | 'silver' | 'bronze' | 'none';

export interface LevelRequirement {
  id: CertificationLevel;
  label: string;
  /** Доля входящего потока, ушедшая в дело, а не в кучу. */
  recycled: number;
  /** Средняя чистота отгруженного. */
  purity: number;
  /** Предельный размер кучи. */
  pile: number;
}

/** От высшего к низшему: берётся первый, который взят целиком. */
export const LEVELS: readonly LevelRequirement[] = [
  { id: 'platinum', label: 'Платина', recycled: 0.9, purity: 0.97, pile: 50 },
  { id: 'gold', label: 'Золото', recycled: 0.8, purity: 0.93, pile: 150 },
  { id: 'silver', label: 'Серебро', recycled: 0.65, purity: 0.88, pile: 300 },
  { id: 'bronze', label: 'Бронза', recycled: 0.5, purity: 0.8, pile: 500 },
];

/** Деньги, с которыми начинается свободный режим: строй что хочешь. */
export const FREE_MODE_MONEY = 50000;
