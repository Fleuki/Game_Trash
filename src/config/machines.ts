import type { MaterialId } from './materials';

/**
 * Сортировщики. Числа из GDD §10, кроме цен: покупать пока не на что,
 * деньги появятся в S11.
 *
 * Разница между машинами — не «лучше и хуже», а обмен: дешёвый стол медленный
 * и ошибается, магнит быстрый и точный, но берёт только металл.
 */
export type MachineKind = 'manual' | 'magnet' | 'optical';

interface MachineInfo {
  label: string;
  /** Предметов в секунду. */
  throughput: number;
  /** Доля предметов, уехавших туда, куда решила машина. Остальные — мимо. */
  accuracy: number;
  /** Материалы, которые машина умеет выбирать. null — любые. */
  handles: MaterialId[] | null;
  /**
   * Насколько машина путает похожие материалы. Магнит не смотрит, а притягивает,
   * поэтому не путает вовсе — GDD §5: «отделяется магнитом от обратного».
   */
  confusion: number;
  color: number;
}

export const MACHINES: Record<MachineKind, MachineInfo> = {
  manual: {
    label: 'Ручной стол',
    throughput: 2,
    accuracy: 0.85,
    handles: null,
    confusion: 0.15,
    color: 0x6b5f4a,
  },
  magnet: {
    label: 'Магнит',
    throughput: 6,
    accuracy: 0.98,
    handles: ['aluminium'],
    confusion: 0,
    color: 0x4a5f6b,
  },
  optical: {
    label: 'Оптический',
    throughput: 4,
    accuracy: 0.92,
    handles: null,
    confusion: 0.06,
    color: 0x4a6b5a,
  },
};

export const MACHINE_KINDS: readonly MachineKind[] = ['manual', 'magnet', 'optical'];

/** Через сколько тиков машина отпустит следующий предмет. */
export function cooldownTicks(kind: MachineKind): number {
  return Math.round(60 / MACHINES[kind].throughput);
}

/** Что машина пропускает прямо по умолчанию: всё, что умеет. */
export function defaultMachineFilter(kind: MachineKind, all: readonly MaterialId[]): MaterialId[] {
  return [...(MACHINES[kind].handles ?? all)];
}
