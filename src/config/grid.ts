/**
 * Размеры площадки. Это участок №1 из GDD §11 — тот, на котором начинается игра.
 * Участки 2 и 3 появятся в S16 и лягут рядом, поэтому сетка — не «весь мир», а одна площадка.
 */

/** Клеток по горизонтали. */
export const GRID_WIDTH = 32;

/** Клеток по вертикали. */
export const GRID_HEIGHT = 20;

/** Сторона клетки в мировых единицах. Тайл 64 px из PLAN §10. */
export const TILE_SIZE = 64;

/** Ширина площадки в мировых единицах. */
export const WORLD_WIDTH = GRID_WIDTH * TILE_SIZE;

/** Высота площадки в мировых единицах. */
export const WORLD_HEIGHT = GRID_HEIGHT * TILE_SIZE;
