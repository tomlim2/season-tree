// A tree on an island, the season it wears, and the loop that moves the wind.
import * as THREE from 'three/webgpu';
import { THEMES, SHAPES } from './themes.js';
import { buildTree, groundGeometry, seeded } from './tree.js';
import { createUniforms, setSeason, WIPE_SPAN, WIPE_START } from './tsl/common.js';
import { leafMaterial, leafShadowMaterial } from './tsl/leaves.js';
import { woodMaterial, woodShadowMaterial, groundMaterial } from './tsl/wood.js';

const deg = (d) => (d * Math.PI) / 180;

async function makeRenderer(canvas, forceWebGL) {
  const make = (gl) => new THREE.WebGPURenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance', forceWebGL: gl });
  let renderer = make(forceWebGL);
  try {
    await renderer.init();
    return renderer;
  } catch (e) {
    console.warn('season-tree: the renderer did not start', e);
    if (forceWebGL) return null;
  }
  renderer.dispose();
  renderer = make(true);
  try {
    await renderer.init();
    return renderer;
  } catch (e) {
    console.warn('season-tree: WebGL 2 did not start either', e);
    renderer.dispose();
    return null;
  }
}

export async function createScene(host, hooks = {}) {
  const { onFail, forceWebGL = false, onSeason, onWipe } = hooks;
  const canvas = document.createElement('canvas');
  canvas.className = 'stage';
  host.appendChild(canvas);
  const renderer = await makeRenderer(canvas, forceWebGL);
  if (!renderer) {
    canvas.remove();
    onFail?.();
    return null;
  }
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0); // the page behind the canvas is the sky
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  const u = createUniforms();

  /* ---------------------------------------------------------------- the season */
  let season = 0;
  let wiping = -1; // time the wipe started, or -1
  setSeason(u.old, THEMES[0]);
  setSeason(u.now, THEMES[0]);
  function wear(index) {
    if (index === season) return;
    // the season that is showing becomes the old one, in full; the new one wipes in
    setSeason(u.old, THEMES[season]);
    setSeason(u.now, THEMES[index]);
    season = index;
    wiping = t;
    u.wipe.value = 0;
    onSeason?.(THEMES[season], THEMES[index]);
  }

  /* ---------------------------------------------------------------- the tree */
  const materials = {
    leaf: leafMaterial(u),
    leafShadow: leafShadowMaterial(u),
    wood: woodMaterial(u),
    woodShadow: woodShadowMaterial(u),
    ground: groundMaterial(u),
  };
  const ground = new THREE.Mesh(groundGeometry(seeded(3)), materials.ground);
  ground.renderOrder = 0;
  scene.add(ground);
  const tree = new THREE.Group();
  scene.add(tree);
  let shape = 0;
  let seed = 7;
  let planted = 0;
  let leafCount = 0;
  const R = seeded(Date.now() >>> 0);
  function plant(newShape = shape, newSeed = seed) {
    shape = newShape;
    seed = newSeed;
    for (const child of [...tree.children]) {
      tree.remove(child);
      child.geometry.dispose();
    }
    const built = buildTree(SHAPES[shape], seed);
    u.top.value = built.top;
    leafCount = built.leafCount;
    const woodShadow = new THREE.Mesh(built.wood, materials.woodShadow);
    const leafShadow = new THREE.Mesh(built.leaves, materials.leafShadow);
    const wood = new THREE.Mesh(built.wood, materials.wood);
    const leaves = new THREE.Mesh(built.leaves, materials.leaf);
    woodShadow.renderOrder = 1;
    leafShadow.renderOrder = 2;
    wood.renderOrder = 3;
    leaves.renderOrder = 4;
    for (const m of [woodShadow, leafShadow, wood, leaves]) {
      m.frustumCulled = false;
      tree.add(m);
    }
    planted = t;
    u.grow.value = 0;
  }

  /* ---------------------------------------------------------------- the camera */
  const look = { yaw: deg(8), pitch: deg(5), tyaw: deg(8), tpitch: deg(5), dist: 17 };
  const target = new THREE.Vector3(0, 2.2, 0);
  function frame() {
    const w = host.clientWidth || 1;
    const h = host.clientHeight || 1;
    camera.aspect = w / h;
    // a tall screen backs off so the whole tree still fits
    camera.fov = w / h < 1 ? 28 * Math.min(1.7, 1 / (w / h)) : 28;
    camera.updateProjectionMatrix();
  }
  function aim(t) {
    const yaw = look.yaw + deg(0.6) * Math.sin(t * 0.17);
    const pitch = look.pitch + deg(0.3) * Math.sin(t * 0.11 + 1);
    camera.position.set(target.x + look.dist * Math.cos(pitch) * Math.sin(yaw), target.y + look.dist * Math.sin(pitch), target.z + look.dist * Math.cos(pitch) * Math.cos(yaw));
    camera.lookAt(target);
  }
  function resize() {
    renderer.setSize(host.clientWidth || 1, host.clientHeight || 1, false);
    frame();
  }
  const watcher = new ResizeObserver(resize);
  watcher.observe(host);
  resize();

  // drag to walk round the tree
  const drag = { on: false, x: 0, y: 0, moved: 0 };
  const onDown = (e) => {
    drag.on = true;
    drag.x = e.clientX;
    drag.y = e.clientY;
    drag.moved = 0;
    host.setPointerCapture?.(e.pointerId);
  };
  const onMove = (e) => {
    if (!drag.on) return;
    const dx = e.clientX - drag.x;
    const dy = e.clientY - drag.y;
    drag.x = e.clientX;
    drag.y = e.clientY;
    drag.moved += Math.abs(dx) + Math.abs(dy);
    look.tyaw -= dx * 0.005;
    look.tpitch = Math.min(deg(35), Math.max(deg(-4), look.tpitch + dy * 0.004));
  };
  const onUp = () => {
    drag.on = false;
  };
  host.addEventListener('pointerdown', onDown);
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
  window.addEventListener('pointercancel', onUp);

  /* ---------------------------------------------------------------- a frame */
  let raf = 0;
  let before = 0;
  let t = 0;
  function tick(dt) {
    t += dt;
    u.time.value = t;
    // the wind: a steady breath with gusts
    u.wind.value = 0.45 + 0.3 * Math.sin(t * 0.37) + 0.25 * Math.sin(t * 0.91 + 1.7) * Math.sin(t * 0.23);
    u.grow.value = t - planted;
    look.yaw += (look.tyaw - look.yaw) * (1 - Math.exp(-dt / 0.25));
    look.pitch += (look.tpitch - look.pitch) * (1 - Math.exp(-dt / 0.25));
    aim(t);
    if (wiping >= 0) {
      const k = Math.min(1, (t - wiping) / 1.3);
      u.wipe.value = k;
      onWipe?.(k * WIPE_SPAN + WIPE_START, k);
      if (k >= 1) {
        wiping = -1;
        setSeason(u.old, THEMES[season]);
      }
    }
    renderer.render(scene, camera);
  }
  function loop(now) {
    raf = requestAnimationFrame(loop);
    const dt = before ? Math.min((now - before) / 1000, 0.05) : 1 / 60;
    before = now;
    tick(dt);
  }
  plant(0, 7);
  u.grow.value = 10; // the first tree is already grown
  planted = -10;
  tick(0);
  raf = requestAnimationFrame(loop);

  return {
    wear,
    plant: (newShape) => plant(newShape ?? shape, Math.floor(R() * 1e9)),
    reshape: (newShape) => plant(newShape, seed),
    get season() {
      return season;
    },
    get shape() {
      return shape;
    },
    debug: {
      renderer,
      backend: renderer.backend.isWebGPUBackend ? 'webgpu' : 'webgl',
      uniforms: u,
      camera,
      look,
      get leafCount() {
        return leafCount;
      },
      get time() {
        return t;
      },
      set time(v) {
        t = v;
      },
    },
    dispose() {
      cancelAnimationFrame(raf);
      watcher.disconnect();
      host.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      renderer.dispose();
      canvas.remove();
    },
  };
}
