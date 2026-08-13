import { Container, Sprite, Texture } from 'pixi.js';
import { STEP } from '../config/balance';
import { TILE_SIZE } from '../config/grid';
import { COLOR_BROKEN_GLASS } from '../config/view';
import { MATERIALS } from '../config/materials';
import { DIR_STEP, cellCoord } from '../sim/grid';
import { exitDirection } from '../sim/routing';
import type { Cell, Item, WorldState } from '../sim/types';

export interface ItemLayer {
  container: Container;
  /** Рисует предметы и возвращает, сколько их сейчас на площадке. */
  sync(world: WorldState, alpha: number): number;
}

const ITEM_SIZE = TILE_SIZE * 0.34;

/** Осветлить цвет: переработанное сырьё должно отличаться от сырого на глаз. */
function lighten(color: number): number {
  const mix = (shift: number): number => {
    const channel = (color >> shift) & 0xff;
    return Math.min(255, Math.round(channel + (255 - channel) * 0.45)) & 0xff;
  };
  return (mix(16) << 16) | (mix(8) << 8) | mix(0);
}

/**
 * Где предмет находится на экране.
 *
 * Первую половину клетки он едет в том направлении, с которым въехал, вторую — в
 * том, куда клетка его отправляет. На повороте получается «Г», а не срезанный угол.
 *
 * alpha — доля шага, прошедшая с последнего тика. Без неё предмет дёргался бы
 * ровно 60 раз в секунду вместо того, чтобы ехать плавно на любом мониторе.
 * Стоящий в заторе предмет упирается в свой предел и никуда не уползает, потому
 * что дальше предела экстраполяция обрезается.
 */
function itemPosition(
  cell: Cell,
  index: number,
  item: Item,
  ahead: Item | undefined,
  world: WorldState,
  alpha: number,
): { x: number; y: number } {
  const { cx, cy } = cellCoord(index);
  const centerX = (cx + 0.5) * TILE_SIZE;
  const centerY = (cy + 0.5) * TILE_SIZE;

  const predicted = item.t + world.beltSpeed * STEP * alpha;
  const t = ahead ? Math.min(predicted, ahead.t) : predicted;

  // Во второй половине клетки предмет уже повёрнут туда, куда поедет:
  // у развилки это зависит от его материала.
  const dir = t < 0.5 ? item.dirIn : exitDirection(cell, item);
  const step = DIR_STEP[dir];
  if (!step) return { x: centerX, y: centerY };

  return {
    x: centerX + step.dx * (t - 0.5) * TILE_SIZE,
    y: centerY + step.dy * (t - 0.5) * TILE_SIZE,
  };
}

/**
 * Слой предметов. Спрайты берутся из пула и не создаются в кадре: на ленте их
 * будут сотни, а сборщик мусора посреди кадра — это провал по FPS (PLAN §7).
 */
export function createItemLayer(): ItemLayer {
  const container = new Container();
  const pool: Sprite[] = [];

  function obtain(index: number): Sprite {
    const existing = pool[index];
    if (existing) return existing;

    // Белый спрайт с подкраской: цвет предмета меняется без перерисовки формы.
    const sprite = new Sprite(Texture.WHITE);
    sprite.anchor.set(0.5);
    sprite.width = ITEM_SIZE;
    sprite.height = ITEM_SIZE;
    pool.push(sprite);
    container.addChild(sprite);
    return sprite;
  }

  return {
    container,

    sync(world: WorldState, alpha: number): number {
      let used = 0;

      for (let index = 0; index < world.cells.length; index++) {
        const cell = world.cells[index];
        if (cell.items.length === 0) continue;

        for (let position = 0; position < cell.items.length; position++) {
          const item = cell.items[position];
          if (!item) continue;

          const sprite = obtain(used++);
          const point = itemPosition(cell, index, item, cell.items[position - 1], world, alpha);
          sprite.position.set(point.x, point.y);
          // Бой отличается на глаз: иначе игрок не поймёт, откуда взялась примесь.
          // Переработанное светлее сырья: видно, что через станок оно прошло.
          const base = item.broken ? COLOR_BROKEN_GLASS : MATERIALS[item.material].color;
          sprite.tint = item.form === 'raw' ? base : lighten(base);
          sprite.visible = true;
        }
      }

      // Лишние спрайты не удаляем, а прячем: в следующем кадре они пригодятся.
      for (let i = used; i < pool.length; i++) {
        const sprite = pool[i];
        if (sprite) sprite.visible = false;
      }

      return used;
    },
  };
}
