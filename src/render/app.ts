import { Application, Container } from 'pixi.js';
import { COLOR_BACKGROUND } from '../config/view';
import type { CellCoord, CellPlacement, WorldState } from '../sim/types';
import type { BuildAction } from '../ui/buildTool';
import { createBeltLayer } from './beltLayer';
import type { Camera } from './camera';
import { createGridLayer } from './gridLayer';
import { createItemLayer } from './itemLayer';

/** Всё, что нужно нарисовать кадр. Рендер читает это и ничего из этого не меняет. */
export interface Frame {
  world: WorldState;
  camera: Camera;
  /** Клетка под курсором или null. */
  hover: CellCoord | null;
  /** Незавершённая протяжка: то, что появится, если отпустить сейчас. */
  ghost: readonly CellPlacement[];
  ghostAction: BuildAction;
  /** Доля шага, накопленная сверх последнего тика (0..1) — для интерполяции. */
  alpha: number;
}

export interface Renderer {
  /** Какой бэкенд достался: webgl или webgpu. Нужно только оверлею. */
  readonly backend: string;
  /** Размер холста в пикселях CSS. Ввод считает координаты относительно него. */
  getViewSize(): { width: number; height: number };
  /** Рисует кадр и возвращает, сколько предметов на площадке. */
  render(frame: Frame): number;
}

export async function createRenderer(container: HTMLElement): Promise<Renderer> {
  const app = new Application();

  await app.init({
    background: COLOR_BACKGROUND,
    resizeTo: window,
    antialias: true,
    autoDensity: true,
    resolution: window.devicePixelRatio,
  });

  // Кадрами управляет цикл в main.ts. Собственный тикер Pixi выключен, иначе получится
  // два независимых источника времени.
  app.ticker.stop();
  container.appendChild(app.canvas);

  // Всё игровое поле живёт внутри viewport: камера — это его позиция и масштаб,
  // а не пересчёт координат каждого объекта.
  const viewport = new Container();
  const grid = createGridLayer();
  const belts = createBeltLayer();
  const items = createItemLayer();
  // Порядок: сетка снизу, ленты, предметы на них, подсветка клетки — самой верхней.
  viewport.addChild(grid.container, belts.container, items.container, grid.hoverContainer);
  app.stage.addChild(viewport);

  return {
    backend: app.renderer.name,

    getViewSize() {
      return { width: app.renderer.screen.width, height: app.renderer.screen.height };
    },

    render(frame: Frame): number {
      const { camera } = frame;
      grid.syncZoom(camera.zoom);
      grid.setHover(frame.hover);
      belts.sync(frame.world, frame.ghost, frame.ghostAction);
      const itemCount = items.sync(frame.world, frame.alpha);

      viewport.scale.set(camera.zoom);
      viewport.position.set(
        app.renderer.screen.width / 2 - camera.x * camera.zoom,
        app.renderer.screen.height / 2 - camera.y * camera.zoom,
      );

      app.renderer.render(app.stage);
      return itemCount;
    },
  };
}
