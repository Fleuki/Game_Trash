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
  | RemoveCellCommand
  | SetBeltSpeedCommand;
