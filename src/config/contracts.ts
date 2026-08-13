/**
 * Контракты. Числа черновые, как и вся экономика: в таблицу не прогонялись.
 */

/** Сколько контрактов можно держать одновременно. GDD §9 — два-три. */
export const MAX_ACTIVE_CONTRACTS = 3;

/** Сколько предложений на доске каждое утро. */
export const CONTRACT_OFFERS = 3;

/** Объём одной позиции заказа, единиц. */
export const CONTRACT_UNITS: readonly [number, number] = [100, 350];

/** Через сколько дней срок. */
export const CONTRACT_DAYS: readonly [number, number] = [2, 5];

/** Требования к чистоте, из которых выбирается одно. */
export const CONTRACT_PURITY: readonly number[] = [0.85, 0.9, 0.95];

/** Шанс, что заказ смешанный: две фракции вместо одной. GDD §9. */
export const MIXED_CONTRACT_CHANCE = 0.35;

/** Насколько контракт выгоднее рынка: за срочность и обязательство. */
export const CONTRACT_BONUS = 1.4;

/** Штраф за срыв как доля от награды. */
export const PENALTY_SHARE = 0.4;

/** Насколько репутация двигает награду за каждый пункт. */
export const REPUTATION_REWARD_STEP = 0.05;

/** Пределы влияния репутации на награду. */
export const REPUTATION_REWARD_RANGE: readonly [number, number] = [0.7, 1.5];
