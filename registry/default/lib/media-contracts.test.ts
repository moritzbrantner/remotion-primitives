import { describe, expect, it } from 'vitest';

import {
  normalizeAssetToolingAssetRef,
  normalizeRemotionCompositionSpec,
  normalizeThreeDMeshDocument,
  REMOTION_COMPOSITION_FORMAT,
  THREE_D_MESH_MEDIA_TYPE,
} from './media-contracts';

const asset = {
  schemaVersion: 1 as const,
  kind: 'mesh',
  mediaType: THREE_D_MESH_MEDIA_TYPE,
  sha256: 'a'.repeat(64),
  byteLength: 128,
  metadata: { meshSchemaVersion: 1, triangleCount: 1 },
};

describe('media integration contracts', () => {
  it('accepts the asset-tooling v1 content-addressed asset shape', () => {
    expect(normalizeAssetToolingAssetRef(asset)).toEqual(asset);
  });

  it('rejects ambient or consumer-specific fields on asset refs', () => {
    expect(() =>
      normalizeAssetToolingAssetRef({ ...asset, url: 'https://example.invalid/object' }),
    ).toThrow(/unknown field 'url'/);
  });

  it('accepts the three-d-mesh-json-v1 position/index envelope', () => {
    const mesh = normalizeThreeDMeshDocument({
      schemaVersion: 1,
      vertices: [
        [0, 0, 0],
        [1, 0, 0],
        [0, 1, 0],
      ],
      indices: [0, 1, 2],
    });
    expect(mesh.indices).toEqual([0, 1, 2]);
  });

  it('rejects mesh indices that do not resolve against the declared vertex buffer', () => {
    expect(() =>
      normalizeThreeDMeshDocument({
        schemaVersion: 1,
        vertices: [[0, 0, 0]],
        indices: [0, 1, 0],
      }),
    ).toThrow(/references a missing vertex/);
  });

  it('normalizes the reusable composition spec independently from asset generation', () => {
    expect(
      normalizeRemotionCompositionSpec({
        format: REMOTION_COMPOSITION_FORMAT,
        version: 1,
        compositionId: 'asset-bridge-demo',
        durationInFrames: 180,
        fps: 30,
        width: 1920,
        height: 1080,
        metadata: { purpose: 'dogfood' },
      }),
    ).toEqual({
      format: REMOTION_COMPOSITION_FORMAT,
      version: 1,
      compositionId: 'asset-bridge-demo',
      durationInFrames: 180,
      fps: 30,
      width: 1920,
      height: 1080,
      metadata: { purpose: 'dogfood' },
    });
  });
});
