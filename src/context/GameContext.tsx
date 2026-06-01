import { createContext, useContext, useReducer, useEffect, useCallback, type ReactNode } from 'react';
import type { GameState, GameConfig, Position } from '../engine/types';
import { createGame, makeMove, undoMove } from '../engine/gameEngine';
import { saveGame, loadGame, clearGame } from '../utils/storage';

type GameAction =
  | { type: 'START_GAME'; config: GameConfig }
  | { type: 'MAKE_MOVE'; position: Position }
  | { type: 'UNDO_MOVE' }
  | { type: 'RESTART_GAME' }
  | { type: 'LOAD_GAME'; state: GameState };

function gameReducer(state: GameState | null, action: GameAction): GameState | null {
  switch (action.type) {
    case 'START_GAME':
      return createGame(action.config);
    case 'MAKE_MOVE':
      return state ? makeMove(state, action.position) : null;
    case 'UNDO_MOVE':
      return state ? undoMove(state) : null;
    case 'RESTART_GAME':
      return state ? createGame(state.config) : null;
    case 'LOAD_GAME':
      return action.state;
    default:
      return state;
  }
}

interface GameContextType {
  gameState: GameState | null;
  startGame: (config: GameConfig) => void;
  placeMoveAction: (position: Position) => void;
  undoMoveAction: () => void;
  restartGame: () => void;
  loadSavedGame: () => boolean;
  clearSavedGame: () => void;
}

const GameContext = createContext<GameContextType>({
  gameState: null,
  startGame: () => {},
  placeMoveAction: () => {},
  undoMoveAction: () => {},
  restartGame: () => {},
  loadSavedGame: () => false,
  clearSavedGame: () => {},
});

export function GameProvider({ children }: { children: ReactNode }) {
  const [gameState, dispatch] = useReducer(gameReducer, null);

  // Persist game state
  useEffect(() => {
    if (gameState) {
      saveGame(gameState);
    }
  }, [gameState]);

  const startGame = useCallback((config: GameConfig) => {
    dispatch({ type: 'START_GAME', config });
  }, []);

  const placeMoveAction = useCallback((position: Position) => {
    dispatch({ type: 'MAKE_MOVE', position });
  }, []);

  const undoMoveAction = useCallback(() => {
    dispatch({ type: 'UNDO_MOVE' });
  }, []);

  const restartGame = useCallback(() => {
    dispatch({ type: 'RESTART_GAME' });
  }, []);

  const loadSavedGame = useCallback((): boolean => {
    const saved = loadGame();
    if (saved) {
      dispatch({ type: 'LOAD_GAME', state: saved });
      return true;
    }
    return false;
  }, []);

  const clearSavedGame = useCallback(() => {
    clearGame();
  }, []);

  return (
    <GameContext.Provider value={{
      gameState,
      startGame,
      placeMoveAction,
      undoMoveAction,
      restartGame,
      loadSavedGame,
      clearSavedGame,
    }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  return useContext(GameContext);
}
