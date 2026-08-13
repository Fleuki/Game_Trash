import { BUILD_COST, MACHINE_COST, REFUND_RATE } from '../config/economy';
import { DISPOSAL_COST_PER_UNIT } from '../config/waste';
import { MACHINES } from '../config/machines';
import type { BuildMode } from './buildTool';

interface ToolbarButton {
  mode: BuildMode;
  label: string;
  /** Что это такое и зачем. Видно всегда: на телефоне наведения не существует. */
  hint: string;
  /** Сортировщики выделяются: у них общая повадка и общий смысл. */
  machine?: boolean;
}

const BUTTONS: readonly ToolbarButton[] = [
  {
    mode: 'belt',
    label: 'Лента',
    hint: `Лента (B), ${BUILD_COST.belt} ₽ за клетку. Тяни протяжкой — на изломе повернёт сама.`,
  },
  {
    mode: 'inlet',
    label: 'Источник',
    hint: `Источник (I), ${BUILD_COST.inlet} ₽. Отсюда приезжает купленная партия. Забился вход — источник встаёт.`,
  },
  {
    mode: 'splitter',
    label: 'Развилка',
    hint: `Развилка (R), ${BUILD_COST.splitter} ₽. Делит поток поровну и обходит забитую сторону. Материалы не различает — это работа сортировщиков.`,
  },
  {
    mode: 'manual',
    label: 'Стол',
    hint: `Ручной стол (1) — сортировщик, ${MACHINE_COST.manual} ₽. ${MACHINES.manual.throughput} ед/с, точность ${Math.round(MACHINES.manual.accuracy * 100)}%. Медленный и ошибается, зато берёт любой материал.`,
    machine: true,
  },
  {
    mode: 'magnet',
    label: 'Магнит',
    hint: `Магнит (2) — сортировщик, ${MACHINE_COST.magnet} ₽. ${MACHINES.magnet.throughput} ед/с, точность ${Math.round(MACHINES.magnet.accuracy * 100)}%. Быстрый и точный, но вытаскивает только металл.`,
    machine: true,
  },
  {
    mode: 'optical',
    label: 'Оптика',
    hint: `Оптический (3) — сортировщик, ${MACHINE_COST.optical} ₽. ${MACHINES.optical.throughput} ед/с, точность ${Math.round(MACHINES.optical.accuracy * 100)}%. Берёт любой материал.`,
    machine: true,
  },
  {
    mode: 'outlet',
    label: 'Приёмник',
    hint: `Приёмник (O), ${BUILD_COST.outlet} ₽. Копит фракцию, считает чистоту и отгружает за деньги. Настроить — «Рука» и тап.`,
  },
  {
    mode: 'waste',
    label: 'Сброс',
    hint: `Сброс (W), ${BUILD_COST.waste} ₽. Всё, что сюда приедет, уходит в кучу и остаётся там. Вывоз — ${DISPOSAL_COST_PER_UNIT} ₽ за единицу.`,
  },
  {
    mode: 'erase',
    label: 'Снос',
    hint: `Снос (E). Возвращает ${Math.round(REFUND_RATE * 100)}% стоимости. Правая кнопка мыши сносит в любом режиме.`,
  },
  {
    mode: 'hand',
    label: 'Рука',
    hint: 'Рука (H). Двигает поле. Тап по машине, развилке или приёмнику открывает настройку.',
  },
];

export interface Toolbar {
  setMode(mode: BuildMode): void;
}

/**
 * Панель режимов и строка подсказки под ней.
 *
 * Подсказка постоянная, а не всплывающая: на телефоне наведения нет, и «Стол»
 * с «Магнитом» без неё не значат ничего — проверено на живом человеке.
 */
export function createToolbar(
  element: HTMLElement,
  hintElement: HTMLElement,
  onPick: (mode: BuildMode) => void,
): Toolbar {
  const buttons = new Map<BuildMode, HTMLButtonElement>();
  const hints = new Map<BuildMode, string>();

  for (const item of BUTTONS) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = item.label;
    if (item.machine) button.classList.add('is-machine');
    button.addEventListener('click', () => onPick(item.mode));
    element.appendChild(button);
    buttons.set(item.mode, button);
    hints.set(item.mode, item.hint);
  }

  return {
    setMode(mode: BuildMode): void {
      for (const [buttonMode, button] of buttons) {
        button.classList.toggle('is-active', buttonMode === mode);
      }
      hintElement.textContent = hints.get(mode) ?? '';
    },
  };
}
