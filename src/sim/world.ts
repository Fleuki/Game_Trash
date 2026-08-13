import { BELT_SPEED_DEFAULT } from '../config/balance';
import { GRID_HEIGHT, GRID_WIDTH } from '../config/grid';
import { DIR_RIGHT } from './grid';
import { MATERIAL_IDS, type MaterialId } from '../config/materials';
import { STARTING_MONEY } from '../config/economy';
import { generateContractOffers } from './systems/contracts';
import { generateMarket } from './systems/market';
import type { Cell, DayStats, WorldState } from './types';

/** Новый мир: пустая площадка. */
export function createWorld(seed: number): WorldState {
  const cells: Cell[] = new Array<Cell>(GRID_WIDTH * GRID_HEIGHT);
  for (let i = 0; i < cells.length; i++) {
    cells[i] = {
      kind: 'empty',
      dir: DIR_RIGHT,
      items: [],
      filter: [],
      machine: null,
      crafter: null,
      cooldown: 0,
      altOut: false,
      fromPile: false,
      collected: emptyCollected(),
      broken: 0,
      value: 0,
    };
  }
  const world: WorldState = {
    tick: 0,
    day: 1,
    phase: 'morning',
    dayTicks: 0,
    market: [],
    batch: null,
    money: STARTING_MONEY,
    plots: 1,
    totalArrived: 0,
    totalShipped: 0,
    totalPurityUnits: 0,
    certificate: null,
    freeMode: false,
    pile: emptyCollected(),
    pileBroken: 0,
    today: emptyDayStats(),
    contracts: [],
    contractOffers: [],
    nextContractId: 1,
    reputation: 0,
    cells,
    nextItemId: 1,
    delivered: 0,
    spawnTimer: 0,
    beltSpeed: BELT_SPEED_DEFAULT,
    seed,
    rngState: seed | 0,
    revision: 0,
  };

  // Первое утро уже с рынком: пустая утренняя фаза не значила бы ничего.
  generateMarket(world);
  generateContractOffers(world);
  world.today.pileAtStart = 0;
  return world;
}

/** Пустой счётчик принятого: нули по всем материалам. */
export function emptyCollected(): Record<MaterialId, number> {
  const counts = {} as Record<MaterialId, number>;
  for (const id of MATERIAL_IDS) counts[id] = 0;
  return counts;
}

/** Пустые итоги дня. */
export function emptyDayStats(): DayStats {
  return {
    arrived: 0,
    processed: 0,
    shipments: [],
    earned: 0,
    spent: 0,
    refunded: 0,
    rewards: 0,
    penalties: 0,
    contractsDone: 0,
    contractsFailed: 0,
    pileAtStart: 0,
    disposedUnits: 0,
    disposalCost: 0,
    dug: 0,
    upkeep: 0,
    newArrived: 0,
    newLost: 0,
    newLostValue: 0,
  };
}
