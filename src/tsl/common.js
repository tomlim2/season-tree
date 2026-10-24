// What every material of the tree shares: the wind, the season's colours and the wipe between
// two seasons, the light, and a few quaternion helpers.
import * as THREE from 'three/webgpu';
import { uniform, float, vec3, vec4, cross, select, smoothstep, mix, sin, screenUV, int } from 'three/tsl';

export const SUN = new THREE.Vector3(1, 0.72, 0.3).normalize(); // toward the sun: on the right, a third of the way up

// a set of colour uniforms for one season; two sets are kept, the old and the new, and the wipe
// slides from one to the other across the screen
function seasonUniforms() {
  return {
    leaves: Array.from({ length: 5 }, () => uniform(new THREE.Color())),
    leafShade: uniform(new THREE.Color()),
    leafLight: uniform(new THREE.Color()),
    wood: [uniform(new THREE.Color()), uniform(new THREE.Color())],
    ground: [uniform(new THREE.Color()), uniform(new THREE.Color())],
    shadow: uniform(new THREE.Color()),
  };
}

export function createUniforms() {
  return {
    time: uniform(0),
    wind: uniform(0.6),
    grow: uniform(10), // seconds since the tree was planted
    top: uniform(4), // how tall the tree is, for the bend
    sun: uniform(SUN.clone()),
    wipe: uniform(1), // 0 start .. 1 done
    old: seasonUniforms(),
    now: seasonUniforms(),
  };
}

// copies a theme into a set of season uniforms
export function setSeason(set, theme) {
  const cols = [...theme.leaves, theme.accent];
  cols.forEach((hex, i) => set.leaves[i].value.set(hex));
  set.leafShade.value.set(theme.leafShade);
  set.leafLight.value.set(theme.leafLight);
  set.wood[0].value.set(theme.wood[0]);
  set.wood[1].value.set(theme.wood[1]);
  set.ground[0].value.set(theme.ground[0]);
  set.ground[1].value.set(theme.ground[1]);
  set.shadow.value.set(theme.shadow);
}

// the wipe runs from the top right corner to the bottom left; `v` is 0 at the top right, 2 at the
// bottom left of the screen, and the front sits at wipe * 2.3 - 0.15
export const WIPE_SPAN = 2.3;
export const WIPE_START = -0.15;
export function wipeMix(u) {
  const v = screenUV.y.add(screenUV.x.oneMinus());
  const front = u.wipe.mul(WIPE_SPAN).add(WIPE_START);
  return smoothstep(front.sub(0.04), front.add(0.04), v); // 1 where the old season still shows
}

// one colour slot out of five
export const pick = (slot, cols) => {
  const i = int(slot);
  return select(i.equal(int(0)), cols[0], select(i.equal(int(1)), cols[1], select(i.equal(int(2)), cols[2], select(i.equal(int(3)), cols[3], cols[4]))));
};

// a colour of the current season, old or new depending on where the wipe is
export const seasonal = (u, take) => mix(take(u.now), take(u.old), wipeMix(u));

// how far a branch at height h is pushed by the wind: more toward the top, swaying
export const bendAt = (u, h, phase) => {
  const f = h.div(u.top).clamp(0.0, 1.0);
  const sway = sin(u.time.mul(0.8).add(h.mul(0.5)).add(phase)).mul(0.5).add(0.5);
  return f.mul(f).mul(u.wind).mul(sway.mul(0.6).add(0.4)).mul(0.28);
};

// rotate a vector by a quaternion
export const qRotate = (q, v) => {
  const t = cross(q.xyz, v).mul(2.0);
  return v.add(t.mul(q.w)).add(cross(q.xyz, t));
};
export const qMul = (a, b) => vec4(a.w.mul(b.x).add(a.x.mul(b.w)).add(a.y.mul(b.z)).sub(a.z.mul(b.y)), a.w.mul(b.y).sub(a.x.mul(b.z)).add(a.y.mul(b.w)).add(a.z.mul(b.x)), a.w.mul(b.z).add(a.x.mul(b.y)).sub(a.y.mul(b.x)).add(a.z.mul(b.w)), a.w.mul(b.w).sub(a.x.mul(b.x)).sub(a.y.mul(b.y)).sub(a.z.mul(b.z)));
// a quaternion turning by `angle` about the unit axis
export const qAxis = (axis, angle) => vec4(axis.mul(sin(angle.mul(0.5))), angle.mul(0.5).cos());

// a point on the tree, projected along the sunlight onto the ground
export const toGround = (u, p) => {
  const l = u.sun.negate(); // the light travels away from the sun
  const q = p.sub(l.mul(p.y.div(l.y)));
  return vec3(q.x, 0.012, q.z);
};
