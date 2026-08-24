'use client';

import { Children, type ReactNode } from 'react';
import { Sequence } from 'remotion';

export type StaggerProps = {
  children: ReactNode;
  startFrame?: number;
  intervalInFrames?: number;
  childDurationInFrames?: number;
};

export function Stagger({
  children,
  startFrame = 0,
  intervalInFrames = 5,
  childDurationInFrames,
}: StaggerProps) {
  const start = Math.round(startFrame);
  const interval = Math.round(intervalInFrames);

  return (
    <>
      {Children.map(children, (child, index) => (
        <Sequence
          from={start + index * interval}
          durationInFrames={childDurationInFrames}
          layout="none"
        >
          {child}
        </Sequence>
      ))}
    </>
  );
}
