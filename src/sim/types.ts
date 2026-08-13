import type { DistrictId } from '../config/districts';
import type { CertificationLevel } from '../config/certification';
import type { CraftKind, ItemForm } from '../config/crafters';
import type { MachineKind } from '../config/machines';
import type { MaterialId } from '../config/materials';

/**
 * Фаза дня. Утро и вечер — паузы: поток стоит, игрок думает и строит.
 * Работает завод только днём — GDD §4.
 */
export type DayPhase = 'morning' | 'day' | 'evening';

/** Предложение на утреннем рынке. Состав виден до покупки — GDD §8. */
export interface Offer {
  district: DistrictId;
  /** Сколько единиц мусора приедет. */
  volume: number;
  /** Доли материалов, в сумме единица. */
  composition: Record<MaterialId, number>;
}

/** Купленная партия: то, что источники выдают сегодня. */
export interface Batch {
  district: DistrictId;
  composition: Record<MaterialId, number>;
  /** Сколько единиц ещё не приехало. */
  remaining: number;
  /** Сколько было изначально. */
  volume: number;
}

/** Одна позиция заказа: столько-то такой-то фракции не грязнее заданного. */
export interface ContractItem {
  material: MaterialId;
  units: number;
  minPurity: number;
  /** Сколько уже сдано. */
  delivered: number;
}

export interface Contract {
  id: number;
  items: ContractItem[];
  /** Последний день, когда заказ ещё можно сдать. */
  deadlineDay: number;
  reward: number;
  penalty: number;
  status: 'active' | 'done' | 'failed';
}

/** Одна отгрузка: что, сколько, какой чистоты и за сколько ушло. */
export interface Shipped {
  material: MaterialId;
  units: number;
  purity: number;
  /** Выручка с рынка. Награда за контракт приходит отдельно, при закрытии. */
  revenue: number;
  /** Сколько единиц ушло в счёт заказов. */
  toContracts: number;
}

/** Итоги дня. Обнуляются с началом каждого дня, читаются вечером в отчёте. */
export interface DayStats {
  /** Сколько единиц привезла партия. */
  arrived: number;
  /** Сколько дошло до приёмников. */
  processed: number;
  shipments: Shipped[];
  earned: number;
  spent: number;
  refunded: number;
  /** Награды за сданные сегодня контракты, входят в earned. */
  rewards: number;
  /** Штрафы за сорванные. */
  penalties: number;
  contractsDone: number;
  contractsFailed: number;
  /** Размер кучи на начало дня: в отчёте показывается дельта. */
  pileAtStart: number;
  /** Сколько единиц вывезли и за сколько. */
  disposedUnits: number;
  disposalCost: number;
  /** Сколько единиц подняли из кучи обратно в работу. */
  dug: number;
  /** Содержание участков за день, ₽. */
  upkeep: number;
  /** Сколько единиц нового сырья приехало сегодня — GDD §12. */
  newArrived: number;
  /** Сколько из них ушло мимо: в чужую фракцию, в сброс или в кучу. */
  newLost: number;
  /** Во сколько обошлась эта потеря по полной цене, ₽. */
  newLostValue: number;
}

/** Направление: куда смотрит объект. Индекс в таблицах из sim/grid.ts. */
export type Direction = 0 | 1 | 2 | 3;

/** Координаты клетки на площадке. */
export interface CellCoord {
  cx: number;
  cy: number;
}

/** Клетка с направлением: и команда постройки, и призрак под курсором. */
export interface CellPlacement extends CellCoord {
  dir: Direction;
}

/** Что стоит в клетке. Развилки и сортировщики добавятся в S5–S6. */
export type CellKind =
  | 'empty'
  | 'belt'
  | 'inlet'
  | 'outlet'
  | 'splitter'
  | 'sorter'
  | 'crafter'
  | 'waste';

export interface Cell {
  kind: CellKind;
  /** Куда уезжает содержимое клетки. Для пустой клетки значения не имеет. */
  dir: Direction;
  /**
   * Предметы внутри клетки, от ближнего к выходу к дальнему: items[0] — головной.
   * Порядок поддерживается при переходах и никогда не нарушается.
   */
  items: Item[];

  /**
   * Для сортировщика и приёмника: материалы, которые едут прямо (у приёмника —
   * какую фракцию он собирает). Развилка материалов не различает.
   */
  filter: MaterialId[];

  /**
   * Для источника: брать из кучи, а не из купленной партии. Раскопка — это
   * режим разгрузочной площадки, а не отдельная машина (PLAN §8).
   */
  fromPile: boolean;

  /**
   * Для развилки: в какой выход уйдёт следующий предмет. Так поток делится
   * поровну, а не сваливается весь в одну сторону.
   */
  altOut: boolean;

  /** Какой это сортировщик. null — клетка не сортировщик. */
  machine: MachineKind | null;

  /** Какой это крафт-станок. null — клетка не станок. */
  crafter: CraftKind | null;

  /** Тиков до того, как сортировщик отпустит следующий предмет. */
  cooldown: number;

  /**
   * Для приёмника: сколько единиц каждого материала он принял.
   * Отсюда считается чистота партии. Для прочих клеток — нули.
   */
  collected: Record<MaterialId, number>;

  /** Сколько боя принял приёмник. Считается отдельно: это уже не стекло. */
  broken: number;

  /**
   * Стоимость накопленной партии при полной чистоте, ₽. Копится по мере
   * приёмки: так переработанное сырьё сохраняет свою цену, а не усредняется.
   */
  value: number;
}

/** Единица сырья, едущая по ленте. Живёт внутри клетки, в её массиве items. */
export interface Item {
  id: number;
  material: MaterialId;
  /** Прогресс внутри клетки, 0..1. При 1 предмет переходит в следующую. */
  t: number;
  /**
   * Направление, с которым предмет въехал в клетку. Нужно, чтобы на повороте
   * он ехал буквой «Г», а не срезал угол по прямой.
   */
  dirIn: Direction;

  /**
   * Предмет уходит в боковой выход, а не прямо. Решение принимается один раз,
   * при въезде в развилку или машину: иначе предмет метался бы между выходами
   * каждый кадр, и рендер показывал бы не то, что посчитает симуляция.
   */
  exitSide: boolean;

  /** Стекло разбилось на быстрой ленте. Обратно уже не склеить. */
  broken: boolean;

  /** Во что предмет переработан. Влияет только на цену. */
  form: ItemForm;
}

/**
 * Состояние мира.
 *
 * Всё, что нужно знать о партии, лежит здесь: сохранение — это сериализация WorldState.
 */
export interface WorldState {
  /** Сколько шагов симуляции прожил мир. Растёт ровно на 1 за шаг. */
  tick: number;

  /** Номер дня, начиная с первого. */
  day: number;

  phase: DayPhase;

  /** Сколько тиков прошло с начала дневной фазы. */
  dayTicks: number;

  /** Предложения этого утра. */
  market: Offer[];

  /** Что везём сегодня. null — партия ещё не выбрана, и день начинать рано. */
  batch: Batch | null;

  /** Деньги. */
  money: number;

  /** Сколько участков открыто. Начинаем с одного — GDD §11. */
  plots: number;

  /** Всего приехало за партию, единиц. Знаменатель доли переработки. */
  totalArrived: number;

  /** Всего отгружено, единиц. */
  totalShipped: number;

  /** Сумма «чистота × единицы» по всем отгрузкам: делённая на объём даёт среднее. */
  totalPurityUnits: number;

  /** Итог сертификации. null — комиссия ещё не приезжала. */
  certificate: { level: CertificationLevel; recycled: number; purity: number; pile: number } | null;

  /** Свободный режим: без контрактов и сроков — GDD §12. */
  freeMode: boolean;

  /**
   * Куча отходов: всё, что не переработано. По составу, потому что в S14
   * её начнут раскапывать обратно.
   */
  pile: Record<MaterialId, number>;

  /** Бой в куче. Отдельно: это уже не стекло. */
  pileBroken: number;

  /** Итоги текущего дня. */
  today: DayStats;

  /** Взятые контракты: и активные, и закрытые за партию. */
  contracts: Contract[];

  /** Что предлагают сегодня утром на доске. */
  contractOffers: Contract[];

  /** Откуда берутся номера контрактов. */
  nextContractId: number;

  /**
   * Репутация. Растёт за сданные заказы, падает за сорванные, и двигает
   * награду в новых предложениях: сорвал — предлагают хуже.
   */
  reputation: number;

  /**
   * Клетки площадки, построчно: индекс = cy * GRID_WIDTH + cx.
   * Плоский массив, а не массив массивов: обход дешевле, сериализация проще.
   */
  cells: Cell[];

  /** Откуда берутся id предметов. Растёт и не переиспользуется. */
  nextItemId: number;

  /** Сколько предметов ушло через стоки за всю партию. */
  delivered: number;

  /** Тиков с последнего выпуска из источников. */
  spawnTimer: number;

  /** Скорость лент в клетках в секунду. Меняется игроком через команду. */
  beltSpeed: number;

  /** Сид партии. Один сид — один и тот же прогон. */
  seed: number;

  /** Текущее состояние генератора. Часть мира, иначе прогон не повторить. */
  rngState: number;

  /**
   * Счётчик изменений постройки. Растёт на каждую применённую команду.
   * Рендер по нему понимает, что картинку пора перерисовать, и не строит её каждый кадр.
   */
  revision: number;
}
