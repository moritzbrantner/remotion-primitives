'use client';

import type { CSSProperties, ReactNode } from 'react';
import { interpolate, useCurrentFrame } from 'remotion';

export type EnterExitDirection = 'up' | 'right' | 'down' | 'left' | 'none';

export type EnterExitProps = {
  children: ReactNode;
  durationInFrames: number;
  enterInFrames?: number;
  exitInFrames?: number;
  enterDirection?: EnterExitDirection;
  exitDirection?: EnterExitDirection;
  distance?: number;
  className?: string;
  style?: CSSProperties;
};

function vectorFor(direction: EnterExitDirection, distance: number) {
  switch (direction) {
    case 'up':
      return { x: 0, y: distance };
    case 'right':
      return { x: -distance, y: 0 };
    case 'down':
      return { x: 0, y: -distance };
    case 'left':
      return { x: distance, y: 0 };
    case 'none':
      return { x: 0, y: 0 };
  }
}

export function EnterExit({
  children,
  durationInFrames,
  enterInFrames = 15,
  exitInFrames = 15,
  enterDirection = 'up',
  exitDirection = 'up',
  distance = 32,
  className,
  style,
}: EnterExitProps) {
  const frame = useCurrentFrame();
  const duration = Math.max(0, durationInFrames);
  const enterDuration = Math.min(Math.max(0, enterInFrames), duration);
  const exitDuration = Math.min(Math.max(0, exitInFrames), duration);
  const exitStart = Math.max(0, duration - exitDuration);

  const enterProgress =
    enterDuration === 0
      ? 1
      : interpolate(frame, [0, enterDuration], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });
  const exitProgress =
    exitDuration === 0
      ? 0
      : interpolate(frame, [exitStart, duration], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });

  const enterVector = vectorFor(enterDirection, distance);
  const exitVector = vectorFor(exitDirection, distance);
  const x = enterVector.x * (1 - enterProgress) - exitVector.x * exitProgress;
  const y = enterVector.y * (1 - enterProgress) - exitVector.y * exitProgress;
  const opacity = Math.min(enterProgress, 1 - exitProgress);
  const transform = [style?.transform, `translate3d(${x}px, ${y}px, 0)`]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={className} style={{ ...style, opacity, transform }}>
      {children}
    </div>
  );
}
