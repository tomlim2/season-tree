// The wood, two-toned by the sun, bending with the wind; the island the tree stands on.
import * as THREE from 'three/webgpu';
import { Fn, attribute, positionLocal, normalWorld, positionWorld, float, vec3, vec4, dot, smoothstep, mix } from 'three/tsl';
import { seasonal, bendAt, toGround } from './common.js';

const bent = (u) => {
  const h = attribute('aH', 'float');
  const b = bendAt(u, h, float(0.0));
  return positionLocal.add(vec3(b.negate(), 0.0, b.mul(0.2)));
};

export function woodMaterial(u) {
  const m = new THREE.NodeMaterial();
  m.positionNode = bent(u);
  m.fragmentNode = Fn(() => {
    const lit = smoothstep(-0.25, 0.55, dot(normalWorld, u.sun));
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
    const col = seasonal(u, (s) => {
      const top = s.ground[0];
      const side = s.ground[1];
      // grass blades are a little lighter toward their tips
      const grass = mix(side, top, smoothstep(0.0, 0.25, positionWorld.y)).mul(1.08);
      return mix(mix(top, side, smoothstep(0.5, 1.5, kind)), grass, smoothstep(1.5, 2.0, kind));
    });
    return vec4(col, 1.0);
  })();
  return m;
}
