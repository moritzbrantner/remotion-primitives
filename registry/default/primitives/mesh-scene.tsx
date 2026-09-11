'use client';

import type { CSSProperties } from 'react';
import { useMemo } from 'react';
import { useCurrentFrame } from 'remotion';

import {
  normalizeThreeDMeshDocument,
  type ThreeDMeshDocument,
} from '@/lib/remotion/media-contracts';

export type MeshSceneProps = {
  mesh: ThreeDMeshDocument;
  startFrame?: number;
  framesPerTurn?: number;
  tiltDegrees?: number;
  cameraDistance?: number;
  className?: string;
  style?: CSSProperties;
  fillOpacity?: number;
  strokeOpacity?: number;
  strokeWidth?: number;
};

type Vec3 = readonly [number, number, number];
type ProjectedVertex = { x: number; y: number; z: number };

function normalizeGeometry(vertices: readonly Vec3[]): Vec3[] {
  if (vertices.length === 0) return [];
  const mins = [...vertices[0]!] as [number, number, number];
  const maxs = [...vertices[0]!] as [number, number, number];
  for (const vertex of vertices.slice(1)) {
    for (let axis = 0; axis < 3; axis += 1) {
      mins[axis] = Math.min(mins[axis]!, vertex[axis]!);
      maxs[axis] = Math.max(maxs[axis]!, vertex[axis]!);
    }
  }
  const center: Vec3 = [
    (mins[0] + maxs[0]) / 2,
    (mins[1] + maxs[1]) / 2,
    (mins[2] + maxs[2]) / 2,
  ];
  const extent = Math.max(maxs[0] - mins[0], maxs[1] - mins[1], maxs[2] - mins[2], 1e-9);
  const scale = 1.45 / extent;
  return vertices.map(([x, y, z]) => [
    (x - center[0]) * scale,
    (y - center[1]) * scale,
    (z - center[2]) * scale,
  ]);
}

function rotate([x, y, z]: Vec3, yaw: number, pitch: number): Vec3 {
  const cosYaw = Math.cos(yaw);
  const sinYaw = Math.sin(yaw);
  const yawX = x * cosYaw + z * sinYaw;
  const yawZ = -x * sinYaw + z * cosYaw;
  const cosPitch = Math.cos(pitch);
  const sinPitch = Math.sin(pitch);
  return [yawX, y * cosPitch - yawZ * sinPitch, y * sinPitch + yawZ * cosPitch];
}

function project([x, y, z]: Vec3, cameraDistance: number): ProjectedVertex {
  const perspective = cameraDistance / (cameraDistance - z);
  return { x: x * perspective, y: y * perspective, z };
}

export function MeshScene({
  mesh,
  startFrame = 0,
  framesPerTurn = 240,
  tiltDegrees = -18,
  cameraDistance = 3.5,
  className,
  style,
  fillOpacity = 0.16,
  strokeOpacity = 0.82,
  strokeWidth = 0.012,
}: MeshSceneProps) {
  const frame = useCurrentFrame();
  if (!Number.isFinite(framesPerTurn) || framesPerTurn <= 0) {
    throw new Error('MeshScene framesPerTurn must be positive');
  }
  if (!Number.isFinite(cameraDistance) || cameraDistance <= 1) {
    throw new Error('MeshScene cameraDistance must be greater than 1');
  }

  const document = useMemo(() => normalizeThreeDMeshDocument(mesh), [mesh]);
  const normalized = useMemo(() => normalizeGeometry(document.vertices), [document.vertices]);
  const yaw = ((frame - startFrame) / framesPerTurn) * Math.PI * 2;
  const pitch = (tiltDegrees / 180) * Math.PI;
  const vertices = normalized.map((vertex) => project(rotate(vertex, yaw, pitch), cameraDistance));
  const faces = [] as Array<{ index: number; depth: number; points: string }>;

  for (let index = 0; index < document.indices.length; index += 3) {
    const a = vertices[document.indices[index]!]!;
    const b = vertices[document.indices[index + 1]!]!;
    const c = vertices[document.indices[index + 2]!]!;
    faces.push({
      index: index / 3,
      depth: (a.z + b.z + c.z) / 3,
      points: `${a.x},${-a.y} ${b.x},${-b.y} ${c.x},${-c.y}`,
    });
  }
  faces.sort((left, right) => left.depth - right.depth || left.index - right.index);

  return (
    <svg
      viewBox="-1.2 -0.8 2.4 1.6"
      role="img"
      aria-label="Frame-driven three-dimensional mesh"
      className={className}
      style={{ width: '100%', height: '100%', overflow: 'visible', ...style }}
    >
      {faces.map((face) => (
        <polygon
          key={face.index}
          points={face.points}
          fill="currentColor"
          fillOpacity={fillOpacity}
          stroke="currentColor"
          strokeOpacity={strokeOpacity}
          strokeWidth={strokeWidth}
          vectorEffect="non-scaling-stroke"
          strokeLinejoin="round"
        />
      ))}
    </svg>
  );
}
