import { MAX_FRAME_DELTA, STEP, TICK_RATE } from './config/balance';
import { createRenderer } from './render/app';
import {
  cellAtScreen,
  createCamera,
  fitToScreen,
  panByScreen,
  zoomAtScreen,
  type CellCoord,
} from './render/camera';
import { step } from './sim/step';
import { createWorld } from './sim/world';
import { createDebugOverlay } from './ui/debugOverlay';
import { attachPointerInput } from './ui/pointer';

/**
 * Склейка: цикл, симуляция, ввод, рендер, оверлей.
 *
 * Единственное место, где живёт реальное время. Симуляция про часы не знает и знать
 * не должна — она считает шаги.
 */
async function main(): Promise<void> {
  const stage = document.querySelector<HTMLElement>('#stage');
  const overlayElement = document.querySelector<HTMLElement>('#debug-overlay');
  if (!stage || !overlayElement) throw new Error('Разметка не содержит #stage или #debug-overlay');

  const world = createWorld();
  const renderer = await createRenderer(stage);
  const overlay = createDebugOverlay(overlayElement);

  const camera = createCamera();
  const view = renderer.getViewSize();
  fitToScreen(camera, view.width, view.height);

  let hover: CellCoord | null = null;
  let lastTap: CellCoord | null = null;

  attachPointerInput(stage, {
    onPan(deltaX, deltaY) {
      panByScreen(camera, deltaX, deltaY);
    },
    onZoom(factor, screenX, screenY) {
      const size = renderer.getViewSize();
      zoomAtScreen(camera, factor, screenX, screenY, size.width, size.height);
    },
    onHover(screenX, screenY) {
      const size = renderer.getViewSize();
      hover = cellAtScreen(camera, screenX, screenY, size.width, size.height);
    },
    onHoverEnd() {
      hover = null;
    },
    onTap(screenX, screenY) {
      const size = renderer.getViewSize();
      lastTap = cellAtScreen(camera, screenX, screenY, size.width, size.height);
    },
  });

  /** Нерастраченное время, накопленное к следующему шагу. */
  let accumulator = 0;
  let lastFrameMs = performance.now();

  /** Секунды, что вкладка была видима. Ожидание по тикам считается от него. */
  let visibleSeconds = 0;
  /** Шаги, отброшенные клампом: фон и фризы. */
  let skippedTicks = 0;

  // Замер TPS и FPS: копим за секунду, потом делим.
  let sampleSeconds = 0;
  let ticksInSample = 0;
  let framesInSample = 0;
  let tps = 0;
  let fps = 0;
  let stepMs = 0;

  // Возврат из фона. requestAnimationFrame в фоне не вызывается, поэтому первый кадр
  // после возврата принёс бы всю паузу целиком. Время паузы не догоняем, а списываем:
  // симуляция в фоне не шла, и пачки шагов на возврате быть не должно.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return;
    const now = performance.now();
    skippedTicks += ((now - lastFrameMs) / 1000) * TICK_RATE;
    lastFrameMs = now;
    accumulator = 0;
  });

  function frame(nowMs: number): void {
    requestAnimationFrame(frame);

    const rawDelta = (nowMs - lastFrameMs) / 1000;
    lastFrameMs = nowMs;

    const delta = Math.min(rawDelta, MAX_FRAME_DELTA);
    if (rawDelta > delta) skippedTicks += (rawDelta - delta) * TICK_RATE;

    accumulator += delta;
    visibleSeconds += delta;

    const simStartMs = performance.now();
    let ticksThisFrame = 0;
    while (accumulator >= STEP) {
      step(world);
      accumulator -= STEP;
      ticksThisFrame++;
    }
    if (ticksThisFrame > 0) {
      stepMs = (performance.now() - simStartMs) / ticksThisFrame;
    }

    ticksInSample += ticksThisFrame;
    framesInSample++;
    sampleSeconds += delta;
    if (sampleSeconds >= 1) {
      tps = ticksInSample / sampleSeconds;
      fps = framesInSample / sampleSeconds;
      ticksInSample = 0;
      framesInSample = 0;
      sampleSeconds = 0;
    }

    renderer.render({ world, camera, hover, alpha: accumulator / STEP });

    overlay.update({
      tick: world.tick,
      tps,
      fps,
      stepMs,
      drift: world.tick - visibleSeconds * TICK_RATE,
      skipped: skippedTicks,
      backend: renderer.backend,
      hover,
      lastTap,
      zoom: camera.zoom,
    });
  }

  requestAnimationFrame(frame);
}

void main();
