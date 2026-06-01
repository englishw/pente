import { describe, it, expect } from 'vitest';
import { createBoard, cloneBoard, isInBounds, getStone, setStone, removeStone } from '../board';
import { BOARD_SIZE } from '../types';

describe('createBoard', () => {
  it('creates a 19x19 board of nulls', () => {
    const board = createBoard();
    expect(board.length).toBe(BOARD_SIZE);
    expect(board[0].length).toBe(BOARD_SIZE);
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        expect(board[r][c]).toBeNull();
      }
    }
  });
});

describe('cloneBoard', () => {
  it('creates an independent copy', () => {
    const board = createBoard();
    board[5][5] = 0;
    const clone = cloneBoard(board);
    clone[5][5] = 1;
    expect(board[5][5]).toBe(0);
    expect(clone[5][5]).toBe(1);
  });
});

describe('isInBounds', () => {
  it('returns true for valid positions', () => {
    expect(isInBounds({ row: 0, col: 0 })).toBe(true);
    expect(isInBounds({ row: 18, col: 18 })).toBe(true);
    expect(isInBounds({ row: 9, col: 9 })).toBe(true);
  });

  it('returns false for out-of-bounds positions', () => {
    expect(isInBounds({ row: -1, col: 0 })).toBe(false);
    expect(isInBounds({ row: 0, col: -1 })).toBe(false);
    expect(isInBounds({ row: 19, col: 0 })).toBe(false);
    expect(isInBounds({ row: 0, col: 19 })).toBe(false);
  });
});

describe('getStone', () => {
  it('returns null for empty positions', () => {
    const board = createBoard();
    expect(getStone(board, { row: 9, col: 9 })).toBeNull();
  });

  it('returns the player id for occupied positions', () => {
    const board = createBoard();
    board[9][9] = 0;
    expect(getStone(board, { row: 9, col: 9 })).toBe(0);
  });

  it('returns null for out-of-bounds', () => {
    const board = createBoard();
    expect(getStone(board, { row: -1, col: 0 })).toBeNull();
  });
});

describe('setStone', () => {
  it('places a stone and returns a new board', () => {
    const board = createBoard();
    const newBoard = setStone(board, { row: 9, col: 9 }, 0);
    expect(getStone(newBoard, { row: 9, col: 9 })).toBe(0);
    expect(getStone(board, { row: 9, col: 9 })).toBeNull(); // original unchanged
  });
});

describe('removeStone', () => {
  it('removes a stone and returns a new board', () => {
    let board = createBoard();
    board = setStone(board, { row: 5, col: 5 }, 1);
    const newBoard = removeStone(board, { row: 5, col: 5 });
    expect(getStone(newBoard, { row: 5, col: 5 })).toBeNull();
    expect(getStone(board, { row: 5, col: 5 })).toBe(1); // original unchanged
  });
});
