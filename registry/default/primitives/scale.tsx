'use client';

import type { CSSProperties, ReactNode } from 'react';
import { interpolate, useCurrentFrame } from 'remotion';

export type ScaleProps = {
  children: ReactNode;
  startFrame?: number;
  durationInFrames?: number;
  from?: number;
  to?: number;
  className?: string;
  style?: CSSProperties;
};

export function Scale({
  children,
  startFrame = 0,
  durationInFrames = 15,
  from = 0.96,
  to = 1,
  className,
  style,
}: ScaleProps) {
  const frame = useCurrentFrame();
  const scale =
    durationInFrames <= 0
      ? frame >= startFrame
        ? to
        : from
      : interpolate(frame, [startFrame, startFrame + durationInFrames], [from, to], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });
  const transform = [style?.transform, `scale(${scale})`].filter(Boolean).join(' ');

  return (
    <div className={className} style={{ ...style, transform }}>
      {children}
    </div>
  );
}
