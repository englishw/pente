import { describe, it, expect } from 'vitest';
import { detectCaptures, processCaptures } from '../captures';
import { createBoard, setStone } from '../board';

describe('detectCaptures', () => {
  it('detects a horizontal capture (forward)', () => {
    // Pattern: P0 at (5,3), P1 at (5,4), P1 at (5,5), placing P0 at (5,6) is not what we test
    // We test: P0 exists at (5,6), P1 at (5,4), P1 at (5,5), placing P0 at (5,3)
    let board = createBoard();
    board = setStone(board, { row: 5, col: 4 }, 1); // opponent
    board = setStone(board, { row: 5, col: 5 }, 1); // opponent
    board = setStone(board, { row: 5, col: 6 }, 0); // bracket
    // Place P0 at (5,3) - the other bracket
    board = setStone(board, { row: 5, col: 3 }, 0);
    const captures = detectCaptures(board, { row: 5, col: 3 }, 0);
    expect(captures.length).toBe(1);
    expect(captures[0].pos1).toEqual({ row: 5, col: 4 });
    expect(captures[0].pos2).toEqual({ row: 5, col: 5 });
  });

  it('detects a vertical capture', () => {
    let board = createBoard();
    board = setStone(board, { row: 4, col: 5 }, 1);
    board = setStone(board, { row: 5, col: 5 }, 1);
    board = setStone(board, { row: 6, col: 5 }, 0);
    board = setStone(board, { row: 3, col: 5 }, 0);
    const captures = detectCaptures(board, { row: 3, col: 5 }, 0);
    expect(captures.length).toBe(1);
  });

  it('detects a diagonal capture', () => {
    let board = createBoard();
    board = setStone(board, { row: 4, col: 4 }, 1);
    board = setStone(board, { row: 5, col: 5 }, 1);
    board = setStone(board, { row: 6, col: 6 }, 0);
    board = setStone(board, { row: 3, col: 3 }, 0);
    const captures = detectCaptures(board, { row: 3, col: 3 }, 0);
    expect(captures.length).toBe(1);
  });

  it('detects reverse-direction capture', () => {
    // P0 at (5,3), P1 at (5,4), P1 at (5,5), placing P0 at (5,6)
    let board = createBoard();
    board = setStone(board, { row: 5, col: 3 }, 0); // bracket
    board = setStone(board, { row: 5, col: 4 }, 1); // opponent
    board = setStone(board, { row: 5, col: 5 }, 1); // opponent
    board = setStone(board, { row: 5, col: 6 }, 0); // placing
    const captures = detectCaptures(board, { row: 5, col: 6 }, 0);
    expect(captures.length).toBe(1);
  });

  it('detects multiple simultaneous captures', () => {
    let board = createBoard();
    // Horizontal capture: P0(5,3), P1(5,4), P1(5,5), P0 placing at (5,6)
    board = setStone(board, { row: 5, col: 3 }, 0);
    board = setStone(board, { row: 5, col: 4 }, 1);
    board = setStone(board, { row: 5, col: 5 }, 1);
    // Vertical capture: P0(8,6), P1(7,6), P1(6,6) - capture when placing at (5,6) going down (but we need P0 at the end)
    // Actually: placing at (5,6), direction (1,0): (6,6)=P1, (7,6)=P1, (8,6)=P0
    board = setStone(board, { row: 6, col: 6 }, 1);
    board = setStone(board, { row: 7, col: 6 }, 1);
    board = setStone(board, { row: 8, col: 6 }, 0);

    board = setStone(board, { row: 5, col: 6 }, 0); // the placed stone
    const captures = detectCaptures(board, { row: 5, col: 6 }, 0);
    expect(captures.length).toBe(2);
  });

  it('detects mixed captures (different opponent colors)', () => {
    // P0 at (5,3), P1 at (5,4), P2 at (5,5), placing P0 at (5,6)
    // Wait, the placed stone is the bracket. So we need:
    // placing P0 at (5,6), direction (-1,0) check: no
    // direction (0,-1): (5,5)=P2 (not P0), (5,4)=P1 (not P0), (5,3)=P0 ✓
    let board = createBoard();
    board = setStone(board, { row: 5, col: 3 }, 0); // bracket
    board = setStone(board, { row: 5, col: 4 }, 1); // opponent 1
    board = setStone(board, { row: 5, col: 5 }, 2); // opponent 2 (different!)
    board = setStone(board, { row: 5, col: 6 }, 0); // placing
    const captures = detectCaptures(board, { row: 5, col: 6 }, 0);
    expect(captures.length).toBe(1);
    expect(captures[0].pos1).toEqual({ row: 5, col: 5 });
    expect(captures[0].pos2).toEqual({ row: 5, col: 4 });
  });

  it('does not capture own stones', () => {
    // P0 at (5,3), P0 at (5,4), P0 at (5,5), placing P0 at (5,6)
    let board = createBoard();
    board = setStone(board, { row: 5, col: 3 }, 0);
    board = setStone(board, { row: 5, col: 4 }, 0);
    board = setStone(board, { row: 5, col: 5 }, 0);
    board = setStone(board, { row: 5, col: 6 }, 0);
    const captures = detectCaptures(board, { row: 5, col: 6 }, 0);
    expect(captures.length).toBe(0);
  });

  it('does not capture with empty spaces', () => {
    let board = createBoard();
    board = setStone(board, { row: 5, col: 3 }, 0);
    // (5,4) is empty
    board = setStone(board, { row: 5, col: 5 }, 1);
    board = setStone(board, { row: 5, col: 6 }, 0);
    const captures = detectCaptures(board, { row: 5, col: 6 }, 0);
    expect(captures.length).toBe(0);
  });
});

describe('processCaptures', () => {
  it('removes captured stones from the board', () => {
    let board = createBoard();
    board = setStone(board, { row: 5, col: 4 }, 1);
    board = setStone(board, { row: 5, col: 5 }, 1);
    const result = processCaptures(board, [{ pos1: { row: 5, col: 4 }, pos2: { row: 5, col: 5 } }]);
    expect(result[5][4]).toBeNull();
    expect(result[5][5]).toBeNull();
  });
});
