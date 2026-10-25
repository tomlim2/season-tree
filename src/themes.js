// The five seasons a tree can wear, and the five shapes it can take.
// Colours are sRGB hex; the materials convert them to linear light.

export const THEMES = [
  {
    id: 'blossom',
    name: '벚꽃',
    bg: '#f9e4ee',
    ground: ['#9ed6b7', '#74bb95'],
    wood: ['#cdc6d8', '#8f9dc4'],
    leaves: ['#f29ab6', '#f4a3bd', '#ef92b0', '#f6adc3'],
    accent: '#8fd3c9',
    leafShade: '#bd8fc6',
    leafLight: '#fbd3df',
    leafScale: 0.8,
    leafAspect: 0.8, // petals: small eggs, a little narrower at one end
    leafTaper: 0.3,
    leafLobes: 0,
    shadow: '#8f8899',
  },
  {
    id: 'summer',
    name: '여름',
    bg: '#cfe9f4',
    ground: ['#66cab7', '#41ad9a'],
    wood: ['#b39b74', '#7d7a93'],
    leaves: ['#52b58c', '#5bbb90', '#49ad86', '#60bf92'],
    accent: '#2f9e8f',
    leafShade: '#1f7d79',
    leafLight: '#cde873',
    leafScale: 1.2,
    leafAspect: 1.0, // broad leaves: round, lobed like little clouds
    leafTaper: 0.1,
    leafLobes: 1,
    shadow: '#7f8aa0',
  },
  {
    id: 'autumn',
    name: '가을',
    bg: '#fbf1dc',
    ground: ['#e8622a', '#c84a20'],
    wood: ['#b0926b', '#86542f'],
    leaves: ['#f08d33', '#f2953c', '#ec8429', '#f59f45'],
    accent: '#c94d2a',
    leafShade: '#c8521c',
    leafLight: '#ffd453',
    leafScale: 1.0,
    leafAspect: 0.72, // longer ovals, pointed like lemons
    leafTaper: 0.36,
    leafLobes: 0,
    shadow: '#a08a78',
  },
  {
    id: 'winter',
    name: '겨울',
    bg: '#8fc6ea',
    ground: ['#e6edf3', '#b9c9d7'],
    wood: ['#736d71', '#4b5c78'],
    leaves: ['#eef4f9', '#f4f8fb', '#e8f0f6', '#f8fafc'],
    accent: '#a6cbe6',
    leafShade: '#aac3da',
    leafLight: '#ffffff',
    leafScale: 0.85,
    leafAspect: 1.1, // round discs of snow
    leafTaper: 0.04,
    leafLobes: 0,
    shadow: '#7c94b4',
  },
  {
    id: 'night',
    name: '밤',
    bg: '#1e2c50',
    ground: ['#0e5a67', '#09424d'],
    wood: ['#36485f', '#071a39'],
    leaves: ['#2f8fa8', '#3397ae', '#2a88a2', '#3a9eb4'],
    accent: '#7fd9df',
    leafShade: '#12395a',
    leafLight: '#86dbe0',
    leafScale: 1.0,
    leafAspect: 0.85, // ovals
    leafTaper: 0.22,
    leafLobes: 0,
    shadow: '#0c1736',
  },
];

// how each shape grows: the wood, and where the leaves hang
export const SHAPES = [
  {
    id: 'round',
    name: '둥근 나무',
    trunk: { length: 1.4, radius: 0.115, splits: 3, spread: 0.72, falloff: 0.8, depth: 3, up: 0.25, wobble: 0.16, lift: 0.08 },
    leaves: { kind: 'clumps', lobes: 6, radius: 1.2, lobeSpread: 1.05, crownLift: 0.75, perClump: 5500, aspect: 0.85, size: 0.1 },
  },
  {
    id: 'conifer',
    name: '침엽수',
    trunk: { length: 0.6, radius: 0.13, splits: 1, spread: 0.0, falloff: 1.0, depth: 1, up: 1.0, wobble: 0.03, whorls: 9, cone: 1.5 }, // a short trunk: only its foot shows below the boughs
    leaves: { kind: 'cone', height: 4.6, radius: 1.55, tufts: 1100, tiers: 9, aspect: 0.12, size: 0.42, needle: true },
  },
  {
    id: 'column',
    name: '기둥 나무',
    trunk: { length: 1.0, radius: 0.12, splits: 1, spread: 0.0, falloff: 1.0, depth: 1, up: 1.0, wobble: 0.02 },
    leaves: { kind: 'column', height: 4.4, radius: 0.62, count: 28000, aspect: 0.35, size: 0.09 },
  },
  {
    id: 'willow',
    name: '수양버들',
    trunk: { length: 1.7, radius: 0.125, splits: 3, spread: 0.7, falloff: 0.75, depth: 3, up: 0.25, wobble: 0.2 },
    leaves: { kind: 'willow', lobes: 5, radius: 0.95, lobeSpread: 0.8, perClump: 2400, strands: 14, drop: 2.6, aspect: 0.45, size: 0.075 },
  },
  {
    id: 'bush',
    name: '덤불',
    trunk: { length: 0.4, radius: 0.1, splits: 4, spread: 0.95, falloff: 0.65, depth: 2, up: 0.15, wobble: 0.2 },
    leaves: { kind: 'clumps', lobes: 7, radius: 1.0, lobeSpread: 1.0, flat: 0.45, crownLift: 0.3, perClump: 4500, aspect: 0.85, size: 0.085 },
  },
];
