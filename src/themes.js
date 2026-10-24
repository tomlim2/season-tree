// The five seasons a tree can wear, and the five shapes it can take.
// Colours are sRGB hex; the materials convert them to linear light.

export const THEMES = [
  {
    id: 'blossom',
    name: '벚꽃',
    bg: '#f9e4ee',
    ground: ['#a9dcb0', '#7cc48e'],
    wood: ['#b7b0c8', '#7f7595'],
    leaves: ['#f7b1ca', '#f28cb2', '#d890c4', '#fbd3e0'],
    accent: '#8fd3c9',
    shadow: '#5c5668',
  },
  {
    id: 'summer',
    name: '여름',
    bg: '#cfe9f4',
    ground: ['#7bd3bf', '#4fb8a0'],
    wood: ['#a07f63', '#6f5545'],
    leaves: ['#b6e872', '#70cf82', '#44b7a2', '#dff07c'],
    accent: '#2f9e8f',
    shadow: '#4d5668',
  },
  {
    id: 'autumn',
    name: '가을',
    bg: '#fbf1dc',
    ground: ['#e3612f', '#c64a23'],
    wood: ['#7d5b47', '#553a2d'],
    leaves: ['#f8a93c', '#f08236', '#ffd56e', '#e86d3f'],
    accent: '#c94d2a',
    shadow: '#5c4b45',
  },
  {
    id: 'winter',
    name: '겨울',
    bg: '#8fc6ea',
    ground: ['#eef4f9', '#cfdfea'],
    wood: ['#5d6879', '#3b4553'],
    leaves: ['#ffffff', '#ebf4fa', '#d4e6f2', '#bcd8eb'],
    accent: '#a6cbe6',
    shadow: '#3c506c',
  },
  {
    id: 'night',
    name: '밤',
    bg: '#1e2c50',
    ground: ['#237379', '#18565d'],
    wood: ['#121f39', '#0a1328'],
    leaves: ['#3094a7', '#237090', '#3aaebe', '#56c7d0'],
    accent: '#7fd9df',
    shadow: '#0b1430',
  },
];

// how each shape grows: the wood, and where the leaves hang
export const SHAPES = [
  {
    id: 'round',
    name: '둥근 나무',
    trunk: { length: 1.5, radius: 0.16, splits: 3, spread: 0.55, falloff: 0.72, depth: 4, up: 0.35, wobble: 0.18 },
    leaves: { kind: 'clumps', radius: 1.05, perClump: 320, aspect: 0.75, size: 0.125 },
  },
  {
    id: 'conifer',
    name: '침엽수',
    trunk: { length: 1.2, radius: 0.13, splits: 1, spread: 0.0, falloff: 1.0, depth: 1, up: 1.0, wobble: 0.03, whorls: 9, cone: 1.5 },
    leaves: { kind: 'cone', height: 4.6, radius: 1.5, count: 6500, aspect: 0.3, size: 0.16 },
  },
  {
    id: 'column',
    name: '기둥 나무',
    trunk: { length: 1.0, radius: 0.1, splits: 1, spread: 0.0, falloff: 1.0, depth: 1, up: 1.0, wobble: 0.02 },
    leaves: { kind: 'column', height: 4.4, radius: 0.72, count: 7000, aspect: 0.45, size: 0.12 },
  },
  {
    id: 'willow',
    name: '수양버들',
    trunk: { length: 1.7, radius: 0.15, splits: 3, spread: 0.7, falloff: 0.7, depth: 3, up: 0.25, wobble: 0.2 },
    leaves: { kind: 'willow', radius: 0.85, perClump: 240, strands: 12, drop: 2.6, aspect: 0.4, size: 0.105 },
  },
  {
    id: 'bush',
    name: '덤불',
    trunk: { length: 0.4, radius: 0.1, splits: 4, spread: 0.95, falloff: 0.65, depth: 2, up: 0.15, wobble: 0.2 },
    leaves: { kind: 'clumps', radius: 1.05, perClump: 520, aspect: 0.7, size: 0.11 },
  },
];
