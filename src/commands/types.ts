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

export interface RemoveCellCommand {
  type: 'REMOVE_CELL';
  cx: number;
  cy: number;
}

export type Command = PlaceBeltCommand | RemoveCellCommand;
