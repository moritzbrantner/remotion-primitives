'use client';

import type { CSSProperties } from 'react';
import { interpolate, useCurrentFrame } from 'remotion';

export type AnimatedNumberProps = {
  to: number;
  from?: number;
  startFrame?: number;
  durationInFrames?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
  style?: CSSProperties;
};

export function AnimatedNumber({
  to,
  from = 0,
  startFrame = 0,
  durationInFrames = 30,
  decimals = 0,
  prefix = '',
  suffix = '',
  className,
  style,
}: AnimatedNumberProps) {
  const frame = useCurrentFrame();
  const value =
    durationInFrames <= 0
      ? frame >= startFrame
        ? to
        : from
      : interpolate(frame, [startFrame, startFrame + durationInFrames], [from, to], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });
  const precision = Math.min(20, Math.max(0, Math.round(decimals)));

  return (
    <span className={className} style={style}>
      {prefix}
      {value.toFixed(precision)}
      {suffix}
    </span>
  );
}
