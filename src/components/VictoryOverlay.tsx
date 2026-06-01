import type { GameState } from '../engine/types';
import { useEffect } from 'react';
import { useSettings } from '../context/SettingsContext';
import { playVictorySound } from '../utils/sound';

interface VictoryOverlayProps {
  gameState: GameState;
  onNewGame: () => void;
  onRematch: () => void;
}

export default function VictoryOverlay({ gameState, onNewGame, onRematch }: VictoryOverlayProps) {
  const { settings } = useSettings();

  useEffect(() => {
    if (settings.soundEnabled) {
      playVictorySound();
    }
  }, []);

  if (gameState.winner === null) return null;
  const winner = gameState.players[gameState.winner];

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 fade-in p-4">
      <div className="bg-slate-800 rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl border border-slate-600">
        <div
          className="w-16 h-16 rounded-full mx-auto mb-4 border-4 border-amber-400"
          style={{ backgroundColor: winner.color }}
        />
        <h2 className="text-3xl font-bold text-amber-400 mb-2">
          {winner.name} Wins!
        </h2>
        <p className="text-slate-300 mb-6">
          {gameState.winReason === 'five-in-a-row'
            ? 'Five stones in a row!'
            : `${winner.captures} captured pairs!`}
        </p>
        <div className="flex gap-3 justify-center">
          <button className="btn btn-secondary" onClick={onNewGame}>New Game</button>
          <button className="btn btn-primary" onClick={onRematch}>Rematch</button>
        </div>
      </div>
    </div>
  );
}
