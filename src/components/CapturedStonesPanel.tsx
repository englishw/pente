import type { GameState } from '../engine/types';

interface CapturedStonesPanelProps {
  gameState: GameState;
}

export default function CapturedStonesPanel({ gameState }: CapturedStonesPanelProps) {
  return (
    <div className="bg-slate-700/40 rounded-lg p-3 max-h-56 overflow-y-auto lg:flex-1 lg:min-h-0 lg:max-h-none">
      <h3 className="text-sm font-semibold text-slate-300 mb-3">Captured Stones</h3>
      <div className="flex flex-col gap-3">
        {gameState.players.map(player => {
          const captured = player.capturedStones ?? [];
          const pairs = Math.floor(captured.length / 2);

          return (
            <div key={player.id} className="bg-slate-600/35 rounded-md p-2">
              <div className="flex items-center gap-2 mb-1.5">
                <div
                  className="w-3 h-3 rounded-full border border-slate-500"
                  style={{ backgroundColor: player.color }}
                />
                <span className="text-sm font-medium text-slate-100 truncate">{player.name}</span>
                <span className="text-xs text-amber-300 ml-auto">{pairs} / 5 pairs</span>
              </div>

              {captured.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {captured.map((capturedPlayerId, index) => {
                    const victim = gameState.players[capturedPlayerId];
                    return (
                      <div
                        key={`${player.id}-captured-${index}`}
                        className="w-4 h-4 rounded-full border border-slate-500"
                        style={{ backgroundColor: victim?.color ?? '#64748b' }}
                        title={victim ? `${victim.name} captured` : 'Captured stone'}
                        aria-label={victim ? `${player.name} captured ${victim.name}` : `${player.name} captured stone`}
                      />
                    );
                  })}
                </div>
              ) : (
                <div className="text-xs text-slate-400">No captures yet.</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
