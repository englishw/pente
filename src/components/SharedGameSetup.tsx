import { useEffect, useMemo, useState } from 'react';
import { PRESET_COLORS } from '../utils/colors';
import { useSharedGame } from '../context/SharedGameContext';

interface SharedGameSetupProps {
  onBack: () => void;
}

type Tab = 'create' | 'join';

export default function SharedGameSetup({ onBack }: SharedGameSetupProps) {
  const {
    phase,
    role,
    error,
    roomCode,
    broker,
    players,
    takenColors,
    shareLink,
    createRoom,
    joinRoom,
    startSharedGame,
    leaveSharedGame,
  } = useSharedGame();

  const [tab, setTab] = useState<Tab>('create');
  const [name, setName] = useState('');
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [joinCode, setJoinCode] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!shareLink || shareLink === '/') return;
    const codeMatch = shareLink.match(/[?&]game=([A-Z0-9]{1,6})/i);
    if (codeMatch?.[1]) {
      setJoinCode(codeMatch[1].toUpperCase());
      setTab('join');
    }
  }, [shareLink]);

  const isBusy = phase === 'connecting';
  const normalizedTakenColors = useMemo(
    () => new Set(takenColors.map(c => c.trim().toLowerCase())),
    [takenColors]
  );
  const selectedColorTaken = normalizedTakenColors.has(color.trim().toLowerCase());

  const heading = useMemo(() => {
    if (phase === 'lobby') return 'Shared Game Lobby';
    if (phase === 'in-game') return 'Shared Game Active';
    return 'Shared Game';
  }, [phase]);

  const handleCreate = () => {
    createRoom({
      name: name.trim() || 'Host',
      color,
    });
  };

  const handleJoin = () => {
    joinRoom({
      code: joinCode,
      name: name.trim() || 'Guest',
      color,
    });
  };

  const handleLeave = () => {
    leaveSharedGame();
    onBack();
  };

  const handleCopyLink = async () => {
    const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}${shareLink}` : shareLink;
    if (!shareUrl || shareUrl === '/') return;

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
      }
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}${shareLink}` : shareLink;

  return (
    <div className="max-w-3xl mx-auto p-6 h-full fade-in flex flex-col gap-5">
      <h2 className="text-3xl font-bold text-amber-400">{heading}</h2>

      {error && (
        <div className="bg-red-500/20 border border-red-400/40 rounded-lg p-3 text-red-200 text-sm">
          {error}
        </div>
      )}

      {(phase === 'idle' || phase === 'connecting' || phase === 'error') && (
        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-slate-800/60 border border-slate-600/50 rounded-xl p-4 flex flex-col gap-3">
            <div className="flex gap-2">
              <button
                className={`btn btn-sm ${tab === 'create' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setTab('create')}
                type="button"
              >
                Create
              </button>
              <button
                className={`btn btn-sm ${tab === 'join' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setTab('join')}
                type="button"
              >
                Join
              </button>
            </div>

            <label className="text-sm text-slate-300">Display Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="bg-slate-700 text-slate-100 rounded px-3 py-2 border border-slate-600 focus:border-amber-400"
              placeholder={tab === 'create' ? 'Host name' : 'Your name'}
              maxLength={24}
            />

            <label className="text-sm text-slate-300">Stone Color</label>
            <div className="flex gap-2 flex-wrap">
              {PRESET_COLORS.map(c => {
                const isTaken = normalizedTakenColors.has(c.trim().toLowerCase());
                const isSelected = color === c;
                const isBlocked = isTaken && !isSelected;

                return (
                  <button
                    key={c}
                    type="button"
                    className="relative w-7 h-7 rounded-full border border-slate-500 hover:scale-110 transition-transform disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                    style={{
                      backgroundColor: c,
                      outline: isSelected
                        ? (isTaken ? '2px solid #ef4444' : '2px solid #f59e0b')
                        : 'none',
                      outlineOffset: '1px',
                    }}
                    onClick={() => setColor(c)}
                    disabled={isBlocked}
                    aria-label={isTaken ? `Color ${c} is taken` : `Select color ${c}`}
                    title={isTaken ? 'Taken' : 'Available'}
                  >
                    {isTaken && (
                      <span className="absolute -top-1 -right-1 text-[9px] leading-none bg-red-500 text-white rounded px-1">T</span>
                    )}
                  </button>
                );
              })}
            </div>
            {takenColors.length > 0 && (
              <p className="text-xs text-slate-400">
                Colors marked with <span className="text-red-300 font-semibold">T</span> are already taken.
              </p>
            )}
            {selectedColorTaken && (
              <p className="text-xs text-red-300">Selected color is unavailable. Choose a different one.</p>
            )}

            {tab === 'join' && (
              <>
                <label className="text-sm text-slate-300">6-Character Game Code</label>
                <input
                  type="text"
                  value={joinCode}
                  onChange={e => setJoinCode(e.target.value.toUpperCase())}
                  className="bg-slate-700 text-slate-100 rounded px-3 py-2 border border-slate-600 focus:border-amber-400 tracking-[0.35em] font-mono"
                  placeholder="ABC123"
                  maxLength={6}
                />
              </>
            )}

            <div className="flex gap-2 mt-1">
              {tab === 'create' ? (
                <button className="btn btn-primary" disabled={isBusy || selectedColorTaken} onClick={handleCreate}>
                  {isBusy ? 'Connecting...' : 'Create Shared Game'}
                </button>
              ) : (
                <button className="btn btn-primary" disabled={isBusy || selectedColorTaken} onClick={handleJoin}>
                  {isBusy ? 'Connecting...' : 'Join Shared Game'}
                </button>
              )}
              <button className="btn btn-secondary" disabled={isBusy} onClick={onBack}>
                Back
              </button>
            </div>
          </div>

          <div className="bg-slate-800/35 border border-slate-600/40 rounded-xl p-4 text-sm text-slate-300 space-y-3">
            <p>
              Share a short link with your opponent and they can join in a few taps.
            </p>
            <p>
              The host creates the room, picks a name and color, and sends the link. The other player opens it, enters their name, and joins instantly.
            </p>
            <p>
              This works without a server. The game uses secure public brokers to relay moves and board updates between players.
            </p>
          </div>
        </div>
      )}

      {(phase === 'lobby' || phase === 'in-game') && (
        <div className="bg-slate-800/60 border border-slate-600/50 rounded-xl p-4 flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="text-slate-300">Game Code:</div>
            <div className="text-2xl font-bold tracking-[0.3em] text-amber-300 font-mono">
              {roomCode}
            </div>
            {broker && (
              <div className="text-xs text-slate-400 bg-slate-700/70 rounded px-2 py-1">
                {broker.label}
              </div>
            )}
          </div>

          <div className="rounded-lg border border-amber-400/30 bg-amber-500/10 p-3 text-sm text-slate-200">
            <div className="font-semibold text-amber-200 mb-1">Share this link</div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="break-all font-mono text-amber-100 flex-1">{shareUrl}</div>
              <button
                type="button"
                className="btn btn-sm btn-secondary whitespace-nowrap"
                onClick={handleCopyLink}
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>

          <div>
            <h3 className="text-slate-200 font-semibold mb-2">Players ({players.length}/4)</h3>
            <div className="grid gap-2 sm:grid-cols-2">
              {players
                .slice()
                .sort((a, b) => a.seat - b.seat)
                .map(p => (
                  <div key={p.clientId} className="bg-slate-700/45 rounded-lg p-2 flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full border border-slate-500" style={{ backgroundColor: p.color }} />
                    <span className="font-medium">{p.name}</span>
                    <span className="text-xs text-slate-400 ml-auto">Seat {p.seat + 1}</span>
                  </div>
                ))}
            </div>
          </div>

          <div className="flex gap-2">
            {role === 'host' && phase === 'lobby' && (
              <button className="btn btn-primary" onClick={startSharedGame} disabled={players.length < 2}>
                Start Game ({players.length}/4)
              </button>
            )}
            <button className="btn btn-secondary" onClick={handleLeave}>
              Leave Lobby
            </button>
          </div>

          {phase === 'in-game' && (
            <div className="text-sm text-emerald-300">
              Shared game started. Open the game screen to play turns.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
