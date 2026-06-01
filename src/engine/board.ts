import { type Board, type Position, BOARD_SIZE } from './types';

export function createBoard(): Board {
  return Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => null)
  );
}

export function cloneBoard(board: Board): Board {
  return board.map(row => [...row]);
}

export function isInBounds(pos: Position): boolean {
  return pos.row >= 0 && pos.row < BOARD_SIZE && pos.col >= 0 && pos.col < BOARD_SIZE;
}

export function getStone(board: Board, pos: Position): number | null {
  if (!isInBounds(pos)) return null;
  return board[pos.row][pos.col];
}

export function setStone(board: Board, pos: Position, playerId: number): Board {
  const newBoard = cloneBoard(board);
  newBoard[pos.row][pos.col] = playerId;
  return newBoard;
}

export function removeStone(board: Board, pos: Position): Board {
  const newBoard = cloneBoard(board);
  newBoard[pos.row][pos.col] = null;
  return newBoard;
}
