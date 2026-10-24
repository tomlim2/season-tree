// The leaves: thousands of small cards. The vertex stage hangs each one on its branch, sways it
// in the wind, and for the few that are marked to fall, flies it off to the left, lays it on the
// ground, lets it fade and grows it back. The fragment stage paints a flat seasonal colour and
// cuts the card into a petal with a soft edge.
import * as THREE from 'three/webgpu';
import { Fn, If, Discard, attribute, positionGeometry, uv, float, vec2, vec3, vec4, length, mix, sin, cos, fract, floor, smoothstep, max } from 'three/tsl';
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

// The leaf's shape: a petal, round at the stem and narrowing to the tip, with a soft edge.
// Returns how far inside the petal this pixel is (0 edge .. 1 centre) and its coverage.
const petal = () => {
  const p = uv().sub(0.5);
  const q = vec2(p.x, p.y.div(float(1.0).sub(p.x.add(0.5).mul(0.42))));
  const d = length(q).mul(2.0);
  const cover = smoothstep(1.0, 0.88, d);
  If(cover.lessThan(0.02), () => {
    Discard();
  });
  return { d, cover, p };
};

export function leafMaterial(u) {
  const m = new THREE.NodeMaterial();
  m.side = THREE.DoubleSide;
  m.alphaToCoverage = true; // soft edges through the multisample mask, no sorting needed
  m.positionNode = leafPlacement(u);
  m.fragmentNode = Fn(() => {
    const { d, cover, p } = petal();
    const data = attribute('aData', 'vec4'); // colour slot, phase, fall, light (0 shadow .. 1 lit)
    const lit = data.w;
    // each leaf's own colour sits between two of the season's colours, so no two are quite alike
    const second = floor(fract(data.y.mul(5.13)).mul(4.0));
    const blend = fract(data.y.mul(3.71)).mul(0.5);
    const col = seasonal(u, (s) => {
      const base = mix(pick(data.x, s.leaves), pick(second, s.leaves), blend);
      return mix(s.leafShade, mix(base, s.leafLight, smoothstep(0.62, 1.0, lit).mul(0.8)), smoothstep(0.0, 0.7, lit));
    }).toVar();
    // a little scatter from leaf to leaf, a gentle wash from stem to tip, and a lighter rim
    col.mulAssign(fract(data.y.mul(7.31)).mul(0.14).add(0.93));
    col.mulAssign(p.x.add(0.5).mul(0.16).add(0.92));
    col.mulAssign(smoothstep(0.55, 1.0, d).mul(0.1).add(1.0));
    return vec4(col, cover);
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
    const { cover } = petal();
    return vec4(seasonal(u, (s) => s.shadow), cover.mul(0.5));
  })();
  return m;
}
