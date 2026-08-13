import { Container, Graphics } from 'pixi.js';
import { GRID_HEIGHT, GRID_WIDTH, TILE_SIZE, WORLD_HEIGHT, WORLD_WIDTH } from '../config/grid';
import type { CellCoord } from '../sim/types';
import {
  COLOR_CELL_HOVER,
  COLOR_GRID_BORDER,
  COLOR_GRID_LINE,
} from '../config/view';


export interface GridLayer {
  container: Container;
  /** Подсветка отдельно: она рисуется поверх лент, а сетка — под ними. */
  hoverContainer: Container;
  /** Подсветить клетку под курсором. null — курсор вне площадки. */
  setHover(cell: CellCoord | null): void;
  /** Сообщить текущий зум: толщина линий пересчитывается, чтобы сетка не пропадала. */
  syncZoom(zoom: number): void;
}

/** Ниже этой разницы перестраивать сетку незачем — толщина изменится незаметно. */
const ZOOM_REBUILD_THRESHOLD = 0.02;

export function createGridLayer(): GridLayer {
  const container = new Container();

  const hoverContainer = new Container();
  const field = new Graphics();
  const lines = new Graphics();
  const hover = new Graphics();
  container.addChild(field, lines);
  hoverContainer.addChild(hover);

  field.rect(0, 0, WORLD_WIDTH, WORLD_HEIGHT).fill(0x232220);

  let builtForZoom = 0;
  let hovered: CellCoord | null = null;

  /**
   * Толщина задаётся в мировых единицах и потому масштабируется вместе с полем.
   * Чтобы линия оставалась в один экранный пиксель, делим на зум и перестраиваем при его смене.
   */
  function buildLines(zoom: number): void {
    const width = 1 / zoom;
    lines.clear();

    for (let x = 1; x < GRID_WIDTH; x++) {
      lines.moveTo(x * TILE_SIZE, 0).lineTo(x * TILE_SIZE, WORLD_HEIGHT);
    }
    for (let y = 1; y < GRID_HEIGHT; y++) {
      lines.moveTo(0, y * TILE_SIZE).lineTo(WORLD_WIDTH, y * TILE_SIZE);
    }
    lines.stroke({ width, color: COLOR_GRID_LINE });

    lines.rect(0, 0, WORLD_WIDTH, WORLD_HEIGHT).stroke({ width: width * 2, color: COLOR_GRID_BORDER });
    builtForZoom = zoom;
  }

  function drawHover(zoom: number): void {
    hover.clear();
    if (!hovered) return;
    hover
      .rect(hovered.cx * TILE_SIZE, hovered.cy * TILE_SIZE, TILE_SIZE, TILE_SIZE)
      .fill({ color: COLOR_CELL_HOVER, alpha: 0.18 })
      .stroke({ width: 2 / zoom, color: COLOR_CELL_HOVER });
  }

  buildLines(1);

  return {
    container,
    hoverContainer,

    setHover(cell: CellCoord | null): void {
      const same =
        (cell === null && hovered === null) ||
        (cell !== null && hovered !== null && cell.cx === hovered.cx && cell.cy === hovered.cy);
      if (same) return;
      hovered = cell;
      drawHover(builtForZoom);
    },

    syncZoom(zoom: number): void {
      if (Math.abs(zoom - builtForZoom) / builtForZoom < ZOOM_REBUILD_THRESHOLD) return;
      buildLines(zoom);
      drawHover(zoom);
    },
  };
}
