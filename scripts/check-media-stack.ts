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
const { ASSET_OPERATION_WORKFLOW_KIND, createAssetOperationWorkflowExecutor } = await import(
  assetToolingModule('workflow-operations.js')
);
const { createWorkflowRunner } = await import(workflowRunnerModule('index.ts'));

const root = await mkdtemp(path.join(tmpdir(), 'remotion-media-stack-'));
const evidence: Array<Record<string, unknown>> = [];
let renderCalls = 0;

try {
  const compose = createRemotionCompositionOperationExecutor({
    resolveAsset: (workspaceRoot, asset) => resolveAssetObject(workspaceRoot, asset),
    render: async (request: RemotionCompositionRenderRequest) => {
      renderCalls += 1;
      assert.equal(request.spec.compositionId, 'workflow-generated-asset');
      assert.equal(request.spec.format, REMOTION_COMPOSITION_FORMAT);
      assert.ok(request.image, 'workflow must route the generated image into the composition');
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
        metadata: { renderer: 'cross-stack-fixture-v1' },
      };
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
        operation: REMOTION_COMPOSE_OPERATION,
        execute: compose,
      },
    ],
    onOperationResult: (entry: Record<string, unknown>) => evidence.push(entry),
  });
  const runner = createWorkflowRunner({
    executors: { [ASSET_OPERATION_WORKFLOW_KIND]: assetExecutor },
  });

  const workflow = {
    format: '@moritzbrantner/workflow/compiled' as const,
    version: 1 as const,
    nodes: [
      {
        id: 'generate',
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
        id: 'compose',
        label: 'Compose video',
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
                compositionId: 'workflow-generated-asset',
                durationInFrames: 90,
                fps: 30,
                width: 960,
                height: 540,
                metadata: { purpose: 'cross-stack-dogfood' },
              },
            },
          },
        },
      },
    ],
    edges: [
      {
        id: 'generated-image-to-composition',
        sourceNodeId: 'generate',
        sourcePortId: 'output',
        targetNodeId: 'compose',
        targetPortId: 'image',
      },
    ],
    order: ['generate', 'compose'],
  };

  const run = await runner.dispatch({ runId: 'remotion-media-stack', workflow });
  assert.equal(run.status, 'succeeded');
  assert.equal(renderCalls, 1);
  assert.equal(run.nodeResults.generate.status, 'succeeded');
  assert.equal(run.nodeResults.compose.status, 'succeeded');

  const generatedAsset = run.nodeResults.generate.outputs.output;
  const videoAsset = run.nodeResults.compose.outputs.output;
  assert.equal(generatedAsset.kind, 'vector-image');
  assert.equal(generatedAsset.mediaType, 'image/svg+xml');
  assert.equal(videoAsset.kind, 'media');
  assert.equal(videoAsset.mediaType, 'video/x-remotion-fixture');

  const storedVideo = JSON.parse((await resolveAssetObject(root, videoAsset)).toString('utf8'));
  assert.deepEqual(storedVideo, {
    schemaVersion: 1,
    compositionId: 'workflow-generated-asset',
    imageSha256: generatedAsset.sha256,
  });

  assert.equal(evidence.length, 2);
  assert.deepEqual(
    evidence.map((entry: any) => entry.operation),
    [
      { id: 'procedural.svg.scatter', version: '1' },
      { id: 'video.remotion.compose', version: '1' },
    ],
  );
  assert.equal((evidence[1] as any).result.observations.inputs.image, generatedAsset.sha256);

  console.log(
    JSON.stringify({
      status: 'media-stack-valid',
      assetTooling: assetToolingRevision,
      workflowRunner: workflowRunnerRevision,
      generatedAsset: generatedAsset.sha256,
      composedVideo: videoAsset.sha256,
      renderCalls,
    }),
  );
} finally {
  await rm(root, { recursive: true, force: true });
}
