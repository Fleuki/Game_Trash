import { BELT_SPEED_MAX, BELT_SPEED_MIN } from '../config/balance';

/**
 * Ползунок скорости лент. Ничего не меняет сам: отдаёт значение наружу,
 * а меняет мир команда SET_BELT_SPEED (правило 4).
 */
export function createSpeedSlider(
  element: HTMLElement,
  initial: number,
  onChange: (value: number) => void,
): void {
  const label = document.createElement('label');
  label.className = 'slider';

  const caption = document.createElement('span');
  const input = document.createElement('input');
  input.type = 'range';
  input.min = String(BELT_SPEED_MIN);
  input.max = String(BELT_SPEED_MAX);
  input.step = '0.1';
  input.value = String(initial);

  function render(value: number): void {
    caption.textContent = `Скорость ${value.toFixed(1)} кл/с`;
  }

  input.addEventListener('input', () => {
    const value = Number(input.value);
    render(value);
    onChange(value);
  });

  render(initial);
  label.append(caption, input);
  element.appendChild(label);
}
