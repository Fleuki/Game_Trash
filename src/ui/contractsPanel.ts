import { MATERIALS } from '../config/materials';
import type { Contract } from '../sim/types';

export interface ContractsPanel {
  update(contracts: readonly Contract[], day: number): void;
}

function itemLine(contract: Contract, day: number): string {
  const parts = contract.items.map(
    (item) =>
      `${MATERIALS[item.material].label} ${item.delivered}/${item.units} ≥${Math.round(item.minPurity * 100)}%`,
  );
  const left = contract.deadlineDay - day;
  const due = left === 0 ? 'сегодня' : `${left} дн.`;
  return `${parts.join(' + ')} · ${due} · ${contract.reward} ₽`;
}

/**
 * Полоска активных заказов. Видна всегда: игрок работает на них весь день,
 * и прогресс должен быть перед глазами, а не в отчёте задним числом.
 */
export function createContractsPanel(element: HTMLElement): ContractsPanel {
  let signature = '';

  return {
    update(contracts, day): void {
      const active = contracts.filter((contract) => contract.status === 'active');
      element.hidden = active.length === 0;
      if (active.length === 0) return;

      const next = active
        .map((c) => `${c.id}:${c.items.map((i) => i.delivered).join(',')}:${c.deadlineDay}`)
        .join('|');
      if (next === signature) return;
      signature = next;

      element.textContent = '';
      for (const contract of active) {
        const row = document.createElement('div');
        row.className = 'contract';
        // Последний день горит: срок — это давление, а не сноска.
        if (contract.deadlineDay <= day) row.classList.add('is-urgent');

        const text = document.createElement('div');
        text.textContent = itemLine(contract, day);

        const track = document.createElement('div');
        track.className = 'contract-track';
        const done = contract.items.reduce((sum, item) => sum + Math.min(item.delivered, item.units), 0);
        const total = contract.items.reduce((sum, item) => sum + item.units, 0);
        const fill = document.createElement('div');
        fill.className = 'contract-fill';
        fill.style.width = `${(done / total) * 100}%`;
        track.appendChild(fill);

        row.append(text, track);
        element.appendChild(row);
      }
    },
  };
}
