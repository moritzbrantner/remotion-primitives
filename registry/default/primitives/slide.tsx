'use client';

import type { CSSProperties, ReactNode } from 'react';
import { interpolate, useCurrentFrame } from 'remotion';

export type SlideDirection = 'up' | 'right' | 'down' | 'left';

export type SlideProps = {
  children: ReactNode;
  startFrame?: number;
  durationInFrames?: number;
  direction?: SlideDirection;
  distance?: number;
  className?: string;
  style?: CSSProperties;
};

function getOffset(direction: SlideDirection, distance: number) {
  switch (direction) {
    case 'up':
      return { x: 0, y: distance };
    case 'right':
      return { x: -distance, y: 0 };
    case 'down':
      return { x: 0, y: -distance };
    case 'left':
      return { x: distance, y: 0 };
  }
}

export function Slide({
  children,
  startFrame = 0,
  durationInFrames = 15,
  direction = 'up',
  distance = 48,
  className,
  style,
}: SlideProps) {
  const frame = useCurrentFrame();
  const progress =
    durationInFrames <= 0
      ? frame >= startFrame
        ? 1
        : 0
      : interpolate(frame, [startFrame, startFrame + durationInFrames], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });
  const offset = getOffset(direction, distance);
  const x = offset.x * (1 - progress);
  const y = offset.y * (1 - progress);
  const transform = [style?.transform, `translate3d(${x}px, ${y}px, 0)`]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={className} style={{ ...style, transform }}>
      {children}
    </div>
  );
}
