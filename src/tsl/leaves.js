// The leaves: thousands of small cards. The vertex stage hangs each one on its branch, sways it
// in the wind, and for the few that are marked to fall, flies it off to the left, lays it on the
// ground, lets it fade and grows it back. The fragment stage paints a flat seasonal colour and
// cuts the card into a rounded leaf.
import * as THREE from 'three/webgpu';
import { Fn, If, Discard, attribute, positionGeometry, uv, float, vec2, vec3, vec4, length, mix, sin, cos, atan, abs, max, fract, smoothstep, step } from 'three/tsl';
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
  const local = vec3(positionGeometry.xy.mul(size).mul(scale).mul(vec2(u.leafScale, u.leafScale.mul(u.leafAspect))), 0.0);
  return pos.add(qRotate(rot, local));
  })();

// The leaf's shape, cut from the card with a crisp edge (the multisample mask only smooths the
// last few percent). A broad leaf is an oval that narrows toward its tip (+x) by the season's
// taper; in summer its outline is pushed in and out into three lobes, like the reference's little
// cloud-shaped leaves (only on roundish cards, so willow and column strokes stay plain). A
// needle is a lens, pointed at both ends. Returns the distance from the centre (1 at the edge)
// and the coverage.
const petal = (u) => {
  const p = uv().sub(0.5);
  const size = attribute('aSize', 'vec2');
  const phase = attribute('aData', 'vec4').y;
  const roundish = smoothstep(0.55, 0.8, size.y.div(size.x));
  const q = vec2(p.x, p.y.div(float(1.0).sub(p.x.add(0.5).mul(u.leafTaper))));
  const theta = atan(q.y, q.x);
  const turn = phase.mul(6.2832);
  const bump = cos(theta.mul(3.0).add(turn)).mul(0.2).add(cos(theta.mul(2.0).sub(turn)).mul(0.08));
  const outline = float(1.0).sub(u.leafLobes.mul(roundish).mul(bump));
  const dLeaf = length(q).mul(2.0).div(outline);
  const x2 = abs(p.x).mul(2.0);
  const dLens = max(x2, abs(p.y).mul(2.0).div(max(float(1.0).sub(x2.mul(x2)), 0.001)));
  const d = mix(dLeaf, dLens, u.leafKind);
  const cover = smoothstep(1.0, 0.94, d);
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
    const { cover } = petal(u);
    const data = attribute('aData', 'vec4'); // colour slot, phase, fall, light (0 shadow .. 1 lit)
    const lit = data.w;
    // three flat tones, as in the reference: the shadow colour over the far side of each lobe,
    // the leaf's own colour across the middle, the light colour on the cap toward the sun. Each
    // leaf is one flat colour, so a band of leaves reads as one solid mass
    // ... though not every leaf in a band takes the band's colour: on the lit cap about half stay
    // the middle colour, so the light leaves lie scattered over it like the reference's pale discs
    const phase = data.y;
    const shadeW = smoothstep(0.4, 0.33, lit).mul(step(fract(phase.mul(4.73)), 0.85));
    const lightW = smoothstep(0.68, 0.75, lit).mul(step(fract(phase.mul(9.17)), 0.55));
    const col = seasonal(u, (s) => mix(mix(pick(data.x, s.leaves), s.leafShade, shadeW), s.leafLight, lightW)).toVar();
    col.mulAssign(fract(data.y.mul(7.31)).mul(0.06).add(0.97)); // the slightest scatter
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
    const { cover } = petal(u);
    return vec4(seasonal(u, (s) => s.shadow), cover.mul(0.5));
  })();
  return m;
}
