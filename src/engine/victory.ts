import { type Board, type Position, AXES, STONES_IN_ROW_TO_WIN, CAPTURES_TO_WIN } from './types';
import { isInBounds, getStone } from './board';

export interface FiveInARowResult {
  won: boolean;
  positions: Position[];
}

export interface OpenEndedThreat {
  playerId: number;
  positions: Position[];
  openEnds: [Position, Position];
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

/**
 * Detect open-ended threat lines for the current board shape.
 * In 2-player games, an open three is warned.
 * In 3- and 4-player games, an open four is warned.
 */
export function detectOpenEndedThreats(board: Board, playerCount: number): OpenEndedThreat[] {
  const targetLength = playerCount === 2 ? 3 : 4;
  const threats: OpenEndedThreat[] = [];

  for (let row = 0; row < board.length; row++) {
    for (let col = 0; col < board[row].length; col++) {
      const playerId = board[row][col];
      if (playerId === null) continue;

      for (const [dr, dc] of AXES) {
        const start: Position = { row, col };
        const previous: Position = { row: row - dr, col: col - dc };

        if (isInBounds(previous) && getStone(board, previous) === playerId) {
          continue;
        }

        const positions: Position[] = [];
        let cursor: Position = start;

        while (isInBounds(cursor) && getStone(board, cursor) === playerId) {
          positions.push(cursor);
          cursor = { row: cursor.row + dr, col: cursor.col + dc };
        }

        if (positions.length !== targetLength) {
          continue;
        }

        const before = previous;
        const after = cursor;

        if (!isInBounds(before) || !isInBounds(after)) {
          continue;
        }

        if (getStone(board, before) !== null || getStone(board, after) !== null) {
          continue;
        }

        threats.push({
          playerId,
          positions,
          openEnds: [before, after],
        });
      }
    }
  }

  return threats;
}
