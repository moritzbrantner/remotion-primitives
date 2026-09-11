import { Player } from '@remotion/player';
import type { ComponentType } from 'react';

import {
  AssetPipelineDemo,
  MeshPipelineDemo,
  MotionDemo,
  SubtitleDemo,
  TerminalDemo,
  TextDemo,
  WorkflowPipelineDemo,
} from './compositions';

type Demo = {
  title: string;
  description: string;
  component: ComponentType;
  durationInFrames: number;
};

const demos: Demo[] = [
  {
    title: 'Asset-tooling consumer',
    description: 'Render a materialized, content-addressed asset instead of regenerating it in Remotion.',
    component: AssetPipelineDemo,
    durationInFrames: 150,
  },
  {
    title: '3D mesh composition',
    description: 'Consume the renderer-neutral three-d-mesh-json-v1 envelope and add only frame-driven presentation.',
    component: MeshPipelineDemo,
    durationInFrames: 180,
  },
  {
    title: 'Workflow composition',
    description: 'Expose video.remotion.compose through the existing asset.operation workflow bridge.',
    component: WorkflowPipelineDemo,
    durationInFrames: 150,
  },
  {
    title: 'Motion primitives',
    description: 'Fade, Slide, and Scale composed against one frame clock.',
    component: MotionDemo,
    durationInFrames: 120,
  },
  {
    title: 'Text effects',
    description: 'BlurReveal and deterministic MatrixDecode typography.',
    component: TextDemo,
    durationInFrames: 150,
  },
  {
    title: 'Terminal simulator',
    description: 'Frame-driven typing, pauses, cursor blinking, and scrolling.',
    component: TerminalDemo,
    durationInFrames: 240,
  },
  {
    title: 'Subtitles',
    description: 'The pure subtitle parser feeding the frame-synced renderer.',
    component: SubtitleDemo,
    durationInFrames: 180,
  },
];

export function App() {
  return (
    <main className="shell">
      <header className="hero">
        <div className="eyebrow">source-owned · deterministic · frame-oriented</div>
        <h1>Remotion primitives</h1>
        <p>
          A dogfood catalog for source-owned components and thin integration seams. Asset generation,
          3D semantics, and workflow orchestration stay in their owning repositories; Remotion owns
          temporal composition and presentation.
        </p>
      </header>

      <section className="catalog" aria-label="Primitive showcase">
        {demos.map((demo) => (
          <article className="card" key={demo.title}>
            <div className="copy">
              <h2>{demo.title}</h2>
              <p>{demo.description}</p>
            </div>
            <Player
              component={demo.component}
              durationInFrames={demo.durationInFrames}
              compositionWidth={960}
              compositionHeight={540}
              fps={30}
              controls
              loop
              style={{ width: '100%', aspectRatio: '16 / 9' }}
            />
          </article>
        ))}
      </section>
    </main>
  );
}
