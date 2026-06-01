import { useGame } from '../context/GameContext';
import Board from './Board';
import GameInfo from './GameInfo';
import MoveHistory from './MoveHistory';
import VictoryOverlay from './VictoryOverlay';

interface GameViewProps {
  onMenu: () => void;
  onNewGame: () => void;
  onSettings: () => void;
}

export default function GameView({ onMenu, onNewGame, onSettings }: GameViewProps) {
  const { gameState, undoMoveAction, restartGame } = useGame();

  if (!gameState) return null;

  const handleRematch = () => {
    restartGame();
  };

  return (
    <div className="flex flex-col lg:flex-row gap-4 p-4 h-full fade-in">
      {/* Board area */}
      <div className="flex-1 flex items-center justify-center min-h-0">
        <Board />
      </div>

      {/* Side panel */}
      <div className="lg:w-72 flex flex-col gap-3 shrink-0">
        <GameInfo gameState={gameState} />

        {/* Action buttons */}
        <div className="flex flex-wrap gap-2">
          <button
            className="btn btn-sm btn-secondary flex-1"
            onClick={undoMoveAction}
            disabled={gameState.moves.length === 0}
            style={{ opacity: gameState.moves.length === 0 ? 0.4 : 1 }}
          >
            Undo
          </button>
          <button className="btn btn-sm btn-secondary flex-1" onClick={handleRematch}>
            Restart
          </button>
          <button className="btn btn-sm btn-secondary flex-1" onClick={onNewGame}>
            New
          </button>
          <button className="btn btn-sm btn-secondary flex-1" onClick={onSettings}>
            ⚙
          </button>
        </div>

        <MoveHistory gameState={gameState} />

        <button className="btn btn-sm btn-secondary mt-auto" onClick={onMenu}>
          ← Menu
        </button>
      </div>

      {/* Victory overlay */}
      {gameState.gameOver && gameState.winner !== null && (
        <VictoryOverlay
          gameState={gameState}
          onNewGame={onNewGame}
          onRematch={handleRematch}
        />
      )}

      {/* Screen reader announcements */}
      <div aria-live="assertive" className="sr-only">
        {gameState.gameOver && gameState.winner !== null &&
          `${gameState.players[gameState.winner].name} wins by ${gameState.winReason}!`}
      </div>
    </div>
  );
}
