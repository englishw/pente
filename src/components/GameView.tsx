import { useGame } from '../context/GameContext';
import { useSharedGame } from '../context/SharedGameContext';
import Board from './Board';
import GameInfo from './GameInfo';
import CapturedStonesPanel from './CapturedStonesPanel';
import VictoryOverlay from './VictoryOverlay';

interface GameViewProps {
  onMenu: () => void;
  onNewGame: () => void;
  onSettings: () => void;
}

export default function GameView({ onMenu, onNewGame, onSettings }: GameViewProps) {
  const { gameState, undoMoveAction, restartGame } = useGame();
  const {
    mode,
    role,
    roomCode,
    broker,
    canLocalMove,
    startSharedGame,
    returnSharedToLobby,
    leaveSharedGame,
  } = useSharedGame();

  if (!gameState) return null;

  const isShared = mode === 'shared';
  const canAct = canLocalMove(gameState);

  const handleRematch = () => {
    if (isShared) return;
    restartGame();
  };

  const handleSharedLeave = () => {
    leaveSharedGame();
    onMenu();
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

        {isShared && (
          <div className="bg-slate-700/50 rounded-lg p-2 text-xs text-slate-300">
            <div>Shared code: <span className="font-mono tracking-wider text-amber-300">{roomCode}</span></div>
            {broker && <div>Broker: {broker.label}</div>}
            <div>{canAct ? 'Your turn' : 'Waiting for your turn'}</div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-wrap gap-2">
          <button
            className="btn btn-sm btn-secondary flex-1"
            onClick={undoMoveAction}
            disabled={isShared || gameState.moves.length === 0}
            style={{ opacity: isShared || gameState.moves.length === 0 ? 0.4 : 1 }}
          >
            Undo
          </button>
          <button className="btn btn-sm btn-secondary flex-1" onClick={handleRematch} disabled={isShared} style={{ opacity: isShared ? 0.4 : 1 }}>
            Restart
          </button>
          <button className="btn btn-sm btn-secondary flex-1" onClick={onNewGame} disabled={isShared} style={{ opacity: isShared ? 0.4 : 1 }}>
            New
          </button>
          <button className="btn btn-sm btn-secondary flex-1" onClick={onSettings}>
            ⚙
          </button>
        </div>

        <CapturedStonesPanel gameState={gameState} />

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
          isShared={isShared}
          isSharedHost={role === 'host'}
          onSharedReplay={startSharedGame}
          onSharedLobby={returnSharedToLobby}
          onSharedLeave={handleSharedLeave}
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
