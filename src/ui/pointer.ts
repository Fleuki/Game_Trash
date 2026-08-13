import { TAP_SLOP_PX, WHEEL_ZOOM_STEP } from '../config/view';

/**
 * Ввод указателем: мышь и палец одним кодом через Pointer Events.
 *
 * Живёт в ui/, потому что это работа с DOM-событиями, а не с Pixi и не с миром.
 * Ничего не решает сам: распознаёт жесты и зовёт колбэки. Что жест значит —
 * строить, сносить или двигать камеру — решает main.ts.
 */

export interface ScreenPoint {
  x: number;
  y: number;
}

/** Какой кнопкой начали тащить. Средняя всегда двигает поле, правая — сносит. */
export type DragKind = 'primary' | 'secondary' | 'auxiliary';

export interface GestureCallbacks {
  onDragStart(point: ScreenPoint, kind: DragKind): void;
  onDragMove(point: ScreenPoint, deltaX: number, deltaY: number): void;
  /** wasTap — указатель не уехал дальше порога, то есть это клик или тап. */
  onDragEnd(point: ScreenPoint, wasTap: boolean): void;
  /** Начатое перетаскивание отменено: например, лёг второй палец. */
  onDragCancel(): void;
  /** Два пальца: сдвиг середины и изменение расстояния между ними за один шаг. */
  onPinch(
    deltaX: number,
    deltaY: number,
    factor: number,
    centerX: number,
    centerY: number,
  ): void;
  onWheelZoom(factor: number, x: number, y: number): void;
  onHover(point: ScreenPoint): void;
  onHoverEnd(): void;
}

function distance(a: ScreenPoint, b: ScreenPoint): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function midpoint(a: ScreenPoint, b: ScreenPoint): ScreenPoint {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

function dragKindOf(button: number): DragKind {
  if (button === 1) return 'auxiliary';
  if (button === 2) return 'secondary';
  return 'primary';
}

export function attachPointerInput(element: HTMLElement, callbacks: GestureCallbacks): void {
  /** Указатели, которые сейчас прижаты к экрану. Два — это щипок. */
  const active = new Map<number, ScreenPoint>();

  /** Идёт ли одиночное перетаскивание прямо сейчас. */
  let dragging = false;
  /** Точка нажатия. Тап или перетаскивание решается по расстоянию от неё. */
  let pressOrigin: ScreenPoint = { x: 0, y: 0 };
  /** Уехал ли указатель дальше порога: если да, отпускание уже не тап. */
  let moved = false;

  let pinchDistance = 0;
  let pinchCenter: ScreenPoint = { x: 0, y: 0 };

  function local(event: PointerEvent | WheelEvent): ScreenPoint {
    const rect = element.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function twoPointers(): [ScreenPoint, ScreenPoint] | null {
    const points = [...active.values()];
    return points.length === 2 && points[0] && points[1] ? [points[0], points[1]] : null;
  }

  element.addEventListener('pointerdown', (event: PointerEvent) => {
    element.setPointerCapture(event.pointerId);
    const point = local(event);
    active.set(event.pointerId, point);

    if (active.size === 1) {
      dragging = true;
      moved = false;
      pressOrigin = point;
      callbacks.onDragStart(point, dragKindOf(event.button));
      return;
    }

    const pair = twoPointers();
    if (pair) {
      // Лёг второй палец — значит, человек собрался двигать поле, а не строить.
      if (dragging) {
        dragging = false;
        callbacks.onDragCancel();
      }
      pinchDistance = distance(pair[0], pair[1]);
      pinchCenter = midpoint(pair[0], pair[1]);
    }
  });

  element.addEventListener('pointermove', (event: PointerEvent) => {
    const point = local(event);
    const previous = active.get(event.pointerId);

    // Указатель не прижат — это просто наведение мышью.
    if (!previous) {
      callbacks.onHover(point);
      return;
    }

    active.set(event.pointerId, point);

    const pair = twoPointers();
    if (pair) {
      const spread = distance(pair[0], pair[1]);
      const center = midpoint(pair[0], pair[1]);
      const factor = pinchDistance > 0 && spread > 0 ? spread / pinchDistance : 1;
      callbacks.onPinch(center.x - pinchCenter.x, center.y - pinchCenter.y, factor, center.x, center.y);
      pinchDistance = spread;
      pinchCenter = center;
      return;
    }

    if (!dragging) return;

    const deltaX = point.x - previous.x;
    const deltaY = point.y - previous.y;
    // Считаем от точки нажатия, а не по шагам: медленное перетаскивание —
    // это всё равно перетаскивание, а не тап.
    if (!moved && distance(point, pressOrigin) > TAP_SLOP_PX) moved = true;

    callbacks.onDragMove(point, deltaX, deltaY);
    callbacks.onHover(point);
  });

  function release(event: PointerEvent): void {
    const point = local(event);
    const wasSinglePointer = active.size === 1;
    active.delete(event.pointerId);
    if (active.size < 2) pinchDistance = 0;

    if (wasSinglePointer && dragging) {
      dragging = false;
      callbacks.onDragEnd(point, !moved);
    }
    if (event.pointerType !== 'mouse' && active.size === 0) callbacks.onHoverEnd();
  }

  element.addEventListener('pointerup', release);
  element.addEventListener('pointercancel', release);

  element.addEventListener('pointerleave', () => {
    if (active.size === 0) callbacks.onHoverEnd();
  });

  // Правая кнопка сносит, поэтому системное меню на поле не нужно.
  element.addEventListener('contextmenu', (event: Event) => event.preventDefault());

  element.addEventListener(
    'wheel',
    (event: WheelEvent) => {
      event.preventDefault();
      const point = local(event);
      const factor = event.deltaY < 0 ? WHEEL_ZOOM_STEP : 1 / WHEEL_ZOOM_STEP;
      callbacks.onWheelZoom(factor, point.x, point.y);
      callbacks.onHover(point);
    },
    { passive: false },
  );
}
