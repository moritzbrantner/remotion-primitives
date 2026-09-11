import { AbsoluteFill, useCurrentFrame } from 'remotion';

import { AnimatedNumber } from '../../registry/default/primitives/animated-number';
import { AssetImage } from '../../registry/default/primitives/asset-image';
import { BlurReveal } from '../../registry/default/primitives/blur-reveal';
import { Fade } from '../../registry/default/primitives/fade';
import { MatrixDecode } from '../../registry/default/primitives/matrix-decode';
import { MeshScene } from '../../registry/default/primitives/mesh-scene';
import { Scale } from '../../registry/default/primitives/scale';
import { Slide } from '../../registry/default/primitives/slide';
import { Subtitles } from '../../registry/default/primitives/subtitles';
import { TerminalSimulator } from '../../registry/default/primitives/terminal-simulator';
import { Typewriter } from '../../registry/default/primitives/typewriter';
import { cubeMesh, materializedVectorAsset } from './integration-fixtures';

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

export function AssetPipelineDemo() {
  return (
    <AbsoluteFill
      style={{
        ...stage,
        padding: 72,
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        alignItems: 'center',
        gap: 64,
      }}
    >
      <Fade startFrame={6} durationInFrames={20}>
        <div style={{ height: 330 }}>
          <AssetImage source={materializedVectorAsset} />
        </div>
      </Fade>
      <div style={{ display: 'grid', gap: 24 }}>
        <div style={{ color: '#93c5fd', fontSize: 22, fontWeight: 700 }}>asset-tooling → Remotion</div>
        <div style={{ fontSize: 44, fontWeight: 760, letterSpacing: -2 }}>
          Render the validated object. Do not regenerate it.
        </div>
        <div style={{ color: '#9ca3af', fontSize: 20, lineHeight: 1.5 }}>
          AssetRef · image/svg+xml · sha256 0265b45b…
        </div>
      </div>
    </AbsoluteFill>
  );
}

export function MeshPipelineDemo() {
  return (
    <AbsoluteFill style={{ ...stage, padding: 66, display: 'grid', gridTemplateColumns: '1.15fr 0.85fr' }}>
      <div style={{ minWidth: 0, color: '#a7f3d0' }}>
        <MeshScene mesh={cubeMesh} framesPerTurn={180} />
      </div>
      <div style={{ alignSelf: 'center', display: 'grid', gap: 20 }}>
        <div style={{ color: '#6ee7b7', fontSize: 22, fontWeight: 700 }}>three-d-mesh-json-v1</div>
        <div style={{ fontSize: 44, fontWeight: 760, letterSpacing: -2 }}>
          Geometry upstream. Time and presentation here.
        </div>
        <div style={{ color: '#9ca3af', fontSize: 20, lineHeight: 1.5 }}>
          The frame clock changes the view; it never mutates mesh semantics.
        </div>
      </div>
    </AbsoluteFill>
  );
}

const workflowStages = [
  'asset-tooling',
  'asset.operation',
  'video.remotion.compose',
  'video AssetRef',
] as const;

export function WorkflowPipelineDemo() {
  const frame = useCurrentFrame();
  const activeStage = Math.min(workflowStages.length - 1, Math.floor(Math.max(0, frame - 10) / 28));

  return (
    <AbsoluteFill style={{ ...stage, justifyContent: 'center', padding: 76, gap: 48 }}>
      <div>
        <div style={{ color: '#c4b5fd', fontSize: 22, fontWeight: 700, marginBottom: 16 }}>
          workflow-runner integration
        </div>
        <div style={{ fontSize: 46, fontWeight: 760, letterSpacing: -2 }}>
          One existing workflow bridge, one new operation.
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', alignItems: 'center', gap: 18 }}>
        {workflowStages.map((label, index) => {
          const active = index <= activeStage;
          return (
            <div key={label} style={{ display: 'grid', gridTemplateColumns: index === 0 ? '1fr' : '24px 1fr', alignItems: 'center', gap: 10 }}>
              {index > 0 ? (
                <div style={{ color: active ? '#c4b5fd' : '#52525b', fontSize: 24, textAlign: 'center' }}>→</div>
              ) : null}
              <div
                style={{
                  border: `1px solid ${active ? '#8b5cf6' : '#3f3f46'}`,
                  borderRadius: 14,
                  padding: '22px 16px',
                  color: active ? '#f5f3ff' : '#71717a',
                  background: active ? '#18112a' : '#0d0f14',
                  fontSize: 18,
                  fontWeight: 650,
                  textAlign: 'center',
                }}
              >
                {label}
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ color: '#9ca3af', fontSize: 19 }}>
        Rendering and object storage are injected; workflow-runner remains generic.
      </div>
    </AbsoluteFill>
  );
}
