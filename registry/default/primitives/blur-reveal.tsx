'use client';

import type { CSSProperties } from 'react';

import { Blur } from './blur';
import { Fade } from './fade';

export type BlurRevealProps = {
  text: string;
  startFrame?: number;
  durationInFrames?: number;
  blur?: number;
  className?: string;
  style?: CSSProperties;
};

export function BlurReveal({
  text,
  startFrame = 0,
  durationInFrames = 18,
  blur = 12,
  className,
  style,
}: BlurRevealProps) {
  return (
    <Fade
      startFrame={startFrame}
      durationInFrames={durationInFrames}
      style={{ display: 'inline-block' }}
    >
      <Blur
        startFrame={startFrame}
        durationInFrames={durationInFrames}
        from={blur}
        to={0}
        style={{ display: 'inline-block' }}
      >
        <span className={className} style={{ display: 'inline-block', ...style }}>
          {text}
        </span>
      </Blur>
    </Fade>
  );
}
