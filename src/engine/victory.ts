import { type Board, type Position, AXES, STONES_IN_ROW_TO_WIN, CAPTURES_TO_WIN } from './types';
import { isInBounds, getStone } from './board';

export interface FiveInARowResult {
  won: boolean;
  positions: Position[];
}

/**
 * Check if placing a stone creates five-or-more in a row.
 * Returns the winning positions if found.
 */
export function checkFiveInARow(
  board: Board,
  position: Position,
  playerId: number,
): FiveInARowResult {
  for (const [dr, dc] of AXES) {
    const line: Position[] = [position];

    // Count forward
    let i = 1;
    while (true) {
      const p: Position = { row: position.row + i * dr, col: position.col + i * dc };
      if (!isInBounds(p) || getStone(board, p) !== playerId) break;
      line.push(p);
      i++;
    }

    // Count backward
    i = 1;
    while (true) {
      const p: Position = { row: position.row - i * dr, col: position.col - i * dc };
      if (!isInBounds(p) || getStone(board, p) !== playerId) break;
      line.push(p);
      i++;
    }

    if (line.length >= STONES_IN_ROW_TO_WIN) {
      return { won: true, positions: line };
    }
  }

  return { won: false, positions: [] };
}

/**
 * Check if a player has reached the capture victory threshold.
 */
export function checkCaptureVictory(totalCaptures: number): boolean {
  return totalCaptures >= CAPTURES_TO_WIN;
}
