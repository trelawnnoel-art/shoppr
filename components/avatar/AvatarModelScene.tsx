'use client';

import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { AvatarModel } from './AvatarModel';
import { MALE_MODEL_PATH } from './model-paths';

// This model's own coordinate system is unrelated to AvatarCharacter's
// (which is built feet-at-y=0) — it's a single static mesh.
//
// IMPORTANT: this framing is based on `gltf-transform inspect`'s reported
// bbox (the authoritative, transform-aware one — it accounts for any scale
// baked into the glTF node hierarchy), NOT on raw vertex-array min/max
// computed by hand. An earlier version of this file used a hand-computed
// bbox (height 1.47, center -0.11) that turned out to be wrong — the real
// bbox is height ~1.0, centered ~0 — and the render only looked correct by
// coincidence, from empirically nudging the camera distance without
// realizing the underlying numbers were off. Verified via `gltf-transform
// inspect public/models/hitem3d-avatar-split.glb` and the female
// equivalent: both come out to height ~1.0, X/Z center within ~0.03 of 0 —
// close enough that one shared framing works for both.
const MODEL_VERTICAL_CENTER = 0;

export function AvatarModelScene({ modelPath = MALE_MODEL_PATH }: { modelPath?: string }) {
  return (
    <Canvas camera={{ position: [0, 0.1, 2.6], fov: 32 }}>
      <ambientLight intensity={0.7} />
      <directionalLight position={[3, 4, 2]} intensity={1.1} />

      <Suspense fallback={null}>
        <AvatarModel modelPath={modelPath} />
      </Suspense>

      <OrbitControls
        enablePan={false}
        enableZoom={false}
        minPolarAngle={Math.PI / 3}
        maxPolarAngle={Math.PI / 1.8}
        target={[0, MODEL_VERTICAL_CENTER, 0]}
      />
    </Canvas>
  );
}
