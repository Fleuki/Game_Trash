import { Container, Graphics } from 'pixi.js';
import { GRID_HEIGHT, TILE_SIZE } from '../config/grid';
import { PLOT_COUNT, plotColumns } from '../config/plots';
import type { WorldState } from '../sim/types';

export interface PlotsLayer {
  container: Container;
  sync(world: WorldState): void;
}

/**
 * Закрытые участки и полосы между ними.
 *
 * Закрытый участок видно сразу: он тут, он твой в будущем, но пока на нём не
 * строят. Это делает покупку понятной ещё до того, как на неё нашлись деньги.
 */
export function createPlotsLayer(): PlotsLayer {
  const container = new Container();
  const graphics = new Graphics();
  container.addChild(graphics);

  let drawnFor = -1;

  return {
    container,

    sync(world: WorldState): void {
      if (world.plots === drawnFor) return;
      drawnFor = world.plots;

      graphics.clear();
      for (let plot = 0; plot < PLOT_COUNT; plot++) {
        if (plot < world.plots) continue;
        const { from, to } = plotColumns(plot);
        graphics
          .rect(from * TILE_SIZE, 0, (to - from + 1) * TILE_SIZE, GRID_HEIGHT * TILE_SIZE)
          .fill({ color: 0x000000, alpha: 0.55 });
      }
    },
  };
}
