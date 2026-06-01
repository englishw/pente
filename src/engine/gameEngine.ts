import type { GameState, GameConfig, Position, Move } from './types';
import { createBoard, setStone } from './board';
import { isValidMove } from './validation';
import { detectCaptures, processCaptures } from './captures';
import { checkFiveInARow, checkCaptureVictory } from './victory';

const DEFAULT_COLORS = ['#1a1a1a', '#f5f5f5', '#3b82f6', '#ef4444'];

export function createGame(config: GameConfig): GameState {
  const players = Array.from({ length: config.playerCount }, (_, i) => ({
    id: i,
    name: config.playerNames[i] || `Player ${i + 1}`,
    color: config.playerColors[i] || DEFAULT_COLORS[i],
    captures: 0,
  }));

  return {
    board: createBoard(),
    players,
    currentPlayerIndex: 0,
    moves: [],
    winner: null,
    winReason: null,
    winningPositions: [],
    gameOver: false,
    turnNumber: 1,
    config,
  };
}

export function makeMove(state: GameState, position: Position): GameState {
  if (!isValidMove(state, position)) {
    return state;
  }

  const currentPlayer = state.players[state.currentPlayerIndex];
  let board = setStone(state.board, position, currentPlayer.id);

  // Step 1: Detect and process captures
  const captures = detectCaptures(board, position, currentPlayer.id);
  if (captures.length > 0) {
    board = processCaptures(board, captures);
  }

  // Update player captures
  const players = state.players.map(p =>
    p.id === currentPlayer.id
      ? { ...p, captures: p.captures + captures.length }
      : { ...p }
  );

  // Record the move
  const move: Move = {
    position,
    playerId: currentPlayer.id,
    captures,
    turnNumber: state.turnNumber,
  };

  const moves = [...state.moves, move];

  // Step 2: Check capture victory
  const updatedPlayer = players.find(p => p.id === currentPlayer.id)!;
  if (checkCaptureVictory(updatedPlayer.captures)) {
    return {
      ...state,
      board,
      players,
      moves,
      winner: currentPlayer.id,
      winReason: 'captures',
      winningPositions: [],
      gameOver: true,
      turnNumber: state.turnNumber,
    };
  }

  // Step 3: Check five-in-a-row victory
  const fiveResult = checkFiveInARow(board, position, currentPlayer.id);
  if (fiveResult.won) {
    return {
      ...state,
      board,
      players,
      moves,
      winner: currentPlayer.id,
      winReason: 'five-in-a-row',
      winningPositions: fiveResult.positions,
      gameOver: true,
      turnNumber: state.turnNumber,
    };
  }

  // No victory - advance turn
  const nextPlayerIndex = (state.currentPlayerIndex + 1) % state.players.length;

  return {
    ...state,
    board,
    players,
    moves,
    currentPlayerIndex: nextPlayerIndex,
    turnNumber: state.turnNumber + 1,
  };
}

export function undoMove(state: GameState): GameState {
  if (state.moves.length === 0) return state;

  // Rebuild state from scratch by replaying all moves except the last
  const movesToReplay = state.moves.slice(0, -1);
  let rebuilt = createGame(state.config);

  for (const move of movesToReplay) {
    rebuilt = makeMove(rebuilt, move.position);
  }

  return rebuilt;
}
