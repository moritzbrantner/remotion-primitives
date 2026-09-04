# remotion-primitives

Reusable, source-owned Remotion primitives and components.

The repository supports two usage modes:

- copy individual components into an application through a shadcn-compatible registry;
- use the repository itself as a development and dogfood showcase for those primitives.

## Principles

- Keep primitives generic and frame-oriented.
- Keep domain concepts such as stories, charts, or maps in their owning repositories.
- Prefer source-copy distribution for components that applications should own and customize.
- Keep Remotion as the runtime foundation rather than wrapping it behind a second animation framework.
- Keep frame output deterministic: no wall-clock time or ambient randomness inside registry source.
- Keep subtitle parsing runtime-neutral; React and Remotion belong in the renderer layer.

## Verification

`bun run verify` is the repository contract. It checks TypeScript, unit behavior, deterministic/source ownership rules, the shadcn registry, and the production showcase build.

The motion tests pin frame-boundary behavior for the core primitives, while `scripts/verify-source-contracts.ts` rejects ambient random/time sources and protects the subtitle parser seam.

## Registry dogfood

`bun run dogfood:registry` creates a clean temporary React/TypeScript consumer and installs representative items through the private GitHub registry itself. It exercises a standalone item, composed registry dependencies, and the subtitle dependency chain rather than copying files directly from the checkout.

The dogfood check verifies the expected consumer paths, reinstalls dependency items at the exact tested commit, fingerprints every installed source file against the repository source, checks that Remotion dependencies were added to the consumer package, and type-checks a composition that imports the copied components.

CI supplies the workflow token and pins installs to the PR head SHA or push SHA. For local runs, authenticate with `gh auth login`; the script uses the current checkout commit when `REGISTRY_REF` is not set.

## Showcase

Run `bun run dev:showcase` for a small Remotion Player catalog. The same static build is produced by `bun run build:showcase` and prepared for deployment to GitHub Pages from `main`.

GitHub Pages requires one repository-level setup step that the workflow token cannot perform: in **Settings → Pages**, set **Source** to **GitHub Actions**. Until that is enabled, the Pages workflow still verifies and uploads the showcase build but reports a notice and skips deployment. After enabling Pages, run the workflow manually once or push to `main`.

The showcase is intentionally a dogfood consumer, not a second component implementation.

## Registry

Registry items are declared in `registry.json` and built with the shadcn CLI. UI items target the portable `@components/remotion/*` placeholder; pure support code targets `@lib/remotion/*`. The CLI resolves those placeholders through the consumer's `components.json` aliases.

Current groups include:

- motion: Fade, Slide, Scale, Blur, Stagger, EnterExit;
- typography and surfaces: BlurReveal, MatrixDecode, AnimatedNumber, Typewriter, SpotlightCard, TerminalSimulator;
- subtitles: SubtitleFormats, Subtitles, SubtitleFile.
