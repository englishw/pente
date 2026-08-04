import { describe, it, expect } from 'vitest';
import { createGame, makeMove, undoMove } from '../gameEngine';
import { CENTER } from '../types';

const config2 = { playerCount: 2, playerNames: ['A', 'B'], playerColors: ['#000', '#fff'] };
const config3 = { playerCount: 3, playerNames: ['A', 'B', 'C'], playerColors: ['#000', '#fff', '#00f'] };
const config4 = { playerCount: 4, playerNames: ['A', 'B', 'C', 'D'], playerColors: ['#000', '#fff', '#00f', '#f00'] };

describe('createGame', () => {
  it('creates initial state', () => {
    const state = createGame(config2);
    expect(state.players.length).toBe(2);
    expect(state.currentPlayerIndex).toBe(0);
    expect(state.turnNumber).toBe(1);
    expect(state.gameOver).toBe(false);
    expect(state.moves.length).toBe(0);
  });
});

describe('makeMove', () => {
  it('requires center for first move', () => {
    const state = createGame(config2);
    const result = makeMove(state, { row: 0, col: 0 });
    expect(result).toBe(state); // unchanged
  });

  it('places first stone at center', () => {
    const state = createGame(config2);
    const result = makeMove(state, { row: CENTER, col: CENTER });
    expect(result.board[CENTER][CENTER]).toBe(0);
    expect(result.currentPlayerIndex).toBe(1);
    expect(result.turnNumber).toBe(2);
    expect(result.moves.length).toBe(1);
  });

  it('alternates turns for 2 players', () => {
    let state = createGame(config2);
    state = makeMove(state, { row: CENTER, col: CENTER }); // P0
    expect(state.currentPlayerIndex).toBe(1);
    state = makeMove(state, { row: 0, col: 0 }); // P1
    expect(state.currentPlayerIndex).toBe(0);
  });

  it('rotates turns for 3 players', () => {
    let state = createGame(config3);
    state = makeMove(state, { row: CENTER, col: CENTER }); // P0
    expect(state.currentPlayerIndex).toBe(1);
    state = makeMove(state, { row: 0, col: 0 }); // P1
    expect(state.currentPlayerIndex).toBe(2);
    state = makeMove(state, { row: 0, col: 1 }); // P2
    expect(state.currentPlayerIndex).toBe(0);
  });

  it('rotates turns for 4 players', () => {
    let state = createGame(config4);
    state = makeMove(state, { row: CENTER, col: CENTER }); // P0
    state = makeMove(state, { row: 0, col: 0 }); // P1
    state = makeMove(state, { row: 0, col: 1 }); // P2
    expect(state.currentPlayerIndex).toBe(3);
    state = makeMove(state, { row: 0, col: 2 }); // P3
    expect(state.currentPlayerIndex).toBe(0);
  });

  it('detects five-in-a-row victory', () => {
    let state = createGame(config2);
    // P0 plays center, then builds a horizontal line
    // P1 plays elsewhere
    state = makeMove(state, { row: CENTER, col: CENTER }); // P0
    state = makeMove(state, { row: 0, col: 0 }); // P1
    state = makeMove(state, { row: CENTER, col: CENTER + 1 }); // P0
    state = makeMove(state, { row: 0, col: 1 }); // P1
    state = makeMove(state, { row: CENTER, col: CENTER + 2 }); // P0
    state = makeMove(state, { row: 0, col: 2 }); // P1
    state = makeMove(state, { row: CENTER, col: CENTER - 1 }); // P0
    state = makeMove(state, { row: 0, col: 3 }); // P1
    state = makeMove(state, { row: CENTER, col: CENTER - 2 }); // P0 - 5 in a row!

    expect(state.gameOver).toBe(true);
    expect(state.winner).toBe(0);
    expect(state.winReason).toBe('five-in-a-row');
    expect(state.winningPositions.length).toBe(5);
  });

  it('processes captures and increments count', () => {
    let state = createGame(config2);
    state = makeMove(state, { row: CENTER, col: CENTER }); // P0 at center
    state = makeMove(state, { row: CENTER, col: CENTER + 1 }); // P1
    state = makeMove(state, { row: CENTER, col: CENTER + 4 }); // P0
    state = makeMove(state, { row: CENTER, col: CENTER + 2 }); // P1

    // Now P0 plays at CENTER, CENTER+3 to capture P1 at +1 and +2
    state = makeMove(state, { row: CENTER, col: CENTER + 3 }); // P0 captures!

    expect(state.players[0].captures).toBe(1);
    expect(state.players[0].capturedStones).toEqual([1, 1]);
    // Captured stones should be removed
    expect(state.board[CENTER][CENTER + 1]).toBeNull();
    expect(state.board[CENTER][CENTER + 2]).toBeNull();
  });

  it('tracks captured colors in mixed captures', () => {
    let state = createGame(config3);
    state = makeMove(state, { row: CENTER, col: CENTER }); // P0
    state = makeMove(state, { row: CENTER, col: CENTER + 1 }); // P1
    state = makeMove(state, { row: CENTER, col: CENTER + 2 }); // P2
    state = makeMove(state, { row: CENTER, col: CENTER + 3 }); // P0 captures P2 and P1

    expect(state.players[0].captures).toBe(1);
    expect(state.players[0].capturedStones).toEqual([2, 1]);
  });

  it('retains the capture pair that triggers a capture victory', () => {
    let state = createGame(config2);
    state = makeMove(state, { row: CENTER, col: CENTER }); // P0
    state = makeMove(state, { row: CENTER, col: CENTER + 1 }); // P1
    state = makeMove(state, { row: CENTER, col: CENTER + 4 }); // P0
    state = makeMove(state, { row: CENTER, col: CENTER + 2 }); // P1

    state = {
      ...state,
      players: state.players.map(player =>
        player.id === 0 ? { ...player, captures: 4 } : player
      ),
    };

    state = makeMove(state, { row: CENTER, col: CENTER + 3 }); // P0 capture win

    expect(state.gameOver).toBe(true);
    expect(state.winReason).toBe('captures');
    expect(state.moves.at(-1)?.captures).toEqual([
      {
        pos1: { row: CENTER, col: CENTER + 2 },
        pos2: { row: CENTER, col: CENTER + 1 },
      },
    ]);
  });
});

describe('undoMove', () => {
  it('restores previous state', () => {
    let state = createGame(config2);
    state = makeMove(state, { row: CENTER, col: CENTER });
    state = makeMove(state, { row: 0, col: 0 });
    const undone = undoMove(state);
    expect(undone.moves.length).toBe(1);
    expect(undone.board[0][0]).toBeNull();
    expect(undone.currentPlayerIndex).toBe(1);
  });

  it('returns same state when no moves to undo', () => {
    const state = createGame(config2);
    const result = undoMove(state);
    expect(result.moves.length).toBe(0);
  });

  it('undoes captures correctly', () => {
    let state = createGame(config2);
    state = makeMove(state, { row: CENTER, col: CENTER }); // P0
    state = makeMove(state, { row: CENTER, col: CENTER + 1 }); // P1
    state = makeMove(state, { row: CENTER, col: CENTER + 4 }); // P0
    state = makeMove(state, { row: CENTER, col: CENTER + 2 }); // P1
    state = makeMove(state, { row: CENTER, col: CENTER + 3 }); // P0 captures!

    expect(state.players[0].captures).toBe(1);

    const undone = undoMove(state);
    expect(undone.players[0].captures).toBe(0);
    // Captured stones should be restored
    expect(undone.board[CENTER][CENTER + 1]).toBe(1);
    expect(undone.board[CENTER][CENTER + 2]).toBe(1);
  });

  it('undoes a victory', () => {
    let state = createGame(config2);
    state = makeMove(state, { row: CENTER, col: CENTER });
    state = makeMove(state, { row: 0, col: 0 });
    state = makeMove(state, { row: CENTER, col: CENTER + 1 });
    state = makeMove(state, { row: 0, col: 1 });
    state = makeMove(state, { row: CENTER, col: CENTER + 2 });
    state = makeMove(state, { row: 0, col: 2 });
    state = makeMove(state, { row: CENTER, col: CENTER - 1 });
    state = makeMove(state, { row: 0, col: 3 });
    state = makeMove(state, { row: CENTER, col: CENTER - 2 }); // win

    expect(state.gameOver).toBe(true);
    const undone = undoMove(state);
    expect(undone.gameOver).toBe(false);
    expect(undone.winner).toBeNull();
  });
});
