// Repairs the Hitem3D-generated avatar model, which turned out to have TWO
// overlapping copies of the character baked into its source mesh (confirmed
// via a vertex-position histogram — dense clusters on both sides of x=0 with
// a sparse gap between them, not a rendering bug in our app).
//
// Approach:
//   1. Union-find over the index buffer to find connected mesh fragments.
//      (The prior mesh-simplify pass fragmented the surface into ~50-56
//      pieces — aggressive triangle reduction broke topology in places —
//      so this does NOT cleanly yield exactly 2 components.)
//   2. Classify each fragment as "left" or "right" by its own centroid X,
//      since the two duplicate copies are spatially separated along X.
//   3. Keep every fragment on the larger side, discard the other — this
//      keeps a complete single copy even though it's built from many small
//      fragments rather than one contiguous piece.
//   4. Drop outlier fragments: a fragment that's small AND spatially far
//      from the largest (presumably main-body) kept fragment gets excluded
//      even if its centroid classified it onto the "keep" side — this
//      catches pieces like a hand whose arm crosses the body's centerline,
//      which centroid-based left/right classification alone misclassifies
//      as belonging to the kept copy when it actually reads as a floating,
//      disconnected part on render (seen on the female model's first pass).
//   5. Recenter the kept geometry on X (Y/Z are untouched — only X was ever
//      used to separate the duplicates, so they were already correct).
//
// Outlier-fragment removal (step 4) is OFF by default — a first attempt at
// always-on filtering cut a real, legitimate fragment out of the male
// model's chin/neck (visible hole on render), not just debris. It's opt-in
// per-run via --outlier-dist so it only applies where it's actually needed
// and verified, rather than silently risking every future run.
//
// Usage: node scripts/repair-avatar-model.mjs [input.glb] [output.glb] [--outlier-dist=0.3] [--outlier-fraction=0.03]
// Defaults: public/models/hitem3d-avatar-optimized.glb -> hitem3d-avatar-split.glb, outlier filter disabled

import { NodeIO } from '@gltf-transform/core';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const modelsDir = path.join(__dirname, '..', 'public', 'models');

const positional = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const flags = Object.fromEntries(
  process.argv
    .slice(2)
    .filter((a) => a.startsWith('--'))
    .map((a) => a.replace(/^--/, '').split('='))
);

const SRC = positional[0] || path.join(modelsDir, 'hitem3d-avatar-optimized.glb');
const OUT = positional[1] || path.join(modelsDir, 'hitem3d-avatar-split.glb');
// Infinity = never triggers, i.e. outlier removal disabled unless requested.
const OUTLIER_DISTANCE = flags['outlier-dist'] !== undefined ? parseFloat(flags['outlier-dist']) : Infinity;
const OUTLIER_MAX_FRACTION =
  flags['outlier-fraction'] !== undefined ? parseFloat(flags['outlier-fraction']) : 0.03;

const io = new NodeIO();
const doc = await io.read(SRC);
const mesh = doc.getRoot().listMeshes()[0];
const prim = mesh.listPrimitives()[0];

const posAcc = prim.getAttribute('POSITION');
const normAcc = prim.getAttribute('NORMAL');
const uvAcc = prim.getAttribute('TEXCOORD_0');
const idxAcc = prim.getIndices();

const positions = posAcc.getArray();
const normals = normAcc.getArray();
const uvs = uvAcc.getArray();
const indices = idxAcc.getArray();
const vertCount = posAcc.getCount();
const triCount = indices.length / 3;

// ---- union-find over vertices sharing a triangle ----
const parent = new Int32Array(vertCount);
for (let i = 0; i < vertCount; i++) parent[i] = i;
function find(x) {
  while (parent[x] !== x) {
    parent[x] = parent[parent[x]];
    x = parent[x];
  }
  return x;
}
function union(a, b) {
  const ra = find(a);
  const rb = find(b);
  if (ra !== rb) parent[ra] = rb;
}
for (let t = 0; t < triCount; t++) {
  union(indices[t * 3], indices[t * 3 + 1]);
  union(indices[t * 3 + 1], indices[t * 3 + 2]);
}

// ---- group vertices by fragment, classify each fragment left/right ----
const groups = new Map();
for (let v = 0; v < vertCount; v++) {
  const r = find(v);
  let g = groups.get(r);
  if (!g) {
    g = { verts: [], sumX: 0, sumY: 0, sumZ: 0 };
    groups.set(r, g);
  }
  g.verts.push(v);
  g.sumX += positions[v * 3];
  g.sumY += positions[v * 3 + 1];
  g.sumZ += positions[v * 3 + 2];
}

let leftVerts = 0;
let rightVerts = 0;
const side = new Map();
for (const [root, g] of groups) {
  const centroidX = g.sumX / g.verts.length;
  const s = centroidX < 0 ? 'L' : 'R';
  side.set(root, s);
  if (s === 'L') leftVerts += g.verts.length;
  else rightVerts += g.verts.length;
}
const keepSide = leftVerts >= rightVerts ? 'L' : 'R';
console.log(
  `fragments: ${groups.size} | left: ${leftVerts}v | right: ${rightVerts}v | keeping: ${keepSide}`
);

// ---- drop small fragments that are spatially isolated from the main body
// (only when --outlier-dist was passed; OUTLIER_DISTANCE defaults to
// Infinity, so this loop finds zero outliers and changes nothing) ----

const keptFragments = [...groups.entries()].filter(([root]) => side.get(root) === keepSide);
const keptVertTotal = keptFragments.reduce((sum, [, g]) => sum + g.verts.length, 0);
const [, mainFragment] = keptFragments.reduce((a, b) =>
  a[1].verts.length >= b[1].verts.length ? a : b
);
const mainCentroid = [
  mainFragment.sumX / mainFragment.verts.length,
  mainFragment.sumY / mainFragment.verts.length,
  mainFragment.sumZ / mainFragment.verts.length,
];

const outlierRoots = new Set();
for (const [root, g] of keptFragments) {
  if (g === mainFragment) continue;
  const centroid = [g.sumX / g.verts.length, g.sumY / g.verts.length, g.sumZ / g.verts.length];
  const dist = Math.hypot(
    centroid[0] - mainCentroid[0],
    centroid[1] - mainCentroid[1],
    centroid[2] - mainCentroid[2]
  );
  const isSmall = g.verts.length / keptVertTotal < OUTLIER_MAX_FRACTION;
  if (dist > OUTLIER_DISTANCE && isSmall) {
    outlierRoots.add(root);
    console.log(
      `  dropping outlier fragment: ${g.verts.length}v, ${dist.toFixed(3)} units from main body`
    );
  }
}

const keepSet = new Set();
for (let v = 0; v < vertCount; v++) {
  const root = find(v);
  if (side.get(root) === keepSide && !outlierRoots.has(root)) keepSet.add(v);
}
console.log(`dropped ${outlierRoots.size} outlier fragment(s)`);

// ---- recenter kept geometry on X ----
let minX = Infinity;
let maxX = -Infinity;
for (const v of keepSet) {
  const x = positions[v * 3];
  if (x < minX) minX = x;
  if (x > maxX) maxX = x;
}
const centerX = (minX + maxX) / 2;

// ---- rebuild vertex/index buffers containing only the kept side ----
const remap = new Map();
let newCount = 0;
for (const v of keepSet) remap.set(v, newCount++);

const newPositions = new Float32Array(newCount * 3);
const newNormals = new Float32Array(newCount * 3);
const newUvs = new Float32Array(newCount * 2);
for (const [oldV, newV] of remap) {
  newPositions[newV * 3] = positions[oldV * 3] - centerX;
  newPositions[newV * 3 + 1] = positions[oldV * 3 + 1];
  newPositions[newV * 3 + 2] = positions[oldV * 3 + 2];
  newNormals.set(normals.subarray(oldV * 3, oldV * 3 + 3), newV * 3);
  newUvs.set(uvs.subarray(oldV * 2, oldV * 2 + 2), newV * 2);
}

const newIndices = [];
for (let t = 0; t < triCount; t++) {
  const a = indices[t * 3];
  const b = indices[t * 3 + 1];
  const c = indices[t * 3 + 2];
  if (keepSet.has(a) && keepSet.has(b) && keepSet.has(c)) {
    newIndices.push(remap.get(a), remap.get(b), remap.get(c));
  }
}
const newIndexArray = newCount > 65535 ? new Uint32Array(newIndices) : new Uint16Array(newIndices);

console.log(
  `kept geometry: ${newCount} vertices, ${newIndices.length / 3} triangles (of ${triCount} original)`
);

posAcc.setArray(newPositions);
normAcc.setArray(newNormals);
uvAcc.setArray(newUvs);
idxAcc.setArray(newIndexArray);

await io.write(OUT, doc);
console.log('WROTE', OUT);
