import type { CraftKind } from '../config/crafters';
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

export interface PlaceCrafterCommand {
  type: 'PLACE_CRAFTER';
  cx: number;
  cy: number;
  dir: Direction;
  crafter: CraftKind;
}

export interface PlaceWasteCommand {
  type: 'PLACE_WASTE';
  cx: number;
  cy: number;
  dir: Direction;
}

/** Переключить источник между купленной партией и раскопкой кучи. */
export interface SetInletSourceCommand {
  type: 'SET_INLET_SOURCE';
  cx: number;
  cy: number;
  fromPile: boolean;
}

/** Перенести построенное на другую клетку. Бесплатно: это не покупка. */
export interface MoveCellCommand {
  type: 'MOVE_CELL';
  cx: number;
  cy: number;
  toCx: number;
  toCy: number;
}

/** Открыть следующий участок. */
export interface BuyPlotCommand {
  type: 'BUY_PLOT';
}

/** Вывезти часть кучи за деньги. */
export interface DisposeWasteCommand {
  type: 'DISPOSE_WASTE';
  units: number;
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

/** Отгрузить накопленную приёмником партию и получить за неё деньги. */
export interface ShipOutletCommand {
  type: 'SHIP_OUTLET';
  cx: number;
  cy: number;
}

/** Закончить утро и запустить день, или закончить вечер и перейти к завтрашнему утру. */
/** Взять партию с утреннего рынка. */
export interface SelectOfferCommand {
  type: 'SELECT_OFFER';
  index: number;
}

/** Взять контракт с утренней доски. */
export interface TakeContractCommand {
  type: 'TAKE_CONTRACT';
  index: number;
}

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
  | PlaceWasteCommand
  | PlaceCrafterCommand
  | DisposeWasteCommand
  | SetInletSourceCommand
  | BuyPlotCommand
  | MoveCellCommand
  | SetFilterCommand
  | ShipOutletCommand
  | RemoveCellCommand
  | SetBeltSpeedCommand
  | AdvancePhaseCommand
  | SelectOfferCommand
  | TakeContractCommand;
