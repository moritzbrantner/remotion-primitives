'use client';

import type { CSSProperties, ReactNode } from 'react';
import { interpolate, useCurrentFrame } from 'remotion';

export type BlurProps = {
  children: ReactNode;
  startFrame?: number;
  durationInFrames?: number;
  from?: number;
  to?: number;
  className?: string;
  style?: CSSProperties;
};

export function Blur({
  children,
  startFrame = 0,
  durationInFrames = 15,
  from = 12,
  to = 0,
  className,
  style,
}: BlurProps) {
  const frame = useCurrentFrame();
  const blur =
    durationInFrames <= 0
      ? frame >= startFrame
        ? to
        : from
      : interpolate(frame, [startFrame, startFrame + durationInFrames], [from, to], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });
  const filter = [style?.filter, `blur(${Math.max(blur, 0)}px)`].filter(Boolean).join(' ');

  return (
    <div className={className} style={{ ...style, filter }}>
      {children}
    </div>
  );
}
