'use client';

import type { CSSProperties } from 'react';
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

const NORMALIZED_EXTENT = 1.45;
const NORMALIZED_MAX_RADIUS = (Math.sqrt(3) * NORMALIZED_EXTENT) / 2;

function normalizeGeometry(vertices: readonly Vec3[]): Vec3[] {
  if (vertices.length === 0) return [];

  let coordinateScale = 0;
  for (const [x, y, z] of vertices) {
    coordinateScale = Math.max(coordinateScale, Math.abs(x), Math.abs(y), Math.abs(z));
  }
  if (coordinateScale === 0) return vertices.map(() => [0, 0, 0]);

  const scaled = vertices.map(([x, y, z]): Vec3 => [
    x / coordinateScale,
    y / coordinateScale,
    z / coordinateScale,
  ]);
  const mins = [...scaled[0]!] as [number, number, number];
  const maxs = [...scaled[0]!] as [number, number, number];
  for (const vertex of scaled.slice(1)) {
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
  const extent = Math.max(maxs[0] - mins[0], maxs[1] - mins[1], maxs[2] - mins[2]);
  if (extent === 0) return scaled.map(() => [0, 0, 0]);

  return scaled.map(([x, y, z]) => [
    ((x - center[0]) / extent) * NORMALIZED_EXTENT,
    ((y - center[1]) / extent) * NORMALIZED_EXTENT,
    ((z - center[2]) / extent) * NORMALIZED_EXTENT,
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
  if (!Number.isFinite(cameraDistance) || cameraDistance <= NORMALIZED_MAX_RADIUS) {
    throw new Error(
      `MeshScene cameraDistance must be greater than ${NORMALIZED_MAX_RADIUS.toFixed(3)}`,
    );
  }

  const document = normalizeThreeDMeshDocument(mesh);
  const normalized = normalizeGeometry(document.vertices);
  const elapsedFrames = Math.max(0, frame - startFrame);
  const yaw = (elapsedFrames / framesPerTurn) * Math.PI * 2;
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
          strokeLinejoin="round"
        />
      ))}
    </svg>
  );
}
