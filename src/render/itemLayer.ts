import { Container, Graphics } from 'pixi.js';
import { STEP } from '../config/balance';
import { TILE_SIZE } from '../config/grid';
import { COLOR_ITEM } from '../config/view';
import { DIR_STEP, cellCoord } from '../sim/grid';
import type { Item, WorldState } from '../sim/types';

export interface ItemLayer {
  container: Container;
  sync(world: WorldState, alpha: number): void;
}

const ITEM_SIZE = TILE_SIZE * 0.34;

/**
 * Где предмет находится на экране.
 *
 * Первую половину клетки он едет в том направлении, с которым въехал, вторую — в
 * том, куда клетка его отправляет. На повороте получается «Г», а не срезанный угол.
 *
 * alpha — доля шага, прошедшая с последнего тика. Без неё предмет дёргался бы
 * ровно 60 раз в секунду вместо того, чтобы ехать плавно на любом мониторе.
 */
function itemPosition(world: WorldState, item: Item, alpha: number): { x: number; y: number } {
  const cell = world.cells[item.cell];
  const { cx, cy } = cellCoord(item.cell);
  const centerX = (cx + 0.5) * TILE_SIZE;
  const centerY = (cy + 0.5) * TILE_SIZE;

  const t = item.t + world.beltSpeed * STEP * alpha;
  const dir = t < 0.5 ? item.dirIn : (cell?.dir ?? item.dirIn);
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
  const pool: Graphics[] = [];

  function obtain(index: number): Graphics {
    const existing = pool[index];
    if (existing) return existing;

    const graphics = new Graphics();
    graphics.rect(-ITEM_SIZE / 2, -ITEM_SIZE / 2, ITEM_SIZE, ITEM_SIZE).fill(COLOR_ITEM);
    pool.push(graphics);
    container.addChild(graphics);
    return graphics;
  }

  return {
    container,

    sync(world: WorldState, alpha: number): void {
      for (let i = 0; i < world.items.length; i++) {
        const item = world.items[i];
        if (!item) continue;
        const sprite = obtain(i);
        const position = itemPosition(world, item, alpha);
        sprite.position.set(position.x, position.y);
        sprite.visible = true;
      }

      // Лишние спрайты не удаляем, а прячем: в следующем кадре они пригодятся.
      for (let i = world.items.length; i < pool.length; i++) {
        const sprite = pool[i];
        if (sprite) sprite.visible = false;
      }
    },
  };
}
