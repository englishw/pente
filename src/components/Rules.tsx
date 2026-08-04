import { APP_VERSION } from '../utils/storage';

interface RulesProps {
  onBack: () => void;
}

export default function Rules({ onBack }: RulesProps) {
  return (
    <div className="max-w-2xl mx-auto p-6 fade-in overflow-y-auto h-full">
      <h2 className="text-3xl font-bold text-amber-400 mb-6">How to Play Pente</h2>

      <section className="mb-6">
        <h3 className="text-xl font-semibold text-slate-200 mb-2">Objective</h3>
        <p className="text-slate-300 leading-relaxed">
          Win by either placing <strong>five or more stones in a row</strong> (horizontally,
          vertically, or diagonally) or by <strong>capturing five pairs</strong> of your
          opponent's stones.
        </p>
      </section>

      <section className="mb-6">
        <h3 className="text-xl font-semibold text-slate-200 mb-2">Turn Order</h3>
        <ul className="text-slate-300 leading-relaxed list-disc pl-5 space-y-1">
          <li>The first move must be placed on the <strong>center intersection</strong>.</li>
          <li>Players take turns clockwise, placing one stone per turn.</li>
          <li>Stones cannot be moved once placed (only captured stones are removed).</li>
        </ul>
      </section>

      <section className="mb-6">
        <h3 className="text-xl font-semibold text-slate-200 mb-2">Captures</h3>
        <p className="text-slate-300 leading-relaxed mb-2">
          A capture occurs when you <strong>bracket exactly two opponent stones</strong> in a
          straight line with your own stones on both ends:
        </p>
        <div className="bg-slate-700/50 rounded-lg p-3 font-mono text-center text-lg mb-2">
          <span className="text-amber-400">You</span>
          {' — '}
          <span className="text-red-400">Opp</span>
          {' — '}
          <span className="text-red-400">Opp</span>
          {' — '}
          <span className="text-amber-400">You</span>
        </div>
        <ul className="text-slate-300 leading-relaxed list-disc pl-5 space-y-1">
          <li>The two captured stones are removed from the board.</li>
          <li>A single move can capture multiple pairs simultaneously.</li>
          <li>Placing a stone between two opponents does <em>not</em> cause self-capture.</li>
        </ul>
      </section>

      <section className="mb-6">
        <h3 className="text-xl font-semibold text-slate-200 mb-2">Mixed Captures (3-4 Players)</h3>
        <p className="text-slate-300 leading-relaxed">
          In multiplayer games, the two captured stones <strong>do not need to belong to the
          same opponent</strong>. For example, capturing one blue and one red stone between
          your own stones is valid and counts as one captured pair.
        </p>
      </section>

      <section className="mb-6">
        <h3 className="text-xl font-semibold text-slate-200 mb-2">Winning</h3>
        <ul className="text-slate-300 leading-relaxed list-disc pl-5 space-y-1">
          <li><strong>Five-in-a-row:</strong> Place five or more consecutive stones in any direction.</li>
          <li><strong>Capture victory:</strong> Accumulate five captured pairs.</li>
          <li>After each move, captures are processed first, then both victory conditions are checked.</li>
        </ul>
      </section>

      <section className="mb-6">
        <h3 className="text-xl font-semibold text-slate-200 mb-2">Multiplayer</h3>
        <p className="text-slate-300 leading-relaxed">
          Pente supports 2, 3, or 4 players. All players compete individually — there are
          no teams. Turn order rotates clockwise.
        </p>
      </section>
      <div className="mt-4 text-xs text-slate-400 text-right" aria-label="App version"> Version {APP_VERSION}
      </div>
      <button className="btn btn-secondary mt-4" onClick={onBack}>← Back</button>
    </div>
  );
}
