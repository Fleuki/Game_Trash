import { BUILD_COST, MACHINE_COST, REFUND_RATE } from '../config/economy';
import { DISPOSAL_COST_PER_UNIT } from '../config/waste';
import { CRAFTERS } from '../config/crafters';
import { MACHINES } from '../config/machines';
import { BUILD_UNLOCK_DAY, type BuildableKind } from '../config/tutorial';
import type { BuildMode } from './buildTool';

interface ToolbarButton {
  mode: BuildMode;
  label: string;
  /** Что это такое и зачем. Видно всегда: на телефоне наведения не существует. */
  hint: string;
  /** Сортировщики выделяются: у них общая повадка и общий смысл. */
  machine?: boolean;
}

/**
 * Режимы, которые можно построить, открываются по расписанию — GDD §13.
 * «Рука», «Перенос» и «Снос» не строят ничего и доступны всегда.
 */
const UNLOCKABLE: readonly BuildMode[] = [
  'belt', 'inlet', 'outlet', 'waste', 'splitter',
  'manual', 'magnet', 'optical', 'press', 'composter', 'extruder',
];

function unlockOf(mode: BuildMode): BuildableKind | null {
  return UNLOCKABLE.includes(mode) ? (mode as BuildableKind) : null;
}

const BUTTONS: readonly ToolbarButton[] = [
  {
    mode: 'belt',
    label: 'Лента',
    hint: `Лента (B), ${BUILD_COST.belt} ₽ за клетку. Тяни протяжкой — на изломе повернёт сама.`,
  },
  {
    mode: 'inlet',
    label: 'Разгрузка',
    hint: `Разгрузка (I), ${BUILD_COST.inlet} ₽. Она одна на весь завод: поставишь в другом месте — переедет туда. По тапу в «Руке» переключается на раскопку кучи.`,
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
    mode: 'press',
    label: 'Пресс',
    hint: `Пресс (4), ${CRAFTERS.press.cost} ₽. ${CRAFTERS.press.note}. ${CRAFTERS.press.throughput} ед/с.`,
    machine: true,
  },
  {
    mode: 'composter',
    label: 'Компостер',
    hint: `Компостер (5), ${CRAFTERS.composter.cost} ₽. ${CRAFTERS.composter.note}. ${CRAFTERS.composter.throughput} ед/с.`,
    machine: true,
  },
  {
    mode: 'extruder',
    label: 'Экструдер',
    hint: `Экструдер (6), ${CRAFTERS.extruder.cost} ₽. ${CRAFTERS.extruder.note}. ${CRAFTERS.extruder.throughput} ед/с.`,
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
    mode: 'move',
    label: 'Перенести',
    hint: 'Перенос (M). Тап по построенному — берём, тап по свободной клетке — ставим. Бесплатно: машина не покупается заново.',
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
  /** Перерисовать замки: что открыто, зависит от дня. */
  setDay(day: number): void;
  /** Открыт ли режим сегодня. Нужно вводу: по горячей клавише тоже нельзя. */
  isUnlocked(mode: BuildMode): boolean;
  /**
   * Сказать, почему режим не взялся. Молчаливый отказ хуже запрета: игрок
   * жмёт «3», видит прежний инструмент и строит лентой то, что хотел оптикой.
   */
  explainLocked(mode: BuildMode): void;
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
  let day = 1;
  let current: BuildMode = 'belt';

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

  const unlockedAt = (mode: BuildMode): number => {
    const kind = unlockOf(mode);
    return kind ? BUILD_UNLOCK_DAY[kind] : 1;
  };
  const unlocked = (mode: BuildMode): boolean => day >= unlockedAt(mode);

  /**
   * Подсказка закрытого режима говорит только когда он откроется. Расписывать
   * машину, которую нельзя поставить ещё восемь дней, — впустую занимать
   * единственную строку подсказки.
   */
  const showHint = (mode: BuildMode): void => {
    hintElement.textContent = unlocked(mode)
      ? (hints.get(mode) ?? '')
      : `Откроется на ${unlockedAt(mode)}-й день.`;
  };

  const paint = (): void => {
    for (const [mode, button] of buttons) {
      const open = unlocked(mode);
      button.disabled = !open;
      button.classList.toggle('is-locked', !open);
      button.title = open ? '' : `Откроется на ${unlockedAt(mode)}-й день`;
    }
  };
  paint();

  return {
    setMode(mode: BuildMode): void {
      current = mode;
      for (const [buttonMode, button] of buttons) {
        button.classList.toggle('is-active', buttonMode === mode);
      }
      showHint(mode);
    },

    setDay(next: number): void {
      if (next === day) return;
      day = next;
      paint();
      showHint(current);
    },

    isUnlocked: unlocked,

    explainLocked(mode: BuildMode): void {
      hintElement.textContent = `Откроется на ${unlockedAt(mode)}-й день.`;
    },
  };
}
