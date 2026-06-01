export const BOARD_SIZE = 19;
export const CENTER = Math.floor(BOARD_SIZE / 2); // 9
export const CAPTURES_TO_WIN = 5;
export const STONES_IN_ROW_TO_WIN = 5;

export interface Position {
  row: number;
  col: number;
}

export interface CapturedPair {
  pos1: Position;
  pos2: Position;
}

export interface Move {
  position: Position;
  playerId: number;
  captures: CapturedPair[];
  turnNumber: number;
}

export interface Player {
  id: number;
  name: string;
  color: string;
  captures: number;
}

export interface GameConfig {
  playerCount: number;
  playerNames: string[];
  playerColors: string[];
}

export type Board = (number | null)[][];

export type WinReason = 'five-in-a-row' | 'captures';

export interface GameState {
  board: Board;
  players: Player[];
  currentPlayerIndex: number;
  moves: Move[];
  winner: number | null;
  winReason: WinReason | null;
  winningPositions: Position[];
  gameOver: boolean;
  turnNumber: number;
  config: GameConfig;
}

// Directions for line checking (4 axes)
export const AXES: [number, number][] = [
  [0, 1],   // horizontal
  [1, 0],   // vertical
  [1, 1],   // diagonal NW-SE
  [1, -1],  // diagonal NE-SW
];

// All 8 directions for capture checking
export const DIRECTIONS: [number, number][] = [
  [0, 1], [0, -1],
  [1, 0], [-1, 0],
  [1, 1], [-1, -1],
  [1, -1], [-1, 1],
];
