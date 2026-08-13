import { Container, Graphics } from 'pixi.js';
import { TILE_SIZE } from '../config/grid';
import { cellCoord } from '../sim/grid';
import { pileCells, pileTotal } from '../sim/pile';
import type { WorldState } from '../sim/types';

export interface PileLayer {
  container: Container;
  sync(world: WorldState): void;
}

const PILE_BODY = 0x4a4034;
const PILE_TOP = 0x5c503f;

/**
 * Куча отходов.
 *
 * Рисуется грязными неровными блоками поверх площадки: она должна быть
 * заметна с другого конца экрана и мешать смотреть на завод — это её работа.
 */
export function createPileLayer(): PileLayer {
  const container = new Container();
  const graphics = new Graphics();
  container.addChild(graphics);

  let drawnFor = -1;

  return {
    container,

    sync(world: WorldState): void {
      const total = pileTotal(world);
      // Перерисовываем по изменению размера: куча меняется редко, а клеток много.
      if (total === drawnFor) return;
      drawnFor = total;

      graphics.clear();
      if (total === 0) return;

      for (const index of pileCells(world)) {
        const { cx, cy } = cellCoord(index);
        const x = cx * TILE_SIZE;
        const y = cy * TILE_SIZE;

        graphics.rect(x + 1, y + 1, TILE_SIZE - 2, TILE_SIZE - 2).fill(PILE_BODY);
        // Пара пятен, чтобы куча читалась как мусор, а не как ровная плитка.
        graphics.rect(x + TILE_SIZE * 0.12, y + TILE_SIZE * 0.14, TILE_SIZE * 0.4, TILE_SIZE * 0.3).fill(PILE_TOP);
        graphics
          .rect(x + TILE_SIZE * 0.55, y + TILE_SIZE * 0.5, TILE_SIZE * 0.33, TILE_SIZE * 0.36)
          .fill(PILE_TOP);
      }
    },
  };
}
