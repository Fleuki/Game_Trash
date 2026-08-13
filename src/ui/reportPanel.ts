import { DISTRICTS } from '../config/districts';
import { MATERIALS } from '../config/materials';
import type { Batch, Contract, DayStats } from '../sim/types';

export interface ReportPanel {
  update(
    day: number,
    stats: DayStats,
    batch: Batch | null,
    money: number,
    reputation: number,
    contracts: readonly Contract[],
    pile: number,
    isEvening: boolean,
  ): void;
}

function row(label: string, value: string): string {
  return `${label.padEnd(22)}${value}`;
}

/**
 * Вечерний отчёт по GDD §4.
 *
 * Строки про кучу отходов здесь пока нет: она появится в S13, а пустая строка
 * в отчёте ничего не значит.
 */
export function createReportPanel(element: HTMLElement): ReportPanel {
  let signature = '';

  return {
    update(day, stats, batch, money, reputation, contracts, pile, isEvening): void {
      element.hidden = !isEvening;
      if (!isEvening) return;

      const next = `${day}|${stats.earned}|${stats.spent}|${stats.shipments.length}|${money}|${stats.contractsDone}|${stats.contractsFailed}|${pile}`;
      if (next === signature) return;
      signature = next;

      const left = batch ? batch.remaining : 0;
      const onBelts = stats.arrived - stats.processed;
      const profit =
        stats.earned - stats.spent + stats.refunded - stats.penalties - stats.disposalCost;

      const lines: string[] = [
        `Итоги дня ${day}`,
        '',
        row('Партия', batch ? `${DISTRICTS[batch.district].label}, ${batch.volume} ед` : '—'),
        row('Приехало', `${stats.arrived} ед`),
        row('Не приехало', `${left} ед`),
        row('Дошло до приёмников', `${stats.processed} ед`),
        row('Осталось на лентах', `${Math.max(0, onBelts)} ед`),
        '',
        row('Куча', `${pile} ед (${pile - stats.pileAtStart >= 0 ? '+' : ''}${pile - stats.pileAtStart} за день)`),
        ...(stats.disposedUnits > 0
          ? [row('  вывезено', `${stats.disposedUnits} ед за ${stats.disposalCost} ₽`)]
          : []),
        '',
      ];

      if (stats.shipments.length === 0) {
        lines.push('Ничего не отгружено');
      } else {
        lines.push('Отгружено:');
        for (const shipment of stats.shipments) {
          const toContracts = shipment.toContracts > 0 ? ` · по заказам ${shipment.toContracts} ед` : '';
          lines.push(
            row(
              `  ${MATERIALS[shipment.material].label}`,
              `${shipment.units} ед · чистота ${(shipment.purity * 100).toFixed(1)}% · ${shipment.revenue} ₽${toContracts}`,
            ),
          );
        }
      }

      const active = contracts.filter((contract) => contract.status === 'active');
      if (active.length > 0) {
        lines.push('', 'Заказы:');
        for (const contract of active) {
          const parts = contract.items.map(
            (item) =>
              `${MATERIALS[item.material].label} ${item.delivered}/${item.units}`,
          );
          const left = contract.deadlineDay - day;
          lines.push(
            row(`  ${parts.join(' + ')}`, left <= 0 ? 'срок вышел' : `осталось ${left} дн.`),
          );
        }
      }

      lines.push(
        '',
        row('Выручка', `${stats.earned} ₽`),
        ...(stats.contractsDone > 0
          ? [row('  сдано заказов', `${stats.contractsDone} на ${stats.rewards} ₽`)]
          : []),
        ...(stats.contractsFailed > 0
          ? [row('  сорвано заказов', `${stats.contractsFailed}, штраф ${stats.penalties} ₽`)]
          : []),
        row('Потрачено на стройку', `${stats.spent} ₽`),
        row('Возвращено за снос', `${stats.refunded} ₽`),
        ...(stats.disposalCost > 0 ? [row('Вывоз кучи', `${stats.disposalCost} ₽`)] : []),
        row('Итог дня', `${profit >= 0 ? '+' : ''}${profit} ₽`),
        row('Баланс', `${money} ₽`),
        row('Репутация', `${reputation >= 0 ? '+' : ''}${reputation}`),
      );

      element.textContent = lines.join('\n');
    },
  };
}
