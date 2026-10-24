// Growing a tree: a skeleton of branches, low-poly wood around it, and a cloud of leaf cards hung
// where the shape says. Everything here is plain geometry; the shaders move and colour it.
import * as THREE from 'three/webgpu';
import { SUN } from './tsl/common.js';

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
  const joints = []; // where a branch of each depth ends: { p, dir, depth }
  let top = 0;
  const grow = (from, dir, length, radius, depth) => {
    // a branch wanders a little along its length: three sub-segments with small turns
    let p = from.clone();
    let d = dir.clone();
    const n = 5; // five short pieces, each turning a little and lifting a little, so a branch curves up instead of kinking
    const taper = depth === 0 ? 0.25 : 0.45;
    for (let i = 0; i < n; i++) {
      const q = p.clone().addScaledVector(d, length / n);
      const r0 = radius * (1 - (taper * i) / n);
      const r1 = radius * (1 - (taper * (i + 1)) / n);
      segments.push({ a: p, b: q, r0, r1, depth });
      p = q;
      top = Math.max(top, p.y);
      d = d.clone().add(new THREE.Vector3((R() - 0.5) * T.wobble * 0.6, (R() - 0.5) * T.wobble * 0.3 + (T.lift ?? 0.05), (R() - 0.5) * T.wobble * 0.6)).normalize();
    }
    joints.push({ p: p.clone(), dir: d.clone(), depth });
    if (depth >= T.depth) {
      tips.push({ p: p.clone(), dir: d.clone(), radius });
      return;
    }
    // the trunk forks into two main limbs, sometimes three (a bush into three or four)
    const count = depth === 0 ? (T.splits >= 3 ? T.splits - 1 + (R() < 0.45 ? 1 : 0) : T.splits) : 2 + (R() < 0.45 ? 1 : 0);
    const base = R() * Math.PI * 2;
    for (let i = 0; i < count; i++) {
      let az;
      let spread = T.spread * (0.7 + 0.6 * R());
      if (depth === 0 && count >= 2) {
        // the trunk forks into a Y seen from the front: one limb to the left, one to the right,
        // any others toward or away from the viewer and a little steeper
        if (i < 2) az = i * Math.PI + (R() - 0.5) * 0.7;
        else {
          az = (R() < 0.5 ? 0.5 : 1.5) * Math.PI + (R() - 0.5) * 0.6;
          spread *= 0.7;
        }
      } else {
        az = base + (i / count) * Math.PI * 2 + (R() - 0.5) * 0.8;
      }
      // turn away from the parent direction by `spread`, round the parent axis by `az`
      const side = new THREE.Vector3(Math.cos(az), 0, Math.sin(az));
      const nd = d.clone().multiplyScalar(Math.cos(spread)).addScaledVector(side, Math.sin(spread));
      nd.y += T.up * 0.5;
      nd.normalize();
      // the main limbs stay thick, like the trunk; twigs thin out faster
      grow(p, nd, length * T.falloff * (0.85 + 0.3 * R()), radius * (depth === 0 ? 0.62 : 0.55), depth + 1);
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
        const len = (0.2 + f * 0.62) * (0.8 + 0.4 * R());
        const a = new THREE.Vector3(0, h, 0);
        const b = a.clone().addScaledVector(dir, len);
        segments.push({ a, b, r0: 0.035 * (0.5 + f), r1: 0.012, depth: 1 });
        tips.push({ p: b, dir, radius: 0.03 });
      }
    }
  }
  // where the trunk ends (the fork), for the shadow it throws on the grass
  const fork = joints.find((j) => j.depth === 0)?.p.y ?? T.length;
  return { segments, tips, joints, top, fork };
}

/* ---------------------------------------------------------------- wood */

// Low-poly wood: six flat faces round every segment, so the light steps from face to face the
// way it does on the reference's trunk, and a flared root collar where the trunk meets the
// ground. Everything is merged into one mesh; aH is height for the sway.
function woodGeometry(segments, R, collar) {
  const SIDES = 6;
  const pos = [];
  const nrm = [];
  const hgt = [];
  const idx = [];
  const up = new THREE.Vector3(0, 1, 0);
  const e1 = new THREE.Vector3();
  const e2 = new THREE.Vector3();
  const fn = new THREE.Vector3();
  // one flat quad with its own four vertices and the face normal, wound to face outward
  const quad = (a, b, c, d, outward) => {
    fn.crossVectors(e1.subVectors(b, a), e2.subVectors(d, a)).normalize();
    if (fn.dot(outward) < 0) fn.negate();
    const s = pos.length / 3;
    for (const p of [a, b, c, d]) {
      pos.push(p.x, p.y, p.z);
      nrm.push(fn.x, fn.y, fn.z);
      hgt.push(p.y);
    }
    // front faces are counter-clockwise: flip the order if the first triangle winds the other way
    const ccw = tmp.crossVectors(e1.subVectors(b, a), e2.subVectors(c, a)).dot(fn) > 0;
    if (ccw) idx.push(s, s + 1, s + 2, s, s + 2, s + 3);
    else idx.push(s, s + 2, s + 1, s, s + 3, s + 2);
  };
  // a frame (u, v) round a direction; the same rule for every segment keeps the faces lined up
  const frame = (dir) => {
    const side = Math.abs(dir.y) > 0.9 ? new THREE.Vector3(1, 0, 0) : up.clone();
    const u = new THREE.Vector3().crossVectors(dir, side).normalize();
    const v = new THREE.Vector3().crossVectors(u, dir).normalize();
    return { u, v };
  };
  // a ring of points round `c`; `bump(theta)` lets the root collar bulge into buttresses
  const ring = (c, u, v, r, bump) => {
    const out = [];
    for (let i = 0; i < SIDES; i++) {
      const t = ((i + 0.5) / SIDES) * Math.PI * 2;
      const rr = r * (bump ? bump(t) : 1);
      out.push(c.clone().addScaledVector(u, Math.cos(t) * rr).addScaledVector(v, Math.sin(t) * rr));
    }
    return out;
  };
  // faces between two rings
  const tube = (ringA, ringB, axisA, axisB) => {
    for (let i = 0; i < SIDES; i++) {
      const j = (i + 1) % SIDES;
      const outward = tmp2.copy(ringA[i]).add(ringA[j]).add(ringB[i]).add(ringB[j]).multiplyScalar(0.25).sub(tmp.copy(axisA).add(axisB).multiplyScalar(0.5));
      quad(ringA[i], ringA[j], ringB[j], ringB[i], outward);
    }
  };
  segments.forEach((s, index) => {
    const dir = tmp.subVectors(s.b, s.a).normalize().clone();
    const { u, v } = frame(dir);
    // the start is pulled back a little, so joints overlap instead of gaping
    const a = s.a.clone().addScaledVector(dir, -s.r0 * 0.6);
    tube(ring(a, u, v, s.r0), ring(s.b, u, v, s.r1), a, s.b);
    // a flat cap at the tip
    const cap = ring(s.b, u, v, s.r1);
    const c = pos.length / 3;
    for (const p of cap) {
      pos.push(p.x, p.y, p.z);
      nrm.push(dir.x, dir.y, dir.z);
      hgt.push(p.y);
    }
    for (let i = 1; i < SIDES - 1; i++) {
      const ccw = e1.subVectors(cap[i], cap[0]).cross(e2.subVectors(cap[i + 1], cap[0])).dot(dir) > 0;
      if (ccw) idx.push(c, c + i, c + i + 1);
      else idx.push(c, c + i + 1, c + i);
    }
    // the root collar: the foot of the trunk flares out into the ground, with three or four
    // buttress ridges, the way the reference's trunks spread where they meet the grass
    if (index === 0 && s.depth === 0) {
      const r = s.r0;
      const bumpLow = collar.bump;
      const bumpMid = (t) => 1 + 0.1 * Math.sin(t * collar.ridges + collar.phase);
      // a trumpet profile: wide and lumpy in the ground, narrowing fast, then easing into the trunk
      const at = (h) => s.a.clone().addScaledVector(dir, h - s.a.y);
      // the top ring matches the trunk's own radius at that height, so there is no ledge
      const heights = [-1.0, 0.5, 1.7, 3.6].map((k) => k * r);
      const trunkAt = (h) => {
        for (const t of segments) if (t.depth === 0 && h >= t.a.y && h <= t.b.y) return t.r0 + (t.r1 - t.r0) * ((h - t.a.y) / Math.max(t.b.y - t.a.y, 1e-6));
        return r * 0.9;
      };
      const rings = [
        ring(at(heights[0]), u, v, r * 2.3, bumpLow),
        ring(at(heights[1]), u, v, r * 1.9, bumpLow),
        ring(at(heights[2]), u, v, r * 1.4, bumpMid),
        ring(at(heights[3]), u, v, trunkAt(heights[3]) * 1.005),
      ];
      const axis = heights.map(at);
      for (let k = 0; k < rings.length - 1; k++) tube(rings[k], rings[k + 1], axis[k], axis[k + 1]);
      // the collar's outline where it crosses the ground, for the tufts of grass round the foot
      collar.groundRing = ring(at(0), u, v, r * 2.03, bumpLow);
    }
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  g.setAttribute('aH', new THREE.Float32BufferAttribute(hgt, 1));
  g.setIndex(idx);
  return g;
}

/* ---------------------------------------------------------------- leaves */

// each leaf: where it hangs, the centre of its clump (for shading), its turn, its size, and its
// numbers: colour slot, phase, whether and when it falls, brightness.
// Also returns `balls`: a few spheres that stand in for the canopy when the grass works out
// where the tree's shadow falls on it.
function leafCloud(shape, bones, R) {
  const L = shape.leaves;
  const anchors = []; // { p, c, dir?, flat }
  const balls = []; // { c, r }
  const sphere = (centre, radius, count, shell = 0.35) => {
    for (let i = 0; i < count; i++) {
      const fluff = R() < 0.08;
      const r = radius * Math.pow(R(), shell) * (fluff ? 1.0 + 0.18 * R() : 1.0);
      const th = R() * Math.PI * 2;
      const ph = Math.acos(2 * R() - 1);
      const p = new THREE.Vector3(centre.x + r * Math.sin(ph) * Math.cos(th), centre.y + r * Math.cos(ph) * 0.85, centre.z + r * Math.sin(ph) * Math.sin(th));
      anchors.push({ p, c: centre, r: radius, fluff });
    }
  };
  // the crown: a handful of cotton-ball lobes set round a centre above the fork of the trunk,
  // each shaded as its own ball, so the canopy reads as lumps and not as one cloud
  const forks = bones.joints.filter((j) => j.depth === 1);
  const crown = new THREE.Vector3();
  for (const j of forks.length ? forks : bones.tips) crown.add(j.p);
  crown.divideScalar(Math.max(forks.length || bones.tips.length, 1));
  crown.x *= 0.5;
  crown.z *= 0.5;
  crown.y += L.radius * (L.kind === 'willow' ? 0.7 : 0.9) * (L.crownLift ?? 1);
  const lobeCentres = [];
  const lobeRadii = [];
  const lobes = L.kind === 'clumps' || L.kind === 'willow' ? (L.lobes ?? 5 + Math.floor(R() * 3)) : 0;
  for (let i = 0; i < lobes; i++) {
    const az = (i / lobes) * Math.PI * 2 + (R() - 0.5) * 0.9;
    const el = (R() - 0.3) * 1.2; // mostly round the sides, a couple on top
    const dir = new THREE.Vector3(Math.cos(el) * Math.cos(az), Math.sin(el) * (L.flat ?? 1), Math.cos(el) * Math.sin(az));
    const r = L.radius * (0.85 + 0.3 * R());
    const centre = crown.clone().addScaledVector(dir, L.radius * (L.lobeSpread ?? 0.8));
    centre.y = Math.max(centre.y, r * 0.9 + 0.2);
    lobeCentres.push(centre);
    lobeRadii.push(r);
    balls.push({ c: centre, r: r * 0.95 });
    const count = Math.round(L.perClump * (0.8 + 0.4 * R()));
    sphere(centre, r, count, 0.3);
    // a smaller lobe grown on its side
    const off = new THREE.Vector3(R() - 0.5, (R() - 0.5) * 0.6, R() - 0.5).normalize().multiplyScalar(r * 0.8);
    sphere(centre.clone().add(off), r * (0.5 + 0.2 * R()), Math.round(count * 0.3), 0.3);
  }
  if (L.kind === 'willow') {
    // strands hanging from the underside of every lobe, each a chain of small leaves
    lobeCentres.forEach((centre, li) => {
      for (let s = 0; s < L.strands; s++) {
        const az = R() * Math.PI * 2;
        const el = -R() * 1.2;
        const start = centre.clone().add(new THREE.Vector3(Math.cos(el) * Math.cos(az), Math.sin(el), Math.cos(el) * Math.sin(az)).multiplyScalar(lobeRadii[li] * 0.9));
        const drift = new THREE.Vector3((R() - 0.5) * 0.3, 0, (R() - 0.5) * 0.3);
        const drop = L.drop * (0.6 + 0.6 * R());
        const n = Math.round(drop / 0.11);
        for (let i = 0; i < n; i++) {
          const t = i / n;
          const p = start.clone().addScaledVector(drift, t).add(new THREE.Vector3(0, -drop * t, 0));
          if (p.y < 0.15) break;
          anchors.push({ p, c: centre, r: lobeRadii[li], strand: true });
        }
      }
    });
  }
  if (L.kind === 'cone') {
    for (let i = 0; i < L.count; i++) {
      const h = Math.pow(R(), 0.8) * L.height;
      // tiers: the needles gather in bands, thinner between them
      if (R() > 0.55 + 0.45 * Math.sin(h * 4.2)) continue;
      const f = 1 - h / L.height; // wide at the bottom
      const r = L.radius * f * (0.6 + 0.5 * Math.pow(R(), 0.4));
      const th = R() * Math.PI * 2;
      anchors.push({ p: new THREE.Vector3(r * Math.cos(th), 0.4 + h, r * Math.sin(th)), c: new THREE.Vector3(0, 0.4 + h, 0), needle: true });
    }
    // a stack of balls stands in for the cone
    for (const f of [0.12, 0.34, 0.56, 0.78]) {
      const h = 0.4 + f * L.height;
      balls.push({ c: new THREE.Vector3(0, h, 0), r: L.radius * (1 - f) * 0.95 });
    }
  } else if (L.kind === 'column') {
    const taper = (y) => Math.sin(Math.PI * Math.pow(y, 0.9)) * 0.75 + 0.25;
    for (let i = 0; i < L.count; i++) {
      const y = R();
      const r = L.radius * taper(y) * (0.6 + 0.4 * Math.pow(R(), 0.4));
      const th = R() * Math.PI * 2;
      anchors.push({ p: new THREE.Vector3(r * Math.cos(th), 0.3 + y * L.height, r * Math.sin(th)), c: new THREE.Vector3(0, 0.3 + y * L.height, 0) });
    }
    for (const y of [0.15, 0.4, 0.62, 0.84]) balls.push({ c: new THREE.Vector3(0, 0.3 + y * L.height, 0), r: L.radius * taper(y) });
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
    const s = L.size * (0.7 + 0.6 * R()) * (a.fluff ? 1.25 : 1.0);
    size.set([s, s * L.aspect * (0.8 + 0.4 * R())], i * 2);
    // light: each lobe is shaded as a ball by the sun (bright on the upper right, the shadow
    // colour on the lower left), darker deep inside the lobe, a touch lighter near the crown
    const height = (a.p.y - lo) / Math.max(hi - lo, 0.01);
    const out = tmp.subVectors(a.p, a.c);
    const depth = Math.min(out.length() / Math.max(a.r || 1, 0.01), 1.2);
    const nn = out.lengthSq() > 1e-6 ? out.normalize() : tmp.set(0, 1, 0);
    if (a.needle || a.strand) nn.y += 0.5;
    const lambert = nn.dot(SUN);
    let lit = 0.12 + 0.88 * Math.max(0, Math.min(1, (lambert + 0.55) / 1.35));
    lit *= 0.55 + 0.45 * Math.min(depth / 0.8, 1);
    // where one lobe pushes into another there is a crevice, and the reference's canopy is
    // darkest in those seams: a leaf inside a neighbouring lobe is pulled toward the shadow
    let crevice = 0;
    for (let k = 0; k < lobeCentres.length; k++) {
      if (lobeCentres[k] === a.c) continue;
      const dd = a.p.distanceTo(lobeCentres[k]) / lobeRadii[k];
      if (dd < 0.95) crevice += 1 - dd / 0.95;
    }
    lit *= 1 - Math.min(crevice, 1) * 0.55;
    lit = Math.max(0, Math.min(1, lit + 0.12 * (height - 0.5)));
    const slot = R() < 0.015 ? 4 : Math.floor(R() * 4); // the fifth slot is the rare accent colour
    const falls = R() < 0.06 ? 1 : 0;
    data.set([slot, R(), falls ? 0.3 + 0.7 * R() : 0, lit], i * 4);
  });
  const geo = new THREE.InstancedBufferGeometry();
  const plane = new THREE.PlaneGeometry(1, 1);
  geo.index = plane.index;
  geo.setAttribute('position', plane.getAttribute('position'));
  geo.setAttribute('uv', plane.getAttribute('uv'));
  geo.setAttribute('aPos', new THREE.InstancedBufferAttribute(pos, 3));
  geo.setAttribute('aCentre', new THREE.InstancedBufferAttribute(cen, 3));
  geo.setAttribute('aQuat', new THREE.InstancedBufferAttribute(quat, 4));
  geo.setAttribute('aSize', new THREE.InstancedBufferAttribute(size, 2));
  geo.setAttribute('aData', new THREE.InstancedBufferAttribute(data, 4));
  geo.instanceCount = n;
  return { geometry: geo, count: n, top: hi, balls };
}

/* ---------------------------------------------------------------- ground */

// A flat island with a scalloped edge and a thin side, covered in a carpet of short grass
// blades: thousands of little triangles, so the island's silhouette is fuzzy all the way round
// and the ground reads as a shaggy mat, as in the reference.
export function groundGeometry(R) {
  const N = 64;
  const DEPTH = 0.78; // the island is a little wider (x) than it is deep (z)
  const radius = (t) => 1.6 + 0.3 * Math.sin(t * 3 + R() * 0.3) + 0.18 * Math.sin(t * 7 + 1.3) + 0.09 * Math.sin(t * 13 + 2.1);
  const rim = [];
  for (let i = 0; i < N; i++) {
    const t = (i / N) * Math.PI * 2;
    const r = radius(t);
    rim.push([Math.cos(t) * r, Math.sin(t) * r * DEPTH]);
  }
  const pos = [];
  const nrm = [];
  const kind = []; // 0 top, 1 side, 2..3 grass (the fraction is the blade's own shade)
  const tip = []; // 1 at the tip of a blade, 0 at its base and everywhere else
  const idx = [];
  // top: a fan
  pos.push(0, 0, 0);
  nrm.push(0, 1, 0);
  kind.push(0);
  tip.push(0);
  for (const [x, z] of rim) {
    pos.push(x, 0, z);
    nrm.push(0, 1, 0);
    kind.push(0);
    tip.push(0);
  }
  for (let i = 0; i < N; i++) idx.push(0, 1 + ((i + 1) % N), 1 + i);
  // side
  const THICK = 0.045;
  const sideStart = pos.length / 3;
  for (let i = 0; i < N; i++) {
    const [x, z] = rim[i];
    const l = Math.hypot(x, z);
    pos.push(x, 0, z, x, -THICK, z);
    nrm.push(x / l, 0, z / l, x / l, 0, z / l);
    kind.push(1, 1);
    tip.push(0, 0);
  }
  for (let i = 0; i < N; i++) {
    const a = sideStart + i * 2;
    const b = sideStart + ((i + 1) % N) * 2;
    idx.push(a, b, a + 1, a + 1, b, b + 1);
  }
  // the carpet: tens of thousands of tiny blades, one population spread evenly over the whole
  // top, out to the rim and a little past it. Toward the edge the blades grow longer, lean
  // outward and finally droop over the side, so the mat ends in fuzz and no ledge shows
  const CARPET = 46000;
  for (let i = 0; i < CARPET; i++) {
    const t = R() * Math.PI * 2;
    const f = Math.sqrt(R()) * 1.03; // 0 at the centre, 1 at the rim, a little beyond
    const edge = smooth01((f - 0.84) / 0.19);
    const r = radius(t) * f;
    const x = Math.cos(t) * r;
    const z = Math.sin(t) * r * DEPTH;
    const h = (0.025 + 0.035 * R()) * (1 + 1.6 * edge);
    const la = R() * Math.PI * 2;
    const lean = 0.02 * R();
    const out = edge * (0.04 + 0.08 * R());
    const droop = edge * (0.05 + 0.05 * R());
    grassBlade(pos, nrm, kind, tip, idx, R, x, z, 0.005 + 0.006 * R(), x + Math.cos(la) * lean + Math.cos(t) * out, h - droop, z + Math.sin(la) * lean + Math.sin(t) * out);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  g.setAttribute('aKind', new THREE.Float32BufferAttribute(kind, 1));
  g.setAttribute('aTip', new THREE.Float32BufferAttribute(tip, 1));
  g.setIndex(idx);
  return g;
}

const smooth01 = (x) => {
  const k = Math.max(0, Math.min(1, x));
  return k * k * (3 - 2 * k);
};

// one blade of grass: a triangle with its base on the ground at (x, z) and its tip at (tx, ty, tz)
function grassBlade(pos, nrm, kind, tip, idx, R, x, z, w, tx, ty, tz) {
  const ang = R() * Math.PI;
  const dx = Math.cos(ang) * w;
  const dz = Math.sin(ang) * w;
  const s = pos.length / 3;
  const shade = 2 + R() * 0.999;
  pos.push(x - dx, 0, z - dz, x + dx, 0, z + dz, tx, ty, tz);
  nrm.push(0, 1, 0, 0, 1, 0, 0, 1, 0);
  kind.push(shade, shade, shade);
  tip.push(0, 0, 1);
  idx.push(s, s + 1, s + 2);
}

/* ---------------------------------------------------------------- tufts at the foot */

// Grass tufts round the foot of the trunk: taller than the carpet and leaning away from the
// trunk, so the root collar sinks into grass instead of meeting the ground along a hard line.
// They start on the collar's own foot ring (buttresses included), so the seam is covered
// wherever the wood actually enters the ground.
function footTufts(segments, collar, R) {
  const s = segments.find((t) => t.depth === 0);
  const pos = [];
  const nrm = [];
  const kind = [];
  const tip = [];
  const idx = [];
  if (s && collar.groundRing) {
    const r = s.r0;
    const k = r / 0.115; // scale with the trunk
    const cx = s.a.x;
    const cz = s.a.z;
    const poly = collar.groundRing;
    // how far from the trunk's axis the collar's outline lies in the direction (dx, dz)
    const outline = (dx, dz) => {
      let best = Infinity;
      for (let i = 0; i < poly.length; i++) {
        const a = poly[i];
        const b = poly[(i + 1) % poly.length];
        const ex = b.x - a.x;
        const ez = b.z - a.z;
        const den = dx * ez - dz * ex;
        if (Math.abs(den) < 1e-9) continue;
        const t = ((a.x - cx) * ez - (a.z - cz) * ex) / den;
        const w = ((a.x - cx) * dz - (a.z - cz) * dx) / den;
        if (t > 0 && w >= 0 && w <= 1) best = Math.min(best, t);
      }
      return best === Infinity ? r * 2 : best;
    };
    const N = Math.round(700 * k);
    for (let i = 0; i < N; i++) {
      const phi = R() * Math.PI * 2;
      const dx = Math.cos(phi);
      const dz = Math.sin(phi);
      const spread = Math.pow(R(), 1.6); // most tufts right against the wood
      const d = outline(dx, dz) * 1.01 + r * 1.6 * spread;
      const x = cx + dx * d;
      const z = cz + dz * d;
      const near = 1 - spread; // 1 against the wood, 0 at the outer edge of the ring
      const h = (0.05 + 0.06 * R()) * (0.45 + 1.0 * near) * k;
      const lean = (0.03 + 0.05 * R()) * k;
      grassBlade(pos, nrm, kind, tip, idx, R, x, z, 0.006 + 0.007 * R(), x + dx * lean, h, z + dz * lean);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  g.setAttribute('aKind', new THREE.Float32BufferAttribute(kind, 1));
  g.setAttribute('aTip', new THREE.Float32BufferAttribute(tip, 1));
  g.setIndex(idx);
  return g;
}

/* ---------------------------------------------------------------- a whole tree */

export function buildTree(shape, seed) {
  const R = seeded(seed);
  const bones = skeleton(shape, R);
  // the root collar's buttresses: three or four ridges, turned at random
  const phase = R() * Math.PI * 2;
  const ridges = 3 + Math.floor(R() * 2);
  const collar = { phase, ridges, bump: (t) => 1 + 0.22 * Math.sin(t * ridges + phase) + 0.06 * Math.sin(t * 2 + 1.7) };
  const wood = woodGeometry(bones.segments, R, collar);
  const tufts = footTufts(bones.segments, collar, R);
  const leaves = leafCloud(shape, bones, R);
  return {
    wood,
    tufts,
    leaves: leaves.geometry,
    leafCount: leaves.count,
    top: Math.max(bones.top, leaves.top),
    balls: leaves.balls,
    trunk: { radius: shape.trunk.radius, fork: bones.fork },
  };
}
