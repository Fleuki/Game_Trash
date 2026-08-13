import { MATERIALS, MATERIAL_IDS, type MaterialId } from '../config/materials';
import { DISPOSAL_COST_PER_UNIT } from '../config/waste';

export interface PileState {
  pile: Record<MaterialId, number>;
  broken: number;
  total: number;
  money: number;
}

export interface PilePanel {
  update(state: PileState): void;
}

/**
 * Куча и вывоз.
 *
 * Видна всегда, а не только в отчёте: это главный счётчик провала, и он должен
 * мозолить глаза. Вывоз стоит денег, поэтому решение «вывезти или потерпеть»
 * принимает игрок, а не игра за него.
 */
export function createPilePanel(element: HTMLElement, onDispose: (units: number) => void): PilePanel {
  const title = document.createElement('div');
  title.className = 'pile-title';

  const body = document.createElement('div');
  body.className = 'pile-body';

  const dispose = document.createElement('button');
  dispose.type = 'button';
  element.append(title, body, dispose);

  let signature = '';
  let currentTotal = 0;
  dispose.addEventListener('click', () => {
    if (currentTotal > 0) onDispose(currentTotal);
  });

  return {
    update(state): void {
      element.hidden = state.total === 0;
      if (state.total === 0) return;

      currentTotal = state.total;
      const next = `${state.total}|${state.money}`;
      if (next === signature) return;
      signature = next;

      title.textContent = `Куча: ${state.total} ед`;
      body.textContent = MATERIAL_IDS.filter((id) => state.pile[id] > 0)
        .map((id) => `${MATERIALS[id].label} ${state.pile[id]}`)
        .concat(state.broken > 0 ? [`бой ${state.broken}`] : [])
        .join(' · ');

      const cost = state.total * DISPOSAL_COST_PER_UNIT;
      const affordable = Math.min(state.total, Math.floor(Math.max(0, state.money) / DISPOSAL_COST_PER_UNIT));
      dispose.textContent =
        affordable >= state.total
          ? `Вывезти всё за ${cost} ₽`
          : `Вывезти ${affordable} ед за ${affordable * DISPOSAL_COST_PER_UNIT} ₽`;
      dispose.disabled = affordable === 0;
    },
  };
}
