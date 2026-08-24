'use client';

import type { CSSProperties } from 'react';
import { useMemo } from 'react';
import {
  createTikTokStyleCaptions,
  type Caption,
  type TikTokToken,
} from '@remotion/captions';
import { useCurrentFrame, useVideoConfig } from 'remotion';

export type SubtitleHighlightMode = 'none' | 'current' | 'spoken';

export type SubtitlesProps = {
  captions: Caption[];
  combineTokensWithinMilliseconds?: number;
  breakOnSilenceAfterMilliseconds?: number;
  timeOffsetMs?: number;
  lingerMs?: number;
  highlightMode?: SubtitleHighlightMode;
  activeColor?: string;
  inactiveColor?: string;
  backgroundColor?: string;
  fontSize?: number;
  fontWeight?: CSSProperties['fontWeight'];
  lineHeight?: number;
  maxWidth?: CSSProperties['maxWidth'];
  bottom?: CSSProperties['bottom'];
  padding?: CSSProperties['padding'];
  borderRadius?: number;
  textShadow?: string;
  className?: string;
  style?: CSSProperties;
  tokenStyle?: CSSProperties;
  activeTokenStyle?: CSSProperties;
};

function getPageEndMs(tokens: TikTokToken[], startMs: number, lingerMs: number) {
  return Math.max(startMs, ...tokens.map((token) => token.toMs)) + Math.max(0, lingerMs);
}

function isTokenHighlighted(
  token: TikTokToken,
  timeMs: number,
  mode: SubtitleHighlightMode,
) {
  switch (mode) {
    case 'current':
      return timeMs >= token.fromMs && timeMs < token.toMs;
    case 'spoken':
      return timeMs >= token.fromMs;
    case 'none':
      return false;
  }
}

export function Subtitles({
  captions,
  combineTokensWithinMilliseconds = 1200,
  breakOnSilenceAfterMilliseconds = 500,
  timeOffsetMs = 0,
  lingerMs = 80,
  highlightMode = 'current',
  activeColor = '#facc15',
  inactiveColor = '#ffffff',
  backgroundColor = 'rgba(0, 0, 0, 0.72)',
  fontSize = 48,
  fontWeight = 700,
  lineHeight = 1.2,
  maxWidth = '84%',
  bottom = '8%',
  padding = '0.35em 0.6em',
  borderRadius = 14,
  textShadow = '0 2px 8px rgba(0, 0, 0, 0.55)',
  className,
  style,
  tokenStyle,
  activeTokenStyle,
}: SubtitlesProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const timeMs = (frame / fps) * 1000 + timeOffsetMs;

  const pages = useMemo(
    () =>
      createTikTokStyleCaptions({
        captions,
        combineTokensWithinMilliseconds,
        breakOnSilenceAfterMilliseconds,
      }).pages,
    [captions, combineTokensWithinMilliseconds, breakOnSilenceAfterMilliseconds],
  );

  const page = pages.find(
    (candidate) =>
      timeMs >= candidate.startMs &&
      timeMs <= getPageEndMs(candidate.tokens, candidate.startMs, lingerMs),
  );

  if (!page) {
    return null;
  }

  return (
    <div
      aria-label={page.text}
      className={className}
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom,
        display: 'flex',
        justifyContent: 'center',
        pointerEvents: 'none',
        ...style,
      }}
    >
      <div
        style={{
          maxWidth,
          padding,
          borderRadius,
          background: backgroundColor,
          color: inactiveColor,
          fontSize,
          fontWeight,
          lineHeight,
          textAlign: 'center',
          textShadow,
          whiteSpace: 'pre-wrap',
        }}
      >
        {page.tokens.map((token, index) => {
          const highlighted = isTokenHighlighted(token, timeMs, highlightMode);

          return (
            <span
              key={`${token.fromMs}-${token.toMs}-${index}`}
              style={{
                color: highlighted ? activeColor : inactiveColor,
                ...tokenStyle,
                ...(highlighted ? activeTokenStyle : undefined),
              }}
            >
              {token.text}
            </span>
          );
        })}
      </div>
    </div>
  );
}
