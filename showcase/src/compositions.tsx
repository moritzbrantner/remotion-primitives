import { AbsoluteFill } from 'remotion';

import { AnimatedNumber } from '../../registry/default/primitives/animated-number';
import { BlurReveal } from '../../registry/default/primitives/blur-reveal';
import { Fade } from '../../registry/default/primitives/fade';
import {
  Hotspot,
  HotspotProvider,
  type HotspotActivation,
} from '../../registry/default/primitives/hotspot';
import { MatrixDecode } from '../../registry/default/primitives/matrix-decode';
import { Scale } from '../../registry/default/primitives/scale';
import { Slide } from '../../registry/default/primitives/slide';
import { Subtitles } from '../../registry/default/primitives/subtitles';
import { TerminalSimulator } from '../../registry/default/primitives/terminal-simulator';
import { Typewriter } from '../../registry/default/primitives/typewriter';

const stage = {
  background: '#07090d',
  color: '#f7f7f8',
  fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
} as const;

export function MotionDemo() {
  return (
    <AbsoluteFill style={{ ...stage, alignItems: 'center', justifyContent: 'center' }}>
      <Fade startFrame={8} durationInFrames={24}>
        <Slide startFrame={8} durationInFrames={24} direction="up" distance={64}>
          <Scale startFrame={8} durationInFrames={24} from={0.92}>
            <div style={{ fontSize: 64, fontWeight: 760, letterSpacing: -3 }}>
              One frame clock.
            </div>
          </Scale>
        </Slide>
      </Fade>
    </AbsoluteFill>
  );
}

export function TextDemo() {
  return (
    <AbsoluteFill style={{ ...stage, justifyContent: 'center', padding: 96, gap: 34 }}>
      <BlurReveal
        text="Reusable motion, owned by the app."
        startFrame={8}
        durationInFrames={24}
        style={{ fontSize: 44, fontWeight: 700 }}
      />
      <MatrixDecode
        text="deterministic by construction"
        startFrame={34}
        revealDurationInFrames={70}
        seed="showcase"
        style={{ fontSize: 28, color: '#9ca3af' }}
      />
      <Typewriter
        text="frame > time"
        startFrame={52}
        framesPerCharacter={3}
        hideCursorWhenComplete
        style={{ fontSize: 26, color: '#d4d4d8' }}
      />
      <AnimatedNumber
        from={0}
        to={100}
        startFrame={72}
        durationInFrames={42}
        suffix="%"
        style={{ fontSize: 34, fontWeight: 700 }}
      />
    </AbsoluteFill>
  );
}

export function TerminalDemo() {
  return (
    <AbsoluteFill style={{ ...stage, alignItems: 'center', justifyContent: 'center' }}>
      <TerminalSimulator
        width={780}
        height={360}
        visibleLines={7}
        title="verify"
        lines={[
          { type: 'command', text: 'bun run verify' },
          { type: 'log', text: 'types: ok', delayInFrames: 8 },
          { type: 'log', text: 'unit tests: ok', delayInFrames: 8 },
          { type: 'log', text: 'source contracts: deterministic', delayInFrames: 8 },
          { type: 'success', text: 'registry + showcase: ready', delayInFrames: 8 },
        ]}
      />
    </AbsoluteFill>
  );
}

export function SubtitleDemo() {
  return (
    <AbsoluteFill style={{ ...stage, alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ fontSize: 60, fontWeight: 760, letterSpacing: -2 }}>Parser → renderer</div>
      <Subtitles
        subtitleText={`1\n00:00:00,300 --> 00:00:02,300\nFormats stay runtime-neutral.\n\n2\n00:00:02,500 --> 00:00:04,800\nRendering stays frame-synced.`}
        format="srt"
        fontSize={34}
        bottom={54}
        maxWidth="82%"
      />
    </AbsoluteFill>
  );
}

export type InteractiveDemoProps = {
  onActivate?: (activation: HotspotActivation) => void;
  selectedId?: string;
};

const interactiveSubtitles = `1
00:00:00,300 --> 00:00:03,000
Every frame is a pure function of time.

2
00:00:03,200 --> 00:00:06,000
Hotspots turn words into questions.

3
00:00:06,200 --> 00:00:07,900
Click one to pause and dig in.`;

export function InteractiveDemo({ onActivate, selectedId }: InteractiveDemoProps) {
  return (
    <HotspotProvider onActivate={onActivate} selectedId={selectedId}>
      <AbsoluteFill style={{ ...stage, alignItems: 'center', justifyContent: 'center', gap: 12 }}>
        <Fade startFrame={4} durationInFrames={18}>
          <div style={{ fontSize: 22, color: '#9ca3af', letterSpacing: 2, textTransform: 'uppercase' }}>
            reproducible renders
          </div>
        </Fade>
        <Hotspot id="determinism" label="Why every render is identical" from={10}>
          <AnimatedNumber
            from={0}
            to={100}
            startFrame={10}
            durationInFrames={50}
            suffix="%"
            style={{ fontSize: 120, fontWeight: 760, letterSpacing: -4 }}
          />
        </Hotspot>
        <Subtitles
          subtitleText={interactiveSubtitles}
          format="srt"
          fontSize={34}
          bottom={54}
          maxWidth="82%"
          highlightMode="none"
          hotspots={[
            { id: 'frame', term: 'frame' },
            { id: 'pure-function', term: 'pure function' },
            { id: 'hotspot', term: 'Hotspots' },
          ]}
        />
      </AbsoluteFill>
    </HotspotProvider>
  );
}
