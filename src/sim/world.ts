import { BELT_SPEED_DEFAULT } from '../config/balance';
import { GRID_HEIGHT, GRID_WIDTH } from '../config/grid';
import { DIR_RIGHT } from './grid';
import type { Cell, WorldState } from './types';

/** Новый мир: пустая площадка. */
export function createWorld(): WorldState {
  const cells: Cell[] = new Array<Cell>(GRID_WIDTH * GRID_HEIGHT);
  for (let i = 0; i < cells.length; i++) {
    cells[i] = { kind: 'empty', dir: DIR_RIGHT };
  }
  return {
    tick: 0,
    cells,
    items: [],
    nextItemId: 1,
    spawnTimer: 0,
    beltSpeed: BELT_SPEED_DEFAULT,
    revision: 0,
  };
}
