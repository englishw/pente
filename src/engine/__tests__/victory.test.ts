import { describe, it, expect } from 'vitest';
import { checkFiveInARow, checkCaptureVictory } from '../victory';
import { createBoard, setStone } from '../board';

describe('checkFiveInARow', () => {
  it('detects horizontal five-in-a-row', () => {
    let board = createBoard();
    for (let c = 3; c <= 7; c++) {
      board = setStone(board, { row: 5, col: c }, 0);
    }
    const result = checkFiveInARow(board, { row: 5, col: 5 }, 0);
    expect(result.won).toBe(true);
    expect(result.positions.length).toBe(5);
  });

  it('detects vertical five-in-a-row', () => {
    let board = createBoard();
    for (let r = 3; r <= 7; r++) {
      board = setStone(board, { row: r, col: 5 }, 0);
    }
    const result = checkFiveInARow(board, { row: 5, col: 5 }, 0);
    expect(result.won).toBe(true);
    expect(result.positions.length).toBe(5);
  });

  it('detects diagonal NW-SE five-in-a-row', () => {
    let board = createBoard();
    for (let i = 0; i < 5; i++) {
      board = setStone(board, { row: 3 + i, col: 3 + i }, 0);
    }
    const result = checkFiveInARow(board, { row: 5, col: 5 }, 0);
    expect(result.won).toBe(true);
  });

  it('detects diagonal NE-SW five-in-a-row', () => {
    let board = createBoard();
    for (let i = 0; i < 5; i++) {
      board = setStone(board, { row: 3 + i, col: 7 - i }, 0);
    }
    const result = checkFiveInARow(board, { row: 5, col: 5 }, 0);
    expect(result.won).toBe(true);
  });

  it('detects six-or-more in a row as a win', () => {
    let board = createBoard();
    for (let c = 2; c <= 8; c++) {
      board = setStone(board, { row: 5, col: c }, 0);
    }
    const result = checkFiveInARow(board, { row: 5, col: 5 }, 0);
    expect(result.won).toBe(true);
    expect(result.positions.length).toBe(7);
  });

  it('does not detect four-in-a-row as a win', () => {
    let board = createBoard();
    for (let c = 3; c <= 6; c++) {
      board = setStone(board, { row: 5, col: c }, 0);
    }
    const result = checkFiveInARow(board, { row: 5, col: 5 }, 0);
    expect(result.won).toBe(false);
  });

  it('does not count opponent stones in the line', () => {
    let board = createBoard();
    board = setStone(board, { row: 5, col: 3 }, 0);
    board = setStone(board, { row: 5, col: 4 }, 0);
    board = setStone(board, { row: 5, col: 5 }, 0);
    board = setStone(board, { row: 5, col: 6 }, 1); // opponent breaks line
    board = setStone(board, { row: 5, col: 7 }, 0);
    const result = checkFiveInARow(board, { row: 5, col: 5 }, 0);
    expect(result.won).toBe(false);
  });
});

describe('checkCaptureVictory', () => {
  it('returns true at exactly 5 captures', () => {
    expect(checkCaptureVictory(5)).toBe(true);
  });

  it('returns true above 5 captures', () => {
    expect(checkCaptureVictory(6)).toBe(true);
  });

  it('returns false below 5 captures', () => {
    expect(checkCaptureVictory(4)).toBe(false);
    expect(checkCaptureVictory(0)).toBe(false);
  });
});
