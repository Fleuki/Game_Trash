import { DISTRICTS } from '../config/districts';
import { MATERIALS } from '../config/materials';
import type { Batch, DayStats } from '../sim/types';

export interface ReportPanel {
  update(day: number, stats: DayStats, batch: Batch | null, money: number, isEvening: boolean): void;
}

function row(label: string, value: string): string {
  return `${label.padEnd(22)}${value}`;
}

/**
 * Вечерний отчёт по GDD §4.
 *
 * Куча отходов и контракты появятся в S13 и S12 — их строк здесь пока нет,
 * и придумывать их заранее незачем: пустая строка в отчёте ничего не значит.
 */
export function createReportPanel(element: HTMLElement): ReportPanel {
  let signature = '';

  return {
    update(day, stats, batch, money, isEvening): void {
      element.hidden = !isEvening;
      if (!isEvening) return;

      const next = `${day}|${stats.earned}|${stats.spent}|${stats.shipments.length}|${money}`;
      if (next === signature) return;
      signature = next;

      const left = batch ? batch.remaining : 0;
      const onBelts = stats.arrived - stats.processed;
      const profit = stats.earned - stats.spent + stats.refunded;

      const lines: string[] = [
        `Итоги дня ${day}`,
        '',
        row('Партия', batch ? `${DISTRICTS[batch.district].label}, ${batch.volume} ед` : '—'),
        row('Приехало', `${stats.arrived} ед`),
        row('Не приехало', `${left} ед`),
        row('Дошло до приёмников', `${stats.processed} ед`),
        row('Осталось на лентах', `${Math.max(0, onBelts)} ед`),
        '',
      ];

      if (stats.shipments.length === 0) {
        lines.push('Ничего не отгружено');
      } else {
        lines.push('Отгружено:');
        for (const shipment of stats.shipments) {
          lines.push(
            row(
              `  ${MATERIALS[shipment.material].label}`,
              `${shipment.units} ед · чистота ${(shipment.purity * 100).toFixed(1)}% · ${shipment.revenue} ₽`,
            ),
          );
        }
      }

      lines.push(
        '',
        row('Выручка', `${stats.earned} ₽`),
        row('Потрачено на стройку', `${stats.spent} ₽`),
        row('Возвращено за снос', `${stats.refunded} ₽`),
        row('Итог дня', `${profit >= 0 ? '+' : ''}${profit} ₽`),
        row('Баланс', `${money} ₽`),
      );

      element.textContent = lines.join('\n');
    },
  };
}
