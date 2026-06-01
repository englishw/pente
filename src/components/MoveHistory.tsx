import type { GameState } from '../engine/types';
import { BOARD_SIZE } from '../engine/types';

const COL_LABELS = 'ABCDEFGHJKLMNOPQRST';

function posToLabel(row: number, col: number): string {
  return `${COL_LABELS[col]}${BOARD_SIZE - row}`;
}

interface MoveHistoryProps {
  gameState: GameState;
}

export default function MoveHistory({ gameState }: MoveHistoryProps) {
  if (gameState.moves.length === 0) return null;

  return (
    <div className="bg-slate-700/40 rounded-lg p-3 max-h-48 overflow-y-auto">
      <h3 className="text-sm font-semibold text-slate-300 mb-2">Move History</h3>
      <div className="flex flex-wrap gap-1 text-xs">
        {gameState.moves.map((move, i) => {
          const player = gameState.players[move.playerId];
          return (
            <span
              key={i}
              className="inline-flex items-center gap-1 bg-slate-600/50 rounded px-1.5 py-0.5"
            >
              <span
                className="w-2 h-2 rounded-full inline-block"
                style={{ backgroundColor: player.color }}
              />
              {posToLabel(move.position.row, move.position.col)}
              {move.captures.length > 0 && (
                <span className="text-amber-400">×{move.captures.length}</span>
              )}
            </span>
          );
        })}
      </div>
    </div>
  );
}
