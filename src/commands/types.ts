import type { MachineKind } from '../config/machines';
import type { MaterialId } from '../config/materials';
import type { Direction } from '../sim/types';

/**
 * Команды — единственный способ изменить мир (PLAN §3.3, правило 4).
 *
 * Обработчик ввода не трогает состояние, а описывает намерение. Отсюда бесплатно
 * получаются отмена, реплей и отладка, а в следующей игре — кооп.
 */

export interface PlaceBeltCommand {
  type: 'PLACE_BELT';
  cx: number;
  cy: number;
  dir: Direction;
}

export interface PlaceInletCommand {
  type: 'PLACE_INLET';
  cx: number;
  cy: number;
  dir: Direction;
}

export interface PlaceOutletCommand {
  type: 'PLACE_OUTLET';
  cx: number;
  cy: number;
  dir: Direction;
}

export interface PlaceSplitterCommand {
  type: 'PLACE_SPLITTER';
  cx: number;
  cy: number;
  dir: Direction;
}

export interface PlaceSorterCommand {
  type: 'PLACE_SORTER';
  cx: number;
  cy: number;
  dir: Direction;
  machine: MachineKind;
}

/** Новое правило маршрутизации: эти материалы едут прямо, остальные — вбок. */
export interface SetFilterCommand {
  type: 'SET_FILTER';
  cx: number;
  cy: number;
  filter: MaterialId[];
}

/** Высыпать накопленное приёмником и начать партию заново. */
export interface ResetOutletCommand {
  type: 'RESET_OUTLET';
  cx: number;
  cy: number;
}

/** Закончить утро и запустить день, или закончить вечер и перейти к завтрашнему утру. */
export interface AdvancePhaseCommand {
  type: 'ADVANCE_PHASE';
}

export interface SetBeltSpeedCommand {
  type: 'SET_BELT_SPEED';
  /** Клеток в секунду. Границы проверяются при постановке в очередь. */
  value: number;
}

export interface RemoveCellCommand {
  type: 'REMOVE_CELL';
  cx: number;
  cy: number;
}

export type Command =
  | PlaceBeltCommand
  | PlaceInletCommand
  | PlaceOutletCommand
  | PlaceSplitterCommand
  | PlaceSorterCommand
  | SetFilterCommand
  | ResetOutletCommand
  | RemoveCellCommand
  | SetBeltSpeedCommand
  | AdvancePhaseCommand;
