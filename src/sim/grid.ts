import { GRID_HEIGHT, GRID_WIDTH } from '../config/grid';
import type { Direction } from './types';

export const DIR_RIGHT: Direction = 0;
export const DIR_DOWN: Direction = 1;
export const DIR_LEFT: Direction = 2;
export const DIR_UP: Direction = 3;

/** Сдвиг на одну клетку по каждому направлению. Индекс — само направление. */
export const DIR_STEP: readonly { readonly dx: number; readonly dy: number }[] = [
  { dx: 1, dy: 0 },
  { dx: 0, dy: 1 },
  { dx: -1, dy: 0 },
  { dx: 0, dy: -1 },
];

export function inBounds(cx: number, cy: number): boolean {
  return cx >= 0 && cy >= 0 && cx < GRID_WIDTH && cy < GRID_HEIGHT;
}

export function cellIndex(cx: number, cy: number): number {
  return cy * GRID_WIDTH + cx;
}

/**
 * Направление от одной клетки к соседней.
 * null — клетки не соседи по стороне (диагональ, та же клетка, дальше одной клетки).
 */
export function directionBetween(
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
): Direction | null {
  const dx = toX - fromX;
  const dy = toY - fromY;
  if (dx === 1 && dy === 0) return DIR_RIGHT;
  if (dx === -1 && dy === 0) return DIR_LEFT;
  if (dx === 0 && dy === 1) return DIR_DOWN;
  if (dx === 0 && dy === -1) return DIR_UP;
  return null;
}
