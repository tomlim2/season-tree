// The leaves: thousands of small cards. The vertex stage hangs each one on its branch, sways it
// in the wind, and for the few that are marked to fall, flies it off to the left, lays it on the
// ground, lets it fade and grows it back. The fragment stage paints a flat seasonal colour and
// cuts the card into an oval.
import * as THREE from 'three/webgpu';
import { Fn, If, Discard, attribute, positionGeometry, uv, float, vec3, vec4, length, mix, sin, cos, fract, smoothstep, max } from 'three/tsl';
import { seasonal, pick, bendAt, qRotate, qMul, qAxis, toGround } from './common.js';

// where a leaf is right now, how big, and how it is turned: shared by the leaves and their shadows
const leafPlacement = (u) =>
  Fn(() => {
  const anchor = attribute('aPos', 'vec3');
  const q = attribute('aQuat', 'vec4');
  const size = attribute('aSize', 'vec2');
  const data = attribute('aData', 'vec4'); // colour slot, phase, fall (0 = never), shade
  const phase = data.y;
  const fall = data.z;
  const h = anchor.y;
  // the branch bends in the wind and the leaf flutters on it
  const bend = bendAt(u, h, phase.mul(0.6));
  const flutter = sin(u.time.mul(2.4).add(phase.mul(6.2832)).add(anchor.x.mul(1.3))).mul(u.wind.add(0.3)).mul(0.03);
  const pos = anchor.add(vec3(bend.negate().add(flutter), flutter.mul(0.5), bend.mul(0.2))).toVar();
  const rot = vec4(q).toVar();
  const scale = float(1.0).toVar();
  // the fall: a cycle of its own period, mostly spent on the tree
  If(fall.greaterThan(0.0), () => {
    const period = fall.mul(10.0).add(14.0);
    const c = fract(u.time.div(period).add(phase)).toVar();
    const land = vec3(anchor.x.sub(mix(3.0, 7.5, fall)).sub(phase.mul(1.5)), 0.03, anchor.z.add(sin(phase.mul(37.0)).mul(1.4))).toVar();
    const flat = qMul(qAxis(vec3(0.0, 1.0, 0.0), phase.mul(6.2832)), vec4(-0.7071, 0.0, 0.0, 0.7071));
    If(c.greaterThan(0.62).and(c.lessThan(0.8)), () => {
      // flying: a long low arc to the left, fluttering and tumbling
      const k = c.sub(0.62).div(0.18);
      const ease = smoothstep(0.0, 1.0, k);
      const arc = sin(k.mul(3.1416)).mul(0.5);
      pos.assign(mix(pos, land, ease).add(vec3(sin(k.mul(17.0).add(phase.mul(6.0))).mul(0.18), arc.add(sin(k.mul(23.0)).mul(0.07)), cos(k.mul(13.0).add(phase)).mul(0.14))));
      const spin = qAxis(vec3(0.6, 0.7, 0.4).normalize(), k.mul(9.0).add(phase));
      rot.assign(qMul(mix(rot, flat, ease), spin));
    })
      .ElseIf(c.greaterThanEqual(0.8).and(c.lessThan(0.92)), () => {
        // lying on the ground, then fading away
        pos.assign(land);
        rot.assign(flat);
        scale.assign(smoothstep(0.92, 0.86, c));
      })
      .ElseIf(c.greaterThanEqual(0.92), () => {
        // growing back in its place
        scale.assign(smoothstep(0.92, 1.0, c));
      });
  });
  // a newly planted tree leafs out from the ground up
  scale.mulAssign(smoothstep(0.0, 0.6, u.grow.sub(h.mul(0.14)).sub(phase.mul(0.35))));
  const local = vec3(positionGeometry.xy.mul(size).mul(scale), 0.0);
  return pos.add(qRotate(rot, local));
  })();

const oval = () => {
  If(length(uv().sub(0.5)).greaterThan(0.5), () => {
    Discard();
  });
};

export function leafMaterial(u) {
  const m = new THREE.NodeMaterial();
  m.side = THREE.DoubleSide;
  m.positionNode = leafPlacement(u);
  m.fragmentNode = Fn(() => {
    oval();
    const data = attribute('aData', 'vec4'); // colour slot, phase, fall, light (0 shadow .. 1 lit)
    const lit = data.w;
    const col = seasonal(u, (s) => {
      const base = pick(data.x, s.leaves);
      return mix(s.leafShade, mix(base, s.leafLight, smoothstep(0.62, 1.0, lit).mul(0.8)), smoothstep(0.0, 0.7, lit));
    });
    // a little scatter from leaf to leaf, so a lobe is never a flat gradient
    const jitter = fract(data.y.mul(7.31)).mul(0.14).add(0.93);
    return vec4(col.mul(jitter), 1.0);
  })();
  return m;
}

export function leafShadowMaterial(u) {
  const m = new THREE.NodeMaterial();
  m.side = THREE.DoubleSide;
  m.transparent = true;
  m.depthWrite = false;
  m.positionNode = toGround(u, leafPlacement(u));
  m.fragmentNode = Fn(() => {
    oval();
    return vec4(seasonal(u, (s) => s.shadow), 0.5);
  })();
  return m;
}
