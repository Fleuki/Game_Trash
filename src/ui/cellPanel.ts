import { MACHINES, type MachineKind } from '../config/machines';
import { MATERIALS, MATERIAL_IDS, type MaterialId } from '../config/materials';
import type { CellCoord } from '../sim/types';

/** Что настраиваем: у приёмника фракция одна, у остальных — список. */
export type PanelKind = 'splitter' | 'sorter' | 'outlet';

export interface OutletStats {
  collected: Record<MaterialId, number>;
  purity: number;
}

export interface CellPanel {
  /** Показать настройку клетки: развилки или сортировщика. */
  open(
    cell: CellCoord,
    kind: PanelKind,
    filter: readonly MaterialId[],
    machine: MachineKind | null,
    stats: OutletStats | null,
  ): void;
  /** Обновить состав партии, пока панель открыта. */
  refresh(stats: OutletStats): void;
  readonly cell: CellCoord | null;
  close(): void;
  readonly isOpen: boolean;
}

/**
 * Настройка: какие материалы едут прямо, какие уходят вбок.
 *
 * Панель ничего не решает сама — отдаёт новый список наружу, а мир меняет
 * команда SET_FILTER.
 */
export function createCellPanel(
  element: HTMLElement,
  onChange: (cell: CellCoord, filter: MaterialId[]) => void,
  onReset: (cell: CellCoord) => void,
): CellPanel {
  let current: CellCoord | null = null;
  let selected = new Set<MaterialId>();
  let single = false;

  const title = document.createElement('div');
  title.className = 'panel-title';

  const rows = document.createElement('div');
  rows.className = 'panel-rows';

  const specs = document.createElement('div');
  specs.className = 'panel-specs';

  const hint = document.createElement('div');
  hint.className = 'panel-hint';
  hint.textContent = 'Отмеченное едет прямо, остальное — вбок';

  const stats = document.createElement('div');
  stats.className = 'panel-stats';

  const reset = document.createElement('button');
  reset.type = 'button';
  reset.textContent = 'Высыпать партию';
  reset.addEventListener('click', () => {
    if (current) onReset(current);
  });

  const close = document.createElement('button');
  close.type = 'button';
  close.textContent = 'Закрыть';
  close.addEventListener('click', () => panel.close());

  element.append(title, specs, rows, hint, stats, reset, close);
  element.hidden = true;

  const checkboxes = new Map<MaterialId, HTMLInputElement>();
  for (const material of MATERIAL_IDS) {
    const row = document.createElement('label');
    const input = document.createElement('input');
    input.type = 'checkbox';

    const swatch = document.createElement('span');
    swatch.className = 'swatch';
    swatch.style.background = `#${MATERIALS[material].color.toString(16).padStart(6, '0')}`;

    const caption = document.createElement('span');
    caption.textContent = MATERIALS[material].label;

    input.addEventListener('change', () => {
      // Приёмник берёт ровно одну фракцию: отметил новую — прежняя снимается.
      if (single) {
        selected = new Set(input.checked ? [material] : []);
        for (const [id, box] of checkboxes) box.checked = selected.has(id);
      } else if (input.checked) {
        selected.add(material);
      } else {
        selected.delete(material);
      }
      if (current) onChange(current, [...selected]);
    });

    row.append(input, swatch, caption);
    rows.appendChild(row);
    checkboxes.set(material, input);
  }

  const panel: CellPanel = {
    get isOpen(): boolean {
      return current !== null;
    },

    get cell(): CellCoord | null {
      return current;
    },

    refresh(next: OutletStats): void {
      if (!current || !single) return;
      const total = MATERIAL_IDS.reduce((sum, id) => sum + next.collected[id], 0);
      stats.textContent =
        total === 0
          ? 'партия пуста'
          : [
              `принято ${total} ед`,
              ...MATERIAL_IDS.filter((id) => next.collected[id] > 0).map(
                (id) => `${MATERIALS[id].label}: ${next.collected[id]}`,
              ),
              `чистота ${(next.purity * 100).toFixed(1)}%`,
            ].join('\n');
    },

    open(
      cell: CellCoord,
      kind: PanelKind,
      filter: readonly MaterialId[],
      machine: MachineKind | null,
      outletStats: OutletStats | null,
    ): void {
      current = cell;
      selected = new Set(filter);
      single = kind === 'outlet';

      const info = machine ? MACHINES[machine] : null;
      title.textContent = single
        ? `Приёмник ${cell.cx}, ${cell.cy}`
        : `${info ? info.label : 'Развилка'} ${cell.cx}, ${cell.cy}`;
      specs.textContent = single
        ? 'копит фракцию и считает её чистоту'
        : info
          ? `${info.throughput} ед/с, точность ${Math.round(info.accuracy * 100)}%`
          : 'разводит поток без потерь';
      hint.textContent = single
        ? 'Органика пачкает вдвое сильнее прочих примесей'
        : 'Отмеченное едет прямо, остальное — вбок';
      stats.hidden = !single;
      reset.hidden = !single;
      if (outletStats) panel.refresh(outletStats);

      for (const [material, input] of checkboxes) {
        input.checked = selected.has(material);
        // Магнит берёт только металл: остальное ему включить нельзя.
        const canHandle = !info?.handles || info.handles.includes(material);
        input.disabled = !canHandle;
        input.parentElement?.classList.toggle('is-disabled', !canHandle);
      }
      element.hidden = false;
    },

    close(): void {
      current = null;
      element.hidden = true;
    },
  };

  return panel;
}
