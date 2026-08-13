import { MACHINES, type MachineKind } from '../config/machines';
import { MATERIALS, MATERIAL_IDS, type MaterialId } from '../config/materials';
import type { CellCoord } from '../sim/types';

/** Что настраиваем: у приёмника фракция одна, у остальных — список. */
export type PanelKind = 'splitter' | 'sorter' | 'outlet' | 'inlet';

export interface OutletStats {
  collected: Record<MaterialId, number>;
  /** Сколько боя в партии. Считается отдельно: это уже не стекло. */
  broken: number;
  purity: number;
  /** Сколько дадут за партию прямо сейчас, ₽. */
  revenue: number;
}

export interface CellPanel {
  /** Показать настройку клетки: развилки или сортировщика. */
  open(
    cell: CellCoord,
    kind: PanelKind,
    filter: readonly MaterialId[],
    machine: MachineKind | null,
    stats: OutletStats | null,
    /** Точность машины при текущей скорости ленты. */
    accuracy: number,
    /** Для источника: копает ли он кучу, и сколько в ней осталось. */
    inlet: { fromPile: boolean; pile: number } | null,
  ): void;
  /** Обновить состав партии, пока панель открыта. */
  refresh(stats: OutletStats): void;
  /** Обновить сведения об источнике, пока панель открыта. */
  refreshInlet(info: { fromPile: boolean; pile: number }): void;
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
  onSource: (cell: CellCoord, fromPile: boolean) => void,
): CellPanel {
  let current: CellCoord | null = null;
  let selected = new Set<MaterialId>();
  let single = false;

  const title = document.createElement('div');
  title.className = 'panel-title';

  // Быстрая настройка: одна кнопка вместо четырёх переключателей. Ради этого
  // весь срез и затевался — перенастройка линии должна занимать секунды.
  const quick = document.createElement('div');
  quick.className = 'panel-quick';

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
  reset.textContent = 'Отгрузить';
  reset.addEventListener('click', () => {
    if (current) onReset(current);
  });

  const source = document.createElement('button');
  source.type = 'button';
  let digging = false;
  source.addEventListener('click', () => {
    if (current) onSource(current, !digging);
  });

  const close = document.createElement('button');
  close.type = 'button';
  close.textContent = 'Закрыть';
  close.addEventListener('click', () => panel.close());

  element.append(title, specs, quick, rows, hint, stats, source, reset, close);
  element.hidden = true;

  for (const material of MATERIAL_IDS) {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.material = material;
    button.textContent = MATERIALS[material].label;
    button.addEventListener('click', () => {
      selected = new Set([material]);
      for (const [id, box] of checkboxes) box.checked = id === material;
      if (current) onChange(current, [...selected]);
    });
    quick.appendChild(button);
  }

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

    refreshInlet(info: { fromPile: boolean; pile: number }): void {
      if (!current || source.hidden) return;
      digging = info.fromPile;
      specs.textContent = info.fromPile
        ? `копает кучу, в ней ${info.pile} ед`
        : 'возит купленную партию';
      hint.textContent = info.fromPile
        ? 'Из кучи достаётся то, что в неё свалили, вместе с боем'
        : `В куче лежит ${info.pile} ед — их можно поднять обратно в работу`;
      source.textContent = info.fromPile ? 'Возить партию' : 'Копать кучу';
    },

    refresh(next: OutletStats): void {
      if (!current || !single) return;
      const total = MATERIAL_IDS.reduce((sum, id) => sum + next.collected[id], 0) + next.broken;
      stats.textContent =
        total === 0
          ? 'партия пуста'
          : [
              `принято ${total} ед`,
              ...MATERIAL_IDS.filter((id) => next.collected[id] > 0).map(
                (id) => `${MATERIALS[id].label}: ${next.collected[id]}`,
              ),
              ...(next.broken > 0 ? [`бой: ${next.broken}`] : []),
              `чистота ${(next.purity * 100).toFixed(1)}%`,
            ].join('\n');
      reset.textContent = next.revenue > 0 ? `Отгрузить за ${next.revenue} ₽` : 'Отгрузить';
      reset.disabled = total === 0;
    },

    open(
      cell: CellCoord,
      kind: PanelKind,
      filter: readonly MaterialId[],
      machine: MachineKind | null,
      outletStats: OutletStats | null,
      accuracy: number,
      inlet: { fromPile: boolean; pile: number } | null,
    ): void {
      current = cell;
      selected = new Set(filter);
      single = kind === 'outlet';

      const isInlet = kind === 'inlet';
      rows.hidden = isInlet;
      quick.hidden = isInlet;
      // Магниту предлагать нечего, кроме металла: прячем неподходящее.
      for (const button of quick.children) {
        const material = (button as HTMLElement).dataset.material as MaterialId;
        const info = machine ? MACHINES[machine] : null;
        (button as HTMLElement).hidden = Boolean(info?.handles && !info.handles.includes(material));
      }
      source.hidden = !isInlet;
      if (isInlet && inlet) {
        digging = inlet.fromPile;
        title.textContent = `Источник ${cell.cx}, ${cell.cy}`;
        specs.textContent = inlet.fromPile
          ? `копает кучу, в ней ${inlet.pile} ед`
          : 'возит купленную партию';
        hint.textContent = inlet.fromPile
          ? 'Из кучи достаётся то, что в неё свалили, вместе с боем'
          : `В куче лежит ${inlet.pile} ед — их можно поднять обратно в работу`;
        source.textContent = inlet.fromPile ? 'Возить партию' : 'Копать кучу';
        stats.hidden = true;
        reset.hidden = true;
        element.hidden = false;
        return;
      }

      const info = machine ? MACHINES[machine] : null;
      title.textContent = single
        ? `Приёмник ${cell.cx}, ${cell.cy}`
        : `${info ? info.label : 'Развилка'} ${cell.cx}, ${cell.cy}`;
      const paper = info ? Math.round(info.accuracy * 100) : 0;
      const now = Math.round(accuracy * 100);
      specs.textContent = single
        ? 'копит фракцию и считает её чистоту'
        : info
          ? // Если лента разогнана, паспортная точность уже не про эту машину.
            `${info.throughput} ед/с, точность ${paper}%` +
            (now < paper ? ` → ${now}% на текущей скорости` : '')
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
