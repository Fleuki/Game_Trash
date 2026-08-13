/** Параметры камеры и ввода. Всё, что можно захотеть покрутить руками, — здесь. */

/**
 * Минимальный зум. Подобран так, чтобы площадка 32×20 целиком влезала в экран
 * шириной 360 px: 360 / (32 × 64) = 0.176, с полем по краям — чуть меньше.
 * Клетка при этом около 10 px: смотреть можно, строить нет — для этого приближают.
 */
export const MIN_ZOOM = 0.15;

/** Максимальный зум: клетка крупная, видно, что в ней происходит. */
export const MAX_ZOOM = 2.5;

/** Множитель зума на один щелчок колеса. */
export const WHEEL_ZOOM_STEP = 1.15;

/** Отступ вокруг площадки при подгонке под экран, доля от меньшей стороны. */
export const FIT_PADDING = 0.06;

/**
 * Порог в пикселях экрана, до которого движение пальца считается тапом, а не перетаскиванием.
 * На тачскрине палец всегда немного едет, поэтому не ноль.
 */
export const TAP_SLOP_PX = 8;

/** Цвета. Временные: настоящая палитра — в S21. */
export const COLOR_BACKGROUND = 0x1b1b1a;
export const COLOR_GRID_LINE = 0x2f2e2b;
export const COLOR_GRID_BORDER = 0x4a4843;
export const COLOR_CELL_HOVER = 0x6f9a5c;
export const COLOR_BELT = 0x46433c;
export const COLOR_BELT_ARROW = 0x938d7c;
export const COLOR_ERASE = 0xa8524a;
export const COLOR_INLET = 0x5c7a9a;
export const COLOR_ITEM = 0xd9cfa6;
export const COLOR_OUTLET = 0x7a6a4a;
