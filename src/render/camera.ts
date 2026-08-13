import { GRID_HEIGHT, GRID_WIDTH, TILE_SIZE, WORLD_HEIGHT, WORLD_WIDTH } from '../config/grid';
import { FIT_PADDING, MAX_ZOOM, MIN_ZOOM } from '../config/view';
import type { CellCoord } from '../sim/types';

/** Точка в мировых единицах. */
export interface WorldPoint {
  x: number;
  y: number;
}

/** Камера. Хранит мировую точку, которая находится в центре экрана, и масштаб. */
export interface Camera {
  x: number;
  y: number;
  zoom: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function createCamera(): Camera {
  return { x: WORLD_WIDTH / 2, y: WORLD_HEIGHT / 2, zoom: 1 };
}

/**
 * Держим центр камеры внутри площадки: улететь в пустоту и потерять завод нельзя.
 */
function clampCamera(camera: Camera): void {
  camera.x = clamp(camera.x, 0, WORLD_WIDTH);
  camera.y = clamp(camera.y, 0, WORLD_HEIGHT);
  camera.zoom = clamp(camera.zoom, MIN_ZOOM, MAX_ZOOM);
}

/** Вписать площадку в экран целиком. Вызывается на старте и при ресайзе. */
export function fitToScreen(camera: Camera, viewWidth: number, viewHeight: number): void {
  const usable = 1 - FIT_PADDING * 2;
  const zoom = Math.min((viewWidth * usable) / WORLD_WIDTH, (viewHeight * usable) / WORLD_HEIGHT);
  camera.zoom = clamp(zoom, MIN_ZOOM, MAX_ZOOM);
  camera.x = WORLD_WIDTH / 2;
  camera.y = WORLD_HEIGHT / 2;
}

export function screenToWorld(
  camera: Camera,
  screenX: number,
  screenY: number,
  viewWidth: number,
  viewHeight: number,
): WorldPoint {
  return {
    x: camera.x + (screenX - viewWidth / 2) / camera.zoom,
    y: camera.y + (screenY - viewHeight / 2) / camera.zoom,
  };
}

/** Сдвиг камеры на столько-то пикселей экрана: поле едет за пальцем один в один. */
export function panByScreen(camera: Camera, deltaScreenX: number, deltaScreenY: number): void {
  camera.x -= deltaScreenX / camera.zoom;
  camera.y -= deltaScreenY / camera.zoom;
  clampCamera(camera);
}

/**
 * Зум вокруг точки экрана: мировая точка под курсором остаётся под курсором.
 * Иначе при приближении поле уезжает и приходится догонять его перетаскиванием.
 */
export function zoomAtScreen(
  camera: Camera,
  factor: number,
  screenX: number,
  screenY: number,
  viewWidth: number,
  viewHeight: number,
): void {
  const before = screenToWorld(camera, screenX, screenY, viewWidth, viewHeight);
  camera.zoom = clamp(camera.zoom * factor, MIN_ZOOM, MAX_ZOOM);
  const after = screenToWorld(camera, screenX, screenY, viewWidth, viewHeight);
  camera.x += before.x - after.x;
  camera.y += before.y - after.y;
  clampCamera(camera);
}

/** Клетка под мировой точкой. null — точка вне площадки. */
export function cellAtWorld(point: WorldPoint): CellCoord | null {
  const cx = Math.floor(point.x / TILE_SIZE);
  const cy = Math.floor(point.y / TILE_SIZE);
  if (cx < 0 || cy < 0 || cx >= GRID_WIDTH || cy >= GRID_HEIGHT) return null;
  return { cx, cy };
}

/** Клетка под точкой экрана. Удобная склейка двух предыдущих. */
export function cellAtScreen(
  camera: Camera,
  screenX: number,
  screenY: number,
  viewWidth: number,
  viewHeight: number,
): CellCoord | null {
  return cellAtWorld(screenToWorld(camera, screenX, screenY, viewWidth, viewHeight));
}
