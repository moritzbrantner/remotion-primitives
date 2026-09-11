import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import {
  createRemotionCompositionOperationExecutor,
  REMOTION_COMPOSE_OPERATION,
  type RemotionCompositionRenderRequest,
} from '../registry/default/lib/asset-tooling-composition';
import { REMOTION_COMPOSITION_FORMAT } from '../registry/default/lib/media-contracts';

const [assetToolingCheckout, workflowRunnerCheckout, assetToolingRevision, workflowRunnerRevision] =
  process.argv.slice(2);

for (const [value, name] of [
  [assetToolingCheckout, 'asset-tooling checkout'],
  [workflowRunnerCheckout, 'workflow-runner checkout'],
] as const) {
  if (!value || !path.isAbsolute(value)) throw new Error(`${name} must be an absolute path`);
}
for (const [value, name] of [
  [assetToolingRevision, 'asset-tooling revision'],
  [workflowRunnerRevision, 'workflow-runner revision'],
] as const) {
  if (!/^[0-9a-f]{40}$/.test(value ?? '')) throw new Error(`${name} must be an exact Git SHA`);
}

const stack = JSON.parse(
  await Bun.file(new URL('../stability/media-stack.json', import.meta.url)).text(),
) as {
  schemaVersion: number;
  assetTooling: { repository: string; commit: string };
  workflowRunner: { repository: string; commit: string };
};
assert.equal(stack.schemaVersion, 1);
assert.equal(stack.assetTooling.repository, 'moritzbrantner/asset-tooling');
assert.equal(stack.workflowRunner.repository, 'moritzbrantner/workflow-runner');
assert.equal(stack.assetTooling.commit, assetToolingRevision);
assert.equal(stack.workflowRunner.commit, workflowRunnerRevision);

const assetToolingModule = (file: string) =>
  pathToFileURL(path.join(assetToolingCheckout!, 'src', file)).href;
const workflowRunnerModule = (file: string) =>
  pathToFileURL(path.join(workflowRunnerCheckout!, 'src', file)).href;

const { resolveAssetObject, storeAssetObject } = await import(assetToolingModule('asset-store.js'));
const { PROCEDURAL_SVG_SCATTER_OPERATION, executeProceduralSvgScatterOperation } = await import(
  assetToolingModule('generation-operations.js')
);
const { AUDIO_SYNTHESIZE_OPERATION, executeAudioSynthesizeOperation } = await import(
  assetToolingModule('audio-operations.js')
);
const { ASSET_OPERATION_WORKFLOW_KIND, createAssetOperationWorkflowExecutor } = await import(
  assetToolingModule('workflow-operations.js')
);
const { createWorkflowRunner } = await import(workflowRunnerModule('index.ts'));

const root = await mkdtemp(path.join(tmpdir(), 'remotion-media-stack-'));
const evidence: Array<Record<string, unknown>> = [];
const resolveCounts = new Map<string, number>();
let renderCalls = 0;

try {
  const compose = createRemotionCompositionOperationExecutor({
    resolveAsset: async (workspaceRoot, asset) => {
      resolveCounts.set(asset.sha256, (resolveCounts.get(asset.sha256) ?? 0) + 1);
      return resolveAssetObject(workspaceRoot, asset);
    },
    render: async (request: RemotionCompositionRenderRequest) => {
      renderCalls += 1;
      assert.equal(request.spec.format, REMOTION_COMPOSITION_FORMAT);

      if (request.spec.compositionId === 'workflow-generated-image') {
        assert.ok(request.image, 'image workflow must route the generated image into the composition');
        assert.equal(request.mesh, undefined);
        assert.equal(request.audio, undefined);
        return {
          bytes: new TextEncoder().encode(
            JSON.stringify({
              schemaVersion: 1,
              compositionId: request.spec.compositionId,
              imageSha256: request.image.asset.sha256,
            }),
          ),
          mediaType: 'video/x-remotion-fixture',
          metadata: { renderer: 'cross-stack-image-fixture-v1' },
        };
      }

      if (request.spec.compositionId === 'workflow-generated-audio') {
        assert.equal(request.image, undefined);
        assert.equal(request.mesh, undefined);
        assert.ok(request.audio, 'audio workflow must route canonical audio into the composition');
        assert.equal(request.audio.asset.kind, 'audio');
        assert.equal(request.audio.asset.mediaType, 'audio/wav');
        assert.ok(request.audio.bytes.byteLength > 44);
        return {
          bytes: new TextEncoder().encode(
            JSON.stringify({
              schemaVersion: 1,
              compositionId: request.spec.compositionId,
              audioSha256: request.audio.asset.sha256,
            }),
          ),
          mediaType: 'video/x-remotion-fixture',
          metadata: { renderer: 'cross-stack-audio-fixture-v1' },
        };
      }

      throw new Error(`unexpected composition '${request.spec.compositionId}'`);
    },
    storeAsset: (workspaceRoot, value) => storeAssetObject(workspaceRoot, value),
  });

  const assetExecutor = createAssetOperationWorkflowExecutor({
    root,
    registrations: [
      {
        operation: PROCEDURAL_SVG_SCATTER_OPERATION,
        execute: executeProceduralSvgScatterOperation,
      },
      {
        operation: AUDIO_SYNTHESIZE_OPERATION,
        execute: executeAudioSynthesizeOperation,
      },
      {
        operation: REMOTION_COMPOSE_OPERATION,
        execute: compose,
      },
    ],
    onOperationResult: (entry: Record<string, unknown>) => evidence.push(entry),
  });
  const runner = createWorkflowRunner({
    executors: { [ASSET_OPERATION_WORKFLOW_KIND]: assetExecutor },
  });

  const imageWorkflow = {
    format: '@moritzbrantner/workflow/compiled' as const,
    version: 1 as const,
    nodes: [
      {
        id: 'generate-image',
        label: 'Generate SVG',
        kind: ASSET_OPERATION_WORKFLOW_KIND,
        outputs: [{ id: 'output' }],
        data: {
          assetOperation: {
            id: PROCEDURAL_SVG_SCATTER_OPERATION.id,
            version: PROCEDURAL_SVG_SCATTER_OPERATION.version,
            parameters: {
              seed: '42',
              width: 96,
              height: 64,
              count: 8,
              minRadius: 2,
              maxRadius: 6,
              background: '#101418',
              palette: ['#ffcc00', '#3366ff', '#33aa66'],
            },
          },
        },
      },
      {
        id: 'compose-image',
        label: 'Compose image video',
        kind: ASSET_OPERATION_WORKFLOW_KIND,
        inputs: [{ id: 'image' }],
        outputs: [{ id: 'output' }],
        data: {
          assetOperation: {
            id: REMOTION_COMPOSE_OPERATION.id,
            version: REMOTION_COMPOSE_OPERATION.version,
            parameters: {
              composition: {
                format: REMOTION_COMPOSITION_FORMAT,
                version: 1,
                compositionId: 'workflow-generated-image',
                durationInFrames: 90,
                fps: 30,
                width: 960,
                height: 540,
                metadata: { purpose: 'cross-stack-image-dogfood' },
              },
            },
          },
        },
      },
    ],
    edges: [
      {
        id: 'generated-image-to-composition',
        sourceNodeId: 'generate-image',
        sourcePortId: 'output',
        targetNodeId: 'compose-image',
        targetPortId: 'image',
      },
    ],
    order: ['generate-image', 'compose-image'],
  };

  const audioWorkflow = {
    format: '@moritzbrantner/workflow/compiled' as const,
    version: 1 as const,
    nodes: [
      {
        id: 'generate-audio',
        label: 'Generate canonical audio',
        kind: ASSET_OPERATION_WORKFLOW_KIND,
        outputs: [{ id: 'output' }],
        data: {
          assetOperation: {
            id: AUDIO_SYNTHESIZE_OPERATION.id,
            version: AUDIO_SYNTHESIZE_OPERATION.version,
            parameters: {
              waveform: 'square',
              sampleRate: 8000,
              channels: 1,
              frameCount: 800,
              frequencyHz: 400,
              amplitude: 4000,
            },
          },
        },
      },
      {
        id: 'compose-audio',
        label: 'Compose audio video',
        kind: ASSET_OPERATION_WORKFLOW_KIND,
        inputs: [{ id: 'audio' }],
        outputs: [{ id: 'output' }],
        data: {
          assetOperation: {
            id: REMOTION_COMPOSE_OPERATION.id,
            version: REMOTION_COMPOSE_OPERATION.version,
            parameters: {
              composition: {
                format: REMOTION_COMPOSITION_FORMAT,
                version: 1,
                compositionId: 'workflow-generated-audio',
                durationInFrames: 90,
                fps: 30,
                width: 960,
                height: 540,
                metadata: { purpose: 'cross-stack-audio-dogfood' },
              },
            },
          },
        },
      },
    ],
    edges: [
      {
        id: 'generated-audio-to-composition',
        sourceNodeId: 'generate-audio',
        sourcePortId: 'output',
        targetNodeId: 'compose-audio',
        targetPortId: 'audio',
      },
    ],
    order: ['generate-audio', 'compose-audio'],
  };

  const imageRun = await runner.dispatch({ runId: 'remotion-image-stack', workflow: imageWorkflow });
  assert.equal(imageRun.status, 'succeeded');
  assert.equal(imageRun.nodeResults['generate-image'].status, 'succeeded');
  assert.equal(imageRun.nodeResults['compose-image'].status, 'succeeded');
  const generatedImage = imageRun.nodeResults['generate-image'].outputs.output;
  const imageVideo = imageRun.nodeResults['compose-image'].outputs.output;
  assert.equal(generatedImage.kind, 'vector-image');
  assert.equal(generatedImage.mediaType, 'image/svg+xml');
  assert.equal(imageVideo.kind, 'media');
  assert.equal(imageVideo.mediaType, 'video/x-remotion-fixture');
  assert.deepEqual(
    JSON.parse((await resolveAssetObject(root, imageVideo)).toString('utf8')),
    {
      schemaVersion: 1,
      compositionId: 'workflow-generated-image',
      imageSha256: generatedImage.sha256,
    },
  );
  assert.equal(resolveCounts.get(generatedImage.sha256), 1);

  const audioRun = await runner.dispatch({ runId: 'remotion-audio-stack', workflow: audioWorkflow });
  assert.equal(audioRun.status, 'succeeded');
  assert.equal(audioRun.nodeResults['generate-audio'].status, 'succeeded');
  assert.equal(audioRun.nodeResults['compose-audio'].status, 'succeeded');
  const generatedAudio = audioRun.nodeResults['generate-audio'].outputs.output;
  const audioVideo = audioRun.nodeResults['compose-audio'].outputs.output;
  assert.equal(generatedAudio.kind, 'audio');
  assert.equal(generatedAudio.mediaType, 'audio/wav');
  assert.equal(generatedAudio.metadata.audio.codec, 'pcm-s16le');
  assert.equal(audioVideo.kind, 'media');
  assert.equal(audioVideo.mediaType, 'video/x-remotion-fixture');
  assert.deepEqual(
    JSON.parse((await resolveAssetObject(root, audioVideo)).toString('utf8')),
    {
      schemaVersion: 1,
      compositionId: 'workflow-generated-audio',
      audioSha256: generatedAudio.sha256,
    },
  );
  assert.equal(resolveCounts.get(generatedAudio.sha256), 1);

  assert.equal(renderCalls, 2);
  assert.deepEqual(
    evidence.map((entry: any) => entry.operation),
    [
      { id: 'procedural.svg.scatter', version: '1' },
      { id: 'video.remotion.compose', version: '1' },
      { id: 'audio.synthesize', version: '1' },
      { id: 'video.remotion.compose', version: '1' },
    ],
  );
  assert.equal((evidence[1] as any).result.observations.inputs.image, generatedImage.sha256);
  assert.equal((evidence[3] as any).result.observations.inputs.audio, generatedAudio.sha256);

  console.log(
    JSON.stringify({
      status: 'media-stack-valid',
      assetTooling: assetToolingRevision,
      workflowRunner: workflowRunnerRevision,
      generatedImage: generatedImage.sha256,
      generatedAudio: generatedAudio.sha256,
      imageVideo: imageVideo.sha256,
      audioVideo: audioVideo.sha256,
      renderCalls,
    }),
  );
} finally {
  await rm(root, { recursive: true, force: true });
}
