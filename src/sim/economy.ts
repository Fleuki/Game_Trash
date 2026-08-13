import {
  BUILD_COST,
  MACHINE_COST,
  MATERIAL_PRICE,
  PURITY_FULL,
  PURITY_SCRAP,
  REFUND_RATE,
  SCRAP_MULTIPLIER,
  THRESHOLD_MULTIPLIER,
} from '../config/economy';
import { COMPOST_PRICE, CRAFTERS, FORM_MULTIPLIER, type CraftKind, type ItemForm } from '../config/crafters';
import type { MachineKind } from '../config/machines';
import type { MaterialId } from '../config/materials';
import { collectedTotal, purityOf } from './purity';
import type { Cell, CellKind } from './types';

/**
 * Множитель цены за чистоту.
 *
 * Выше порога полной цены — платят полностью. Ниже порога брака — треть цены,
 * и это обрыв, а не плавный спуск: отгружать мусор должно быть больно.
 * Между порогами — прямая, чтобы каждый выигранный процент чистоты был виден.
 */
export function purityMultiplier(purity: number): number {
  if (purity >= PURITY_FULL) return 1;
  if (purity < PURITY_SCRAP) return SCRAP_MULTIPLIER;

  const span = PURITY_FULL - PURITY_SCRAP;
  const position = (purity - PURITY_SCRAP) / span;
  return THRESHOLD_MULTIPLIER + (1 - THRESHOLD_MULTIPLIER) * position;
}

/**
 * Цена одной единицы с учётом переработки.
 *
 * Компост считается отдельно: у органики цена ноль, и умножать её бессмысленно —
 * компостер не повышает цену, а создаёт её из ничего.
 */
export function unitPrice(material: MaterialId, form: ItemForm): number {
  if (form === 'compost') return COMPOST_PRICE;
  return MATERIAL_PRICE[material] * FORM_MULTIPLIER[form];
}

export interface Shipment {
  material: string;
  /** Всего единиц в партии, включая примеси: платят за партию, а не за чистое. */
  units: number;
  purity: number;
  revenue: number;
}

/** Во сколько обойдётся отгрузка партии из приёмника прямо сейчас. */
export function valueOf(cell: Cell): Shipment | null {
  const target = cell.filter[0];
  const units = collectedTotal(cell);
  if (!target || units === 0) return null;

  const purity = purityOf(cell);
  // Партия стоит ровно столько, сколько стоит то, что в неё приехало: примеси
  // приносят свою цену, а не цену нужной фракции.
  const revenue = Math.round(cell.value * purityMultiplier(purity));
  return { material: target, units, purity, revenue };
}

/** Сколько стоит поставить это на клетку. */
export function buildCost(kind: CellKind, machine: MachineKind | null): number {
  if (kind === 'sorter') return machine ? MACHINE_COST[machine] : 0;
  if (kind === 'belt') return BUILD_COST.belt;
  if (kind === 'splitter') return BUILD_COST.splitter;
  if (kind === 'inlet') return BUILD_COST.inlet;
  if (kind === 'outlet') return BUILD_COST.outlet;
  if (kind === 'waste') return BUILD_COST.waste;
  return 0;
}

/** Сколько стоит крафт-станок. */
export function crafterCost(kind: CraftKind): number {
  return CRAFTERS[kind].cost;
}

/** Сколько вернётся за то, что уже стоит на клетке. */
export function refundFor(cell: Cell): number {
  const base = cell.kind === 'crafter' && cell.crafter
    ? CRAFTERS[cell.crafter].cost
    : buildCost(cell.kind, cell.machine);
  return Math.round(base * REFUND_RATE);
}
