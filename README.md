# remotion-primitives

Reusable, source-owned Remotion primitives and components.

The repository supports two usage modes:

- copy individual components into an application through a shadcn-compatible registry;
- use the repository itself as a development and dogfood showcase for those primitives.

## Principles

- Keep primitives generic and frame-oriented.
- Keep domain concepts such as stories, charts, maps, asset generation, and mesh semantics in their owning repositories.
- Prefer source-copy distribution for components that applications should own and customize.
- Keep Remotion as the runtime foundation rather than wrapping it behind a second animation framework.
- Keep frame output deterministic: no wall-clock time or ambient randomness inside registry source.
- Keep integration contracts runtime-neutral where possible; rendering belongs in renderer components or an injected render adapter.
- Keep subtitle parsing runtime-neutral; React and Remotion belong in the renderer layer.

## Media composition integrations

The repository can now act as the temporal composition layer for the broader media stack without absorbing ownership from neighboring repositories.

### asset-tooling

`media-contracts` mirrors the durable `asset-tooling` `AssetRef` v1 boundary: kind, media type, SHA-256, byte length, and JSON metadata. `AssetImage` consumes a materialized image reference; it never generates, hashes, caches, or verifies the underlying asset itself. Those responsibilities remain with `asset-tooling`.

This supports the compute-once/reuse model: expensive generation or processing produces one content-addressed object, and many Remotion compositions can materialize and present that same object.

### 3D

`MeshScene` consumes the renderer-neutral `three-d-mesh-json-v1` position/index envelope used by `3d-lab`. It adds frame-driven projection and camera presentation only. Mesh topology, transforms, animation semantics, import/export behavior, and other 3D domain decisions remain upstream.

The primitive intentionally does not depend on Three.js or React Three Fiber. A richer consumer can replace the presentation implementation without changing the mesh handoff contract.

### workflow-runner

`asset-tooling-composition` declares `video.remotion.compose@1` as an asset operation. It is designed to be registered through `asset-tooling`'s existing `asset.operation` workflow bridge, so `workflow-runner` remains generic.

The executor uses injected dependencies for three environment-specific actions:

1. resolve content-addressed input objects;
2. render a `RemotionCompositionSpec`;
3. store the resulting video as a new content-addressed asset.

The operation accepts optional image, mesh, and audio inputs today. The output is a reusable `media` `video/*` asset. The renderer itself is deliberately not bundled into this registry package; Node/Chromium/cloud rendering policy belongs at the application or worker boundary.

A consuming integration can register it alongside existing asset operations:

```ts
const executeComposition = createRemotionCompositionOperationExecutor({
  resolveAsset,
  render,
  storeAsset,
});

const registration = {
  operation: REMOTION_COMPOSE_OPERATION,
  execute: executeComposition,
};
```

Pass that registration to `createAssetOperationWorkflowExecutor`, and build a workflow node with `createAssetOperationWorkflowNodeTemplate(REMOTION_COMPOSE_OPERATION, { parameters })` in the owning asset/workflow integration layer.

## Verification

`bun run verify` is the repository contract. It checks TypeScript, unit behavior, deterministic/source ownership rules, the shadcn registry, and the production showcase build.

The motion tests pin frame-boundary behavior for the core primitives, while `scripts/verify-source-contracts.ts` rejects ambient random/time sources and protects subtitle and media-integration ownership seams. Integration tests verify the imported `AssetRef` and mesh envelopes, deterministic mesh presentation, and the compose-operation resolve → render → store boundary.

## Registry dogfood

`bun run dogfood:registry` creates a clean temporary React/TypeScript consumer and installs representative items through the private GitHub registry itself. It exercises standalone items, composed registry dependencies, subtitle dependencies, and the media integration chain rather than copying files directly from the checkout.

The dogfood check verifies the expected consumer paths, reinstalls dependency items at the exact tested commit, fingerprints every installed source file against the repository source, checks that Remotion dependencies were added to the consumer package, and type-checks a composition that imports the copied components and composition operation.

CI supplies the workflow token and pins installs to the PR head SHA or push SHA. For local runs, authenticate with `gh auth login`; the script uses the current checkout commit when `REGISTRY_REF` is not set.

## Showcase

Run `bun run dev:showcase` for a small Remotion Player catalog. The same static build is produced by `bun run build:showcase` and prepared for deployment to GitHub Pages from `main`.

The showcase dogfoods the asset-tooling, renderer-neutral 3D, and workflow composition seams alongside the primitive catalog. It uses fixtures shaped exactly like the imported contracts; it does not claim that Pages performs asset generation or final video rendering.

GitHub Pages requires one repository-level setup step that the workflow token cannot perform: in **Settings → Pages**, set **Source** to **GitHub Actions**. Until that is enabled, the Pages workflow still verifies and uploads the showcase build but reports a notice and skips deployment. After enabling Pages, run the workflow manually once or push to `main`.

The showcase is intentionally a dogfood consumer, not a second component implementation.

## Registry

Registry items are declared in `registry.json` and built with the shadcn CLI. UI items target the portable `@components/remotion/*` placeholder; pure support code targets `@lib/remotion/*`. The CLI resolves those placeholders through the consumer's `components.json` aliases.

Current groups include:

- motion: Fade, Slide, Scale, Blur, Stagger, EnterExit;
- typography and surfaces: BlurReveal, MatrixDecode, AnimatedNumber, Typewriter, SpotlightCard, TerminalSimulator;
- subtitles: SubtitleFormats, Subtitles, SubtitleFile;
- media integration: MediaContracts, AssetImage, MeshScene, AssetToolingComposition.
