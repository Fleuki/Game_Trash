import {
  DISTRICTS,
  DISTRICT_IDS,
  OFFERS_MAX,
  OFFERS_MIN,
  type DistrictId,
} from '../../config/districts';
import { MATERIAL_IDS, type MaterialId } from '../../config/materials';
import { nextFloat, nextInt } from '../rng';
import type { Offer, WorldState } from '../types';

/** Случайный состав для старой свалки: доли по всем материалам, в сумме единица. */
function lotteryComposition(world: WorldState): Record<MaterialId, number> {
  const weights: Record<MaterialId, number> = { pet: 0, aluminium: 0, glass: 0, organic: 0 };
  let total = 0;
  for (const id of MATERIAL_IDS) {
    // Возведение в квадрат делает состав неровным: свалка бывает и щедрой, и мусорной.
    const weight = nextFloat(world) ** 2 + 0.05;
    weights[id] = weight;
    total += weight;
  }
  for (const id of MATERIAL_IDS) weights[id] /= total;
  return weights;
}

function makeOffer(world: WorldState, district: DistrictId): Offer {
  const info = DISTRICTS[district];
  const [min, max] = info.volume;
  return {
    district,
    volume: min + nextInt(world, max - min + 1),
    composition: info.composition ? { ...info.composition } : lotteryComposition(world),
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

  const count = OFFERS_MIN + nextInt(world, OFFERS_MAX - OFFERS_MIN + 1);
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
