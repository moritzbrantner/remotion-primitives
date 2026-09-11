import type {
  MaterializedAsset,
  ThreeDMeshDocument,
} from '../../registry/default/lib/media-contracts';

const VECTOR_FIXTURE_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 300"><rect width="480" height="300" rx="36" fill="#111827"/><circle cx="120" cy="150" r="64" fill="#60a5fa"/><circle cx="240" cy="150" r="48" fill="#34d399"/><circle cx="350" cy="150" r="36" fill="#f59e0b"/></svg>';

export const materializedVectorAsset: MaterializedAsset = {
  asset: {
    schemaVersion: 1,
    kind: 'vector-image',
    mediaType: 'image/svg+xml',
    sha256: '0265b45ba8d1765f6b3c1e4f9916a3c9097390b3ab7d9ecbc99f37d42daa716a',
    byteLength: 270,
    metadata: {
      source: 'asset-tooling-contract-fixture',
    },
  },
  src: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(VECTOR_FIXTURE_SVG)}`,
};

export const cubeMesh: ThreeDMeshDocument = {
  schemaVersion: 1,
  vertices: [
    [-1, -1, -1],
    [1, -1, -1],
    [1, 1, -1],
    [-1, 1, -1],
    [-1, -1, 1],
    [1, -1, 1],
    [1, 1, 1],
    [-1, 1, 1],
  ],
  indices: [
    0, 2, 1, 0, 3, 2,
    4, 5, 6, 4, 6, 7,
    0, 1, 5, 0, 5, 4,
    3, 7, 6, 3, 6, 2,
    0, 4, 7, 0, 7, 3,
    1, 2, 6, 1, 6, 5,
  ],
};
