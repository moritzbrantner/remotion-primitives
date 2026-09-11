import { describe, expect, it, vi } from 'vitest';

const frame = vi.hoisted(() => ({ current: 0 }));

vi.mock('remotion', async () => {
  const actual = await vi.importActual<typeof import('remotion')>('remotion');
  return {
    ...actual,
    useCurrentFrame: () => frame.current,
  };
});

import { MeshScene } from './mesh-scene';

const mesh = {
  schemaVersion: 1 as const,
  vertices: [
    [-1, -1, 0] as [number, number, number],
    [1, -1, 0] as [number, number, number],
    [0, 1, 0] as [number, number, number],
  ],
  indices: [0, 1, 2],
};

describe('MeshScene', () => {
  it('is stable for the same frame and mesh', () => {
    frame.current = 42;
    const first = MeshScene({ mesh });
    const second = MeshScene({ mesh });
    expect(first.props.children[0].props.points).toBe(second.props.children[0].props.points);
  });

  it('uses frame time to advance the presentation without changing the source mesh', () => {
    frame.current = 0;
    const start = MeshScene({ mesh, framesPerTurn: 120, tiltDegrees: 0 });
    const startPoints = start.props.children[0].props.points;

    frame.current = 30;
    const quarterTurn = MeshScene({ mesh, framesPerTurn: 120, tiltDegrees: 0 });
    expect(quarterTurn.props.children[0].props.points).not.toBe(startPoints);
    expect(mesh).toEqual({
      schemaVersion: 1,
      vertices: [
        [-1, -1, 0],
        [1, -1, 0],
        [0, 1, 0],
      ],
      indices: [0, 1, 2],
    });
  });
});
