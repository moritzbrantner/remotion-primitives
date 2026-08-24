# remotion-primitives

Reusable, source-owned Remotion primitives and components.

The repository is intended to support two usage modes:

- copy individual components into an application through a shadcn-compatible registry;
- use the repository itself as a development and showcase workspace for those primitives.

## Principles

- Keep primitives generic and frame-oriented.
- Keep domain concepts such as stories, charts, or maps in their owning repositories.
- Prefer source-copy distribution for components that applications should own and customize.
- Keep Remotion as the runtime foundation rather than wrapping it behind a second animation framework.

## Registry

Registry items are declared in `registry.json` and built with the shadcn CLI.
