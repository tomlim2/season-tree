// Growing a tree: a skeleton of branches, low-poly wood around it, and a cloud of leaf cards hung
// where the shape says. Everything here is plain geometry; the shaders move and colour it.
import * as THREE from 'three/webgpu';

export function seeded(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const tmp = new THREE.Vector3();
const tmp2 = new THREE.Vector3();

/* ---------------------------------------------------------------- the skeleton */

// branches as tapered segments; tips are where the leaves will hang
function skeleton(shape, R) {
  const T = shape.trunk;
  const segments = [];
  const tips = [];
  let top = 0;
  const grow = (from, dir, length, radius, depth) => {
    // a branch wanders a little along its length: three sub-segments with small turns
    let p = from.clone();
    let d = dir.clone();
    const n = 3;
    for (let i = 0; i < n; i++) {
      const q = p.clone().addScaledVector(d, length / n);
      const r0 = radius * (1 - (0.3 * i) / n);
      const r1 = radius * (1 - (0.3 * (i + 1)) / n);
      segments.push({ a: p, b: q, r0, r1, depth });
      p = q;
      top = Math.max(top, p.y);
      d = d.clone().add(new THREE.Vector3((R() - 0.5) * T.wobble, (R() - 0.5) * T.wobble * 0.5, (R() - 0.5) * T.wobble)).normalize();
    }
    if (depth >= T.depth) {
      tips.push({ p: p.clone(), dir: d.clone(), radius });
      return;
    }
    const count = depth === 0 ? T.splits : 2 + (R() < 0.45 ? 1 : 0);
    const base = R() * Math.PI * 2;
    for (let i = 0; i < count; i++) {
      const az = base + (i / count) * Math.PI * 2 + (R() - 0.5) * 0.8;
      const spread = T.spread * (0.7 + 0.6 * R());
      // turn away from the parent direction by `spread`, round the parent axis by `az`
      const side = new THREE.Vector3(Math.cos(az), 0, Math.sin(az));
      const nd = d.clone().multiplyScalar(Math.cos(spread)).addScaledVector(side, Math.sin(spread));
      nd.y += T.up * 0.5;
      nd.normalize();
      grow(p, nd, length * T.falloff * (0.85 + 0.3 * R()), radius * 0.62, depth + 1);
    }
  };
  const lean = new THREE.Vector3((R() - 0.5) * 0.16, 1, (R() - 0.5) * 0.16).normalize();
  grow(new THREE.Vector3(0, -0.05, 0), lean, T.length, T.radius, 0);
  // conifers: whorls of short branches off the one trunk, shorter toward the top
  if (T.whorls) {
    const trunkTop = segments[segments.length - 1].b.y;
    for (let w = 0; w < T.whorls; w++) {
      const h = 0.35 + (w / T.whorls) * (trunkTop - 0.6);
      const f = 1 - w / T.whorls;
      const count = 5 + Math.floor(R() * 3);
      const base = R() * Math.PI * 2;
      for (let i = 0; i < count; i++) {
        const az = base + (i / count) * Math.PI * 2 + (R() - 0.5) * 0.5;
        const dir = new THREE.Vector3(Math.cos(az), -0.15 + 0.1 * R(), Math.sin(az)).normalize();
        const len = (0.3 + f * 1.0) * (0.8 + 0.4 * R());
        const a = new THREE.Vector3(0, h, 0);
        const b = a.clone().addScaledVector(dir, len);
        segments.push({ a, b, r0: 0.035 * (0.5 + f), r1: 0.012, depth: 1 });
        tips.push({ p: b, dir, radius: 0.03 });
      }
    }
  }
  return { segments, tips, top };
}

/* ---------------------------------------------------------------- wood */

// low-poly tapered tubes round every segment, merged into one mesh; aH is height for the sway
function woodGeometry(segments) {
  const SIDES = 7;
  const pos = [];
  const nrm = [];
  const hgt = [];
  const idx = [];
  const up = new THREE.Vector3(0, 1, 0);
  for (const s of segments) {
    const dir = tmp.subVectors(s.b, s.a).normalize();
    const side = Math.abs(dir.y) > 0.9 ? new THREE.Vector3(1, 0, 0) : up.clone();
    const u = new THREE.Vector3().crossVectors(dir, side).normalize();
    const v = new THREE.Vector3().crossVectors(u, dir).normalize();
    const start = pos.length / 3;
    // the start is pulled back a little, so joints overlap instead of gaping
    const a = s.a.clone().addScaledVector(dir, -s.r0 * 0.6);
    for (const [c, r] of [
      [a, s.r0],
      [s.b, s.r1],
    ]) {
      for (let i = 0; i < SIDES; i++) {
        const t = (i / SIDES) * Math.PI * 2;
        const n = tmp2.copy(u).multiplyScalar(Math.cos(t)).addScaledVector(v, Math.sin(t));
        pos.push(c.x + n.x * r, c.y + n.y * r, c.z + n.z * r);
        nrm.push(n.x, n.y, n.z);
        hgt.push(c.y);
      }
    }
    for (let i = 0; i < SIDES; i++) {
      const j = (i + 1) % SIDES;
      idx.push(start + i, start + SIDES + i, start + j, start + j, start + SIDES + i, start + SIDES + j);
    }
    // a cap at the tip
    const cap = pos.length / 3;
    pos.push(s.b.x, s.b.y, s.b.z);
    nrm.push(dir.x, dir.y, dir.z);
    hgt.push(s.b.y);
    for (let i = 0; i < SIDES; i++) idx.push(start + SIDES + i, cap, start + SIDES + ((i + 1) % SIDES));
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  g.setAttribute('aH', new THREE.Float32BufferAttribute(hgt, 1));
  g.setIndex(idx);
  return g;
}

/* ---------------------------------------------------------------- leaves */

// each leaf: where it hangs, the centre of its clump (for shading), its turn, its size, and its
// numbers: colour slot, phase, whether and when it falls, brightness
function leafCloud(shape, bones, R) {
  const L = shape.leaves;
  const anchors = []; // { p, c, dir?, flat }
  const sphere = (centre, radius, count, shell = 0.35) => {
    for (let i = 0; i < count; i++) {
      const r = radius * Math.pow(R(), shell);
      const th = R() * Math.PI * 2;
      const ph = Math.acos(2 * R() - 1);
      const p = new THREE.Vector3(centre.x + r * Math.sin(ph) * Math.cos(th), centre.y + r * Math.cos(ph) * 0.85, centre.z + r * Math.sin(ph) * Math.sin(th));
      anchors.push({ p, c: centre });
    }
  };
  if (L.kind === 'clumps') {
    for (const tip of bones.tips) {
      const centre = tip.p.clone().addScaledVector(tip.dir, L.radius * 0.35);
      sphere(centre, L.radius * (0.8 + 0.4 * R()), Math.round(L.perClump * (0.7 + 0.6 * R())));
    }
  } else if (L.kind === 'willow') {
    for (const tip of bones.tips) {
      const centre = tip.p.clone().addScaledVector(tip.dir, L.radius * 0.3);
      sphere(centre, L.radius * (0.8 + 0.4 * R()), L.perClump);
      // strands hanging from the clump, each a chain of small leaves
      for (let s = 0; s < L.strands; s++) {
        const start = centre.clone().add(new THREE.Vector3((R() - 0.5) * 1.4, (R() - 0.5) * 0.4, (R() - 0.5) * 1.4));
        const drift = new THREE.Vector3((R() - 0.5) * 0.3, 0, (R() - 0.5) * 0.3);
        const drop = L.drop * (0.6 + 0.6 * R());
        const n = Math.round(drop / 0.11);
        for (let i = 0; i < n; i++) {
          const t = i / n;
          const p = start.clone().addScaledVector(drift, t).add(new THREE.Vector3(0, -drop * t, 0));
          if (p.y < 0.15) break;
          anchors.push({ p, c: centre, strand: true });
        }
      }
    }
  } else if (L.kind === 'cone') {
    const centre = new THREE.Vector3(0, L.height * 0.45, 0);
    for (let i = 0; i < L.count; i++) {
      const h = Math.pow(R(), 0.8) * L.height;
      // tiers: the needles gather in bands, thinner between them
      if (R() > 0.55 + 0.45 * Math.sin(h * 4.2)) continue;
      const f = 1 - h / L.height; // wide at the bottom
      const r = L.radius * f * (0.55 + 0.45 * Math.pow(R(), 0.4));
      const th = R() * Math.PI * 2;
      anchors.push({ p: new THREE.Vector3(r * Math.cos(th), 0.4 + h, r * Math.sin(th)), c: new THREE.Vector3(0, 0.4 + h, 0), needle: true });
    }
    void centre;
  } else if (L.kind === 'column') {
    for (let i = 0; i < L.count; i++) {
      const y = R();
      const taper = Math.sin(Math.PI * Math.pow(y, 0.9)) * 0.75 + 0.25;
      const r = L.radius * taper * (0.6 + 0.4 * Math.pow(R(), 0.4));
      const th = R() * Math.PI * 2;
      anchors.push({ p: new THREE.Vector3(r * Math.cos(th), 0.3 + y * L.height, r * Math.sin(th)), c: new THREE.Vector3(0, 0.3 + y * L.height, 0) });
    }
  }
  const n = anchors.length;
  const pos = new Float32Array(n * 3);
  const cen = new Float32Array(n * 3);
  const quat = new Float32Array(n * 4);
  const size = new Float32Array(n * 2);
  const data = new Float32Array(n * 4);
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  let lo = 1e9;
  let hi = -1e9;
  for (const a of anchors) {
    lo = Math.min(lo, a.p.y);
    hi = Math.max(hi, a.p.y);
  }
  anchors.forEach((a, i) => {
    pos.set([a.p.x, a.p.y, a.p.z], i * 3);
    cen.set([a.c.x, a.c.y, a.c.z], i * 3);
    if (a.needle) {
      // needles lie along the branch, fanned a little
      const az = Math.atan2(a.p.x, a.p.z);
      e.set((R() - 0.5) * 0.8, az + (R() - 0.5) * 0.6, Math.PI / 2 + (R() - 0.5) * 0.6);
    } else if (a.strand) {
      e.set((R() - 0.5) * 0.4, R() * Math.PI * 2, Math.PI / 2 + (R() - 0.5) * 0.3);
    } else {
      // most leaves face outward from their clump, tilted at random
      const out = tmp.subVectors(a.p, a.c).normalize();
      const look = new THREE.Matrix4().lookAt(new THREE.Vector3(), out.lengthSq() > 0 ? out : new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 1, 0));
      q.setFromRotationMatrix(look);
      const tilt = new THREE.Quaternion().setFromEuler(e.set((R() - 0.5) * 1.6, (R() - 0.5) * 1.6, R() * Math.PI * 2));
      q.multiply(tilt);
      quat.set([q.x, q.y, q.z, q.w], i * 4);
    }
    if (a.needle || a.strand) {
      q.setFromEuler(e);
      quat.set([q.x, q.y, q.z, q.w], i * 4);
    }
    const s = L.size * (0.7 + 0.6 * R());
    size.set([s, s * L.aspect * (0.8 + 0.4 * R())], i * 2);
    // brightness: higher leaves and the sunward side are lighter, a little per-leaf scatter
    const height = (a.p.y - lo) / Math.max(hi - lo, 0.01);
    const sunward = tmp.subVectors(a.p, a.c).normalize().x; // the sun is to the right
    const shade = 0.78 + 0.3 * height + 0.1 * sunward + (R() - 0.5) * 0.12;
    const slot = R() < 0.04 ? 4 : Math.floor(R() * 4); // the fifth slot is the rare accent colour
    const falls = R() < 0.14 ? 1 : 0;
    data.set([slot, R(), falls ? 0.3 + 0.7 * R() : 0, shade], i * 4);
  });
  const geo = new THREE.InstancedBufferGeometry();
  const quad = new THREE.PlaneGeometry(1, 1);
  geo.index = quad.index;
  geo.setAttribute('position', quad.getAttribute('position'));
  geo.setAttribute('uv', quad.getAttribute('uv'));
  geo.setAttribute('aPos', new THREE.InstancedBufferAttribute(pos, 3));
  geo.setAttribute('aCentre', new THREE.InstancedBufferAttribute(cen, 3));
  geo.setAttribute('aQuat', new THREE.InstancedBufferAttribute(quat, 4));
  geo.setAttribute('aSize', new THREE.InstancedBufferAttribute(size, 2));
  geo.setAttribute('aData', new THREE.InstancedBufferAttribute(data, 4));
  geo.instanceCount = n;
  return { geometry: geo, count: n, top: hi };
}

/* ---------------------------------------------------------------- ground */

// a flat island with a scalloped edge, a thin side, and a fringe of grass blades
export function groundGeometry(R) {
  const N = 64;
  const radius = (t) => 2.1 + 0.42 * Math.sin(t * 3 + R() * 0.3) + 0.25 * Math.sin(t * 7 + 1.3) + 0.12 * Math.sin(t * 13 + 2.1);
  const rim = [];
  for (let i = 0; i < N; i++) {
    const t = (i / N) * Math.PI * 2;
    const r = radius(t);
    rim.push([Math.cos(t) * r, Math.sin(t) * r]);
  }
  const pos = [];
  const nrm = [];
  const kind = []; // 0 top, 1 side, 2 grass
  const idx = [];
  // top: a fan
  pos.push(0, 0, 0);
  nrm.push(0, 1, 0);
  kind.push(0);
  for (const [x, z] of rim) {
    pos.push(x, 0, z);
    nrm.push(0, 1, 0);
    kind.push(0);
  }
  for (let i = 0; i < N; i++) idx.push(0, 1 + ((i + 1) % N), 1 + i);
  // side
  const THICK = 0.22;
  const sideStart = pos.length / 3;
  for (let i = 0; i < N; i++) {
    const [x, z] = rim[i];
    const l = Math.hypot(x, z);
    pos.push(x, 0, z, x, -THICK, z);
    nrm.push(x / l, 0, z / l, x / l, 0, z / l);
    kind.push(1, 1);
  }
  for (let i = 0; i < N; i++) {
    const a = sideStart + i * 2;
    const b = sideStart + ((i + 1) % N) * 2;
    idx.push(a, b, a + 1, a + 1, b, b + 1);
  }
  // grass: small blades leaning outward along the rim
  const GRASS = 220;
  for (let i = 0; i < GRASS; i++) {
    const t = R() * Math.PI * 2;
    const r = radius(t) - R() * 0.35;
    const x = Math.cos(t) * r;
    const z = Math.sin(t) * r;
    const h = 0.14 + 0.16 * R();
    const w = 0.05 + 0.04 * R();
    const lean = 0.08 * R();
    const ox = Math.cos(t) * lean;
    const oz = Math.sin(t) * lean;
    const ang = R() * Math.PI;
    const dx = Math.cos(ang) * w;
    const dz = Math.sin(ang) * w;
    const s = pos.length / 3;
    pos.push(x - dx, 0, z - dz, x + dx, 0, z + dz, x + ox, h, z + oz);
    nrm.push(0, 1, 0, 0, 1, 0, 0, 1, 0);
    kind.push(2, 2, 2);
    idx.push(s, s + 1, s + 2);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  g.setAttribute('aKind', new THREE.Float32BufferAttribute(kind, 1));
  g.setIndex(idx);
  return g;
}

/* ---------------------------------------------------------------- a whole tree */

export function buildTree(shape, seed) {
  const R = seeded(seed);
  const bones = skeleton(shape, R);
  const wood = woodGeometry(bones.segments);
  const leaves = leafCloud(shape, bones, R);
  return { wood, leaves: leaves.geometry, leafCount: leaves.count, top: Math.max(bones.top, leaves.top) };
}
