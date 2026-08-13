import type { Command } from '../commands/types';
import { DIR_RIGHT, directionBetween, inBounds } from '../sim/grid';
import { MACHINE_KINDS, type MachineKind } from '../config/machines';
import type { CellCoord, CellPlacement } from '../sim/types';


/** Что делает протяжка по полю. «Рука» ничего не строит и просто двигает камеру. */
export type BuildMode =
  | 'belt'
  | 'inlet'
  | 'outlet'
  | 'waste'
  | 'splitter'
  | MachineKind
  | 'erase'
  | 'hand';

/** Что кладёт текущая протяжка. Режим «рука» до инструмента не доходит. */
export type BuildAction = Exclude<BuildMode, 'hand'>;

export interface BuildTool {
  /** Идёт ли протяжка прямо сейчас. */
  readonly active: boolean;
  /** Что рисовать призраком: пусто, если протяжки нет. */
  readonly preview: readonly CellPlacement[];
  /** Строит или сносит текущая протяжка. */
  readonly action: BuildAction;

  begin(cell: CellCoord, action: BuildAction): void;
  extend(cell: CellCoord | null): void;
  /** Завершить протяжку и получить команды. Путь сбрасывается. */
  commit(): Command[];
  cancel(): void;
}

/**
 * Протяжка ленты.
 *
 * Копит путь по клеткам и превращает его в команды. Направление каждой клетки —
 * это направление на следующую, поэтому излом сам разворачивает ленту: отдельной
 * «постановки поворота» не существует.
 */
export function createBuildTool(): BuildTool {
  let path: CellCoord[] = [];
  let action: BuildAction = 'belt';
  let active = false;

  function last(): CellCoord | undefined {
    return path[path.length - 1];
  }

  function pushCell(cx: number, cy: number): void {
    if (!inBounds(cx, cy)) return;

    const tail = last();
    if (tail && tail.cx === cx && tail.cy === cy) return;

    // Отход назад по своему же следу укорачивает путь, а не рисует поверх.
    const beforeTail = path[path.length - 2];
    if (beforeTail && beforeTail.cx === cx && beforeTail.cy === cy) {
      path.pop();
      return;
    }

    path.push({ cx, cy });
  }

  /**
   * Палец и мышь двигаются быстрее, чем приходят события, и между кадрами
   * получается разрыв. Заполняем его буквой «Г»: сначала по горизонтали, потом
   * по вертикали — предсказуемо и повторяемо.
   */
  function fillGap(from: CellCoord, to: CellCoord): void {
    let { cx, cy } = from;
    while (cx !== to.cx) {
      cx += Math.sign(to.cx - cx);
      pushCell(cx, cy);
    }
    while (cy !== to.cy) {
      cy += Math.sign(to.cy - cy);
      pushCell(cx, cy);
    }
  }

  function plan(): CellPlacement[] {
    const planned: CellPlacement[] = [];
    let previousDir = DIR_RIGHT;

    for (let i = 0; i < path.length; i++) {
      const cell = path[i];
      if (!cell) continue;
      const next = path[i + 1];
      // Последняя клетка сохраняет направление предыдущего участка: лента
      // заканчивается, продолжая ехать туда же, куда ехала.
      const dir = next ? (directionBetween(cell.cx, cell.cy, next.cx, next.cy) ?? previousDir) : previousDir;
      previousDir = dir;
      planned.push({ cx: cell.cx, cy: cell.cy, dir });
    }
    return planned;
  }

  return {
    get active(): boolean {
      return active;
    },

    get preview(): readonly CellPlacement[] {
      return active ? plan() : [];
    },

    get action(): BuildAction {
      return action;
    },

    begin(cell: CellCoord, nextAction: BuildAction): void {
      action = nextAction;
      active = true;
      path = [];
      pushCell(cell.cx, cell.cy);
    },

    extend(cell: CellCoord | null): void {
      if (!active || !cell) return;
      const tail = last();
      if (!tail) {
        pushCell(cell.cx, cell.cy);
        return;
      }
      fillGap(tail, cell);
    },

    commit(): Command[] {
      if (!active) return [];
      const planned = plan();
      active = false;
      path = [];

      if (action === 'erase') {
        return planned.map((cell) => ({ type: 'REMOVE_CELL', cx: cell.cx, cy: cell.cy }));
      }
      const machine = MACHINE_KINDS.find((kind) => kind === action);
      if (machine) {
        return planned.map((cell) => ({
          type: 'PLACE_SORTER',
          cx: cell.cx,
          cy: cell.cy,
          dir: cell.dir,
          machine,
        }));
      }

      const type =
        action === 'inlet'
          ? 'PLACE_INLET'
          : action === 'waste'
            ? 'PLACE_WASTE'
            : action === 'outlet'
              ? 'PLACE_OUTLET'
              : action === 'splitter'
                ? 'PLACE_SPLITTER'
                : 'PLACE_BELT';
      return planned.map((cell) => ({ type, cx: cell.cx, cy: cell.cy, dir: cell.dir }));
    },

    cancel(): void {
      active = false;
      path = [];
    },
  };
}
