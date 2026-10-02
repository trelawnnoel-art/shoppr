'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type * as THREE from 'three';
import { useToonGradientMap } from './toon-gradient';

// Low-poly, Xbox-avatar-style character built entirely from primitive
// three.js geometries. No external model files.
//
// Built bottom-up in the character's own local space (feet at y=0).
//
// Phase 1 (sizing): every dimension below is derived from `heightCm` and
// `weightKg` props rather than being a fixed literal. Two independent
// scale factors do the work:
//   - heightScale: stretches/shrinks everything measured along the
//     vertical (Y) axis — leg/torso/neck/arm length, shoe height, etc.
//   - weightScale: widens/narrows everything measured across the body
//     (X/Z) — torso/limb/neck radii, stance width, shoe width/depth.
// weightScale is BMI-relative (weight normalized against what's "expected"
// for the given height), not raw weight — otherwise a tall, proportionally
// built person would render as heavier than a short person of the same
// actual weight, which reads wrong. The two axes are independent by
// design: changing height doesn't make the figure look thinner or fatter.
// Head size/face features scale on a third, dampened factor blended from
// both — a literal 1:1 height scale on the head reads as a bobblehead at
// the tall end and a pinhead at the short end.
//
// Phase 3 (articulation): the arms were already pivot groups (fixed at a
// static angle). This extends the same technique to the hips, knees, and
// neck — each is now a real THREE.Group with its own rotation, nested so a
// knee bend happens relative to the thigh's own (possibly rotated) frame,
// exactly like a real joint chain. `pose` sets a static joint pose;
// `previewMode` drives those same joints from useFrame instead, for a live
// "watch it move" preview — see the previewMode block near the bottom.
//
// Cartoon-polish pass (2026-10-02): user feedback was "still doesn't look
// cartoon enough, looks flat/plasticky, needs variety, expression feels
// off" — all four at once. Biggest single lever for the first two
// complaints simultaneously: swapping meshStandardMaterial (realistic PBR)
// for meshToonMaterial (flat cel-shaded bands) — see toon-gradient.ts.
// Realistic shading on simple primitive shapes reads as "cheap 3D model";
// cel shading on the same shapes reads as "intentionally stylized
// character," which is the actual visual language cartoon avatars
// (Bitmoji included) use. Expression got a genuine eye catchlight
// (classic cartoon "alive eyes" trick — a plain unlit white dot, so it
// reads as a sparkle regardless of scene lighting) and a wider smile
// curve. Proportions pushed further past the previous Bitmoji pass.
//
// All the ORIGINAL literals (the ones tuned across ~10 rounds of visual
// feedback) are preserved as the BASE_* values below, valid at the
// baseline height/weight (170cm / 70kg -> heightScale = weightScale = 1),
// so passing no props reproduces the exact previous look (modulo this
// pass's intentional proportion/material changes).

const EYE_COLOR = '#FFFFFF';
const MOUTH_COLOR = '#A9765F'; // muted reddish-brown, close to skin — a hint, not a hole
const NOSE_COLOR = '#DDB88C'; // a touch warmer/deeper than SKIN_COLOR, for definition
const PUPIL_COLOR = '#1C1A17'; // matches the app's "ink" token
const SPARKLE_COLOR = '#FFFFFF';

// Phase 2 (outfits): skin/hair/shirt/pants/shoes are all caller-overridable
// via the `outfit` prop — everything else (eyes, mouth, nose, pupils) stays
// fixed since those aren't "clothing" a store would sell. Shirt color also
// covers the shoulder joints and arm sleeve/bridge pieces, since those read
// as part of the shirt, not bare skin.
export interface AvatarOutfit {
  skinColor?: string;
  hairColor?: string;
  shirtColor?: string;
  pantsColor?: string;
  shoeColor?: string;
}

const DEFAULT_OUTFIT: Required<AvatarOutfit> = {
  skinColor: '#E8C9A0',
  hairColor: '#2E2118',
  shirtColor: '#3454D1', // SHOPPR accent blue — ties the guide to the brand
  pantsColor: '#14141A', // matches the app's "ink" token
  shoeColor: '#6B4630', // lighter/warmer than pantsColor so shoes don't visually merge with the legs
};

// Phase 3 (posing): every joint rotation, all in radians. Arm/hip/knee sign
// conventions follow three.js's right-hand rule around each local axis —
// values were picked by rendering and checking, not derived analytically.
export interface AvatarPose {
  headTiltX?: number; // nod (pitch)
  headTurnY?: number; // shake head (yaw) — "look" left/right
  headTiltZ?: number; // tilt (roll) — ear toward shoulder
  leftArmRotation?: number; // shoulder abduction; default matches the original static ARM_ANGLE
  rightArmRotation?: number;
  leftHipSwing?: number; // thigh forward/back swing
  rightHipSwing?: number;
  leftKneeBend?: number; // shin bend relative to the thigh; 0 = straight leg
  rightKneeBend?: number;
}

const ARM_ANGLE = 0.22;

const DEFAULT_POSE: Required<AvatarPose> = {
  headTiltX: 0,
  headTurnY: 0,
  headTiltZ: 0,
  leftArmRotation: ARM_ANGLE,
  rightArmRotation: ARM_ANGLE,
  leftHipSwing: 0,
  rightHipSwing: 0,
  leftKneeBend: 0,
  rightKneeBend: 0,
};

const BASE_HEIGHT_CM = 170;
const BASE_WEIGHT_KG = 70;
const BASE_HEIGHT_M = BASE_HEIGHT_CM / 100;
const BASE_BMI = BASE_WEIGHT_KG / (BASE_HEIGHT_M * BASE_HEIGHT_M);

const MIN_HEIGHT_CM = 145;
const MAX_HEIGHT_CM = 200;
const MIN_WEIGHT_KG = 40;
const MAX_WEIGHT_KG = 140;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function getAvatarScales(heightCm: number, weightKg: number) {
  const clampedHeightCm = clamp(heightCm, MIN_HEIGHT_CM, MAX_HEIGHT_CM);
  const clampedWeightKg = clamp(weightKg, MIN_WEIGHT_KG, MAX_WEIGHT_KG);
  const heightScale = clamp(clampedHeightCm / BASE_HEIGHT_CM, 0.85, 1.18);

  const heightM = clampedHeightCm / 100;
  const bmi = clampedWeightKg / (heightM * heightM);
  const weightScale = clamp(bmi / BASE_BMI, 0.78, 1.4);

  return { heightScale, weightScale };
}

// Base (heightScale = weightScale = 1) leaf dimensions — every one of these
// traces back to the exact literal from the pre-Phase-1 version of this
// file, just pushed further on the cartoon-polish pass below.
const BASE = {
  // Shoes
  SHOE_WIDTH: 0.2, // weight axis
  SHOE_HEIGHT: 0.1, // height axis
  SHOE_DEPTH: 0.36, // height axis (foot length tracks stature, not build)
  SHOE_CENTER_Z: 0.02, // height axis (depth position)
  SHOE_TOE_WIDTH: 0.13, // weight axis
  SHOE_TOE_HEIGHT: 0.075, // height axis
  SHOE_TOE_DEPTH: 0.13, // height axis
  SHOE_TOE_OVERLAP: 0.03, // height axis
  SHOE_TOE_CENTER_Y_OFFSET: -0.006, // height axis
  SHOE_HEEL_WIDTH: 0.14, // weight axis
  SHOE_HEEL_HEIGHT: 0.09, // height axis
  SHOE_HEEL_DEPTH: 0.09, // height axis
  SHOE_HEEL_OVERLAP: 0.03, // height axis

  // Legs — slightly slimmer than the first Bitmoji pass (0.088/0.068),
  // part of making the body read as simpler/secondary to the head.
  LEG_RADIUS_TOP: 0.078, // weight axis
  LEG_RADIUS_BOTTOM: 0.06, // weight axis
  LEG_HEIGHT: 0.95, // height axis
  LEG_SPACING_X: 0.13, // weight axis (wider stance on a bigger build)
  LEG_SHOE_OVERLAP: 0.05, // height axis

  // Hip connector
  HIP_CONNECTOR_RADIUS_TOP: 0.115, // weight axis
  HIP_CONNECTOR_RADIUS_BOTTOM: 0.08, // weight axis
  HIP_CONNECTOR_HEIGHT: 0.2, // height axis
  HIP_CONNECTOR_Y_DROP: 0.22, // height axis (below HIP_Y)

  // Torso — narrowed from the first Bitmoji pass (0.27/0.12) for more
  // head-vs-body contrast, the main unfinished complaint from that pass.
  TORSO_RADIUS_TOP: 0.235, // weight axis
  TORSO_RADIUS_BOTTOM: 0.105, // weight axis
  TORSO_HEIGHT: 0.68, // height axis
  TORSO_HIP_OVERLAP: 0.14, // height axis

  // Shoulders
  SHOULDER_Y_DROP: 0.06, // height axis (below TORSO_TOP_Y)
  SHOULDER_X_MARGIN: 0.01, // weight axis (added atop TORSO_RADIUS_TOP)
  SHOULDER_JOINT_RADIUS: 0.105, // weight axis

  // Neck
  NECK_RADIUS_TOP: 0.09, // weight axis
  NECK_RADIUS_BOTTOM: 0.105, // weight axis
  NECK_HEIGHT: 0.16, // height axis
  NECK_TORSO_OVERLAP: 0.05, // height axis

  // Head (blended axis — see headScale below). Pushed further past the
  // first Bitmoji pass (0.19 -> 0.3 -> 0.34 here) — "still doesn't look
  // cartoon enough" was explicit feedback, and head-to-body ratio is the
  // single biggest lever for that.
  HEAD_RADIUS: 0.34,
  HEAD_NECK_OVERLAP: 0.05, // height axis

  // Face features — all scale with the head, via headScale. Eyes pushed
  // bigger again, nose stays minimal, mouth arc widened for a clearer
  // default smile (was reading as a flat/neutral line).
  EYE_RADIUS: 0.042,
  EYE_OFFSET_X: 0.1,
  EYE_OFFSET_Y: 0.02,
  PUPIL_FORWARD_OFFSET_RATIO: 0.72, // ratio of EYE_RADIUS, no separate scale needed
  SPARKLE_RADIUS_RATIO: 0.3, // ratio of PUPIL_RADIUS
  EYEBROW_WIDTH: 0.052,
  EYEBROW_HEIGHT: 0.013,
  EYEBROW_DEPTH: 0.016,
  EYEBROW_OFFSET_Y_EXTRA: 0.055, // added atop EYE_OFFSET_Y
  NOSE_RADIUS: 0.013,
  NOSE_OFFSET_Y: -0.01,
  MOUTH_ARC_RADIUS: 0.036,
  MOUTH_ARC_TUBE: 0.006,
  MOUTH_OFFSET_Y: -0.062,
  EAR_RADIUS: 0.05,

  // Arms — slimmer, matching the torso/leg narrowing above.
  ARM_RADIUS: 0.052, // weight axis
  ARM_LENGTH: 0.7, // height axis
  HAND_RADIUS: 0.08, // weight axis
  THUMB_RADIUS: 0.04, // weight axis
  SHOULDER_BRIDGE_RADIUS_TOP: 0.082, // weight axis
  SHOULDER_BRIDGE_RADIUS_BOTTOM: 0.065, // weight axis
  SHOULDER_BRIDGE_HEIGHT: 0.12, // height axis
} as const;

// Angles and shape ratios that don't scale with either axis.
const HAIR_TILT = 0.07;
const EAR_SCALE: [number, number, number] = [0.85, 1, 0.4];
// Widened from 0.55 to 0.68 — the previous arc read as a near-straight
// line (flat/neutral expression complaint); this is visibly a smile curve.
const MOUTH_ARC_ANGLE = Math.PI * 0.68;
const MOUTH_ROTATION_Z = (3 * Math.PI) / 2 - MOUTH_ARC_ANGLE / 2;
const THUMB_OFFSET_Y_RATIO = 0.35; // ratio of HAND_RADIUS
const THUMB_OFFSET_Z_RATIO = 0.85; // ratio of HAND_RADIUS
// Fraction of LEG_HEIGHT from the hip down to the knee — thigh slightly
// longer than shin, which reads more natural than an exact 50/50 split.
const KNEE_RATIO = 0.52;
// Eye catchlight offset, as a fraction of EYE_RADIUS — toward the upper-
// left of each pupil, a fixed "light source" position regardless of the
// scene's actual lighting (this is a cartoon convention, not physically
// simulated).
const SPARKLE_OFFSET_X_RATIO = -0.32;
const SPARKLE_OFFSET_Y_RATIO = 0.32;

function computeDimensions(heightScale: number, weightScale: number) {
  const h = (v: number) => v * heightScale;
  const w = (v: number) => v * weightScale;

  // Head grows/shrinks on a dampened blend of both axes — a 1:1 height
  // scale reads as a bobblehead (tall) or pinhead (short); weight
  // contributes more than height since a fuller build reads mainly as a
  // fuller face, not a taller one.
  const headScaleRaw = 1 + (heightScale - 1) * 0.25 + (weightScale - 1) * 0.35;
  const headScale = clamp(headScaleRaw, 0.85, 1.25);
  const f = (v: number) => v * headScale; // face features track the head

  // ---- Shoes ----
  const SHOE_WIDTH = w(BASE.SHOE_WIDTH);
  const SHOE_HEIGHT = h(BASE.SHOE_HEIGHT);
  const SHOE_DEPTH = h(BASE.SHOE_DEPTH);
  const SHOE_CENTER_Y = SHOE_HEIGHT / 2;
  const SHOE_CENTER_Z = h(BASE.SHOE_CENTER_Z);
  const SHOE_TOP_Y = SHOE_HEIGHT;

  const SHOE_TOE_WIDTH = w(BASE.SHOE_TOE_WIDTH);
  const SHOE_TOE_HEIGHT = h(BASE.SHOE_TOE_HEIGHT);
  const SHOE_TOE_DEPTH = h(BASE.SHOE_TOE_DEPTH);
  const SHOE_TOE_OVERLAP = h(BASE.SHOE_TOE_OVERLAP);
  const SHOE_TOE_CENTER_Y = SHOE_CENTER_Y + h(BASE.SHOE_TOE_CENTER_Y_OFFSET);
  const SHOE_TOE_CENTER_Z = SHOE_CENTER_Z + SHOE_DEPTH / 2 + SHOE_TOE_DEPTH / 2 - SHOE_TOE_OVERLAP;

  const SHOE_HEEL_WIDTH = w(BASE.SHOE_HEEL_WIDTH);
  const SHOE_HEEL_HEIGHT = h(BASE.SHOE_HEEL_HEIGHT);
  const SHOE_HEEL_DEPTH = h(BASE.SHOE_HEEL_DEPTH);
  const SHOE_HEEL_OVERLAP = h(BASE.SHOE_HEEL_OVERLAP);
  const SHOE_HEEL_CENTER_Y = SHOE_CENTER_Y;
  const SHOE_HEEL_CENTER_Z = SHOE_CENTER_Z - SHOE_DEPTH / 2 - SHOE_HEEL_DEPTH / 2 + SHOE_HEEL_OVERLAP;

  // ---- Legs ----
  const LEG_RADIUS_TOP = w(BASE.LEG_RADIUS_TOP);
  const LEG_RADIUS_BOTTOM = w(BASE.LEG_RADIUS_BOTTOM);
  const LEG_HEIGHT = h(BASE.LEG_HEIGHT);
  const LEG_SPACING_X = w(BASE.LEG_SPACING_X);
  const LEG_SHOE_OVERLAP = h(BASE.LEG_SHOE_OVERLAP);
  const LEG_BOTTOM_Y = SHOE_TOP_Y - LEG_SHOE_OVERLAP;
  const HIP_Y = LEG_BOTTOM_Y + LEG_HEIGHT;

  // Knee split — thigh (hip->knee) and shin (knee->ankle), each its own
  // pivot group (see the Leg component below). Radius at the knee is
  // interpolated along the leg's existing top->bottom taper so the thigh
  // and shin segments continue the same silhouette the single-piece leg
  // used to have, just with a bend point in the middle now.
  const THIGH_LENGTH = LEG_HEIGHT * KNEE_RATIO;
  const SHIN_LENGTH = LEG_HEIGHT - THIGH_LENGTH;
  const LEG_RADIUS_KNEE = LEG_RADIUS_TOP + (LEG_RADIUS_BOTTOM - LEG_RADIUS_TOP) * KNEE_RATIO;
  const KNEE_JOINT_RADIUS = LEG_RADIUS_KNEE * 1.05;

  // ---- Hip connector ----
  const HIP_CONNECTOR_RADIUS_TOP = w(BASE.HIP_CONNECTOR_RADIUS_TOP);
  const HIP_CONNECTOR_RADIUS_BOTTOM = w(BASE.HIP_CONNECTOR_RADIUS_BOTTOM);
  const HIP_CONNECTOR_HEIGHT = h(BASE.HIP_CONNECTOR_HEIGHT);
  const HIP_CONNECTOR_CENTER_Y = HIP_Y - h(BASE.HIP_CONNECTOR_Y_DROP);

  // ---- Torso ----
  const TORSO_RADIUS_TOP = w(BASE.TORSO_RADIUS_TOP);
  const TORSO_RADIUS_BOTTOM = w(BASE.TORSO_RADIUS_BOTTOM);
  const TORSO_HEIGHT = h(BASE.TORSO_HEIGHT);
  const TORSO_HIP_OVERLAP = h(BASE.TORSO_HIP_OVERLAP);
  const TORSO_BOTTOM_Y = HIP_Y - TORSO_HIP_OVERLAP;
  const TORSO_CENTER_Y = TORSO_BOTTOM_Y + TORSO_HEIGHT / 2;
  const TORSO_TOP_Y = TORSO_BOTTOM_Y + TORSO_HEIGHT;

  // ---- Shoulders ----
  const SHOULDER_Y = TORSO_TOP_Y - h(BASE.SHOULDER_Y_DROP);
  const SHOULDER_X = TORSO_RADIUS_TOP + w(BASE.SHOULDER_X_MARGIN);
  const SHOULDER_JOINT_RADIUS = w(BASE.SHOULDER_JOINT_RADIUS);

  // ---- Neck ----
  const NECK_RADIUS_TOP = w(BASE.NECK_RADIUS_TOP);
  const NECK_RADIUS_BOTTOM = w(BASE.NECK_RADIUS_BOTTOM);
  const NECK_HEIGHT = h(BASE.NECK_HEIGHT);
  const NECK_TORSO_OVERLAP = h(BASE.NECK_TORSO_OVERLAP);
  const NECK_BOTTOM_Y = TORSO_TOP_Y - NECK_TORSO_OVERLAP;
  const NECK_TOP_Y = NECK_BOTTOM_Y + NECK_HEIGHT;

  // ---- Head and face ----
  const HEAD_RADIUS = f(BASE.HEAD_RADIUS);
  const HEAD_NECK_OVERLAP = h(BASE.HEAD_NECK_OVERLAP);
  const HEAD_CENTER_Y = NECK_TOP_Y + HEAD_RADIUS - HEAD_NECK_OVERLAP;

  const HAIR_RADIUS = HEAD_RADIUS * 1.06;
  const HAIR_CENTER_Y = HEAD_CENTER_Y + HEAD_RADIUS * 0.6;

  const EYE_RADIUS = f(BASE.EYE_RADIUS);
  const EYE_OFFSET_X = f(BASE.EYE_OFFSET_X);
  const EYE_OFFSET_Y = f(BASE.EYE_OFFSET_Y);
  const PUPIL_RADIUS = EYE_RADIUS * 0.5;
  const PUPIL_FORWARD_OFFSET = EYE_RADIUS * BASE.PUPIL_FORWARD_OFFSET_RATIO;
  const SPARKLE_RADIUS = PUPIL_RADIUS * BASE.SPARKLE_RADIUS_RATIO;
  const SPARKLE_OFFSET_X = PUPIL_RADIUS * SPARKLE_OFFSET_X_RATIO;
  const SPARKLE_OFFSET_Y = PUPIL_RADIUS * SPARKLE_OFFSET_Y_RATIO;

  const EYEBROW_WIDTH = f(BASE.EYEBROW_WIDTH);
  const EYEBROW_HEIGHT = f(BASE.EYEBROW_HEIGHT);
  const EYEBROW_DEPTH = f(BASE.EYEBROW_DEPTH);
  const EYEBROW_OFFSET_Y = EYE_OFFSET_Y + f(BASE.EYEBROW_OFFSET_Y_EXTRA);

  const NOSE_RADIUS = f(BASE.NOSE_RADIUS);
  const NOSE_OFFSET_Y = f(BASE.NOSE_OFFSET_Y);
  const NOSE_FORWARD_Z = HEAD_RADIUS * 1.08;

  const MOUTH_ARC_RADIUS = f(BASE.MOUTH_ARC_RADIUS);
  const MOUTH_ARC_TUBE = f(BASE.MOUTH_ARC_TUBE);
  const MOUTH_OFFSET_Y = f(BASE.MOUTH_OFFSET_Y);

  const EAR_RADIUS = f(BASE.EAR_RADIUS);
  const EAR_OFFSET_X = HEAD_RADIUS * 1.0;

  // ---- Arms ----
  const ARM_RADIUS = w(BASE.ARM_RADIUS);
  const ARM_LENGTH = h(BASE.ARM_LENGTH);
  const ARM_CAPSULE_LENGTH = ARM_LENGTH - 2 * ARM_RADIUS;
  const HAND_RADIUS = w(BASE.HAND_RADIUS);
  const THUMB_RADIUS = w(BASE.THUMB_RADIUS);
  const THUMB_OFFSET_Y = HAND_RADIUS * THUMB_OFFSET_Y_RATIO;
  const THUMB_OFFSET_Z = HAND_RADIUS * THUMB_OFFSET_Z_RATIO;

  const SHOULDER_BRIDGE_RADIUS_TOP = w(BASE.SHOULDER_BRIDGE_RADIUS_TOP);
  const SHOULDER_BRIDGE_RADIUS_BOTTOM = w(BASE.SHOULDER_BRIDGE_RADIUS_BOTTOM);
  const SHOULDER_BRIDGE_HEIGHT = h(BASE.SHOULDER_BRIDGE_HEIGHT);

  return {
    SHOE_WIDTH,
    SHOE_HEIGHT,
    SHOE_DEPTH,
    SHOE_CENTER_Y,
    SHOE_CENTER_Z,
    SHOE_TOE_WIDTH,
    SHOE_TOE_HEIGHT,
    SHOE_TOE_DEPTH,
    SHOE_TOE_CENTER_Y,
    SHOE_TOE_CENTER_Z,
    SHOE_HEEL_WIDTH,
    SHOE_HEEL_HEIGHT,
    SHOE_HEEL_DEPTH,
    SHOE_HEEL_CENTER_Y,
    SHOE_HEEL_CENTER_Z,
    LEG_RADIUS_TOP,
    LEG_RADIUS_BOTTOM,
    LEG_RADIUS_KNEE,
    KNEE_JOINT_RADIUS,
    THIGH_LENGTH,
    SHIN_LENGTH,
    LEG_SPACING_X,
    LEG_BOTTOM_Y,
    HIP_Y,
    HIP_CONNECTOR_RADIUS_TOP,
    HIP_CONNECTOR_RADIUS_BOTTOM,
    HIP_CONNECTOR_HEIGHT,
    HIP_CONNECTOR_CENTER_Y,
    TORSO_RADIUS_TOP,
    TORSO_RADIUS_BOTTOM,
    TORSO_HEIGHT,
    TORSO_CENTER_Y,
    SHOULDER_Y,
    SHOULDER_X,
    SHOULDER_JOINT_RADIUS,
    NECK_RADIUS_TOP,
    NECK_RADIUS_BOTTOM,
    NECK_HEIGHT,
    NECK_BOTTOM_Y,
    HEAD_RADIUS,
    HEAD_CENTER_Y,
    HAIR_RADIUS,
    HAIR_CENTER_Y,
    EYE_RADIUS,
    EYE_OFFSET_X,
    EYE_OFFSET_Y,
    PUPIL_RADIUS,
    PUPIL_FORWARD_OFFSET,
    SPARKLE_RADIUS,
    SPARKLE_OFFSET_X,
    SPARKLE_OFFSET_Y,
    EYEBROW_WIDTH,
    EYEBROW_HEIGHT,
    EYEBROW_DEPTH,
    EYEBROW_OFFSET_Y,
    NOSE_RADIUS,
    NOSE_OFFSET_Y,
    NOSE_FORWARD_Z,
    MOUTH_ARC_RADIUS,
    MOUTH_ARC_TUBE,
    MOUTH_OFFSET_Y,
    EAR_RADIUS,
    EAR_OFFSET_X,
    ARM_RADIUS,
    ARM_LENGTH,
    ARM_CAPSULE_LENGTH,
    HAND_RADIUS,
    THUMB_RADIUS,
    THUMB_OFFSET_Y,
    THUMB_OFFSET_Z,
    SHOULDER_BRIDGE_RADIUS_TOP,
    SHOULDER_BRIDGE_RADIUS_BOTTOM,
    SHOULDER_BRIDGE_HEIGHT,
    // Overall figure height (feet at 0 to top of head/hair) — callers use
    // this to frame the camera instead of assuming a fixed constant. The
    // hair is a dome (half-sphere) centered at HAIR_CENTER_Y, so its own
    // top is HAIR_CENTER_Y + HAIR_RADIUS above that, not HAIR_CENTER_Y
    // itself.
    TOTAL_HEIGHT: Math.max(HAIR_CENTER_Y + HAIR_RADIUS, HEAD_CENTER_Y + HEAD_RADIUS),
  };
}

type Dimensions = ReturnType<typeof computeDimensions>;

// One leg: a hip pivot group (thigh + knee joint) containing a nested knee
// pivot group (shin + foot). The foot is nested INSIDE the knee group, not
// positioned in world space, so it stays attached to the ankle through any
// hip/knee rotation instead of the shoe floating away from a bent leg.
function Leg({
  side,
  d,
  pantsColor,
  shoeColor,
  toon,
  hipRef,
  kneeRef,
  hipRotation,
  kneeRotation,
}: {
  side: -1 | 1;
  d: Dimensions;
  pantsColor: string;
  shoeColor: string;
  toon: THREE.Texture;
  hipRef: React.RefObject<THREE.Group>;
  kneeRef: React.RefObject<THREE.Group>;
  hipRotation: [number, number, number];
  kneeRotation: [number, number, number];
}) {
  const x = side * d.LEG_SPACING_X;
  const footY = (absoluteY: number) => absoluteY - d.LEG_BOTTOM_Y;

  return (
    <group ref={hipRef} position={[x, d.HIP_Y, 0]} rotation={hipRotation}>
      {/* Thigh */}
      <mesh position={[0, -d.THIGH_LENGTH / 2, 0]}>
        <cylinderGeometry args={[d.LEG_RADIUS_TOP, d.LEG_RADIUS_KNEE, d.THIGH_LENGTH, 32]} />
        <meshToonMaterial color={pantsColor} gradientMap={toon} />
      </mesh>

      {/* Knee joint */}
      <mesh position={[0, -d.THIGH_LENGTH, 0]}>
        <sphereGeometry args={[d.KNEE_JOINT_RADIUS, 32, 32]} />
        <meshToonMaterial color={pantsColor} gradientMap={toon} />
      </mesh>

      <group ref={kneeRef} position={[0, -d.THIGH_LENGTH, 0]} rotation={kneeRotation}>
        {/* Shin */}
        <mesh position={[0, -d.SHIN_LENGTH / 2, 0]}>
          <cylinderGeometry args={[d.LEG_RADIUS_KNEE, d.LEG_RADIUS_BOTTOM, d.SHIN_LENGTH, 32]} />
          <meshToonMaterial color={pantsColor} gradientMap={toon} />
        </mesh>

        {/* Foot ("shoe") — body box + narrower toe box (front) + narrower
            heel box (back), anchored at the ankle (bottom of the shin) */}
        <group position={[0, -d.SHIN_LENGTH, 0]}>
          <mesh position={[0, footY(d.SHOE_CENTER_Y), d.SHOE_CENTER_Z]}>
            <boxGeometry args={[d.SHOE_WIDTH, d.SHOE_HEIGHT, d.SHOE_DEPTH]} />
            <meshToonMaterial color={shoeColor} gradientMap={toon} />
          </mesh>
          <mesh position={[0, footY(d.SHOE_TOE_CENTER_Y), d.SHOE_TOE_CENTER_Z]}>
            <boxGeometry args={[d.SHOE_TOE_WIDTH, d.SHOE_TOE_HEIGHT, d.SHOE_TOE_DEPTH]} />
            <meshToonMaterial color={shoeColor} gradientMap={toon} />
          </mesh>
          <mesh position={[0, footY(d.SHOE_HEEL_CENTER_Y), d.SHOE_HEEL_CENTER_Z]}>
            <boxGeometry args={[d.SHOE_HEEL_WIDTH, d.SHOE_HEEL_HEIGHT, d.SHOE_HEEL_DEPTH]} />
            <meshToonMaterial color={shoeColor} gradientMap={toon} />
          </mesh>
        </group>
      </group>
    </group>
  );
}

export function AvatarCharacter({
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
  const { heightScale, weightScale } = getAvatarScales(heightCm, weightKg);
  const d = computeDimensions(heightScale, weightScale);
  const colors = { ...DEFAULT_OUTFIT, ...outfit };
  const p = { ...DEFAULT_POSE, ...pose };
  const toon = useToonGradientMap();

  const headRef = useRef<THREE.Group>(null);
  const leftArmRef = useRef<THREE.Group>(null);
  const rightArmRef = useRef<THREE.Group>(null);
  const leftHipRef = useRef<THREE.Group>(null);
  const rightHipRef = useRef<THREE.Group>(null);
  const leftKneeRef = useRef<THREE.Group>(null);
  const rightKneeRef = useRef<THREE.Group>(null);

  // Preview mode: a gentle idle stance (not a walk cycle — the legs pivot
  // but the feet don't lift, so a full gait would look like skating) that
  // demonstrates every joint added this phase. Runs every frame via direct
  // ref mutation (the standard R3F animation pattern — see the male/female
  // Hitem3D model's bob/sway in AvatarModel.tsx) and simply does nothing
  // when previewMode is off, leaving the static `pose` prop (set via JSX
  // below) in effect.
  useFrame((state) => {
    if (!previewMode) return;
    const t = state.clock.getElapsedTime();

    if (headRef.current) {
      headRef.current.rotation.y = Math.sin(t * 0.4) * 0.3;
      headRef.current.rotation.x = Math.sin(t * 0.65) * 0.05;
    }

    const armSway = Math.sin(t * 0.9) * 0.1;
    if (leftArmRef.current) leftArmRef.current.rotation.z = -(p.leftArmRotation + armSway);
    if (rightArmRef.current) rightArmRef.current.rotation.z = p.rightArmRotation + armSway;

    const shift = Math.sin(t * 0.5);
    if (leftHipRef.current) leftHipRef.current.rotation.x = shift * 0.08;
    if (rightHipRef.current) rightHipRef.current.rotation.x = -shift * 0.08;
    if (leftKneeRef.current) leftKneeRef.current.rotation.x = Math.max(0, shift) * 0.15;
    if (rightKneeRef.current) rightKneeRef.current.rotation.x = Math.max(0, -shift) * 0.15;
  });

  return (
    <group>
      {/* Head + neck pivot — everything above the shoulders turns/nods/tilts
          together as one unit, anchored at the base of the neck. */}
      <group ref={headRef} position={[0, d.NECK_BOTTOM_Y, 0]} rotation={[p.headTiltX, p.headTurnY, p.headTiltZ]}>
        {/* Neck */}
        <mesh position={[0, d.NECK_HEIGHT / 2, 0]}>
          <cylinderGeometry args={[d.NECK_RADIUS_TOP, d.NECK_RADIUS_BOTTOM, d.NECK_HEIGHT, 32]} />
          <meshToonMaterial color={colors.skinColor} gradientMap={toon} />
        </mesh>

        {/* Head */}
        <mesh position={[0, d.HEAD_CENTER_Y - d.NECK_BOTTOM_Y, 0]}>
          <sphereGeometry args={[d.HEAD_RADIUS, 32, 32]} />
          <meshToonMaterial color={colors.skinColor} gradientMap={toon} />
        </mesh>

        {/* Hair */}
        <mesh position={[0, d.HAIR_CENTER_Y - d.NECK_BOTTOM_Y, 0]} rotation={[0, 0, HAIR_TILT]}>
          <sphereGeometry args={[d.HAIR_RADIUS, 32, 32, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshToonMaterial color={colors.hairColor} gradientMap={toon} />
        </mesh>

        {/* Eyes */}
        <mesh position={[-d.EYE_OFFSET_X, d.HEAD_CENTER_Y - d.NECK_BOTTOM_Y + d.EYE_OFFSET_Y, d.HEAD_RADIUS * 0.9]}>
          <sphereGeometry args={[d.EYE_RADIUS, 32, 32]} />
          <meshToonMaterial color={EYE_COLOR} gradientMap={toon} />
        </mesh>
        <mesh position={[d.EYE_OFFSET_X, d.HEAD_CENTER_Y - d.NECK_BOTTOM_Y + d.EYE_OFFSET_Y, d.HEAD_RADIUS * 0.9]}>
          <sphereGeometry args={[d.EYE_RADIUS, 32, 32]} />
          <meshToonMaterial color={EYE_COLOR} gradientMap={toon} />
        </mesh>

        {/* Pupils */}
        <mesh
          position={[
            -d.EYE_OFFSET_X,
            d.HEAD_CENTER_Y - d.NECK_BOTTOM_Y + d.EYE_OFFSET_Y,
            d.HEAD_RADIUS * 0.9 + d.PUPIL_FORWARD_OFFSET,
          ]}
        >
          <sphereGeometry args={[d.PUPIL_RADIUS, 32, 32]} />
          <meshToonMaterial color={PUPIL_COLOR} gradientMap={toon} />
        </mesh>
        <mesh
          position={[
            d.EYE_OFFSET_X,
            d.HEAD_CENTER_Y - d.NECK_BOTTOM_Y + d.EYE_OFFSET_Y,
            d.HEAD_RADIUS * 0.9 + d.PUPIL_FORWARD_OFFSET,
          ]}
        >
          <sphereGeometry args={[d.PUPIL_RADIUS, 32, 32]} />
          <meshToonMaterial color={PUPIL_COLOR} gradientMap={toon} />
        </mesh>

        {/* Eye catchlights — classic cartoon "alive eyes" trick. Plain
            unlit material on purpose: a real light-reactive sparkle would
            dim or vanish depending on scene lighting/angle, but a cartoon
            catchlight is supposed to always read as a bright dot regardless
            of how the character is lit. This is what was missing before
            ("dead eyes" feedback) — the pupils had no highlight at all. */}
        <mesh
          position={[
            -d.EYE_OFFSET_X + d.SPARKLE_OFFSET_X,
            d.HEAD_CENTER_Y - d.NECK_BOTTOM_Y + d.EYE_OFFSET_Y + d.SPARKLE_OFFSET_Y,
            d.HEAD_RADIUS * 0.9 + d.PUPIL_FORWARD_OFFSET + d.PUPIL_RADIUS * 0.6,
          ]}
        >
          <sphereGeometry args={[d.SPARKLE_RADIUS, 16, 16]} />
          <meshBasicMaterial color={SPARKLE_COLOR} />
        </mesh>
        <mesh
          position={[
            d.EYE_OFFSET_X + d.SPARKLE_OFFSET_X,
            d.HEAD_CENTER_Y - d.NECK_BOTTOM_Y + d.EYE_OFFSET_Y + d.SPARKLE_OFFSET_Y,
            d.HEAD_RADIUS * 0.9 + d.PUPIL_FORWARD_OFFSET + d.PUPIL_RADIUS * 0.6,
          ]}
        >
          <sphereGeometry args={[d.SPARKLE_RADIUS, 16, 16]} />
          <meshBasicMaterial color={SPARKLE_COLOR} />
        </mesh>

        {/* Eyebrows */}
        <mesh
          position={[
            -d.EYE_OFFSET_X,
            d.HEAD_CENTER_Y - d.NECK_BOTTOM_Y + d.EYEBROW_OFFSET_Y,
            d.HEAD_RADIUS * 0.92,
          ]}
          rotation={[0, 0, 0.12]}
        >
          <boxGeometry args={[d.EYEBROW_WIDTH, d.EYEBROW_HEIGHT, d.EYEBROW_DEPTH]} />
          <meshToonMaterial color={colors.hairColor} gradientMap={toon} />
        </mesh>
        <mesh
          position={[
            d.EYE_OFFSET_X,
            d.HEAD_CENTER_Y - d.NECK_BOTTOM_Y + d.EYEBROW_OFFSET_Y,
            d.HEAD_RADIUS * 0.92,
          ]}
          rotation={[0, 0, -0.12]}
        >
          <boxGeometry args={[d.EYEBROW_WIDTH, d.EYEBROW_HEIGHT, d.EYEBROW_DEPTH]} />
          <meshToonMaterial color={colors.hairColor} gradientMap={toon} />
        </mesh>

        {/* Nose */}
        <mesh position={[0, d.HEAD_CENTER_Y - d.NECK_BOTTOM_Y + d.NOSE_OFFSET_Y, d.NOSE_FORWARD_Z]}>
          <sphereGeometry args={[d.NOSE_RADIUS, 32, 32]} />
          <meshToonMaterial color={NOSE_COLOR} gradientMap={toon} />
        </mesh>

        {/* Mouth */}
        <mesh
          position={[0, d.HEAD_CENTER_Y - d.NECK_BOTTOM_Y + d.MOUTH_OFFSET_Y, d.HEAD_RADIUS * 0.94]}
          rotation={[0, 0, MOUTH_ROTATION_Z]}
        >
          <torusGeometry args={[d.MOUTH_ARC_RADIUS, d.MOUTH_ARC_TUBE, 32, 32, MOUTH_ARC_ANGLE]} />
          <meshToonMaterial color={MOUTH_COLOR} gradientMap={toon} />
        </mesh>

        {/* Ears */}
        <mesh position={[-d.EAR_OFFSET_X, d.HEAD_CENTER_Y - d.NECK_BOTTOM_Y, 0]} scale={EAR_SCALE}>
          <sphereGeometry args={[d.EAR_RADIUS, 32, 32]} />
          <meshToonMaterial color={colors.skinColor} gradientMap={toon} />
        </mesh>
        <mesh position={[d.EAR_OFFSET_X, d.HEAD_CENTER_Y - d.NECK_BOTTOM_Y, 0]} scale={EAR_SCALE}>
          <sphereGeometry args={[d.EAR_RADIUS, 32, 32]} />
          <meshToonMaterial color={colors.skinColor} gradientMap={toon} />
        </mesh>
      </group>

      {/* Torso ("shirt") — tapered, wider at the shoulders than the waist */}
      <mesh position={[0, d.TORSO_CENTER_Y, 0]}>
        <cylinderGeometry args={[d.TORSO_RADIUS_TOP, d.TORSO_RADIUS_BOTTOM, d.TORSO_HEIGHT, 32]} />
        <meshToonMaterial color={colors.shirtColor} gradientMap={toon} />
      </mesh>

      {/* Shoulder joints */}
      <mesh position={[-d.SHOULDER_X, d.SHOULDER_Y, 0]}>
        <sphereGeometry args={[d.SHOULDER_JOINT_RADIUS, 32, 32]} />
        <meshToonMaterial color={colors.shirtColor} gradientMap={toon} />
      </mesh>
      <mesh position={[d.SHOULDER_X, d.SHOULDER_Y, 0]}>
        <sphereGeometry args={[d.SHOULDER_JOINT_RADIUS, 32, 32]} />
        <meshToonMaterial color={colors.shirtColor} gradientMap={toon} />
      </mesh>

      {/* Arms — each a pivot group anchored at the shoulder, limb + hand
          hang below it. The bridge cylinder sits right at the pivot,
          tapering from the joint sphere's radius down to the arm's own —
          that's what fills the capsule's tapering-to-a-point tip with a
          deliberate shape. */}
      <group ref={leftArmRef} position={[-d.SHOULDER_X, d.SHOULDER_Y, 0]} rotation={[0, 0, -p.leftArmRotation]}>
        <mesh position={[0, -d.SHOULDER_BRIDGE_HEIGHT / 2, 0]}>
          <cylinderGeometry
            args={[
              d.SHOULDER_BRIDGE_RADIUS_TOP,
              d.SHOULDER_BRIDGE_RADIUS_BOTTOM,
              d.SHOULDER_BRIDGE_HEIGHT,
              32,
            ]}
          />
          <meshToonMaterial color={colors.shirtColor} gradientMap={toon} />
        </mesh>
        <mesh position={[0, -d.ARM_LENGTH / 2, 0]}>
          <capsuleGeometry args={[d.ARM_RADIUS, d.ARM_CAPSULE_LENGTH, 32, 32]} />
          <meshToonMaterial color={colors.shirtColor} gradientMap={toon} />
        </mesh>
        <mesh position={[0, -d.ARM_LENGTH + d.HAND_RADIUS * 0.5, 0]}>
          <sphereGeometry args={[d.HAND_RADIUS, 32, 32]} />
          <meshToonMaterial color={colors.skinColor} gradientMap={toon} />
        </mesh>
        <mesh
          position={[0, -d.ARM_LENGTH + d.HAND_RADIUS * 0.5 + d.THUMB_OFFSET_Y, d.THUMB_OFFSET_Z]}
        >
          <sphereGeometry args={[d.THUMB_RADIUS, 32, 32]} />
          <meshToonMaterial color={colors.skinColor} gradientMap={toon} />
        </mesh>
      </group>
      <group ref={rightArmRef} position={[d.SHOULDER_X, d.SHOULDER_Y, 0]} rotation={[0, 0, p.rightArmRotation]}>
        <mesh position={[0, -d.SHOULDER_BRIDGE_HEIGHT / 2, 0]}>
          <cylinderGeometry
            args={[
              d.SHOULDER_BRIDGE_RADIUS_TOP,
              d.SHOULDER_BRIDGE_RADIUS_BOTTOM,
              d.SHOULDER_BRIDGE_HEIGHT,
              32,
            ]}
          />
          <meshToonMaterial color={colors.shirtColor} gradientMap={toon} />
        </mesh>
        <mesh position={[0, -d.ARM_LENGTH / 2, 0]}>
          <capsuleGeometry args={[d.ARM_RADIUS, d.ARM_CAPSULE_LENGTH, 32, 32]} />
          <meshToonMaterial color={colors.shirtColor} gradientMap={toon} />
        </mesh>
        <mesh position={[0, -d.ARM_LENGTH + d.HAND_RADIUS * 0.5, 0]}>
          <sphereGeometry args={[d.HAND_RADIUS, 32, 32]} />
          <meshToonMaterial color={colors.skinColor} gradientMap={toon} />
        </mesh>
        <mesh
          position={[0, -d.ARM_LENGTH + d.HAND_RADIUS * 0.5 + d.THUMB_OFFSET_Y, d.THUMB_OFFSET_Z]}
        >
          <sphereGeometry args={[d.THUMB_RADIUS, 32, 32]} />
          <meshToonMaterial color={colors.skinColor} gradientMap={toon} />
        </mesh>
      </group>

      {/* Hip/pelvis connector — tapered cylinder, continuing the torso's
          own taper trajectory rather than interrupting it with a box.
          Stays fixed to the torso/pelvis line (doesn't articulate) since
          both legs pivot independently from the same hip line. */}
      <mesh position={[0, d.HIP_CONNECTOR_CENTER_Y, 0]}>
        <cylinderGeometry
          args={[
            d.HIP_CONNECTOR_RADIUS_TOP,
            d.HIP_CONNECTOR_RADIUS_BOTTOM,
            d.HIP_CONNECTOR_HEIGHT,
            32,
          ]}
        />
        <meshToonMaterial color={colors.pantsColor} gradientMap={toon} />
      </mesh>

      {/* Legs — hip + knee pivot groups (see the Leg component above) */}
      <Leg
        side={-1}
        d={d}
        pantsColor={colors.pantsColor}
        shoeColor={colors.shoeColor}
        toon={toon}
        hipRef={leftHipRef}
        kneeRef={leftKneeRef}
        hipRotation={[p.leftHipSwing, 0, 0]}
        kneeRotation={[p.leftKneeBend, 0, 0]}
      />
      <Leg
        side={1}
        d={d}
        pantsColor={colors.pantsColor}
        shoeColor={colors.shoeColor}
        toon={toon}
        hipRef={rightHipRef}
        kneeRef={rightKneeRef}
        hipRotation={[p.rightHipSwing, 0, 0]}
        kneeRotation={[p.rightKneeBend, 0, 0]}
      />
    </group>
  );
}

// Exposed so AvatarScene can frame the camera correctly at any height/weight
// instead of assuming a fixed figure height.
export function getAvatarTotalHeight(heightCm: number, weightKg: number) {
  const { heightScale, weightScale } = getAvatarScales(heightCm, weightKg);
  return computeDimensions(heightScale, weightScale).TOTAL_HEIGHT;
}

export { BASE_HEIGHT_CM, BASE_WEIGHT_KG, MIN_HEIGHT_CM, MAX_HEIGHT_CM, MIN_WEIGHT_KG, MAX_WEIGHT_KG };
