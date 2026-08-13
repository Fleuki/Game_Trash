import { DISTRICTS } from '../config/districts';
import { MATERIALS, MATERIAL_IDS } from '../config/materials';
import { MAX_ACTIVE_CONTRACTS } from '../config/contracts';
import type { Batch, Contract, Offer } from '../sim/types';

export interface MarketPanel {
  /** Показать рынок и доску заказов. Днём и вечером они закрыты. */
  update(
    market: readonly Offer[],
    batch: Batch | null,
    offers: readonly Contract[],
    activeCount: number,
    isMorning: boolean,
  ): void;
}

function contractText(contract: Contract): string {
  return contract.items
    .map((item) => `${item.units} ед ${MATERIALS[item.material].label.toLowerCase()} ≥${Math.round(item.minPurity * 100)}%`)
    .join(' + ');
}

/** Полоска состава: сразу видно, чего в партии много, а чего нет. */
function compositionBar(offer: Offer): HTMLElement {
  const bar = document.createElement('div');
  bar.className = 'offer-bar';
  for (const id of MATERIAL_IDS) {
    const share = offer.composition[id];
    if (share <= 0) continue;
    const part = document.createElement('span');
    part.style.width = `${share * 100}%`;
    part.style.background = `#${MATERIALS[id].color.toString(16).padStart(6, '0')}`;
    part.title = `${MATERIALS[id].label} ${Math.round(share * 100)}%`;
    bar.appendChild(part);
  }
  return bar;
}

function compositionText(offer: Offer): string {
  return MATERIAL_IDS.filter((id) => offer.composition[id] > 0)
    .map((id) => `${MATERIALS[id].label} ${Math.round(offer.composition[id] * 100)}%`)
    .join(' · ');
}

/**
 * Утренний рынок партий.
 *
 * Состав виден до покупки: игрок выбирает не «побольше», а какую задачу
 * решать сегодня — GDD §8. Цены нет, платить пока нечем.
 */
export function createMarketPanel(
  element: HTMLElement,
  onPick: (index: number) => void,
  onTakeContract: (index: number) => void,
): MarketPanel {
  let signature = '';

  return {
    update(market, batch, offers, activeCount, isMorning): void {
      element.hidden = !isMorning;
      if (!isMorning) return;

      const next = `${market.map((o) => `${o.district}:${o.volume}`).join('|')}#${batch?.district ?? '-'}#${offers.map((c) => c.id).join(',')}#${activeCount}`;
      if (next === signature) return;
      signature = next;

      element.textContent = '';

      const title = document.createElement('div');
      title.className = 'panel-title';
      title.textContent = 'Рынок партий';
      element.appendChild(title);

      const hint = document.createElement('div');
      hint.className = 'panel-hint';
      hint.textContent = batch
        ? `Взято: ${DISTRICTS[batch.district].label}, ${batch.volume} ед`
        : 'Выберите партию — без неё день начинать нечем';
      element.appendChild(hint);

      market.forEach((offer, index) => {
        const info = DISTRICTS[offer.district];
        const card = document.createElement('button');
        card.type = 'button';
        card.className = 'offer';
        if (batch && batch.district === offer.district) card.classList.add('is-taken');

        const head = document.createElement('div');
        head.className = 'offer-head';
        head.textContent = `${info.label} — ${offer.volume} ед`;

        const note = document.createElement('div');
        note.className = 'offer-note';
        note.textContent = info.note;

        const composition = document.createElement('div');
        composition.className = 'offer-composition';
        composition.textContent = compositionText(offer);

        card.append(head, compositionBar(offer), composition, note);
        card.addEventListener('click', () => onPick(index));
        element.appendChild(card);
      });

      const board = document.createElement('div');
      board.className = 'panel-title board-title';
      board.textContent = 'Доска заказов';
      element.appendChild(board);

      const full = activeCount >= MAX_ACTIVE_CONTRACTS;
      const boardHint = document.createElement('div');
      boardHint.className = 'panel-hint';
      boardHint.textContent = full
        ? `Взято ${activeCount} из ${MAX_ACTIVE_CONTRACTS} — больше не потянуть`
        : `Активных ${activeCount} из ${MAX_ACTIVE_CONTRACTS}`;
      element.appendChild(boardHint);

      offers.forEach((contract, index) => {
        const card = document.createElement('button');
        card.type = 'button';
        card.className = 'offer contract-offer';
        card.disabled = full;

        const head = document.createElement('div');
        head.className = 'offer-head';
        head.textContent = `${contract.reward} ₽ · до дня ${contract.deadlineDay}`;

        const body = document.createElement('div');
        body.className = 'offer-composition';
        body.textContent = contractText(contract);

        const note = document.createElement('div');
        note.className = 'offer-note';
        note.textContent = `Срыв: штраф ${contract.penalty} ₽`;

        card.append(head, body, note);
        card.addEventListener('click', () => onTakeContract(index));
        element.appendChild(card);
      });
    },
  };
}
