// The five seasons a tree can wear, and the five shapes it can take.
// Colours are sRGB hex; the materials convert them to linear light.

export const THEMES = [
  {
    id: 'blossom',
    name: '벚꽃',
    bg: '#f9e4ee',
    ground: ['#a9dcb0', '#7cc48e'],
    wood: ['#b7b0c8', '#7f7595'],
    leaves: ['#f7b1ca', '#f28cb2', '#e29ac8', '#fbd3e0'],
    accent: '#8fd3c9',
    leafShade: '#a97fc2',
    leafLight: '#fde0ea',
    shadow: '#8f8899',
  },
  {
    id: 'summer',
    name: '여름',
    bg: '#cfe9f4',
    ground: ['#7bd3bf', '#4fb8a0'],
    wood: ['#a07f63', '#6f5545'],
    leaves: ['#b6e872', '#70cf82', '#5cc49a', '#dff07c'],
    accent: '#2f9e8f',
    leafShade: '#237f80',
    leafLight: '#e6f58e',
    shadow: '#7f8aa0',
  },
  {
    id: 'autumn',
    name: '가을',
    bg: '#fbf1dc',
    ground: ['#e3612f', '#c64a23'],
    wood: ['#7d5b47', '#553a2d'],
    leaves: ['#f8a93c', '#f08236', '#ffd56e', '#f5934a'],
    accent: '#c94d2a',
    leafShade: '#c24f2a',
    leafLight: '#ffdc7a',
    shadow: '#a08a78',
  },
  {
    id: 'winter',
    name: '겨울',
    bg: '#8fc6ea',
    ground: ['#eef4f9', '#cfdfea'],
    wood: ['#5d6879', '#3b4553'],
    leaves: ['#ffffff', '#ebf4fa', '#dbe9f3', '#cfe0ee'],
    accent: '#a6cbe6',
    leafShade: '#8fb0d2',
    leafLight: '#ffffff',
    shadow: '#7c94b4',
  },
  {
    id: 'night',
    name: '밤',
    bg: '#1e2c50',
    ground: ['#237379', '#18565d'],
    wood: ['#121f39', '#0a1328'],
    leaves: ['#3aa3b5', '#2d8aa5', '#46b9c8', '#5fd0d8'],
    accent: '#7fd9df',
    leafShade: '#123a5e',
    leafLight: '#8ee3e8',
    shadow: '#0c1736',
  },
];

// how each shape grows: the wood, and where the leaves hang
export const SHAPES = [
  {
    id: 'round',
    name: '둥근 나무',
    trunk: { length: 1.5, radius: 0.16, splits: 3, spread: 0.55, falloff: 0.72, depth: 3, up: 0.35, wobble: 0.18 },
    leaves: { kind: 'clumps', lobes: 6, radius: 1.2, lobeSpread: 0.85, perClump: 1900, aspect: 0.78, size: 0.155 },
  },
  {
    id: 'conifer',
    name: '침엽수',
    trunk: { length: 1.2, radius: 0.13, splits: 1, spread: 0.0, falloff: 1.0, depth: 1, up: 1.0, wobble: 0.03, whorls: 9, cone: 1.5 },
    leaves: { kind: 'cone', height: 4.6, radius: 1.5, count: 8500, aspect: 0.3, size: 0.16 },
  },
  {
    id: 'column',
    name: '기둥 나무',
    trunk: { length: 1.0, radius: 0.1, splits: 1, spread: 0.0, falloff: 1.0, depth: 1, up: 1.0, wobble: 0.02 },
    leaves: { kind: 'column', height: 4.4, radius: 0.72, count: 8500, aspect: 0.45, size: 0.13 },
  },
  {
    id: 'willow',
    name: '수양버들',
    trunk: { length: 1.7, radius: 0.15, splits: 3, spread: 0.7, falloff: 0.7, depth: 3, up: 0.25, wobble: 0.2 },
    leaves: { kind: 'willow', lobes: 5, radius: 0.95, lobeSpread: 0.8, perClump: 850, strands: 14, drop: 2.6, aspect: 0.4, size: 0.115 },
  },
  {
    id: 'bush',
    name: '덤불',
    trunk: { length: 0.4, radius: 0.1, splits: 4, spread: 0.95, falloff: 0.65, depth: 2, up: 0.15, wobble: 0.2 },
    leaves: { kind: 'clumps', lobes: 7, radius: 1.0, lobeSpread: 1.0, flat: 0.45, crownLift: 0.3, perClump: 1600, aspect: 0.72, size: 0.13 },
  },
];
