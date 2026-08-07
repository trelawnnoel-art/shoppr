// Exports the SHOPPR avatar character to a static .glb file.
//
// Reconstructs the exact same primitive hierarchy as
// components/avatar/AvatarCharacter.tsx in plain three.js (React Three
// Fiber only runs in a browser, so it can't be used from a Node script),
// then serializes it with GLTFExporter. Every constant below is copied 1:1
// from that component — if the avatar's geometry changes there, re-copy the
// constants here and re-run this script to regenerate the .glb.
//
// Usage: node scripts/export-avatar.mjs [output-path]
// Defaults to public/models/shoppr-avatar.glb

import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// GLTFExporter is written for the browser and calls FileReader#readAsArrayBuffer
// to turn its internal Blob into an ArrayBuffer. Node has a global Blob (with
// its own .arrayBuffer() method) but no FileReader — this polyfills just the
// one method GLTFExporter actually calls.
if (typeof globalThis.FileReader === 'undefined') {
  globalThis.FileReader = class FileReader {
    readAsArrayBuffer(blob) {
      blob
        .arrayBuffer()
        .then((buf) => {
          this.result = buf;
          this.onloadend?.();
        })
        .catch((err) => {
          this.onerror?.(err);
        });
    }
  };
}

// ---- colors ----
const SKIN_COLOR = '#E8C9A0';
const SHIRT_COLOR = '#3454D1';
const PANTS_COLOR = '#14141A';
const SHOE_COLOR = '#6B4630';
const EYE_COLOR = '#F3EAD8';
const HAIR_COLOR = '#2E2118';
const MOUTH_COLOR = '#A9765F';
const NOSE_COLOR = '#DDB88C';
const PUPIL_COLOR = '#1C1A17';

// ---- shoes ----
const SHOE_WIDTH = 0.2;
const SHOE_HEIGHT = 0.1;
const SHOE_DEPTH = 0.36;
const SHOE_CENTER_Y = SHOE_HEIGHT / 2;
const SHOE_CENTER_Z = 0.02;
const SHOE_TOP_Y = SHOE_HEIGHT;

const SHOE_TOE_WIDTH = 0.13;
const SHOE_TOE_HEIGHT = 0.075;
const SHOE_TOE_DEPTH = 0.13;
const SHOE_TOE_OVERLAP = 0.03;
const SHOE_TOE_CENTER_Y = SHOE_CENTER_Y - 0.006;
const SHOE_TOE_CENTER_Z = SHOE_CENTER_Z + SHOE_DEPTH / 2 + SHOE_TOE_DEPTH / 2 - SHOE_TOE_OVERLAP;

const SHOE_HEEL_WIDTH = 0.14;
const SHOE_HEEL_HEIGHT = 0.09;
const SHOE_HEEL_DEPTH = 0.09;
const SHOE_HEEL_OVERLAP = 0.03;
const SHOE_HEEL_CENTER_Y = SHOE_CENTER_Y;
const SHOE_HEEL_CENTER_Z = SHOE_CENTER_Z - SHOE_DEPTH / 2 - SHOE_HEEL_DEPTH / 2 + SHOE_HEEL_OVERLAP;

// ---- legs ----
const LEG_RADIUS_TOP = 0.088;
const LEG_RADIUS_BOTTOM = 0.068;
const LEG_HEIGHT = 0.95;
const LEG_SPACING_X = 0.13;
const LEG_SHOE_OVERLAP = 0.05;
const LEG_BOTTOM_Y = SHOE_TOP_Y - LEG_SHOE_OVERLAP;
const LEG_CENTER_Y = LEG_BOTTOM_Y + LEG_HEIGHT / 2;
const HIP_Y = LEG_BOTTOM_Y + LEG_HEIGHT;

// ---- hip connector ----
const HIP_CONNECTOR_RADIUS_TOP = 0.127;
const HIP_CONNECTOR_RADIUS_BOTTOM = 0.09;
const HIP_CONNECTOR_HEIGHT = 0.2;
const HIP_CONNECTOR_CENTER_Y = HIP_Y - 0.22;

// ---- torso ----
const TORSO_RADIUS_TOP = 0.27;
const TORSO_RADIUS_BOTTOM = 0.12;
const TORSO_HEIGHT = 0.68;
const TORSO_HIP_OVERLAP = 0.14;
const TORSO_BOTTOM_Y = HIP_Y - TORSO_HIP_OVERLAP;
const TORSO_CENTER_Y = TORSO_BOTTOM_Y + TORSO_HEIGHT / 2;
const TORSO_TOP_Y = TORSO_BOTTOM_Y + TORSO_HEIGHT;

// ---- shoulders ----
const SHOULDER_Y = TORSO_TOP_Y - 0.06;
const SHOULDER_X = TORSO_RADIUS_TOP + 0.01;
const SHOULDER_JOINT_RADIUS = 0.12;

// ---- neck ----
const NECK_RADIUS_TOP = 0.1;
const NECK_RADIUS_BOTTOM = 0.12;
const NECK_HEIGHT = 0.16;
const NECK_TORSO_OVERLAP = 0.05;
const NECK_BOTTOM_Y = TORSO_TOP_Y - NECK_TORSO_OVERLAP;
const NECK_CENTER_Y = NECK_BOTTOM_Y + NECK_HEIGHT / 2;
const NECK_TOP_Y = NECK_BOTTOM_Y + NECK_HEIGHT;

// ---- head + face ----
const HEAD_RADIUS = 0.19;
const HEAD_NECK_OVERLAP = 0.05;
const HEAD_CENTER_Y = NECK_TOP_Y + HEAD_RADIUS - HEAD_NECK_OVERLAP;

const HAIR_RADIUS = HEAD_RADIUS * 1.06;
const HAIR_CENTER_Y = HEAD_CENTER_Y + HEAD_RADIUS * 0.6;
const HAIR_TILT = 0.07;

const EYE_RADIUS = 0.022;
const EYE_OFFSET_X = 0.065;
const EYE_OFFSET_Y = 0.014;

const PUPIL_RADIUS = EYE_RADIUS * 0.5;
const PUPIL_FORWARD_OFFSET = EYE_RADIUS * 0.72;

const EYEBROW_WIDTH = 0.039;
const EYEBROW_HEIGHT = 0.011;
const EYEBROW_DEPTH = 0.016;
const EYEBROW_OFFSET_Y = EYE_OFFSET_Y + 0.039;
const EYEBROW_TILT = 0.12;

const NOSE_RADIUS = 0.028;
const NOSE_OFFSET_Y = -0.012;
const NOSE_FORWARD_Z = HEAD_RADIUS * 1.08;

const MOUTH_ARC_RADIUS = 0.025;
const MOUTH_ARC_TUBE = 0.005;
const MOUTH_ARC_ANGLE = Math.PI * 0.55;
const MOUTH_ROTATION_Z = (3 * Math.PI) / 2 - MOUTH_ARC_ANGLE / 2;
const MOUTH_OFFSET_Y = -0.048;

const EAR_RADIUS = 0.047;
const EAR_SCALE = [0.85, 1, 0.4];
const EAR_OFFSET_X = HEAD_RADIUS * 1.0;

// ---- arms ----
const ARM_RADIUS = 0.062;
const ARM_LENGTH = 0.7;
const ARM_CAPSULE_LENGTH = ARM_LENGTH - 2 * ARM_RADIUS;
const ARM_ANGLE = 0.22;
const HAND_RADIUS = 0.088;
const THUMB_RADIUS = 0.045;
const THUMB_OFFSET_Y = HAND_RADIUS * 0.35;
const THUMB_OFFSET_Z = HAND_RADIUS * 0.85;

const SHOULDER_BRIDGE_RADIUS_TOP = 0.095;
const SHOULDER_BRIDGE_RADIUS_BOTTOM = 0.075;
const SHOULDER_BRIDGE_HEIGHT = 0.12;

// ---- build ----
function mat(color, roughness) {
  return new THREE.MeshStandardMaterial({ color, roughness });
}

function mesh(geometry, material, position, rotation) {
  const m = new THREE.Mesh(geometry, material);
  if (position) m.position.set(...position);
  if (rotation) m.rotation.set(...rotation);
  return m;
}

const root = new THREE.Group();
root.name = 'SHOPPR_Avatar';

const skinMat = mat(SKIN_COLOR, 0.8);
const shirtMat = mat(SHIRT_COLOR, 0.7);
const pantsMat = mat(PANTS_COLOR, 0.7);
const shoeMat = mat(SHOE_COLOR, 0.6);
const eyeMat = mat(EYE_COLOR, 0.4);
const hairMat = mat(HAIR_COLOR, 0.85);
const mouthMat = mat(MOUTH_COLOR, 0.6);
const noseMat = mat(NOSE_COLOR, 0.8);
const pupilMat = mat(PUPIL_COLOR, 0.5);

// Head
root.add(mesh(new THREE.SphereGeometry(HEAD_RADIUS, 32, 32), skinMat, [0, HEAD_CENTER_Y, 0]));

// Hair (open hemisphere)
root.add(
  mesh(
    new THREE.SphereGeometry(HAIR_RADIUS, 32, 32, 0, Math.PI * 2, 0, Math.PI / 2),
    hairMat,
    [0, HAIR_CENTER_Y, 0],
    [0, 0, HAIR_TILT]
  )
);

// Eyes
root.add(
  mesh(new THREE.SphereGeometry(EYE_RADIUS, 32, 32), eyeMat, [
    -EYE_OFFSET_X,
    HEAD_CENTER_Y + EYE_OFFSET_Y,
    HEAD_RADIUS * 0.9,
  ])
);
root.add(
  mesh(new THREE.SphereGeometry(EYE_RADIUS, 32, 32), eyeMat, [
    EYE_OFFSET_X,
    HEAD_CENTER_Y + EYE_OFFSET_Y,
    HEAD_RADIUS * 0.9,
  ])
);

// Pupils
root.add(
  mesh(new THREE.SphereGeometry(PUPIL_RADIUS, 32, 32), pupilMat, [
    -EYE_OFFSET_X,
    HEAD_CENTER_Y + EYE_OFFSET_Y,
    HEAD_RADIUS * 0.9 + PUPIL_FORWARD_OFFSET,
  ])
);
root.add(
  mesh(new THREE.SphereGeometry(PUPIL_RADIUS, 32, 32), pupilMat, [
    EYE_OFFSET_X,
    HEAD_CENTER_Y + EYE_OFFSET_Y,
    HEAD_RADIUS * 0.9 + PUPIL_FORWARD_OFFSET,
  ])
);

// Eyebrows
root.add(
  mesh(
    new THREE.BoxGeometry(EYEBROW_WIDTH, EYEBROW_HEIGHT, EYEBROW_DEPTH),
    hairMat,
    [-EYE_OFFSET_X, HEAD_CENTER_Y + EYEBROW_OFFSET_Y, HEAD_RADIUS * 0.92],
    [0, 0, EYEBROW_TILT]
  )
);
root.add(
  mesh(
    new THREE.BoxGeometry(EYEBROW_WIDTH, EYEBROW_HEIGHT, EYEBROW_DEPTH),
    hairMat,
    [EYE_OFFSET_X, HEAD_CENTER_Y + EYEBROW_OFFSET_Y, HEAD_RADIUS * 0.92],
    [0, 0, -EYEBROW_TILT]
  )
);

// Nose
root.add(
  mesh(new THREE.SphereGeometry(NOSE_RADIUS, 32, 32), noseMat, [
    0,
    HEAD_CENTER_Y + NOSE_OFFSET_Y,
    NOSE_FORWARD_Z,
  ])
);

// Mouth
root.add(
  mesh(
    new THREE.TorusGeometry(MOUTH_ARC_RADIUS, MOUTH_ARC_TUBE, 32, 32, MOUTH_ARC_ANGLE),
    mouthMat,
    [0, HEAD_CENTER_Y + MOUTH_OFFSET_Y, HEAD_RADIUS * 0.94],
    [0, 0, MOUTH_ROTATION_Z]
  )
);

// Ears
for (const side of [-1, 1]) {
  const ear = mesh(new THREE.SphereGeometry(EAR_RADIUS, 32, 32), skinMat, [
    side * EAR_OFFSET_X,
    HEAD_CENTER_Y,
    0,
  ]);
  ear.scale.set(...EAR_SCALE);
  root.add(ear);
}

// Neck
root.add(
  mesh(
    new THREE.CylinderGeometry(NECK_RADIUS_TOP, NECK_RADIUS_BOTTOM, NECK_HEIGHT, 32),
    skinMat,
    [0, NECK_CENTER_Y, 0]
  )
);

// Torso
root.add(
  mesh(
    new THREE.CylinderGeometry(TORSO_RADIUS_TOP, TORSO_RADIUS_BOTTOM, TORSO_HEIGHT, 32),
    shirtMat,
    [0, TORSO_CENTER_Y, 0]
  )
);

// Shoulder joints
for (const side of [-1, 1]) {
  root.add(
    mesh(new THREE.SphereGeometry(SHOULDER_JOINT_RADIUS, 32, 32), shirtMat, [
      side * SHOULDER_X,
      SHOULDER_Y,
      0,
    ])
  );
}

// Arms (pivot groups)
for (const side of [-1, 1]) {
  const armGroup = new THREE.Group();
  armGroup.position.set(side * SHOULDER_X, SHOULDER_Y, 0);
  armGroup.rotation.set(0, 0, side * ARM_ANGLE);

  armGroup.add(
    mesh(
      new THREE.CylinderGeometry(
        SHOULDER_BRIDGE_RADIUS_TOP,
        SHOULDER_BRIDGE_RADIUS_BOTTOM,
        SHOULDER_BRIDGE_HEIGHT,
        32
      ),
      shirtMat,
      [0, -SHOULDER_BRIDGE_HEIGHT / 2, 0]
    )
  );
  armGroup.add(
    mesh(new THREE.CapsuleGeometry(ARM_RADIUS, ARM_CAPSULE_LENGTH, 32, 32), shirtMat, [
      0,
      -ARM_LENGTH / 2,
      0,
    ])
  );
  armGroup.add(
    mesh(new THREE.SphereGeometry(HAND_RADIUS, 32, 32), skinMat, [
      0,
      -ARM_LENGTH + HAND_RADIUS * 0.5,
      0,
    ])
  );
  armGroup.add(
    mesh(new THREE.SphereGeometry(THUMB_RADIUS, 32, 32), skinMat, [
      0,
      -ARM_LENGTH + HAND_RADIUS * 0.5 + THUMB_OFFSET_Y,
      THUMB_OFFSET_Z,
    ])
  );

  root.add(armGroup);
}

// Hip connector
root.add(
  mesh(
    new THREE.CylinderGeometry(
      HIP_CONNECTOR_RADIUS_TOP,
      HIP_CONNECTOR_RADIUS_BOTTOM,
      HIP_CONNECTOR_HEIGHT,
      32
    ),
    pantsMat,
    [0, HIP_CONNECTOR_CENTER_Y, 0]
  )
);

// Legs
for (const side of [-1, 1]) {
  root.add(
    mesh(new THREE.CylinderGeometry(LEG_RADIUS_TOP, LEG_RADIUS_BOTTOM, LEG_HEIGHT, 32), pantsMat, [
      side * LEG_SPACING_X,
      LEG_CENTER_Y,
      0,
    ])
  );
}

// Feet (shoe body + toe + heel per foot)
for (const side of [-1, 1]) {
  const x = side * LEG_SPACING_X;
  root.add(
    mesh(new THREE.BoxGeometry(SHOE_WIDTH, SHOE_HEIGHT, SHOE_DEPTH), shoeMat, [
      x,
      SHOE_CENTER_Y,
      SHOE_CENTER_Z,
    ])
  );
  root.add(
    mesh(new THREE.BoxGeometry(SHOE_TOE_WIDTH, SHOE_TOE_HEIGHT, SHOE_TOE_DEPTH), shoeMat, [
      x,
      SHOE_TOE_CENTER_Y,
      SHOE_TOE_CENTER_Z,
    ])
  );
  root.add(
    mesh(new THREE.BoxGeometry(SHOE_HEEL_WIDTH, SHOE_HEEL_HEIGHT, SHOE_HEEL_DEPTH), shoeMat, [
      x,
      SHOE_HEEL_CENTER_Y,
      SHOE_HEEL_CENTER_Z,
    ])
  );
}

// ---- export ----
const exporter = new GLTFExporter();
const defaultOutPath = path.join(__dirname, '..', 'public', 'models', 'shoppr-avatar.glb');
const outPath = process.argv[2] || defaultOutPath;

exporter.parse(
  root,
  async (result) => {
    const buffer = Buffer.from(result);
    await mkdir(path.dirname(outPath), { recursive: true });
    await writeFile(outPath, buffer);
    console.log('EXPORTED', outPath, buffer.length, 'bytes');
  },
  (err) => {
    console.error('EXPORT_FAILED', err);
    process.exit(1);
  },
  { binary: true }
);
