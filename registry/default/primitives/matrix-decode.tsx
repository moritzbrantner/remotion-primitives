'use client';

import type { CSSProperties } from 'react';
import { random, useCurrentFrame } from 'remotion';

const DEFAULT_CHARSET = '!@#$%^&*()_+-=<>?/\\|';

export type MatrixDecodeProps = {
  text: string;
  startFrame?: number;
  revealDurationInFrames?: number;
  scrambleStepInFrames?: number;
  charset?: string;
  seed?: string;
  className?: string;
  style?: CSSProperties;
};

export function MatrixDecode({
  text,
  startFrame = 0,
  revealDurationInFrames = 60,
  scrambleStepInFrames = 2,
  charset = DEFAULT_CHARSET,
  seed = 'matrix-decode',
  className,
  style,
}: MatrixDecodeProps) {
  const frame = Math.max(0, useCurrentFrame() - startFrame);
  const revealDuration = Math.max(0, revealDurationInFrames);
  const scrambleStep = Math.max(1, Math.round(scrambleStepInFrames));
  const symbols = charset.length > 0 ? charset : DEFAULT_CHARSET;
  const scrambleFrame = Math.floor(frame / scrambleStep);

  let output = '';
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    const revealFrame = (index / Math.max(text.length, 1)) * revealDuration;

    if (character === ' ' || frame >= revealFrame) {
      output += character;
      continue;
    }

    const value = random(`${seed}-${index}-${scrambleFrame}`);
    output += symbols[Math.floor(value * symbols.length)];
  }

  return (
    <span
      className={className}
      style={{
        display: 'inline-block',
        whiteSpace: 'pre',
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
        ...style,
      }}
    >
      {output}
    </span>
  );
}
