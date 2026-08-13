import { TAP_SLOP_PX, WHEEL_ZOOM_STEP } from '../config/view';

/**
 * Ввод указателем: мышь и палец одним кодом через Pointer Events.
 *
 * Живёт в ui/, потому что это работа с DOM-событиями, а не с Pixi и не с миром.
 * Ничего не решает сам: считает жесты и зовёт колбэки, а что делать с камерой —
 * дело main.ts.
 */
export interface PointerCallbacks {
  /** Перетаскивание: сдвиг в пикселях экрана. */
  onPan(deltaX: number, deltaY: number): void;
  /** Зум вокруг точки экрана: колесо мыши или щипок двумя пальцами. */
  onZoom(factor: number, screenX: number, screenY: number): void;
  /** Указатель над полем. */
  onHover(screenX: number, screenY: number): void;
  /** Указатель ушёл с поля. */
  onHoverEnd(): void;
  /** Нажатие без перетаскивания: клик мышью или тап пальцем. */
  onTap(screenX: number, screenY: number): void;
}

interface Point {
  x: number;
  y: number;
}

function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function midpoint(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

export function attachPointerInput(element: HTMLElement, callbacks: PointerCallbacks): void {
  /** Указатели, которые сейчас прижаты к экрану. Два — это щипок. */
  const active = new Map<number, Point>();

  /** Точка нажатия. Тап или перетаскивание решается по расстоянию от неё. */
  let pressOrigin: Point = { x: 0, y: 0 };
  /** Уехал ли указатель дальше порога: если да, отпускание уже не тап. */
  let moved = false;
  let pinchDistance = 0;
  let pinchCenter: Point = { x: 0, y: 0 };

  function local(event: PointerEvent | WheelEvent): Point {
    const rect = element.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function twoPointers(): [Point, Point] | null {
    const points = [...active.values()];
    return points.length === 2 && points[0] && points[1] ? [points[0], points[1]] : null;
  }

  element.addEventListener('pointerdown', (event: PointerEvent) => {
    element.setPointerCapture(event.pointerId);
    active.set(event.pointerId, local(event));

    if (active.size === 1) {
      moved = false;
      pressOrigin = local(event);
    }

    const pair = twoPointers();
    if (pair) {
      pinchDistance = distance(pair[0], pair[1]);
      pinchCenter = midpoint(pair[0], pair[1]);
    }
  });

  element.addEventListener('pointermove', (event: PointerEvent) => {
    const point = local(event);
    const previous = active.get(event.pointerId);

    // Указатель не прижат — это просто наведение мышью.
    if (!previous) {
      callbacks.onHover(point.x, point.y);
      return;
    }

    active.set(event.pointerId, point);

    const pair = twoPointers();
    if (pair) {
      // Щипок: масштаб по изменению расстояния, сдвиг по перемещению середины.
      const spread = distance(pair[0], pair[1]);
      const center = midpoint(pair[0], pair[1]);
      if (pinchDistance > 0 && spread > 0) {
        callbacks.onZoom(spread / pinchDistance, center.x, center.y);
      }
      callbacks.onPan(center.x - pinchCenter.x, center.y - pinchCenter.y);
      pinchDistance = spread;
      pinchCenter = center;
      moved = true;
      return;
    }

    const deltaX = point.x - previous.x;
    const deltaY = point.y - previous.y;
    if (deltaX !== 0 || deltaY !== 0) {
      callbacks.onPan(deltaX, deltaY);
      callbacks.onHover(point.x, point.y);
    }
    // Считаем от точки нажатия, а не по шагам: медленное перетаскивание —
    // это всё равно перетаскивание, а не тап.
    if (!moved && distance(point, pressOrigin) > TAP_SLOP_PX) moved = true;
  });

  function release(event: PointerEvent): void {
    const wasSinglePointer = active.size === 1;
    const point = local(event);
    active.delete(event.pointerId);
    if (active.size < 2) pinchDistance = 0;

    if (wasSinglePointer && !moved) callbacks.onTap(point.x, point.y);
    if (event.pointerType !== 'mouse') callbacks.onHoverEnd();
  }

  element.addEventListener('pointerup', release);
  element.addEventListener('pointercancel', release);

  element.addEventListener('pointerleave', () => {
    if (active.size === 0) callbacks.onHoverEnd();
  });

  element.addEventListener(
    'wheel',
    (event: WheelEvent) => {
      event.preventDefault();
      const point = local(event);
      const factor = event.deltaY < 0 ? WHEEL_ZOOM_STEP : 1 / WHEEL_ZOOM_STEP;
      callbacks.onZoom(factor, point.x, point.y);
      callbacks.onHover(point.x, point.y);
    },
    { passive: false },
  );
}
