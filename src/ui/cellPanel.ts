import { MACHINES, type MachineKind } from '../config/machines';
import { MATERIALS, MATERIAL_IDS, type MaterialId } from '../config/materials';
import type { CellCoord } from '../sim/types';

export interface CellPanel {
  /** Показать настройку клетки: развилки или сортировщика. */
  open(cell: CellCoord, filter: readonly MaterialId[], machine: MachineKind | null): void;
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
): CellPanel {
  let current: CellCoord | null = null;
  let selected = new Set<MaterialId>();

  const title = document.createElement('div');
  title.className = 'panel-title';

  const rows = document.createElement('div');
  rows.className = 'panel-rows';

  const specs = document.createElement('div');
  specs.className = 'panel-specs';

  const hint = document.createElement('div');
  hint.className = 'panel-hint';
  hint.textContent = 'Отмеченное едет прямо, остальное — вбок';

  const close = document.createElement('button');
  close.type = 'button';
  close.textContent = 'Закрыть';
  close.addEventListener('click', () => panel.close());

  element.append(title, specs, rows, hint, close);
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
      if (input.checked) selected.add(material);
      else selected.delete(material);
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

    open(cell: CellCoord, filter: readonly MaterialId[], machine: MachineKind | null): void {
      current = cell;
      selected = new Set(filter);

      const info = machine ? MACHINES[machine] : null;
      title.textContent = `${info ? info.label : 'Развилка'} ${cell.cx}, ${cell.cy}`;
      specs.textContent = info
        ? `${info.throughput} ед/с, точность ${Math.round(info.accuracy * 100)}%`
        : 'разводит поток без потерь';

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
