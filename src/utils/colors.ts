export const DEFAULT_COLORS = ['#1a1a1a', '#f5f5f5', '#3b82f6', '#ef4444'];
export const DEFAULT_NAMES = ['Black', 'White', 'Blue', 'Red'];

// Color-blind safe palette (Wong 2011)
export const CB_SAFE_COLORS = ['#000000', '#E69F00', '#56B4E9', '#D55E00'];
export const CB_SAFE_NAMES = ['Black', 'Orange', 'Sky Blue', 'Vermillion'];

// Shape markers for color-blind mode (rendered inside stones)
export const CB_SHAPES = ['circle', 'cross', 'triangle', 'square'] as const;
export type CBShape = typeof CB_SHAPES[number];

export const PRESET_COLORS = [
  '#1a1a1a', '#f5f5f5', '#3b82f6', '#ef4444',
  '#22c55e', '#a855f7', '#f97316', '#06b6d4',
  '#ec4899', '#84cc16',
];
