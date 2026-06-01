import { hasSavedGame } from '../utils/storage';

interface MainMenuProps {
  onNewGame: () => void;
  onResume: () => void;
  onRules: () => void;
  onSettings: () => void;
}

export default function MainMenu({ onNewGame, onResume, onRules, onSettings }: MainMenuProps) {
  const canResume = hasSavedGame();

  return (
    <div className="flex flex-col items-center justify-center min-h-full gap-6 p-8 fade-in">
      <h1 className="text-6xl font-bold tracking-tight text-amber-400 mb-2">Pente</h1>
      <p className="text-slate-400 text-lg mb-8 max-w-md text-center">
        The classic game of five-in-a-row with captures. Play with 2-4 players.
      </p>

      <div className="flex flex-col gap-3 w-full max-w-xs">
        <button className="btn btn-primary text-lg" onClick={onNewGame}>
          New Game
        </button>
        <button
          className="btn btn-secondary text-lg"
          onClick={onResume}
          disabled={!canResume}
          style={{ opacity: canResume ? 1 : 0.4 }}
        >
          Resume Game
        </button>
        <button className="btn btn-secondary" onClick={onRules}>
          Rules
        </button>
        <button className="btn btn-secondary" onClick={onSettings}>
          Settings
        </button>
      </div>
    </div>
  );
}
