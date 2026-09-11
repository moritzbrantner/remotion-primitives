'use client';

import type { CSSProperties } from 'react';
import { Img } from 'remotion';

import {
  normalizeMaterializedAsset,
  type MaterializedAsset,
} from '@/lib/remotion/media-contracts';

export type AssetImageProps = {
  source: MaterializedAsset;
  className?: string;
  style?: CSSProperties;
  fit?: CSSProperties['objectFit'];
  position?: CSSProperties['objectPosition'];
};

export function AssetImage({
  source,
  className,
  style,
  fit = 'contain',
  position = 'center',
}: AssetImageProps) {
  const materialized = normalizeMaterializedAsset(source);
  if (!materialized.asset.mediaType.startsWith('image/')) {
    throw new Error(
      `AssetImage requires an image/* asset, received '${materialized.asset.mediaType}'`,
    );
  }

  return (
    <Img
      src={materialized.src}
      className={className}
      style={{ width: '100%', height: '100%', objectFit: fit, objectPosition: position, ...style }}
    />
  );
}
