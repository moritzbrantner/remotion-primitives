import { describe, expect, it, vi } from 'vitest';

import {
  createRemotionCompositionOperationExecutor,
  REMOTION_COMPOSE_OPERATION,
} from './asset-tooling-composition';
import {
  REMOTION_COMPOSITION_FORMAT,
  THREE_D_MESH_MEDIA_TYPE,
  type AssetToolingAssetRef,
} from './media-contracts';

function ref(
  kind: string,
  mediaType: string,
  sha: string,
  metadata: Record<string, never> = {},
): AssetToolingAssetRef {
  return {
    schemaVersion: 1,
    kind,
    mediaType,
    sha256: sha.repeat(64),
    byteLength: 12,
    metadata,
  };
}

const meshRef = ref('mesh', THREE_D_MESH_MEDIA_TYPE, 'a');
const imageRef = ref('vector-image', 'image/svg+xml', 'b');
const outputRef = ref('media', 'video/mp4', 'c');
const composition = {
  format: REMOTION_COMPOSITION_FORMAT,
  version: 1 as const,
  compositionId: 'asset-and-mesh',
  durationInFrames: 180,
  fps: 30,
  width: 1920,
  height: 1080,
  metadata: { purpose: 'dogfood' },
};

const meshBytes = new TextEncoder().encode(
  JSON.stringify({
    schemaVersion: 1,
    vertices: [
      [0, 0, 0],
      [1, 0, 0],
      [0, 1, 0],
    ],
    indices: [0, 1, 2],
  }),
);

describe('asset-tooling Remotion composition operation', () => {
  it('is structurally consumable by asset-tooling asset.operation', () => {
    expect(REMOTION_COMPOSE_OPERATION.id).toBe('video.remotion.compose');
    expect(REMOTION_COMPOSE_OPERATION.inputs.map((input) => input.id)).toEqual([
      'image',
      'mesh',
      'audio',
    ]);
    expect(REMOTION_COMPOSE_OPERATION.outputs[0]?.assetKinds).toEqual(['media']);
  });

  it('materializes validated inputs once, renders, and stores one reusable video asset', async () => {
    const resolveAsset = vi.fn(async (_root: string, asset: AssetToolingAssetRef) => {
      if (asset.sha256 === meshRef.sha256) return meshBytes;
      if (asset.sha256 === imageRef.sha256) return new TextEncoder().encode('<svg />');
      throw new Error('unexpected asset');
    });
    const render = vi.fn(async () => ({
      bytes: new Uint8Array([1, 2, 3]),
      mediaType: 'video/mp4',
      metadata: { renderer: 'fixture' },
    }));
    const storeAsset = vi.fn(async () => ({ asset: outputRef }));
    const execute = createRemotionCompositionOperationExecutor({
      resolveAsset,
      render,
      storeAsset,
    });

    const result = await execute('/workspace', {
      parameters: { composition },
      inputs: { image: imageRef, mesh: meshRef },
    });

    expect(resolveAsset).toHaveBeenCalledTimes(2);
    expect(render).toHaveBeenCalledOnce();
    expect(render.mock.calls[0]?.[0]).toMatchObject({
      spec: composition,
      image: { asset: imageRef },
      mesh: {
        asset: meshRef,
        document: {
          schemaVersion: 1,
          indices: [0, 1, 2],
        },
      },
    });
    expect(storeAsset).toHaveBeenCalledWith('/workspace', {
      bytes: new Uint8Array([1, 2, 3]),
      kind: 'media',
      mediaType: 'video/mp4',
      metadata: {
        compositionFormat: REMOTION_COMPOSITION_FORMAT,
        compositionVersion: 1,
        compositionId: 'asset-and-mesh',
        renderer: 'fixture',
      },
    });
    expect(result.outputs.output).toEqual(outputRef);
    expect(result.observations).toEqual({
      compositionId: 'asset-and-mesh',
      durationInFrames: 180,
      fps: 30,
      width: 1920,
      height: 1080,
      inputs: {
        image: imageRef.sha256,
        mesh: meshRef.sha256,
      },
    });
  });

  it('rejects malformed upstream mesh bytes before rendering', async () => {
    const render = vi.fn();
    const execute = createRemotionCompositionOperationExecutor({
      resolveAsset: async () =>
        new TextEncoder().encode(
          JSON.stringify({ schemaVersion: 1, vertices: [[0, 0, 0]], indices: [0, 1, 0] }),
        ),
      render,
      storeAsset: async () => outputRef,
    });

    await expect(
      execute('/workspace', {
        parameters: { composition },
        inputs: { mesh: meshRef },
      }),
    ).rejects.toThrow(/references a missing vertex/);
    expect(render).not.toHaveBeenCalled();
  });
});
