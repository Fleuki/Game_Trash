import { BELT_SPEED_DEFAULT } from '../config/balance';
import { GRID_HEIGHT, GRID_WIDTH } from '../config/grid';
import { DIR_RIGHT } from './grid';
import { MATERIAL_IDS } from '../config/materials';
import type { Cell, WorldState } from './types';

/** Новый мир: пустая площадка. */
export function createWorld(seed: number): WorldState {
  const cells: Cell[] = new Array<Cell>(GRID_WIDTH * GRID_HEIGHT);
  for (let i = 0; i < cells.length; i++) {
    cells[i] = { kind: 'empty', dir: DIR_RIGHT, items: [], filter: [], machine: null, cooldown: 0 };
  }
  return {
    tick: 0,
    cells,
    nextItemId: 1,
    delivered: 0,
    spawnTimer: 0,
    beltSpeed: BELT_SPEED_DEFAULT,
    seed,
    rngState: seed | 0,
    revision: 0,
  };
}

/** Материалы, которые развилка пропускает прямо по умолчанию: все. */
export function defaultFilter(): typeof MATERIAL_IDS[number][] {
  return [...MATERIAL_IDS];
}
