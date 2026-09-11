export const ASSET_TOOLING_ASSET_REF_SCHEMA_VERSION = 1 as const;
export const THREE_D_MESH_SCHEMA_VERSION = 1 as const;
export const THREE_D_MESH_MEDIA_TYPE =
  'application/vnd.moritzbrantner.three-d.mesh+json' as const;
export const REMOTION_COMPOSITION_FORMAT = '@moritzbrantner/remotion/composition' as const;

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };
export type JsonObject = { [key: string]: JsonValue };

export type AssetToolingAssetRef = {
  schemaVersion: 1;
  kind: string;
  mediaType: string;
  sha256: string;
  byteLength: number;
  metadata: JsonObject;
};

export type MaterializedAsset = {
  asset: AssetToolingAssetRef;
  src: string;
};

export type ThreeDMeshDocument = {
  schemaVersion: 1;
  vertices: Array<[number, number, number]>;
  indices: number[];
};

export type RemotionCompositionSpec = {
  format: typeof REMOTION_COMPOSITION_FORMAT;
  version: 1;
  compositionId: string;
  durationInFrames: number;
  fps: number;
  width: number;
  height: number;
  metadata: JsonObject;
};

const SHA256_PATTERN = /^[0-9a-f]{64}$/;
const TOKEN_PATTERN = /^[a-z0-9]+(?:[._-][a-z0-9]+)*$/;
const MEDIA_TYPE_PATTERN = /^[a-z0-9!#$&^_.+-]+\/[a-z0-9!#$&^_.+-]+$/;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function plainObject(value: unknown, location: string): Record<string, unknown> {
  if (!isPlainObject(value)) throw new Error(`${location} must be a plain object`);
  return value;
}

function assertExactKeys(
  value: Record<string, unknown>,
  allowed: ReadonlySet<string>,
  location: string,
) {
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) throw new Error(`${location} contains unknown field '${key}'`);
  }
}

function nonEmptyString(value: unknown, location: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`${location} must be a non-empty string`);
  }
  return value;
}

function positiveInteger(value: unknown, location: string): number {
  if (!Number.isSafeInteger(value) || (value as number) <= 0) {
    throw new Error(`${location} must be a positive safe integer`);
  }
  return value as number;
}

function positiveNumber(value: unknown, location: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    throw new Error(`${location} must be a positive finite number`);
  }
  return value;
}

function assertJsonValue(value: unknown, location: string): asserts value is JsonValue {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error(`${location} contains a non-finite number`);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((entry, index) => assertJsonValue(entry, `${location}[${index}]`));
    return;
  }
  if (isPlainObject(value)) {
    for (const [key, entry] of Object.entries(value)) {
      if (entry === undefined) throw new Error(`${location}.${key} is undefined`);
      assertJsonValue(entry, `${location}.${key}`);
    }
    return;
  }
  throw new Error(`${location} contains a non-JSON value`);
}

function cloneJsonObject(value: unknown, location: string): JsonObject {
  const object = plainObject(value, location);
  assertJsonValue(object, location);
  return JSON.parse(JSON.stringify(object)) as JsonObject;
}

export function normalizeAssetToolingAssetRef(value: unknown): AssetToolingAssetRef {
  const asset = plainObject(value, 'asset-tooling asset ref');
  assertExactKeys(
    asset,
    new Set(['schemaVersion', 'kind', 'mediaType', 'sha256', 'byteLength', 'metadata']),
    'asset-tooling asset ref',
  );

  if (asset.schemaVersion !== ASSET_TOOLING_ASSET_REF_SCHEMA_VERSION) {
    throw new Error('asset-tooling asset ref schemaVersion must be 1');
  }
  const kind = nonEmptyString(asset.kind, 'asset-tooling asset ref kind');
  if (!TOKEN_PATTERN.test(kind)) {
    throw new Error('asset-tooling asset ref kind must be a lowercase dotted token');
  }
  const mediaType = nonEmptyString(asset.mediaType, 'asset-tooling asset ref mediaType');
  if (!MEDIA_TYPE_PATTERN.test(mediaType)) {
    throw new Error('asset-tooling asset ref mediaType must be a lowercase concrete media type');
  }
  const sha256 = nonEmptyString(asset.sha256, 'asset-tooling asset ref sha256');
  if (!SHA256_PATTERN.test(sha256)) {
    throw new Error('asset-tooling asset ref sha256 must be a lowercase 64-character digest');
  }
  if (!Number.isSafeInteger(asset.byteLength) || (asset.byteLength as number) < 0) {
    throw new Error('asset-tooling asset ref byteLength must be a non-negative safe integer');
  }

  return {
    schemaVersion: 1,
    kind,
    mediaType,
    sha256,
    byteLength: asset.byteLength as number,
    metadata: cloneJsonObject(asset.metadata ?? {}, 'asset-tooling asset ref metadata'),
  };
}

export function normalizeMaterializedAsset(value: unknown): MaterializedAsset {
  const materialized = plainObject(value, 'materialized asset');
  assertExactKeys(materialized, new Set(['asset', 'src']), 'materialized asset');
  return {
    asset: normalizeAssetToolingAssetRef(materialized.asset),
    src: nonEmptyString(materialized.src, 'materialized asset src'),
  };
}

export function normalizeThreeDMeshDocument(value: unknown): ThreeDMeshDocument {
  const document = plainObject(value, 'three-d mesh document');
  assertExactKeys(document, new Set(['schemaVersion', 'vertices', 'indices']), 'three-d mesh document');
  if (document.schemaVersion !== THREE_D_MESH_SCHEMA_VERSION) {
    throw new Error('three-d mesh document schemaVersion must be 1');
  }
  if (!Array.isArray(document.vertices) || !Array.isArray(document.indices)) {
    throw new Error('three-d mesh document vertices and indices must be arrays');
  }

  const vertices = document.vertices.map((value, index): [number, number, number] => {
    if (!Array.isArray(value) || value.length !== 3) {
      throw new Error(`three-d mesh document vertices[${index}] must be a 3D position`);
    }
    const coordinates = value.map((coordinate, coordinateIndex) => {
      if (typeof coordinate !== 'number' || !Number.isFinite(coordinate)) {
        throw new Error(
          `three-d mesh document vertices[${index}][${coordinateIndex}] must be finite`,
        );
      }
      return coordinate;
    });
    return [coordinates[0]!, coordinates[1]!, coordinates[2]!];
  });

  if (document.indices.length % 3 !== 0) {
    throw new Error('three-d mesh document indices must contain complete triangles');
  }
  const indices = document.indices.map((value, index) => {
    if (!Number.isInteger(value) || (value as number) < 0 || (value as number) > 0xffffffff) {
      throw new Error(`three-d mesh document indices[${index}] must be an unsigned 32-bit integer`);
    }
    if ((value as number) >= vertices.length) {
      throw new Error(`three-d mesh document indices[${index}] references a missing vertex`);
    }
    return value as number;
  });

  return { schemaVersion: 1, vertices, indices };
}

export function normalizeRemotionCompositionSpec(value: unknown): RemotionCompositionSpec {
  const spec = plainObject(value, 'Remotion composition spec');
  assertExactKeys(
    spec,
    new Set([
      'format',
      'version',
      'compositionId',
      'durationInFrames',
      'fps',
      'width',
      'height',
      'metadata',
    ]),
    'Remotion composition spec',
  );
  if (spec.format !== REMOTION_COMPOSITION_FORMAT || spec.version !== 1) {
    throw new Error('unsupported Remotion composition spec format or version');
  }

  return {
    format: REMOTION_COMPOSITION_FORMAT,
    version: 1,
    compositionId: nonEmptyString(spec.compositionId, 'Remotion composition spec compositionId'),
    durationInFrames: positiveInteger(
      spec.durationInFrames,
      'Remotion composition spec durationInFrames',
    ),
    fps: positiveNumber(spec.fps, 'Remotion composition spec fps'),
    width: positiveInteger(spec.width, 'Remotion composition spec width'),
    height: positiveInteger(spec.height, 'Remotion composition spec height'),
    metadata: cloneJsonObject(spec.metadata ?? {}, 'Remotion composition spec metadata'),
  };
}
