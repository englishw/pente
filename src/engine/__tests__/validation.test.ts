import { describe, it, expect } from 'vitest';
import { isValidMove } from '../validation';
import { createGame } from '../gameEngine';
import { CENTER } from '../types';

const defaultConfig = { playerCount: 2, playerNames: ['A', 'B'], playerColors: ['#000', '#fff'] };

describe('isValidMove', () => {
  it('requires center for first move', () => {
    const state = createGame(defaultConfig);
    expect(isValidMove(state, { row: CENTER, col: CENTER })).toBe(true);
    expect(isValidMove(state, { row: 0, col: 0 })).toBe(false);
    expect(isValidMove(state, { row: CENTER + 1, col: CENTER })).toBe(false);
  });

  it('rejects out-of-bounds moves', () => {
    const state = createGame(defaultConfig);
    expect(isValidMove(state, { row: -1, col: 0 })).toBe(false);
    expect(isValidMove(state, { row: 19, col: 0 })).toBe(false);
  });

  it('rejects occupied intersections', () => {
    let state = createGame(defaultConfig);
    state = { ...state, board: state.board.map(r => [...r]), moves: [{ position: { row: CENTER, col: CENTER }, playerId: 0, captures: [], turnNumber: 1 }] };
    state.board[CENTER][CENTER] = 0;
    expect(isValidMove(state, { row: CENTER, col: CENTER })).toBe(false);
  });

  it('rejects moves when game is over', () => {
    let state = createGame(defaultConfig);
    state = { ...state, gameOver: true };
    expect(isValidMove(state, { row: CENTER, col: CENTER })).toBe(false);
  });

  it('allows any empty position after first move', () => {
    let state = createGame(defaultConfig);
    state = { ...state, board: state.board.map(r => [...r]), moves: [{ position: { row: CENTER, col: CENTER }, playerId: 0, captures: [], turnNumber: 1 }] };
    state.board[CENTER][CENTER] = 0;
    expect(isValidMove(state, { row: 0, col: 0 })).toBe(true);
    expect(isValidMove(state, { row: 18, col: 18 })).toBe(true);
  });
});
