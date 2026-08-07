'use client';

import { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import {
  AvatarCharacter,
  BASE_HEIGHT_CM,
  BASE_WEIGHT_KG,
  getAvatarTotalHeight,
  type AvatarOutfit,
  type AvatarPose,
} from './AvatarCharacter';

// Camera/target framing is derived from the character's ACTUAL computed
// height (which now varies with heightCm/weightKg — see AvatarCharacter's
// Phase 1 sizing) rather than a fixed constant, so the figure stays
// centered and fully in frame across the whole slider range instead of
// only looking right at the 170cm/70kg baseline.
const BASE_TOTAL_HEIGHT = getAvatarTotalHeight(BASE_HEIGHT_CM, BASE_WEIGHT_KG);
const BASE_CAMERA_DISTANCE = 4.4; // tuned at the baseline height, scaled from there

export function AvatarScene({
  heightCm = BASE_HEIGHT_CM,
  weightKg = BASE_WEIGHT_KG,
  outfit,
  pose,
  previewMode = false,
}: {
  heightCm?: number;
  weightKg?: number;
  outfit?: AvatarOutfit;
  pose?: AvatarPose;
  previewMode?: boolean;
}) {
  const totalHeight = useMemo(() => getAvatarTotalHeight(heightCm, weightKg), [heightCm, weightKg]);
  const verticalCenter = totalHeight / 2;
  const cameraDistance = BASE_CAMERA_DISTANCE * (totalHeight / BASE_TOTAL_HEIGHT);

  return (
    <Canvas camera={{ position: [0, verticalCenter * 1.45, cameraDistance], fov: 32 }}>
      <ambientLight intensity={0.7} />
      <directionalLight position={[3, 4, 2]} intensity={1.1} />

      <AvatarCharacter
        heightCm={heightCm}
        weightKg={weightKg}
        outfit={outfit}
        pose={pose}
        previewMode={previewMode}
      />

      <OrbitControls
        enablePan={false}
        enableZoom={false}
        minPolarAngle={Math.PI / 3}
        maxPolarAngle={Math.PI / 1.8}
        target={[0, verticalCenter, 0]}
      />
    </Canvas>
  );
}
