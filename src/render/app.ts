import { Application } from 'pixi.js';
import type { WorldState } from '../sim/types';

/**
 * Рендер читает мир и рисует его. В мир не пишет — правило 4 из PLAN §3.3.
 */
export interface Renderer {
  /** Какой бэкенд достался: webgl или webgpu. Нужно только оверлею. */
  readonly backend: string;
  /**
   * Нарисовать кадр.
   * @param alpha доля шага, накопленная сверх последнего тика (0..1) — для интерполяции.
   */
  render(world: WorldState, alpha: number): void;
}

export async function createRenderer(container: HTMLElement): Promise<Renderer> {
  const app = new Application();

  await app.init({
    background: 0x1b1b1a,
    resizeTo: window,
    antialias: true,
    autoDensity: true,
    resolution: window.devicePixelRatio,
  });

  // Кадрами управляет цикл в main.ts. Собственный тикер Pixi выключен, иначе получится
  // два независимых источника времени.
  app.ticker.stop();
  container.appendChild(app.canvas);

  return {
    backend: app.renderer.name,
    render(_world: WorldState, _alpha: number): void {
      // Сцена пуста: в S0 рисовать нечего. Вызов настоящий — он чистит холст и
      // прогоняет конвейер отрисовки, поэтому счётчик FPS показывает реальную работу.
      app.renderer.render(app.stage);
    },
  };
}
