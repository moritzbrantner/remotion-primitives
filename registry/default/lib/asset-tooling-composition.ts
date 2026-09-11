import {
  normalizeAssetToolingAssetRef,
  normalizeJsonObject,
  normalizeRemotionCompositionSpec,
  normalizeThreeDMeshDocument,
  THREE_D_MESH_MEDIA_TYPE,
  type AssetToolingAssetRef,
  type JsonObject,
  type RemotionCompositionSpec,
  type ThreeDMeshDocument,
} from './media-contracts';

export const REMOTION_COMPOSE_OPERATION_ID = 'video.remotion.compose' as const;
export const REMOTION_COMPOSE_OPERATION_VERSION = '1' as const;

export const REMOTION_COMPOSE_OPERATION = {
  schemaVersion: 1,
  id: REMOTION_COMPOSE_OPERATION_ID,
  version: REMOTION_COMPOSE_OPERATION_VERSION,
  label: 'Compose Remotion video',
  description:
    'Composes validated asset-tooling objects into a frame-driven video without taking ownership of their domain semantics.',
  category: 'video.composition',
  inputs: [
    {
      id: 'image',
      label: 'Image',
      assetKinds: [],
      mediaTypes: ['image/*'],
      cardinality: 'single',
      required: false,
    },
    {
      id: 'mesh',
      label: '3D mesh',
      assetKinds: ['mesh'],
      mediaTypes: [THREE_D_MESH_MEDIA_TYPE],
      cardinality: 'single',
      required: false,
    },
    {
      id: 'audio',
      label: 'Audio',
      assetKinds: [],
      mediaTypes: ['audio/*'],
      cardinality: 'single',
      required: false,
    },
  ],
  outputs: [
    {
      id: 'output',
      label: 'Video',
      assetKinds: ['media'],
      mediaTypes: ['video/*'],
      cardinality: 'single',
      required: true,
    },
  ],
  parameterSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['composition'],
    properties: {
      composition: {
        type: 'object',
        additionalProperties: false,
        required: [
          'format',
          'version',
          'compositionId',
          'durationInFrames',
          'fps',
          'width',
          'height',
        ],
        properties: {
          format: { const: '@moritzbrantner/remotion/composition' },
          version: { const: 1 },
          compositionId: { type: 'string', minLength: 1 },
          durationInFrames: { type: 'integer', minimum: 1 },
          fps: { type: 'number', exclusiveMinimum: 0 },
          width: { type: 'integer', minimum: 1 },
          height: { type: 'integer', minimum: 1 },
          metadata: { type: 'object' },
        },
      },
    },
  },
} as const;

type MaterializedBinaryAsset = {
  asset: AssetToolingAssetRef;
  bytes: Uint8Array;
};

export type RemotionCompositionRenderRequest = {
  spec: RemotionCompositionSpec;
  image?: MaterializedBinaryAsset;
  mesh?: {
    asset: AssetToolingAssetRef;
    document: ThreeDMeshDocument;
  };
  audio?: MaterializedBinaryAsset;
};

export type RemotionCompositionRenderResult = {
  bytes: Uint8Array;
  mediaType: string;
  metadata?: JsonObject;
};

export type RemotionCompositionOperationDependencies = {
  resolveAsset(
    root: string,
    asset: AssetToolingAssetRef,
  ): Uint8Array | Promise<Uint8Array>;
  render(
    request: RemotionCompositionRenderRequest,
    context?: unknown,
  ): RemotionCompositionRenderResult | Promise<RemotionCompositionRenderResult>;
  storeAsset(
    root: string,
    value: {
      bytes: Uint8Array;
      kind: 'media';
      mediaType: string;
      metadata: JsonObject;
    },
  ):
    | AssetToolingAssetRef
    | { asset: AssetToolingAssetRef }
    | Promise<AssetToolingAssetRef | { asset: AssetToolingAssetRef }>;
};

type OperationInvocation = {
  parameters?: unknown;
  inputs?: Record<string, unknown>;
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function operationSpec(parameters: unknown): RemotionCompositionSpec {
  if (!isPlainObject(parameters)) {
    throw new Error('Remotion composition operation parameters must be a plain object');
  }
  const keys = Object.keys(parameters);
  if (keys.length !== 1 || keys[0] !== 'composition') {
    throw new Error("Remotion composition operation parameters must contain only 'composition'");
  }
  return normalizeRemotionCompositionSpec(parameters.composition);
}

function optionalAsset(
  inputs: Record<string, unknown>,
  id: string,
  mediaFamily: string,
): AssetToolingAssetRef | undefined {
  if (!Object.hasOwn(inputs, id)) return undefined;
  const asset = normalizeAssetToolingAssetRef(inputs[id]);
  if (!asset.mediaType.startsWith(`${mediaFamily}/`)) {
    throw new Error(`Remotion composition input '${id}' must be ${mediaFamily}/*`);
  }
  return asset;
}

function meshAsset(inputs: Record<string, unknown>): AssetToolingAssetRef | undefined {
  if (!Object.hasOwn(inputs, 'mesh')) return undefined;
  const asset = normalizeAssetToolingAssetRef(inputs.mesh);
  if (asset.kind !== 'mesh' || asset.mediaType !== THREE_D_MESH_MEDIA_TYPE) {
    throw new Error(`Remotion composition input 'mesh' must use ${THREE_D_MESH_MEDIA_TYPE}`);
  }
  return asset;
}

function renderResult(value: unknown): RemotionCompositionRenderResult {
  if (!isPlainObject(value)) throw new Error('Remotion render result must be a plain object');
  for (const key of Object.keys(value)) {
    if (!['bytes', 'mediaType', 'metadata'].includes(key)) {
      throw new Error(`Remotion render result contains unknown field '${key}'`);
    }
  }
  if (!(value.bytes instanceof Uint8Array)) {
    throw new Error('Remotion render result bytes must be a Uint8Array');
  }
  if (typeof value.mediaType !== 'string' || !/^video\/[a-z0-9!#$&^_.+-]+$/.test(value.mediaType)) {
    throw new Error('Remotion render result mediaType must be a concrete video/* media type');
  }
  return {
    bytes: value.bytes,
    mediaType: value.mediaType,
    metadata: normalizeJsonObject(value.metadata ?? {}, 'Remotion render result metadata'),
  };
}

function storedAsset(value: AssetToolingAssetRef | { asset: AssetToolingAssetRef }) {
  return normalizeAssetToolingAssetRef(isPlainObject(value) && 'asset' in value ? value.asset : value);
}

export function createRemotionCompositionOperationExecutor(
  dependencies: RemotionCompositionOperationDependencies,
) {
  return async function executeRemotionCompositionOperation(
    root: string,
    invocation: OperationInvocation,
    context?: unknown,
  ) {
    const spec = operationSpec(invocation.parameters ?? {});
    const inputs = invocation.inputs ?? {};
    if (!isPlainObject(inputs)) throw new Error('Remotion composition inputs must be a plain object');

    const imageRef = optionalAsset(inputs, 'image', 'image');
    const audioRef = optionalAsset(inputs, 'audio', 'audio');
    const meshRef = meshAsset(inputs);

    const image = imageRef
      ? { asset: imageRef, bytes: await dependencies.resolveAsset(root, imageRef) }
      : undefined;
    const audio = audioRef
      ? { asset: audioRef, bytes: await dependencies.resolveAsset(root, audioRef) }
      : undefined;
    const mesh = meshRef
      ? {
          asset: meshRef,
          document: normalizeThreeDMeshDocument(
            JSON.parse(new TextDecoder().decode(await dependencies.resolveAsset(root, meshRef))),
          ),
        }
      : undefined;

    const rendered = renderResult(await dependencies.render({ spec, image, mesh, audio }, context));
    const stored = storedAsset(
      await dependencies.storeAsset(root, {
        bytes: rendered.bytes,
        kind: 'media',
        mediaType: rendered.mediaType,
        metadata: {
          ...rendered.metadata,
          compositionFormat: spec.format,
          compositionVersion: spec.version,
          compositionId: spec.compositionId,
        },
      }),
    );
    if (stored.kind !== 'media' || !stored.mediaType.startsWith('video/')) {
      throw new Error('stored Remotion composition output must be a media video/* asset');
    }

    const inputEvidence: JsonObject = {};
    for (const [id, asset] of [
      ['image', imageRef],
      ['mesh', meshRef],
      ['audio', audioRef],
    ] as const) {
      if (asset) inputEvidence[id] = asset.sha256;
    }

    return {
      outputs: { output: stored },
      observations: {
        compositionId: spec.compositionId,
        durationInFrames: spec.durationInFrames,
        fps: spec.fps,
        width: spec.width,
        height: spec.height,
        inputs: inputEvidence,
      },
    };
  };
}
