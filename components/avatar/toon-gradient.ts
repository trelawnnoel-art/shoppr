'use client';

import { useMemo } from 'react';
import * as THREE from 'three';

// MeshToonMaterial needs a STEPPED (not smooth) gradient map to produce the
// flat "2-3 shading band" look that actually reads as cel-shaded/cartoon —
// without one, it falls back to a near-smooth default that barely looks
// different from standard Lambert shading, which is why just swapping the
// material type alone isn't enough. NearestFilter is what keeps the bands
// crisp (hard edges) instead of blurring between them.
export function useToonGradientMap() {
  return useMemo(() => {
    const bands = new Uint8Array([70, 150, 255]); // shadow / mid / highlight
    const texture = new THREE.DataTexture(bands, bands.length, 1, THREE.RedFormat);
    texture.needsUpdate = true;
    texture.minFilter = THREE.NearestFilter;
    texture.magFilter = THREE.NearestFilter;
    texture.generateMipmaps = false;
    return texture;
  }, []);
}
