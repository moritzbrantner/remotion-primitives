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
- Compute once, animate per frame: only time-dependent values are derived from the frame (see [Performance](#performance)).
- Animate with `transform` and `opacity`; never animate layout (see [Performance](#performance)).

## Performance

"Every frame is a pure function of time" describes what a frame may depend on, not how much work it redoes. Because output depends only on the frame and props, everything that does not depend on the frame can be computed once and reused. These rules apply to all registry source and to compositions built with it, especially interactive videos played in `@remotion/player`, where frame-reading components re-render on every frame.

**Compute once, animate per frame.**

- Split work into frame-independent and frame-dependent parts. Parsing, data aggregation and binning, scales, layout, path geometry, text measurement, and matcher compilation are frame-independent: derive them from props once and cache them (`useMemo` keyed on those props, or module-level constants for static data).
- Per-frame work is limited to cheap arithmetic on precomputed data: interpolation progress, active-cue lookup, opacity, and offsets.
- Keep the frame read as low in the tree as possible. Only components that call `useCurrentFrame()` need to re-render each frame; static subtrees such as backgrounds, chart axes, and labels live in components that do not read the frame and are memoized with `React.memo` when their parent does.
- Pass stable prop identities for frame-independent inputs (hoist constant arrays and objects), so caches keyed on them stay valid.
- Never carry state from one frame to the next. Independent frames are what allow seeking, pausing, and parallel server rendering.

**Animate with `transform` and `opacity`.**

- Motion is expressed through `transform` (translate, scale, rotate) and `opacity`, which the browser composites without re-running layout.
- Never animate layout-affecting properties such as `width`, `height`, `top`, `left`, `margin`, `padding`, `font-size`, or `line-height`. Size and position are fixed at layout time and moved or scaled with `transform`; reveals use `transform` or `clip-path`.
- Paint-only properties (`filter`, gradient `background`) may be animated only when that property is the effect itself, as in `Blur`, `BlurReveal`, and `SpotlightCard`, and only on small areas.
- Large mark counts, such as charts with thousands of points, are drawn from precomputed geometry, with hotspots as a few transparent hit targets on top, instead of re-creating thousands of elements per frame.

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
- subtitles: SubtitleFormats, Subtitles, SubtitleFile;
- interaction: Hotspot and HotspotProvider.

## Interactive videos

`Hotspot` turns any composition element into a click target when the video plays in `@remotion/player`. The host app passes an `onActivate` handler (typically through `inputProps` into a `HotspotProvider`), pauses the Player through its ref, and renders its own detail UI outside the video. `Subtitles` accepts `hotspots` terms that make matching words clickable.

Without a handler, for example in a server-side render, hotspots render as plain inert content, so the same composition still produces a normal deterministic video. Set `clickToPlay={false}` on the Player so clicks on the video do not also toggle playback. Insight content and domain-specific widgets such as charts stay in the consuming app.

Pick the element that matches where the mark lives:

- `Hotspot` renders a `<button>` (inert: `<span>`) for HTML content such as text, cards, and subtitle words.
- `SvgHotspot` renders a `<g>` for marks inside an `<svg>`, such as chart bars, points, and cells. Interactive groups get `role="button"`, are focusable, and activate on Enter and Space.
- `useHotspot` exposes the shared behavior (frame window, handler, selection, activation, keyboard handling) for custom click targets.

> **Keep hotspots out of the bottom of the frame.** With `controls` enabled, the Player lays its controls overlay across the bottom of the video. The overlay's padded gradient intercepts pointer events even while the controls are faded out, so a hotspot underneath it cannot be clicked. In practice this covers roughly the bottom 80 CSS pixels of the rendered Player, independent of the composition size. Position subtitles and chart marks above that band, or build custom controls outside the Player.
