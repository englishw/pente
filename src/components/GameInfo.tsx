import type { GameState } from '../engine/types';

interface GameInfoProps {
  gameState: GameState;
}

export default function GameInfo({ gameState }: GameInfoProps) {
  const currentPlayer = gameState.players[gameState.currentPlayerIndex];

  return (
    <div className="flex flex-col gap-3 w-full">
      {/* Current player indicator */}
      <div className="bg-slate-700/60 rounded-lg p-3 text-center" aria-live="polite">
        {gameState.gameOver ? (
          <span className="text-amber-400 font-bold">
            {gameState.winner !== null
              ? `${gameState.players[gameState.winner].name} wins!`
              : 'Game Over'}
          </span>
        ) : (
          <div className="flex items-center justify-center gap-2">
            <div
              className="w-4 h-4 rounded-full border border-slate-400"
              style={{ backgroundColor: currentPlayer.color }}
            />
            <span className="font-semibold">{currentPlayer.name}'s turn</span>
            <span className="text-slate-400 text-sm ml-2">Turn {gameState.turnNumber}</span>
          </div>
        )}
      </div>

      {/* Player scores */}
      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${gameState.players.length}, 1fr)` }}>
        {gameState.players.map(p => (
          <div
            key={p.id}
            className={`bg-slate-700/40 rounded-lg p-2 text-center text-sm
              ${!gameState.gameOver && p.id === currentPlayer.id ? 'ring-2 ring-amber-400/50' : ''}`}
          >
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <div
                className="w-3 h-3 rounded-full border border-slate-500"
                style={{ backgroundColor: p.color }}
              />
              <span className="font-medium truncate">{p.name}</span>
            </div>
            <div className="text-slate-400">
              <span className="text-amber-300 font-bold">{p.captures}</span>
              <span className="text-xs"> / 5 captures</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
