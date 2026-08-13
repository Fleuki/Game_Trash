import { Container, Graphics } from 'pixi.js';
import { TILE_SIZE } from '../config/grid';
import { COLOR_BELT, COLOR_BELT_ARROW, COLOR_CELL_HOVER, COLOR_ERASE } from '../config/view';
import { DIR_STEP, cellIndex } from '../sim/grid';
import type { CellPlacement, Direction, WorldState } from '../sim/types';
import { GRID_HEIGHT, GRID_WIDTH } from '../config/grid';

export interface BeltLayer {
  container: Container;
  /** Перерисовать, если что-то изменилось. Дешёвая проверка, дорогая отрисовка. */
  sync(world: WorldState, ghost: readonly CellPlacement[], ghostAction: 'build' | 'erase'): void;
}

/** Тело ленты и стрелка направления. Формы залитые: от зума не зависят. */
function drawBelt(
  graphics: Graphics,
  cx: number,
  cy: number,
  dir: Direction,
  bodyColor: number,
  arrowColor: number,
  alpha: number,
): void {
  const x = cx * TILE_SIZE;
  const y = cy * TILE_SIZE;
  const inset = TILE_SIZE * 0.09;

  graphics
    .rect(x + inset, y + inset, TILE_SIZE - inset * 2, TILE_SIZE - inset * 2)
    .fill({ color: bodyColor, alpha });

  const step = DIR_STEP[dir];
  if (!step) return;

  const centerX = x + TILE_SIZE / 2;
  const centerY = y + TILE_SIZE / 2;
  const perpX = -step.dy;
  const perpY = step.dx;

  const tipX = centerX + step.dx * TILE_SIZE * 0.28;
  const tipY = centerY + step.dy * TILE_SIZE * 0.28;
  const baseX = centerX - step.dx * TILE_SIZE * 0.12;
  const baseY = centerY - step.dy * TILE_SIZE * 0.12;
  const wing = TILE_SIZE * 0.18;

  graphics
    .poly([
      tipX,
      tipY,
      baseX + perpX * wing,
      baseY + perpY * wing,
      baseX - perpX * wing,
      baseY - perpY * wing,
    ])
    .fill({ color: arrowColor, alpha });
}

export function createBeltLayer(): BeltLayer {
  const container = new Container();
  const built = new Graphics();
  const ghostGraphics = new Graphics();
  container.addChild(built, ghostGraphics);

  let builtRevision = -1;
  let ghostSignature = '';

  return {
    container,

    sync(world, ghost, ghostAction): void {
      if (world.revision !== builtRevision) {
        built.clear();
        for (let cy = 0; cy < GRID_HEIGHT; cy++) {
          for (let cx = 0; cx < GRID_WIDTH; cx++) {
            const cell = world.cells[cellIndex(cx, cy)];
            if (!cell || cell.kind !== 'belt') continue;
            drawBelt(built, cx, cy, cell.dir, COLOR_BELT, COLOR_BELT_ARROW, 1);
          }
        }
        builtRevision = world.revision;
      }

      const signature = `${ghostAction}|${ghost.map((c) => `${c.cx},${c.cy},${c.dir}`).join(';')}`;
      if (signature === ghostSignature) return;
      ghostSignature = signature;

      ghostGraphics.clear();
      const isErase = ghostAction === 'erase';
      for (const cell of ghost) {
        if (isErase) {
          ghostGraphics
            .rect(cell.cx * TILE_SIZE, cell.cy * TILE_SIZE, TILE_SIZE, TILE_SIZE)
            .fill({ color: COLOR_ERASE, alpha: 0.45 });
        } else {
          drawBelt(ghostGraphics, cell.cx, cell.cy, cell.dir, COLOR_CELL_HOVER, COLOR_BELT_ARROW, 0.5);
        }
      }
    },
  };
}
