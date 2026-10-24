import { createScene } from './scene.js';
import { THEMES, SHAPES } from './themes.js';

const query = new URLSearchParams(location.search);
const app = document.getElementById('app');
const skyOld = document.getElementById('sky-old');
const skyNew = document.getElementById('sky-new');

// the page's background is the sky; a season change wipes the new colour in from the top right,
// along the same diagonal the shaders use for the leaves
function wipeTo(front) {
  // the new colour covers the half-plane x - y > 1 - front (in screen fractions, y down)
  const c = 1 - front;
  const pts = [
    [c - 2, -2],
    [c + 2, 2],
    [4, 2],
    [4, -2],
  ];
  skyNew.style.clipPath = `polygon(${pts.map(([x, y]) => `${x * 100}% ${y * 100}%`).join(', ')})`;
}

const seasonButtons = document.getElementById('seasons');
const shapeButtons = document.getElementById('shapes');
THEMES.forEach((theme, i) => {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'season';
  b.dataset.index = i;
  b.title = theme.name;
  b.setAttribute('aria-label', theme.name);
  b.style.setProperty('--a', theme.leaves[0]);
  b.style.setProperty('--b', theme.leaves[1]);
  b.style.setProperty('--c', theme.leaves[2]);
  b.style.setProperty('--d', theme.bg);
  seasonButtons.append(b);
});
const ICONS = {
  round: '<path d="M12 21v-5M7.5 9.5a4.5 4.5 0 1 1 9 0A4 4 0 1 1 16 16H8a4 4 0 0 1-.5-6.5Z"/>',
  conifer: '<path d="M12 21v-3M12 3l4 6h-2l3 4.5h-2.5L17 18H7l2.5-4.5H7L10 9H8Z"/>',
  column: '<path d="M12 21v-2M9 5.5C9 3.5 10.3 2 12 2s3 1.5 3 3.5v9c0 2.5-1.3 4.5-3 4.5s-3-2-3-4.5Z"/>',
  willow: '<path d="M12 21v-9M6 9a6 6 0 0 1 12 0c0 1.5-.5 2.5-1 3.5M7 12c-.5 2 0 4.5.5 6M10 12.5c-.2 2.5 0 4.5.3 6.5M14 12.5c.2 2.5 0 4.5-.3 6.5M17 12c.5 2 0 4.5-.5 6"/>',
  bush: '<path d="M12 20v-2M5 18a3.5 3.5 0 0 1 .5-7A4.5 4.5 0 0 1 14 9a4 4 0 0 1 5.5 4A2.5 2.5 0 0 1 19 18Z"/>',
};
SHAPES.forEach((shape, i) => {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'shape';
  b.dataset.index = i;
  b.title = shape.name;
  b.setAttribute('aria-label', shape.name);
  b.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[shape.id]}</svg>`;
  shapeButtons.append(b);
});
const mark = (list, index) => [...list.children].forEach((b, i) => b.classList.toggle('on', i === index));

createScene(document.getElementById('stage'), {
  forceWebGL: query.get('gl') === '1',
  onFail: () => (document.getElementById('fail').hidden = false),
  onSeason: (from, to) => {
    skyOld.style.background = from.bg;
    skyNew.style.background = to.bg;
    app.dataset.season = to.id;
    wipeTo(-0.15);
  },
  onWipe: (front) => wipeTo(front),
}).then((scene) => {
  if (!scene) return;
  skyOld.style.background = THEMES[0].bg;
  skyNew.style.background = THEMES[0].bg;
  wipeTo(3);
  mark(seasonButtons, 0);
  mark(shapeButtons, 0);
  seasonButtons.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    scene.wear(Number(b.dataset.index));
    mark(seasonButtons, scene.season);
  });
  shapeButtons.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    scene.reshape(Number(b.dataset.index));
    mark(shapeButtons, scene.shape);
  });
  const renew = () => scene.plant();
  document.getElementById('renew').addEventListener('click', renew);
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && !e.repeat) {
      e.preventDefault();
      renew();
    }
    const n = Number(e.key);
    if (n >= 1 && n <= 5) {
      scene.wear(n - 1);
      mark(seasonButtons, scene.season);
    }
  });
  if (import.meta.env.DEV) window.__st = { ...scene.debug, scene };
});
