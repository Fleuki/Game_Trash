import type { WorldState } from './types';

/** Новый мир в начальном состоянии. */
export function createWorld(): WorldState {
  return { tick: 0 };
}
