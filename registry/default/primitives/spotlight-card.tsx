'use client';

import type { CSSProperties, ReactNode } from 'react';
import { interpolate, useCurrentFrame } from 'remotion';

export type SpotlightCardProps = {
  children?: ReactNode;
  title?: ReactNode;
  body?: ReactNode;
  startFrame?: number;
  cycleDurationInFrames?: number;
  cardWidth?: number;
  cardHeight?: number;
  glowSize?: number;
  glowOpacity?: number;
  cardColor?: string;
  textColor?: string;
  mutedColor?: string;
  borderRadius?: number;
  padding?: number;
  className?: string;
  style?: CSSProperties;
};

function cursorAt(
  frame: number,
  cardWidth: number,
  cardHeight: number,
  cycleDurationInFrames: number,
) {
  const duration = Math.max(1, cycleDurationInFrames);
  const t = (frame / duration) * Math.PI * 2;

  return {
    x: cardWidth / 2 + Math.sin(t) * cardWidth * 0.42,
    y: cardHeight / 2 + Math.sin(t * 2) * cardHeight * 0.32,
  };
}

export function SpotlightCard({
  children,
  title,
  body,
  startFrame = 0,
  cycleDurationInFrames = 150,
  cardWidth = 520,
  cardHeight = 320,
  glowSize = 600,
  glowOpacity = 0.08,
  cardColor = '#0a0a0a',
  textColor = '#fafafa',
  mutedColor = '#a1a1aa',
  borderRadius = 20,
  padding = 36,
  className,
  style,
}: SpotlightCardProps) {
  const localFrame = Math.max(0, useCurrentFrame() - startFrame);
  const cursor = cursorAt(
    Math.max(0, localFrame - 1),
    cardWidth,
    cardHeight,
    cycleDurationInFrames,
  );
  const opacity = interpolate(localFrame, [0, 12], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const surfaceGlow = `radial-gradient(${glowSize}px circle at ${cursor.x}px ${cursor.y}px, rgba(255,255,255,${glowOpacity}), transparent 40%)`;
  const borderGlow = `radial-gradient(${glowSize * 0.6}px circle at ${cursor.x}px ${cursor.y}px, rgba(255,255,255,0.35), transparent 40%)`;

  return (
    <div
      className={className}
      style={{
        position: 'relative',
        width: cardWidth,
        height: cardHeight,
        borderRadius,
        padding: 1,
        background: borderGlow,
        opacity,
        ...style,
      }}
    >
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          borderRadius: Math.max(0, borderRadius - 1),
          background: cardColor,
          overflow: 'hidden',
          boxShadow: '0 30px 80px rgba(0,0,0,0.5)',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: surfaceGlow,
            pointerEvents: 'none',
          }}
        />

        <div
          style={{
            position: 'relative',
            zIndex: 1,
            height: '100%',
            boxSizing: 'border-box',
            padding,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
            gap: 12,
          }}
        >
          {children ?? (
            <>
              {title ? (
                <div style={{ color: textColor, fontSize: 28, fontWeight: 700 }}>{title}</div>
              ) : null}
              {body ? (
                <div style={{ color: mutedColor, fontSize: 16, lineHeight: 1.5 }}>{body}</div>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
