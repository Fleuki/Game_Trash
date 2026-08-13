import { Container, Graphics } from 'pixi.js';
import { TILE_SIZE } from '../config/grid';
import { COLOR_ERASE, COLOR_CELL_HOVER } from '../config/view';
import { cellCoord } from '../sim/grid';
import { collectedTotal, purityOf } from '../sim/purity';
import type { WorldState } from '../sim/types';

export interface OutletLayer {
  container: Container;
  sync(world: WorldState): void;
}

/** Плавный переход от грязного к чистому. Красный при 0, зелёный при 1. */
function purityColor(purity: number): number {
  const from = COLOR_ERASE;
  const to = COLOR_CELL_HOVER;
  const mix = (shift: number): number => {
    const a = (from >> shift) & 0xff;
    const b = (to >> shift) & 0xff;
    return Math.round(a + (b - a) * purity) & 0xff;
  };
  return (mix(16) << 16) | (mix(8) << 8) | mix(0);
}

/**
 * Полоска чистоты на приёмнике.
 *
 * Рисуется каждый кадр, а не по revision: состав партии меняется на каждом
 * принятом предмете, а перестраивать из-за этого весь слой лент — дорого.
 * Приёмников единицы, так что это дёшево.
 */
export function createOutletLayer(): OutletLayer {
  const container = new Container();
  const graphics = new Graphics();
  container.addChild(graphics);

  return {
    container,

    sync(world: WorldState): void {
      graphics.clear();

      for (let index = 0; index < world.cells.length; index++) {
        const cell = world.cells[index];
        if (cell.kind !== 'outlet') continue;

        const { cx, cy } = cellCoord(index);
        const x = cx * TILE_SIZE + TILE_SIZE * 0.12;
        const y = cy * TILE_SIZE + TILE_SIZE * 0.74;
        const width = TILE_SIZE * 0.76;
        const height = TILE_SIZE * 0.14;

        graphics.rect(x, y, width, height).fill({ color: 0x000000, alpha: 0.45 });

        // Пока ничего не приехало, полоски нет: пустая партия не «чистая на 100%»,
        // её просто ещё нет.
        if (collectedTotal(cell) === 0) continue;

        const purity = purityOf(cell);
        graphics.rect(x, y, width * purity, height).fill(purityColor(purity));
      }
    },
  };
}
