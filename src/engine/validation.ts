import { type GameState, type Position, CENTER } from './types';
import { isInBounds, getStone } from './board';

export function isValidMove(state: GameState, position: Position): boolean {
  // Must be in bounds
  if (!isInBounds(position)) return false;

  // Must be empty
  if (getStone(state.board, position) !== null) return false;

  // Game must not be over
  if (state.gameOver) return false;

  // First move must be center
  if (state.moves.length === 0) {
    return position.row === CENTER && position.col === CENTER;
  }

  return true;
}
