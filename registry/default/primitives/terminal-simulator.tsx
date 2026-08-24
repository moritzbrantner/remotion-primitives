'use client';

import type { CSSProperties } from 'react';
import { Sequence, useCurrentFrame, useVideoConfig } from 'remotion';

export type TerminalLineType = 'command' | 'log' | 'success' | 'error';

export type TerminalLine = {
  text: string;
  type: TerminalLineType;
  delayInFrames?: number;
  pauseInFrames?: number;
};

export type TerminalSimulatorProps = {
  lines: TerminalLine[];
  prompt?: string;
  title?: string;
  width?: number;
  height?: number;
  visibleLines?: number;
  fontSize?: number;
  framesPerChunk?: number;
  chunkSize?: number;
  background?: string;
  chromeColor?: string;
  colors?: Partial<Record<TerminalLineType, string>>;
  className?: string;
  style?: CSSProperties;
};

const DEFAULT_COLORS: Record<TerminalLineType, string> = {
  command: '#fafafa',
  log: '#a1a1aa',
  success: '#22c55e',
  error: '#ef4444',
};

function getLineStarts(
  lines: TerminalLine[],
  chunkSize: number,
  framesPerChunk: number,
) {
  const starts: number[] = [];
  let cursor = 0;

  for (const line of lines) {
    cursor += Math.max(0, Math.round(line.delayInFrames ?? 8));
    starts.push(cursor);

    const chunks = Math.ceil(line.text.length / chunkSize);
    cursor += chunks * framesPerChunk;
    cursor += Math.max(0, Math.round(line.pauseInFrames ?? 0));
  }

  return starts;
}

export function TerminalSimulator({
  lines,
  prompt = '$',
  title,
  width = 900,
  height = 480,
  visibleLines = 8,
  fontSize = 18,
  framesPerChunk = 1,
  chunkSize = 4,
  background = '#0a0a0a',
  chromeColor = '#1a1a1a',
  colors,
  className,
  style,
}: TerminalSimulatorProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const safeChunkSize = Math.max(1, Math.round(chunkSize));
  const safeFramesPerChunk = Math.max(1, Math.round(framesPerChunk));
  const safeVisibleLines = Math.max(1, Math.round(visibleLines));
  const lineHeight = Math.round(fontSize * 1.6);
  const starts = getLineStarts(lines, safeChunkSize, safeFramesPerChunk);
  const palette = { ...DEFAULT_COLORS, ...colors };

  let translateY = 0;
  for (let index = safeVisibleLines; index < lines.length; index += 1) {
    if (frame >= starts[index]) {
      translateY -= lineHeight;
    }
  }

  return (
    <div
      className={className}
      style={{
        ...style,
        width,
        height,
        background,
        borderRadius: 12,
        overflow: 'hidden',
        boxShadow: '0 30px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.06)',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
      }}
    >
      <div
        style={{
          height: 40,
          flexShrink: 0,
          background: chromeColor,
          display: 'flex',
          alignItems: 'center',
          padding: '0 16px',
          gap: 8,
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <TerminalLight color="#ff5f57" />
        <TerminalLight color="#febc2e" />
        <TerminalLight color="#28c840" />
        {title ? (
          <div style={{ flex: 1, textAlign: 'center', color: '#71717a', fontSize: 13 }}>
            {title}
          </div>
        ) : null}
      </div>

      <div style={{ flex: 1, padding: 20, overflow: 'hidden', position: 'relative' }}>
        <div
          style={{
            position: 'absolute',
            left: 20,
            right: 20,
            top: 20,
            transform: `translateY(${translateY}px)`,
          }}
        >
          {lines.map((line, index) => (
            <Sequence
              key={`${line.type}-${index}-${line.text}`}
              from={starts[index]}
              layout="none"
            >
              <TerminalLineRow
                line={line}
                prompt={prompt}
                fontSize={fontSize}
                lineHeight={lineHeight}
                framesPerChunk={safeFramesPerChunk}
                chunkSize={safeChunkSize}
                fps={fps}
                color={palette[line.type]}
                promptColor={palette.success}
              />
            </Sequence>
          ))}
        </div>
      </div>
    </div>
  );
}

function TerminalLight({ color }: { color: string }) {
  return (
    <span
      style={{
        width: 12,
        height: 12,
        borderRadius: '50%',
        background: color,
        opacity: 0.85,
      }}
    />
  );
}

function TerminalLineRow({
  line,
  prompt,
  fontSize,
  lineHeight,
  framesPerChunk,
  chunkSize,
  fps,
  color,
  promptColor,
}: {
  line: TerminalLine;
  prompt: string;
  fontSize: number;
  lineHeight: number;
  framesPerChunk: number;
  chunkSize: number;
  fps: number;
  color: string;
  promptColor: string;
}) {
  const localFrame = useCurrentFrame();
  const revealed = Math.min(
    line.text.length,
    Math.floor(localFrame / framesPerChunk) * chunkSize,
  );
  const visible = line.text.slice(0, revealed);
  const typingDone = revealed >= line.text.length;
  const cursorVisible = Math.floor((localFrame / fps) * 2) % 2 === 0;

  return (
    <div
      style={{
        height: lineHeight,
        fontSize,
        color,
        display: 'flex',
        alignItems: 'center',
        whiteSpace: 'pre',
      }}
    >
      {line.type === 'command' ? (
        <span style={{ color: promptColor, marginRight: 8 }}>{prompt}</span>
      ) : null}
      <span>{visible}</span>
      {!typingDone && cursorVisible ? (
        <span
          style={{
            display: 'inline-block',
            width: fontSize * 0.55,
            height: fontSize,
            background: color,
            marginLeft: 2,
          }}
        />
      ) : null}
    </div>
  );
}
