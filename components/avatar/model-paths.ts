// Kept separate from AvatarModel.tsx (which imports @react-three/drei/R3F)
// so these plain string constants can be safely imported from
// DestinationContent.tsx's top-level (server-rendered) imports without
// pulling any browser-only 3D code into the SSR bundle.

export const MALE_MODEL_PATH = '/models/hitem3d-avatar-split.glb';
export const FEMALE_MODEL_PATH = '/models/hitem3d-avatar-female.glb';
