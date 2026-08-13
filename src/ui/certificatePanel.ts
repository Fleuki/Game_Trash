import { CERTIFICATION_DAY, FREE_MODE_MONEY, LEVELS } from '../config/certification';
import type { CertificationLevel } from '../config/certification';

export interface CertificateView {
  level: CertificationLevel;
  recycled: number;
  purity: number;
  pile: number;
}

export interface CertificatePanel {
  update(certificate: CertificateView | null, freeMode: boolean): void;
}

function percent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

/**
 * Итог месяца по GDD §12.
 *
 * Показываем не только взятый уровень, но и все требования разом: игрок должен
 * увидеть, каким именно показателем он не дотянул до следующего. Три числа
 * тянут в разные стороны, и без такой таблицы непонятно, что чинить.
 */
export function createCertificatePanel(
  element: HTMLElement,
  onFreeMode: () => void,
): CertificatePanel {
  const card = document.createElement('div');
  card.className = 'cert-card';

  const title = document.createElement('div');
  title.className = 'cert-title';
  title.textContent = `Комиссия, день ${CERTIFICATION_DAY}`;

  const verdict = document.createElement('div');
  verdict.className = 'cert-verdict';

  const table = document.createElement('pre');
  table.className = 'cert-table';

  const free = document.createElement('button');
  free.type = 'button';
  free.className = 'cert-free';
  free.textContent = `Свободный режим · +${FREE_MODE_MONEY} ₽`;
  free.addEventListener('click', onFreeMode);

  const note = document.createElement('div');
  note.className = 'cert-note';
  note.textContent = 'Без заказов и сроков: строй завод, какой хочется.';

  card.append(title, verdict, table, free, note);
  element.appendChild(card);

  let signature = '';

  return {
    update(certificate, freeMode): void {
      // Свободный режим уже включён — комиссию убираем: она приезжает один раз.
      element.hidden = certificate === null || freeMode;
      if (!certificate || freeMode) return;

      const next = `${certificate.level}|${certificate.recycled}|${certificate.purity}|${certificate.pile}`;
      if (next === signature) return;
      signature = next;

      const earned = LEVELS.find((level) => level.id === certificate.level);
      verdict.textContent = earned ? `Уровень: ${earned.label}` : 'Сертификат не выдан';
      verdict.classList.toggle('is-failed', !earned);

      const lines = [
        `${'Показатель'.padEnd(16)}${'ваш'.padStart(8)}`,
        `${'Переработано'.padEnd(16)}${percent(certificate.recycled).padStart(8)}`,
        `${'Чистота'.padEnd(16)}${percent(certificate.purity).padStart(8)}`,
        `${'Куча'.padEnd(16)}${`${certificate.pile} ед`.padStart(8)}`,
        '',
        `${''.padEnd(16)}${'перераб.'.padStart(9)}${'чистота'.padStart(9)}${'куча'.padStart(7)}`,
      ];

      for (const level of LEVELS) {
        const mark = (ok: boolean): string => (ok ? '✓' : '·');
        lines.push(
          `${level.label.padEnd(16)}` +
            `${`${mark(certificate.recycled >= level.recycled)} ${percent(level.recycled)}`.padStart(9)}` +
            `${`${mark(certificate.purity >= level.purity)} ${percent(level.purity)}`.padStart(9)}` +
            `${`${mark(certificate.pile <= level.pile)} ${level.pile}`.padStart(7)}`,
        );
      }

      table.textContent = lines.join('\n');
    },
  };
}
