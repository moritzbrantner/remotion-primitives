import { AbsoluteFill } from 'remotion';

import { BlurReveal } from '../../registry/default/primitives/blur-reveal';
import { Fade } from '../../registry/default/primitives/fade';
import { MatrixDecode } from '../../registry/default/primitives/matrix-decode';
import { Scale } from '../../registry/default/primitives/scale';
import { Slide } from '../../registry/default/primitives/slide';
import { Subtitles } from '../../registry/default/primitives/subtitles';
import { TerminalSimulator } from '../../registry/default/primitives/terminal-simulator';

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
    <AbsoluteFill style={{ ...stage, justifyContent: 'center', padding: 96, gap: 40 }}>
      <BlurReveal
        text="Reusable motion, owned by the app."
        startFrame={8}
        durationInFrames={24}
        style={{ fontSize: 48, fontWeight: 700 }}
      />
      <MatrixDecode
        text="deterministic by construction"
        startFrame={38}
        revealDurationInFrames={72}
        seed="showcase"
        style={{ fontSize: 30, color: '#9ca3af' }}
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
