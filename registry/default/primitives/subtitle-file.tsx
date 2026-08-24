'use client';

import { useEffect, useState } from 'react';
import { useDelayRender } from 'remotion';

import { Subtitles, type SubtitlesProps } from '@/components/remotion/subtitles';

export type SubtitleFileProps = Omit<SubtitlesProps, 'captions' | 'track' | 'subtitleText'> & {
  src: string;
  fetchOptions?: RequestInit;
};

export function SubtitleFile({ src, fetchOptions, fileName, format = 'auto', ...props }: SubtitleFileProps) {
  const [subtitleText, setSubtitleText] = useState<string>();
  const { delayRender, continueRender, cancelRender } = useDelayRender();
  const [handle] = useState(() => delayRender(`Loading subtitles: ${src}`));

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const response = await fetch(src, fetchOptions);
        if (!response.ok) {
          throw new Error(`Failed to load subtitles from ${src}: ${response.status} ${response.statusText}`);
        }
        const text = await response.text();
        if (cancelled) return;
        setSubtitleText(text);
        continueRender(handle);
      } catch (error) {
        if (!cancelled) cancelRender(error instanceof Error ? error : new Error(String(error)));
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [cancelRender, continueRender, fetchOptions, handle, src]);

  if (subtitleText === undefined) return null;

  return (
    <Subtitles
      {...props}
      subtitleText={subtitleText}
      format={format}
      fileName={fileName ?? src}
    />
  );
}
