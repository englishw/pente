import { useState } from 'react';
import type { GameConfig } from '../engine/types';
import { DEFAULT_COLORS, DEFAULT_NAMES, PRESET_COLORS } from '../utils/colors';

interface GameSetupProps {
  onStart: (config: GameConfig) => void;
  onBack: () => void;
}

export default function GameSetup({ onStart, onBack }: GameSetupProps) {
  const [playerCount, setPlayerCount] = useState(2);
  const [names, setNames] = useState(DEFAULT_NAMES.slice());
  const [colors, setColors] = useState(DEFAULT_COLORS.slice());

  const handleStart = () => {
    onStart({
      playerCount,
      playerNames: names.slice(0, playerCount),
      playerColors: colors.slice(0, playerCount),
    });
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-full gap-6 p-8 fade-in">
      <h2 className="text-3xl font-bold text-amber-400">New Game</h2>

      {/* Player count */}
      <div className="flex gap-2 items-center">
        <span className="text-slate-300 mr-2">Players:</span>
        {[2, 3, 4].map(n => (
          <button
            key={n}
            className={`btn btn-sm ${playerCount === n ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setPlayerCount(n)}
          >
            {n}
          </button>
        ))}
      </div>

      {/* Player configs */}
      <div className="flex flex-col gap-4 w-full max-w-sm">
        {Array.from({ length: playerCount }, (_, i) => (
          <div key={i} className="flex items-center gap-3 bg-slate-700/50 rounded-lg p-3">
            <div
              className="w-8 h-8 rounded-full border-2 border-slate-500 shrink-0"
              style={{ backgroundColor: colors[i] }}
            />
            <input
              type="text"
              value={names[i]}
              onChange={e => {
                const next = [...names];
                next[i] = e.target.value;
                setNames(next);
              }}
              className="bg-slate-700 text-slate-100 rounded px-3 py-1.5 flex-1 border border-slate-600 focus:border-amber-400"
              placeholder={`Player ${i + 1}`}
              aria-label={`Player ${i + 1} name`}
            />
            <div className="flex gap-1 flex-wrap max-w-[120px]">
              {PRESET_COLORS.map(c => (
                <button
                  key={c}
                  className="w-5 h-5 rounded-full border border-slate-500 hover:scale-110 transition-transform"
                  style={{
                    backgroundColor: c,
                    outline: colors[i] === c ? '2px solid #f59e0b' : 'none',
                    outlineOffset: '1px',
                  }}
                  onClick={() => {
                    const next = [...colors];
                    next[i] = c;
                    setColors(next);
                  }}
                  aria-label={`Select color ${c} for Player ${i + 1}`}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-3 mt-4">
        <button className="btn btn-secondary" onClick={onBack}>Back</button>
        <button className="btn btn-primary" onClick={handleStart}>Start Game</button>
      </div>
    </div>
  );
}
