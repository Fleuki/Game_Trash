import { createCommandQueue } from './commands/dispatch';
import { MAX_FRAME_DELTA, STEP, TICK_RATE } from './config/balance';
import { createRenderer } from './render/app';
import {
  cellAtScreen,
  createCamera,
  fitToScreen,
  panByScreen,
  zoomAtScreen,
} from './render/camera';
import { cellIndex } from './sim/grid';
import type { CellCoord } from './sim/types';
import { step } from './sim/step';
import { createWorld } from './sim/world';
import { createBuildTool, type BuildAction, type BuildMode } from './ui/buildTool';
import { createDebugOverlay } from './ui/debugOverlay';
import { attachPointerInput, type DragKind, type ScreenPoint } from './ui/pointer';
import { createSpeedSlider } from './ui/speedSlider';
import { createSplitterPanel } from './ui/splitterPanel';
import { createToolbar } from './ui/toolbar';

/**
 * Склейка: цикл, симуляция, ввод, рендер, оверлей.
 *
 * Единственное место, где живёт реальное время, и единственное, где решается,
 * что значит жест: строить, сносить или двигать поле.
 */
async function main(): Promise<void> {
  const stage = document.querySelector<HTMLElement>('#stage');
  const overlayElement = document.querySelector<HTMLElement>('#debug-overlay');
  const toolbarElement = document.querySelector<HTMLElement>('#toolbar');
  const panelElement = document.querySelector<HTMLElement>('#panel');
  if (!stage || !overlayElement || !toolbarElement || !panelElement) {
    throw new Error('Разметка неполная');
  }

  // Сид можно задать в адресе: ?seed=123. Нужен, чтобы прогон повторялся
  // один в один при отладке баланса. Поле ввода появится вместе с отчётом.
  const seedParam = Number(new URLSearchParams(location.search).get('seed'));
  const world = createWorld(Number.isFinite(seedParam) && seedParam !== 0 ? seedParam : Date.now());
  const commands = createCommandQueue();
  const renderer = await createRenderer(stage);
  const overlay = createDebugOverlay(overlayElement);
  const buildTool = createBuildTool();

  const camera = createCamera();
  const initialView = renderer.getViewSize();
  fitToScreen(camera, initialView.width, initialView.height);

  let mode: BuildMode = 'belt';
  let hover: CellCoord | null = null;
  let lastTap: CellCoord | null = null;
  /** Тащим камеру: режим «рука», средняя кнопка или зажатый пробел. */
  let panning = false;
  let spaceHeld = false;
  let beltCount = 0;

  const toolbar = createToolbar(toolbarElement, (picked) => {
    mode = picked;
    toolbar.setMode(mode);
  });
  toolbar.setMode(mode);

  createSpeedSlider(toolbarElement, world.beltSpeed, (value) => {
    commands.push({ type: 'SET_BELT_SPEED', value });
  });

  const splitterPanel = createSplitterPanel(panelElement, (cell, filter) => {
    commands.push({ type: 'SET_SPLITTER_FILTER', cx: cell.cx, cy: cell.cy, filter });
  });

  function cellAt(point: ScreenPoint): CellCoord | null {
    const size = renderer.getViewSize();
    return cellAtScreen(camera, point.x, point.y, size.width, size.height);
  }

  /** Тап по развилке в режиме «рука» открывает её настройку. */
  function openSplitterAt(cell: CellCoord | null): void {
    if (mode !== 'hand' || !cell) return;
    const target = world.cells[cellIndex(cell.cx, cell.cy)];
    if (!target || target.kind !== 'splitter') {
      splitterPanel.close();
      return;
    }
    splitterPanel.open(cell, target.filter);
  }

  attachPointerInput(stage, {
    onDragStart(point, kind: DragKind) {
      // Средняя кнопка и пробел двигают поле всегда, в любом режиме:
      // иначе в режиме стройки некуда деться.
      if (kind === 'auxiliary' || spaceHeld || mode === 'hand') {
        panning = true;
        return;
      }
      const cell = cellAt(point);
      if (!cell) return;
      // Правая кнопка сносит всегда, в любом режиме.
      const action: BuildAction = kind === 'secondary' ? 'erase' : (mode as BuildAction);
      buildTool.begin(cell, action);
    },

    onDragMove(point, deltaX, deltaY) {
      if (panning) {
        panByScreen(camera, deltaX, deltaY);
        return;
      }
      buildTool.extend(cellAt(point));
    },

    onDragEnd(point, wasTap) {
      const wasPanning = panning;
      panning = false;

      // Тап обрабатывается всегда: в режиме «рука» перетаскивания не было,
      // а значит, это клик по клетке, а не движение камеры.
      if (wasTap) {
        lastTap = cellAt(point);
        openSplitterAt(lastTap);
      }

      if (wasPanning) return;
      for (const command of buildTool.commit()) commands.push(command);
    },

    onDragCancel() {
      panning = false;
      buildTool.cancel();
    },

    onPinch(deltaX, deltaY, factor, centerX, centerY) {
      const size = renderer.getViewSize();
      panByScreen(camera, deltaX, deltaY);
      zoomAtScreen(camera, factor, centerX, centerY, size.width, size.height);
    },

    onWheelZoom(factor, x, y) {
      const size = renderer.getViewSize();
      zoomAtScreen(camera, factor, x, y, size.width, size.height);
    },

    onHover(point) {
      hover = cellAt(point);
    },

    onHoverEnd() {
      hover = null;
    },
  });

  document.addEventListener('keydown', (event: KeyboardEvent) => {
    if (event.code === 'Space') spaceHeld = true;
    if (event.code === 'Escape') {
      buildTool.cancel();
      splitterPanel.close();
    }
    const byKey: Record<string, BuildMode> = {
      KeyB: 'belt',
      KeyI: 'inlet',
      KeyO: 'outlet',
      KeyR: 'splitter',
      KeyE: 'erase',
      KeyH: 'hand',
    };
    const picked = byKey[event.code];
    if (picked) {
      mode = picked;
      toolbar.setMode(mode);
      if (mode !== 'hand') splitterPanel.close();
    }
  });
  document.addEventListener('keyup', (event: KeyboardEvent) => {
    if (event.code === 'Space') spaceHeld = false;
  });

  window.addEventListener('resize', () => {
    const size = renderer.getViewSize();
    fitToScreen(camera, size.width, size.height);
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
  let countedRevision = -1;

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
      // drain() отдаёт накопленное только первому шагу кадра, остальные получают пусто.
      step(world, commands.drain());
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

    // Лент на поле — для оверлея. Пересчитываем только когда постройка изменилась.
    if (world.revision !== countedRevision) {
      countedRevision = world.revision;
      beltCount = world.cells.reduce((total, cell) => total + (cell.kind === 'belt' ? 1 : 0), 0);
    }

    const itemCount = renderer.render({
      world,
      camera,
      hover,
      ghost: buildTool.preview,
      ghostAction: buildTool.action,
      alpha: accumulator / STEP,
    });

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
      mode,
      belts: beltCount,
      items: itemCount,
      beltSpeed: world.beltSpeed,
      delivered: world.delivered,
    });
  }

  requestAnimationFrame(frame);

  // Отладочный доступ к миру и камере: нужен для автопроверок и ручного ковыряния
  // в консоли. В сборку не попадает.
  if (import.meta.env.DEV) {
    (window as unknown as { game: unknown }).game = { world, camera };
  }
}

void main();
