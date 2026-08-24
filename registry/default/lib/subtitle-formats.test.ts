import { describe, expect, it } from 'vitest';

import { detectSubtitleFormat, parseSubtitleText } from './subtitle-formats';

describe('subtitle format detection', () => {
  it('prefers a recognized file extension', () => {
    expect(detectSubtitleFormat('anything', 'captions.ass')).toBe('ass');
    expect(detectSubtitleFormat('anything', 'captions.srt?raw=1')).toBe('srt');
  });

  it('detects common text formats from content', () => {
    expect(detectSubtitleFormat('WEBVTT\n\n00:01.000 --> 00:02.000\nHello')).toBe('vtt');
    expect(detectSubtitleFormat('1\n00:00:01,000 --> 00:00:02,000\nHello')).toBe('srt');
    expect(detectSubtitleFormat('[00:01.50]Hello')).toBe('lrc');
  });
});

describe('SRT', () => {
  it('parses timing and inline formatting', () => {
    const track = parseSubtitleText({
      format: 'srt',
      input: '1\n00:00:01,250 --> 00:00:03,000\n<b>Hello</b> <i>world</i>',
    });

    expect(track.cues).toHaveLength(1);
    expect(track.cues[0].startMs).toBe(1250);
    expect(track.cues[0].endMs).toBe(3000);
    expect(track.cues[0].text).toBe('Hello world');
    expect(track.cues[0].spans[0].style?.fontWeight).toBe('bold');
    expect(track.cues[0].spans.at(-1)?.style?.fontStyle).toBe('italic');
  });
});

describe('WebVTT', () => {
  it('parses cue settings and voice markup', () => {
    const track = parseSubtitleText({
      format: 'vtt',
      input: 'WEBVTT\n\nintro\n00:00:01.000 --> 00:00:03.500 position:40% line:80% size:60% align:center\n<v Alice>Hello</v>',
    });

    expect(track.cues[0].id).toBe('intro');
    expect(track.cues[0].actor).toBe('Alice');
    expect(track.cues[0].position?.position).toBe('40%');
    expect(track.cues[0].position?.line).toBe('80%');
    expect(track.cues[0].position?.size).toBe('60%');
  });
});

describe('ASS/SSA', () => {
  const ass = `[Script Info]
ScriptType: v4.00+
PlayResX: 1280
PlayResY: 720

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Arial,42,&H00FFFFFF,&H0000FFFF,&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,2,2,2,30,30,24,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
Dialogue: 2,0:00:01.00,0:00:04.00,Default,Alice,0,0,0,,{\\an8\\pos(640,80)\\fad(100,200)}Hello {\\b1}world{\\b0}
Dialogue: 3,0:00:05.00,0:00:07.00,Default,,0,0,0,,{\\k50}Ka{\\kf50}ra{\\ko100}oke`;

  it('preserves script layout, styles, layers, positioning, and fades', () => {
    const track = parseSubtitleText({ input: ass, format: 'ass' });
    expect(track.scriptWidth).toBe(1280);
    expect(track.scriptHeight).toBe(720);
    expect(track.cues).toHaveLength(2);
    expect(track.cues[0].layer).toBe(2);
    expect(track.cues[0].actor).toBe('Alice');
    expect(track.cues[0].position).toMatchObject({ x: 640, y: 80, alignment: 8 });
    expect(track.cues[0].fade).toEqual({ inMs: 100, outMs: 200 });
    expect(track.cues[0].style?.fontFamily).toBe('Arial');
    expect(track.cues[0].style?.fontSize).toBe(42);
  });

  it('preserves ASS karaoke timing as timed spans', () => {
    const track = parseSubtitleText({ input: ass, format: 'ass' });
    const spans = track.cues[1].spans;
    expect(spans.map((span) => [span.text, span.startOffsetMs, span.endOffsetMs])).toEqual([
      ['Ka', 0, 500],
      ['ra', 500, 1000],
      ['oke', 1000, 2000],
    ]);
  });
});

describe('LRC and SBV', () => {
  it('uses the next LRC timestamp as the cue end', () => {
    const track = parseSubtitleText({ input: '[ar:Artist]\n[00:01.00]One\n[00:03.50]Two', format: 'lrc' });
    expect(track.metadata?.ar).toBe('Artist');
    expect(track.cues[0]).toMatchObject({ startMs: 1000, endMs: 3500, text: 'One' });
  });

  it('parses SBV blocks', () => {
    const track = parseSubtitleText({
      input: '0:00:01.000,0:00:02.500\nHello\n\n0:00:03.000,0:00:04.000\nWorld',
      format: 'sbv',
    });
    expect(track.cues.map((cue) => cue.text)).toEqual(['Hello', 'World']);
  });
});

describe('JSON', () => {
  it('accepts Remotion-like caption arrays', () => {
    const track = parseSubtitleText({
      format: 'json',
      input: JSON.stringify([{ text: 'Hello', startMs: 100, endMs: 900 }]),
    });
    expect(track.cues[0]).toMatchObject({ text: 'Hello', startMs: 100, endMs: 900 });
  });
});
