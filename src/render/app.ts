import { Application, Container } from 'pixi.js';
import { COLOR_BACKGROUND } from '../config/view';
import type { WorldState } from '../sim/types';
import type { Camera, CellCoord } from './camera';
import { createGridLayer } from './gridLayer';

/** Всё, что нужно нарисовать кадр. Рендер читает это и ничего из этого не меняет. */
export interface Frame {
  world: WorldState;
  camera: Camera;
  /** Клетка под курсором или null. */
  hover: CellCoord | null;
  /** Доля шага, накопленная сверх последнего тика (0..1) — для интерполяции. */
  alpha: number;
}

export interface Renderer {
  /** Какой бэкенд достался: webgl или webgpu. Нужно только оверлею. */
  readonly backend: string;
  /** Размер холста в пикселях CSS. Ввод считает координаты относительно него. */
  getViewSize(): { width: number; height: number };
  render(frame: Frame): void;
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
  viewport.addChild(grid.container);
  app.stage.addChild(viewport);

  return {
    backend: app.renderer.name,

    getViewSize() {
      return { width: app.renderer.screen.width, height: app.renderer.screen.height };
    },

    render(frame: Frame): void {
      const { camera } = frame;
      grid.syncZoom(camera.zoom);
      grid.setHover(frame.hover);

      viewport.scale.set(camera.zoom);
      viewport.position.set(
        app.renderer.screen.width / 2 - camera.x * camera.zoom,
        app.renderer.screen.height / 2 - camera.y * camera.zoom,
      );

      app.renderer.render(app.stage);
    },
  };
}
