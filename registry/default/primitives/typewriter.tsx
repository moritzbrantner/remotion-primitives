'use client';

import type { CSSProperties } from 'react';
import { useCurrentFrame } from 'remotion';

export type TypewriterProps = {
  text: string;
  startFrame?: number;
  framesPerCharacter?: number;
  cursor?: string;
  showCursor?: boolean;
  cursorBlinkInFrames?: number;
  hideCursorWhenComplete?: boolean;
  className?: string;
  style?: CSSProperties;
  cursorStyle?: CSSProperties;
};

export function Typewriter({
  text,
  startFrame = 0,
  framesPerCharacter = 2,
  cursor = '|',
  showCursor = true,
  cursorBlinkInFrames = 15,
  hideCursorWhenComplete = false,
  className,
  style,
  cursorStyle,
}: TypewriterProps) {
  const frame = useCurrentFrame();
  const elapsed = frame - startFrame;
  const cadence = Math.max(1, Math.round(framesPerCharacter));
  const blinkCadence = Math.max(1, Math.round(cursorBlinkInFrames));
  const visibleCharacters =
    elapsed < 0 ? 0 : Math.min(text.length, Math.floor(elapsed / cadence) + 1);
  const complete = visibleCharacters >= text.length;
  const cursorVisible =
    showCursor &&
    elapsed >= 0 &&
    !(hideCursorWhenComplete && complete) &&
    Math.floor(elapsed / blinkCadence) % 2 === 0;

  return (
    <span className={className} style={{ whiteSpace: 'pre', ...style }}>
      {text.slice(0, visibleCharacters)}
      {cursorVisible ? (
        <span aria-hidden="true" style={cursorStyle}>
          {cursor}
        </span>
      ) : null}
    </span>
  );
}
