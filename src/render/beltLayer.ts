import { Container, Graphics } from 'pixi.js';
import { TILE_SIZE } from '../config/grid';
import {
  COLOR_BELT,
  COLOR_BELT_ARROW,
  COLOR_CELL_HOVER,
  COLOR_ERASE,
  COLOR_INLET,
  COLOR_OUTLET,
  COLOR_SPLITTER,
} from '../config/view';
import { DIR_STEP, cellIndex, sideDirection } from '../sim/grid';
import type { CellPlacement, Direction, WorldState } from '../sim/types';
import type { BuildAction } from '../ui/buildTool';
import { GRID_HEIGHT, GRID_WIDTH } from '../config/grid';

export interface BeltLayer {
  container: Container;
  /** Перерисовать, если что-то изменилось. Дешёвая проверка, дорогая отрисовка. */
  sync(world: WorldState, ghost: readonly CellPlacement[], ghostAction: BuildAction): void;
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

  drawArrow(graphics, cx, cy, dir, arrowColor, alpha);
}

/** Стрелка направления в центре клетки. */
function drawArrow(
  graphics: Graphics,
  cx: number,
  cy: number,
  dir: Direction,
  color: number,
  alpha: number,
): void {
  const step = DIR_STEP[dir];
  if (!step) return;

  const centerX = cx * TILE_SIZE + TILE_SIZE / 2;
  const centerY = cy * TILE_SIZE + TILE_SIZE / 2;
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
    .fill({ color, alpha });
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
            if (!cell || cell.kind === 'empty') continue;
            const body =
              cell.kind === 'inlet'
                ? COLOR_INLET
                : cell.kind === 'outlet'
                  ? COLOR_OUTLET
                  : cell.kind === 'splitter'
                    ? COLOR_SPLITTER
                    : COLOR_BELT;
            drawBelt(built, cx, cy, cell.dir, body, COLOR_BELT_ARROW, 1);
            // У развилки два выхода, и оба должны быть видны без открытия панели.
            if (cell.kind === 'splitter') {
              drawArrow(built, cx, cy, sideDirection(cell.dir), COLOR_BELT_ARROW, 0.75);
            }
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
          const body =
            ghostAction === 'inlet'
              ? COLOR_INLET
              : ghostAction === 'outlet'
                ? COLOR_OUTLET
                : ghostAction === 'splitter'
                  ? COLOR_SPLITTER
                  : COLOR_CELL_HOVER;
          drawBelt(ghostGraphics, cell.cx, cell.cy, cell.dir, body, COLOR_BELT_ARROW, 0.5);
        }
      }
    },
  };
}
