'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import type * as THREE from 'three';
import { MALE_MODEL_PATH, FEMALE_MODEL_PATH } from './model-paths';

const BOB_AMPLITUDE = 0.02;
const BOB_SPEED = 1.2;
const SWAY_AMPLITUDE = 0.06;
const SWAY_SPEED = 0.6;

// The two source files' own "forward" directions don't agree — the female
// source faces a different way by default than the male one (an artifact of
// how each was reconstructed, not something we control). This rotates the
// whole figure to face the camera by default; sway is added on top of it,
// not in place of it.
const FACING_OFFSET_BY_PATH: Record<string, number> = {
  '/models/hitem3d-avatar-female.glb': Math.PI,
};

// Optimized from a 68MB / ~2M-triangle / 4096px-texture AI-generated source
// (Hitem3D) down to ~2.8MB / ~40k triangles / 1024px texture via
// @gltf-transform (weld + simplify) and sharp (texture resize), then repaired
// (see scripts/repair-avatar-model.mjs) after the source turned out to have
// two overlapping copies of the character baked into its mesh. useGLTF
// suspends while fetching, so this must render inside a <Suspense> boundary.
//
// The model has no skeleton/rig (confirmed via gltf-transform inspect — it's
// a single static mesh), so "animation" here is a whole-figure idle bob +
// sway on the wrapping group, not per-bone motion.
export function AvatarModel({ modelPath }: { modelPath: string }) {
  const { scene } = useGLTF(modelPath);
  // useGLTF caches and returns the SAME Object3D for a given URL across every
  // call/mount. Rendering that shared reference directly via <primitive>
  // duplicated the model on screen under React 18 Strict Mode (which
  // double-invokes renders in dev) — cloning gives each mounted instance its
  // own node hierarchy (geometry/materials are still shared, just the graph
  // wrapper), which is the standard fix for this exact issue.
  const cloned = useMemo(() => scene.clone(), [scene]);
  const facingOffset = FACING_OFFSET_BY_PATH[modelPath] ?? 0;

  const groupRef = useRef<THREE.Group>(null);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  useFrame((state) => {
    if (!groupRef.current || reducedMotion) return;
    const t = state.clock.getElapsedTime();
    groupRef.current.position.y = Math.sin(t * BOB_SPEED) * BOB_AMPLITUDE;
    groupRef.current.rotation.y = facingOffset + Math.sin(t * SWAY_SPEED) * SWAY_AMPLITUDE;
  });

  return (
    // rotation set here as the static baseline (correct even if useFrame
    // never runs, e.g. reduced motion) — useFrame recomputes the same
    // facingOffset each frame when animating, so the two stay consistent.
    <group ref={groupRef} rotation={[0, facingOffset, 0]}>
      <primitive object={cloned} />
    </group>
  );
}

useGLTF.preload(MALE_MODEL_PATH);
useGLTF.preload(FEMALE_MODEL_PATH);
