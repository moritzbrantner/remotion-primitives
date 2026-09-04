import { describe, expect, it, vi } from 'vitest';

const frame = vi.hoisted(() => ({ current: 0 }));

vi.mock('remotion', async () => {
  const actual = await vi.importActual<typeof import('remotion')>('remotion');
  return {
    ...actual,
    useCurrentFrame: () => frame.current,
  };
});

import { AnimatedNumber } from './animated-number';
import { Blur } from './blur';
import { EnterExit } from './enter-exit';
import { Fade } from './fade';
import { MatrixDecode } from './matrix-decode';
import { Scale } from './scale';
import { Slide } from './slide';
import { Typewriter } from './typewriter';

function styleOf(element: ReturnType<typeof Fade>) {
  return element.props.style as Record<string, string | number>;
}

describe('frame-driven motion primitives', () => {
  it('clamps Fade before, during, and after its interval', () => {
    frame.current = 9;
    expect(styleOf(Fade({ children: 'x', startFrame: 10, durationInFrames: 10 })).opacity).toBe(0);

    frame.current = 15;
    expect(styleOf(Fade({ children: 'x', startFrame: 10, durationInFrames: 10 })).opacity).toBe(0.5);

    frame.current = 20;
    expect(styleOf(Fade({ children: 'x', startFrame: 10, durationInFrames: 10 })).opacity).toBe(1);
  });

  it('gives zero-duration Fade an explicit frame boundary', () => {
    frame.current = 9;
    expect(styleOf(Fade({ children: 'x', startFrame: 10, durationInFrames: 0 })).opacity).toBe(0);
    frame.current = 10;
    expect(styleOf(Fade({ children: 'x', startFrame: 10, durationInFrames: 0 })).opacity).toBe(1);
  });

  it('preserves caller transforms while applying Slide and Scale', () => {
    frame.current = 0;
    const slide = Slide({ children: 'x', direction: 'up', style: { transform: 'rotate(5deg)' } });
    expect(slide.props.style.transform).toBe('rotate(5deg) translate3d(0px, 48px, 0)');

    frame.current = 15;
    const scale = Scale({ children: 'x', style: { transform: 'rotate(5deg)' } });
    expect(scale.props.style.transform).toBe('rotate(5deg) scale(1)');
  });

  it('clamps Blur to non-negative values', () => {
    frame.current = 15;
    const blur = Blur({ children: 'x', from: 8, to: -4 });
    expect(blur.props.style.filter).toBe('blur(0px)');
  });

  it('uses the same deterministic lifecycle for EnterExit', () => {
    frame.current = 5;
    const entering = EnterExit({ children: 'x', durationInFrames: 60, enterInFrames: 10, exitInFrames: 10 });
    expect(entering.props.style.opacity).toBe(0.5);
    expect(entering.props.style.transform).toBe('translate3d(0px, 16px, 0)');

    frame.current = 55;
    const exiting = EnterExit({ children: 'x', durationInFrames: 60, enterInFrames: 10, exitInFrames: 10 });
    expect(exiting.props.style.opacity).toBe(0.5);
    expect(exiting.props.style.transform).toBe('translate3d(0px, -16px, 0)');
  });

  it('keeps MatrixDecode stable for the same frame and seed', () => {
    frame.current = 10;
    const first = MatrixDecode({ text: 'deterministic', seed: 'test' });
    const second = MatrixDecode({ text: 'deterministic', seed: 'test' });
    expect(first.props.children).toBe(second.props.children);

    frame.current = 60;
    expect(MatrixDecode({ text: 'done', seed: 'test' }).props.children).toBe('done');
  });

  it('formats AnimatedNumber from deterministic frame interpolation', () => {
    frame.current = 15;
    const number = AnimatedNumber({
      from: 0,
      to: 100,
      durationInFrames: 30,
      decimals: 1,
      prefix: '$',
      suffix: '%',
    });
    expect(number.props.children).toEqual(['$', '50.0', '%']);
  });

  it('reveals Typewriter text from the requested start frame', () => {
    frame.current = 9;
    expect(Typewriter({ text: 'abcd', startFrame: 10 }).props.children[0]).toBe('');

    frame.current = 12;
    expect(Typewriter({ text: 'abcd', startFrame: 10, framesPerCharacter: 2 }).props.children[0]).toBe('ab');

    frame.current = 20;
    expect(
      Typewriter({
        text: 'abcd',
        startFrame: 10,
        framesPerCharacter: 2,
        hideCursorWhenComplete: true,
      }).props.children[1],
    ).toBeNull();
  });
});
