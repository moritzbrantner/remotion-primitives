import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

const frame = vi.hoisted(() => ({ current: 0 }));
const context = vi.hoisted(() => ({ current: undefined as unknown }));

vi.mock('react', async () => {
  const actual = await vi.importActual<typeof import('react')>('react');
  return {
    ...actual,
    useContext: ((value: Parameters<typeof actual.useContext>[0]) =>
      context.current ?? actual.useContext(value)) as typeof actual.useContext,
  };
});

vi.mock('remotion', async () => {
  const actual = await vi.importActual<typeof import('remotion')>('remotion');
  return {
    ...actual,
    useCurrentFrame: () => frame.current,
    useVideoConfig: () => ({ fps: 30, width: 960, height: 540, durationInFrames: 300 }),
  };
});

import { Hotspot, HotspotProvider, isHotspotActive, SvgHotspot } from './hotspot';
import { splitHotspotTerms, Subtitles } from './subtitles';

const srt = `1\n00:00:00,000 --> 00:00:02,000\nFrames beat wall-clock time.`;
const hotspots = [{ id: 'frame', term: 'frames', payload: { topic: 'frames' } }];

describe('Hotspot', () => {
  it('renders inert content without a handler', () => {
    const markup = renderToStaticMarkup(<Hotspot id="x">value</Hotspot>);
    expect(markup).toBe('<span data-hotspot="x">value</span>');
  });

  it('renders a button when a provider supplies a handler', () => {
    const markup = renderToStaticMarkup(
      <HotspotProvider onActivate={() => undefined} selectedId="x">
        <Hotspot id="x">value</Hotspot>
      </HotspotProvider>,
    );
    expect(markup).toContain('<button type="button" data-hotspot="x" aria-pressed="true"');
  });

  it('reports activation with payload and frame without bubbling to the Player', () => {
    frame.current = 42;
    const onActivate = vi.fn();
    const stopPropagation = vi.fn();
    context.current = { onActivate };
    try {
      const element = Hotspot({ id: 'x', payload: { a: 1 }, children: 'value' });
      element.props.onClick({ stopPropagation });
    } finally {
      context.current = undefined;
    }
    expect(stopPropagation).toHaveBeenCalledOnce();
    expect(onActivate).toHaveBeenCalledWith({ id: 'x', payload: { a: 1 }, frame: 42 });
  });

  it('bounds the interactive window by frames', () => {
    expect(isHotspotActive(9, 10, 5)).toBe(false);
    expect(isHotspotActive(10, 10, 5)).toBe(true);
    expect(isHotspotActive(15, 10, 5)).toBe(false);
    expect(isHotspotActive(1_000_000)).toBe(true);
  });

  it('stays inert outside its frame window even with a handler', () => {
    frame.current = 3;
    const markup = renderToStaticMarkup(
      <HotspotProvider onActivate={() => undefined}>
        <Hotspot id="x" from={10}>
          value
        </Hotspot>
      </HotspotProvider>,
    );
    expect(markup).not.toContain('<button');
  });
});

describe('SvgHotspot', () => {
  it('renders an inert group without a handler', () => {
    const markup = renderToStaticMarkup(
      <svg>
        <SvgHotspot id="bar">
          <rect width={4} height={4} />
        </SvgHotspot>
      </svg>,
    );
    expect(markup).toBe('<svg><g data-hotspot="bar"><rect width="4" height="4"></rect></g></svg>');
  });

  it('renders a focusable button-like group when a handler is present', () => {
    frame.current = 0;
    const markup = renderToStaticMarkup(
      <HotspotProvider onActivate={() => undefined} selectedId="bar">
        <svg>
          <SvgHotspot id="bar" label="Bar 1">
            <rect width={4} height={4} />
          </SvgHotspot>
        </svg>
      </HotspotProvider>,
    );
    expect(markup).toContain(
      '<g data-hotspot="bar" role="button" tabindex="0" aria-label="Bar 1" aria-pressed="true"',
    );
  });

  it('activates on Enter and Space but not on other keys', () => {
    frame.current = 7;
    const onActivate = vi.fn();
    context.current = { onActivate };
    try {
      const element = SvgHotspot({ id: 'bar', payload: 3, children: null });
      for (const key of ['Enter', ' ', 'a']) {
        element.props.onKeyDown({ key, preventDefault: vi.fn(), stopPropagation: vi.fn() });
      }
    } finally {
      context.current = undefined;
    }
    expect(onActivate).toHaveBeenCalledTimes(2);
    expect(onActivate).toHaveBeenCalledWith({ id: 'bar', payload: 3, frame: 7 });
  });
});

describe('subtitle hotspots', () => {
  it('splits whole-word terms case-insensitively', () => {
    expect(splitHotspotTerms('Frames beat framesets and frames.', hotspots)).toEqual([
      { text: 'Frames', hotspot: hotspots[0] },
      { text: ' beat framesets and ' },
      { text: 'frames', hotspot: hotspots[0] },
      { text: '.' },
    ]);
  });

  it('prefers the longest overlapping term', () => {
    const terms = [
      { id: 'clock', term: 'clock' },
      { id: 'wall-clock', term: 'wall-clock' },
    ];
    expect(splitHotspotTerms('no wall-clock here', terms).map((segment) => segment.hotspot?.id)).toEqual([
      undefined,
      'wall-clock',
      undefined,
    ]);
  });

  it('keeps rendered subtitles identical in text when no handler is present', () => {
    frame.current = 15;
    const plain = renderToStaticMarkup(<Subtitles subtitleText={srt} format="srt" />);
    const withTerms = renderToStaticMarkup(
      <Subtitles subtitleText={srt} format="srt" hotspots={hotspots} />,
    );
    expect(withTerms.replace(/<\/?span[^>]*>/g, '')).toBe(plain.replace(/<\/?span[^>]*>/g, ''));
    expect(withTerms).not.toContain('<button');
  });

  it('makes matching subtitle words clickable when a handler is present', () => {
    frame.current = 15;
    const markup = renderToStaticMarkup(
      <HotspotProvider onActivate={() => undefined}>
        <Subtitles subtitleText={srt} format="srt" hotspots={hotspots} />
      </HotspotProvider>,
    );
    expect(markup).toMatch(/<button[^>]*data-hotspot="frame"[^>]*>Frames<\/button>/);
  });
});
