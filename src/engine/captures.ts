import { type Board, type Position, type CapturedPair, DIRECTIONS } from './types';
import { isInBounds, getStone } from './board';

/**
 * Detect all captures caused by placing a stone at `position` for `playerId`.
 *
 * A capture occurs when the pattern is:
 *   currentPlayer - opponent - opponent - currentPlayer
 * in any of the 8 directions from the placed stone.
 *
 * Mixed captures are valid: the two opponent stones can belong to different players.
 */
export function detectCaptures(
  board: Board,
  position: Position,
  playerId: number,
): CapturedPair[] {
  const captures: CapturedPair[] = [];

  for (const [dr, dc] of DIRECTIONS) {
    const pos1: Position = { row: position.row + dr, col: position.col + dc };
    const pos2: Position = { row: position.row + 2 * dr, col: position.col + 2 * dc };
    const pos3: Position = { row: position.row + 3 * dr, col: position.col + 3 * dc };

    if (!isInBounds(pos1) || !isInBounds(pos2) || !isInBounds(pos3)) continue;

    const s1 = getStone(board, pos1);
    const s2 = getStone(board, pos2);
    const s3 = getStone(board, pos3);

    // s1 and s2 must be opponent stones (not null, not current player)
    // s3 must be the current player's stone (the other bracket)
    if (
      s1 !== null && s1 !== playerId &&
      s2 !== null && s2 !== playerId &&
      s3 === playerId
    ) {
      captures.push({ pos1, pos2 });
    }
  }

  return captures;
}

/**
 * Remove captured stones from the board and return the new board.
 */
export function processCaptures(board: Board, captures: CapturedPair[]): Board {
  let newBoard = board;
  for (const pair of captures) {
    // Create a new copy for each removal to avoid mutating
    newBoard = newBoard.map(row => [...row]);
    newBoard[pair.pos1.row][pair.pos1.col] = null;
    newBoard[pair.pos2.row][pair.pos2.col] = null;
  }
  return newBoard;
}
