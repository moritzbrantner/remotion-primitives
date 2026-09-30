import { Player, type PlayerRef } from '@remotion/player';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { HotspotActivation } from '../../registry/default/primitives/hotspot';
import { InteractiveDemo } from './compositions';

const fps = 30;

// Insight content belongs to the consuming app; the primitives only report which hotspot was hit.
const insights: Record<string, { title: string; body: string }> = {
  determinism: {
    title: 'Deterministic output',
    body: 'Registry source may not read wall-clock time or ambient randomness, so rendering the same frame twice always produces the same pixels.',
  },
  frame: {
    title: 'Frames, not seconds',
    body: 'Remotion components read useCurrentFrame() and derive every visual from it. Seeking, pausing, and server rendering all reduce to "render frame N".',
  },
  'pure-function': {
    title: 'Pure functions of time',
    body: 'Given the same frame and props, a primitive returns the same tree. That is what lets a paused Player show exactly what the rendered video shows.',
  },
  hotspot: {
    title: 'Hotspots',
    body: 'Hotspot reports clicks through HotspotProvider. Without a handler it renders plain content, so the same composition still renders to a normal video.',
  },
};

function timecode(frame: number) {
  const seconds = frame / fps;
  return `${Math.floor(seconds / 60)}:${(seconds % 60).toFixed(1).padStart(4, '0')}`;
}

export function InteractiveCard() {
  const player = useRef<PlayerRef>(null);
  const [activation, setActivation] = useState<HotspotActivation>();

  const onActivate = useCallback((next: HotspotActivation) => {
    player.current?.pause();
    setActivation(next);
  }, []);

  const close = useCallback(() => {
    setActivation(undefined);
    player.current?.play();
  }, []);

  useEffect(() => {
    const current = player.current;
    if (!current) return;
    const dismiss = () => setActivation(undefined);
    current.addEventListener('play', dismiss);
    return () => current.removeEventListener('play', dismiss);
  }, []);

  const inputProps = useMemo(
    () => ({ onActivate, selectedId: activation?.id }),
    [onActivate, activation?.id],
  );
  const insight = activation ? insights[activation.id] : undefined;

  return (
    <article className="card">
      <div className="copy">
        <h2>Interactive hotspots</h2>
        <p>
          Click the number or an underlined subtitle word. The video pauses and the host app shows
          the matching insight; resuming playback dismisses it.
        </p>
      </div>
      <div className="interactive">
        <Player
          ref={player}
          component={InteractiveDemo}
          inputProps={inputProps}
          durationInFrames={240}
          compositionWidth={960}
          compositionHeight={540}
          fps={fps}
          controls
          loop
          clickToPlay={false}
          style={{ width: '100%', aspectRatio: '16 / 9' }}
        />
        <aside className="insight" aria-live="polite">
          {insight && activation ? (
            <>
              <div className="eyebrow">paused at {timecode(activation.frame)}</div>
              <h3>{insight.title}</h3>
              <p>{insight.body}</p>
              <button type="button" onClick={close}>
                Resume
              </button>
            </>
          ) : (
            <p className="insight-empty">Nothing selected. Click a highlighted element in the video.</p>
          )}
        </aside>
      </div>
    </article>
  );
}
