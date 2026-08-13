import {
  DISTRICTS,
  DISTRICT_IDS,
  OFFERS_MAX,
  OFFERS_MIN,
  type DistrictId,
} from '../../config/districts';
import { BASE_MATERIAL_IDS, MATERIAL_IDS, NEWCOMER_IDS, type MaterialId } from '../../config/materials';
import { newcomerShare } from '../../config/newcomers';
import { marketOfferLimit, TUTORIAL_DISTRICT } from '../../config/tutorial';
import { allowedMaterials } from '../tutorial';
import { nextFloat, nextInt } from '../rng';
import type { Offer, WorldState } from '../types';

function emptyComposition(): Record<MaterialId, number> {
  const shares = {} as Record<MaterialId, number>;
  for (const id of MATERIAL_IDS) shares[id] = 0;
  return shares;
}

/** Случайный состав для старой свалки: доли по базовым материалам, в сумме единица. */
function lotteryComposition(world: WorldState): Record<MaterialId, number> {
  const weights = emptyComposition();
  let total = 0;
  for (const id of BASE_MATERIAL_IDS) {
    // Возведение в квадрат делает состав неровным: свалка бывает и щедрой, и мусорной.
    const weight = nextFloat(world) ** 2 + 0.05;
    weights[id] = weight;
    total += weight;
  }
  for (const id of BASE_MATERIAL_IDS) weights[id] /= total;
  return weights;
}

/**
 * Подмешать новичков — GDD §12.
 *
 * Свою долю они отбирают у старых фракций пропорционально: поток не растёт,
 * меняется его состав. До 20-го дня доли нулевые, и функция ничего не делает.
 */
function mixNewcomers(composition: Record<MaterialId, number>, day: number): Record<MaterialId, number> {
  let taken = 0;
  for (const id of NEWCOMER_IDS) taken += newcomerShare(id, day);
  if (taken <= 0) return composition;

  const mixed = emptyComposition();
  for (const id of BASE_MATERIAL_IDS) mixed[id] = composition[id] * (1 - taken);
  for (const id of NEWCOMER_IDS) mixed[id] = newcomerShare(id, day);
  return mixed;
}

/**
 * Оставить в составе только то, что уже приезжает, и пересчитать доли.
 *
 * Первые дни поток узкий — GDD §13. Район остаётся собой, просто половина
 * его содержимого ещё не появилась в городе.
 */
function keepUnlocked(composition: Record<MaterialId, number>, day: number): Record<MaterialId, number> {
  const allowed = allowedMaterials(day);
  let total = 0;
  for (const id of allowed) total += composition[id];
  // Район целиком из ещё не открытых фракций: возить нечего, кроме ПЭТ.
  if (total <= 0) {
    const only = emptyComposition();
    only.pet = 1;
    return only;
  }

  const kept = emptyComposition();
  for (const id of allowed) kept[id] = composition[id] / total;
  return kept;
}

function makeOffer(world: WorldState, district: DistrictId): Offer {
  const info = DISTRICTS[district];
  const [min, max] = info.volume;
  return {
    district,
    volume: min + nextInt(world, max - min + 1),
    composition: mixNewcomers(
      keepUnlocked(info.composition ? { ...info.composition } : lotteryComposition(world), world.day),
      world.day,
    ),
  };
}

/**
 * Утренний рынок: несколько предложений от разных районов.
 *
 * Районы не повторяются в одно утро — иначе выбор превращается в «то же самое,
 * но другого объёма». Порядок и состав определяются сидом, поэтому одна и та же
 * партия воспроизводится при отладке баланса.
 */
export function generateMarket(world: WorldState): void {
  const pool = [...DISTRICT_IDS];
  // Перемешивание Фишера — Йетса на нашем генераторе.
  for (let i = pool.length - 1; i > 0; i--) {
    const j = nextInt(world, i + 1);
    const a = pool[i];
    const b = pool[j];
    if (a === undefined || b === undefined) continue;
    pool[i] = b;
    pool[j] = a;
  }

  const limit = marketOfferLimit(world.day);
  const rolled = OFFERS_MIN + nextInt(world, OFFERS_MAX - OFFERS_MIN + 1);
  const count = limit === null ? rolled : Math.min(rolled, limit);

  // Единственная партия туториала не разыгрывается: первый урок должен быть
  // одинаковым у всех — GDD §13.
  if (count === 1) {
    world.market = [makeOffer(world, TUTORIAL_DISTRICT)];
    world.batch = null;
    return;
  }
  const offers: Offer[] = [];
  for (let i = 0; i < count; i++) {
    const district = pool[i];
    if (district) offers.push(makeOffer(world, district));
  }

  world.market = offers;
  world.batch = null;
}

/** Взять партию с рынка. Днём выбор уже не меняется: мусор приехал. */
export function selectOffer(world: WorldState, index: number): void {
  if (world.phase !== 'morning') return;
  const offer = world.market[index];
  if (!offer) return;

  world.batch = {
    district: offer.district,
    composition: { ...offer.composition },
    remaining: offer.volume,
    volume: offer.volume,
  };
}
