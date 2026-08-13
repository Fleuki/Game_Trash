import { BELT_SPEED_DEFAULT } from '../config/balance';
import { GRID_HEIGHT, GRID_WIDTH } from '../config/grid';
import { DIR_RIGHT } from './grid';
import type { MaterialId } from '../config/materials';
import { generateMarket } from './systems/market';
import type { Cell, WorldState } from './types';

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
      cooldown: 0,
      altOut: false,
      collected: emptyCollected(),
      broken: 0,
    };
  }
  const world: WorldState = {
    tick: 0,
    day: 1,
    phase: 'morning',
    dayTicks: 0,
    market: [],
    batch: null,
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
  return world;
}

/** Пустой счётчик принятого: нули по всем материалам. */
export function emptyCollected(): Record<MaterialId, number> {
  return { pet: 0, aluminium: 0, glass: 0, organic: 0 };
}
