import {
  CONTRACT_BONUS,
  CONTRACT_DAYS,
  CONTRACT_OFFERS,
  CONTRACT_PURITY,
  CONTRACT_UNITS,
  ARRIVAL_PER_DAY,
  MAX_ACTIVE_CONTRACTS,
  MIXED_CONTRACT_CHANCE,
  PENALTY_SHARE,
  REPUTATION_REWARD_RANGE,
  REPUTATION_REWARD_STEP,
} from '../../config/contracts';
import { MATERIAL_PRICE } from '../../config/economy';
import type { MaterialId } from '../../config/materials';
import { contractLimit } from '../../config/tutorial';
import { allowedMaterials } from '../tutorial';
import { nextFloat, nextInt } from '../rng';
import type { Contract, ContractItem, WorldState } from '../types';

/**
 * Материалы, которые вообще имеет смысл заказывать: за органику не платят,
 * а того, что ещё не приезжает в потоке, нельзя просить вовсе — иначе заказ
 * невыполним по условиям самой игры. Это касается и новичков с 20-го дня, и
 * стекла с алюминием, которых до второго района в городе нет.
 */
function orderable(day: number): readonly MaterialId[] {
  return allowedMaterials(day).filter((id) => MATERIAL_PRICE[id] > 0);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Сорвал заказы — предлагают хуже. Сдал — лучше. */
function reputationFactor(world: WorldState): number {
  const [min, max] = REPUTATION_REWARD_RANGE;
  return clamp(1 + world.reputation * REPUTATION_REWARD_STEP, min, max);
}

/** Срок заказа выбирается первым: от него зависит, сколько вообще можно просить. */
function makeItem(world: WorldState, days: number): ContractItem {
  const pool = orderable(world.day);
  const material = pool[nextInt(world, pool.length)] ?? 'pet';
  const [minUnits, maxUnits] = CONTRACT_UNITS;
  const purity = CONTRACT_PURITY[nextInt(world, CONTRACT_PURITY.length)] ?? 0.9;
  const units = minUnits + nextInt(world, maxUnits - minUnits + 1);
  return {
    material,
    units: Math.max(1, Math.min(units, ARRIVAL_PER_DAY[material] * days)),
    minPurity: purity,
    delivered: 0,
  };
}

function makeContract(world: WorldState): Contract {
  const [minDays, maxDays] = CONTRACT_DAYS;
  const days = minDays + nextInt(world, maxDays - minDays + 1);

  const items = [makeItem(world, days)];
  // Смешанный заказ связывает параллельные линии в одну систему — GDD §9.
  if (nextFloat(world) < MIXED_CONTRACT_CHANCE) {
    const second = makeItem(world, days);
    if (second.material !== items[0]?.material) items.push(second);
  }

  const base = items.reduce(
    // Чем выше требование к чистоте, тем дороже заказ: это и есть плата за труд.
    (sum, item) => sum + item.units * MATERIAL_PRICE[item.material] * (0.6 + item.minPurity * 0.6),
    0,
  );
  const reward = Math.round(base * CONTRACT_BONUS * reputationFactor(world));

  return {
    id: world.nextContractId++,
    items,
    deadlineDay: world.day + days,
    reward,
    penalty: Math.round(reward * PENALTY_SHARE),
    status: 'active',
  };
}

/** Свежая доска заказов на утро. Взятые контракты остаются, доска обновляется. */
export function generateContractOffers(world: WorldState): void {
  world.contractOffers = [];
  // Первые дни заказ один: GDD §13. Выбор из трёх — это уже задача, а в
  // первые дни задача ровно одна, довезти партию до приёмника.
  const limit = contractLimit(world.day);
  const count = limit === null ? CONTRACT_OFFERS : Math.min(CONTRACT_OFFERS, limit);
  for (let i = 0; i < count; i++) world.contractOffers.push(makeContract(world));
}

export function takeContract(world: WorldState, index: number): void {
  if (world.phase !== 'morning') return;
  const active = world.contracts.filter((contract) => contract.status === 'active');
  const allowed = contractLimit(world.day) ?? MAX_ACTIVE_CONTRACTS;
  if (active.length >= Math.min(MAX_ACTIVE_CONTRACTS, allowed)) return;

  const offer = world.contractOffers[index];
  if (!offer) return;

  world.contracts.push(offer);
  world.contractOffers.splice(index, 1);
}

/**
 * Зачесть отгрузку в счёт контрактов.
 *
 * Возвращает, сколько единиц ушло по заказам: за них платят наградой при
 * закрытии, а не по рынку. Остаток продаётся как обычно.
 *
 * Заказы закрываются по старшинству: сначала тот, что взят раньше. Иначе
 * пришлось бы спрашивать игрока при каждой отгрузке, а это шум.
 */
export function applyShipment(
  world: WorldState,
  material: MaterialId,
  units: number,
  purity: number,
): number {
  let left = units;

  for (const contract of world.contracts) {
    if (contract.status !== 'active' || left <= 0) continue;

    for (const item of contract.items) {
      if (item.material !== material || left <= 0) continue;
      // Грязная партия в счёт заказа не идёт вовсе: заказчику нужна чистота.
      if (purity < item.minPurity) continue;

      const need = item.units - item.delivered;
      if (need <= 0) continue;

      const taken = Math.min(need, left);
      item.delivered += taken;
      left -= taken;
    }

    if (contract.items.every((item) => item.delivered >= item.units)) {
      contract.status = 'done';
      world.money += contract.reward;
      world.today.earned += contract.reward;
      world.today.rewards += contract.reward;
      world.today.contractsDone++;
      world.reputation++;
    }
  }

  return units - left;
}

/** Проверить сроки. Вызывается на смене дня: просрочка — штраф, но не конец игры. */
export function checkDeadlines(world: WorldState): void {
  for (const contract of world.contracts) {
    if (contract.status !== 'active') continue;
    if (contract.deadlineDay >= world.day) continue;

    contract.status = 'failed';
    world.money -= contract.penalty;
    world.today.penalties += contract.penalty;
    world.today.contractsFailed++;
    world.reputation--;
  }
}
