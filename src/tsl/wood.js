// The wood, lit face by face by the sun, bending with the wind; the island the tree stands on,
// with the tree's shadow lying across its grass.
import * as THREE from 'three/webgpu';
import { Fn, attribute, positionLocal, normalWorld, positionWorld, float, vec3, vec4, dot, smoothstep, mix, fract } from 'three/tsl';
import { seasonal, bendAt, toGround, treeShade } from './common.js';

const bent = (u) => {
  const h = attribute('aH', 'float');
  const b = bendAt(u, h, float(0.0));
  return positionLocal.add(vec3(b.negate(), 0.0, b.mul(0.2)));
};

export function woodMaterial(u) {
  const m = new THREE.NodeMaterial();
  m.positionNode = bent(u);
  m.fragmentNode = Fn(() => {
    // the faces are flat, so this steps from the cool shadow colour on the left to the warm
    // lit colour on the right, one tone per face
    const lit = smoothstep(-0.35, 0.7, dot(normalWorld, u.sun));
    const col = seasonal(u, (s) => mix(s.wood[1], s.wood[0], lit));
    return vec4(col, 1.0);
  })();
  return m;
}

export function woodShadowMaterial(u) {
  const m = new THREE.NodeMaterial();
  m.transparent = true;
  m.depthWrite = false;
  m.positionNode = toGround(u, bent(u));
  m.fragmentNode = Fn(() => vec4(seasonal(u, (s) => s.shadow), 0.6))();
  return m;
}

export function groundMaterial(u) {
  const m = new THREE.NodeMaterial();
  m.side = THREE.DoubleSide;
  const kind = attribute('aKind', 'float');
  m.fragmentNode = Fn(() => {
    const isSide = smoothstep(0.5, 1.5, kind);
    const isGrass = smoothstep(1.5, 2.0, kind);
    const shade = treeShade(u, positionWorld);
    const col = seasonal(u, (s) => {
      const top = s.ground[0];
      const side = s.ground[1];
      // the plate between the blades sits a little darker; each blade has its own shade, and
      // is lighter toward its tip
      const plate = mix(top, side, 0.45);
      const own = fract(kind).mul(0.3).add(0.85);
      const grass = mix(side, top.mul(1.1), smoothstep(0.0, 0.2, positionWorld.y)).mul(own);
      const base = mix(mix(plate, side, isSide), grass, isGrass);
      return mix(base, s.shadow, shade.mul(0.62));
    });
    return vec4(col, 1.0);
  })();
  return m;
}
