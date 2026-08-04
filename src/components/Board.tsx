import { useState, useCallback, useRef, useEffect } from 'react';
import { useGame } from '../context/GameContext';
import { useSharedGame } from '../context/SharedGameContext';
import { useSettings } from '../context/SettingsContext';
import { BOARD_SIZE, type CapturedPair, type Position } from '../engine/types';
import { isValidMove } from '../engine/validation';
import { detectOpenEndedThreats, type OpenEndedThreat } from '../engine/victory';
import { playPlaceSound, playCaptureSound } from '../utils/sound';
import Stone from './Stone';

const PADDING = 20;
const CELL_SIZE = 20;
const BOARD_PX = PADDING * 2 + (BOARD_SIZE - 1) * CELL_SIZE;

// Star points (traditional Go/Pente positions)
const STAR_POINTS = [
  [3, 3], [3, 9], [3, 15],
  [9, 3], [9, 9], [9, 15],
  [15, 3], [15, 9], [15, 15],
];

const COL_LABELS = 'ABCDEFGHJKLMNOPQRST'; // I is skipped traditionally
const TRANSIENT_INDICATOR_MS = 3200;

interface TransientBoardCue {
  key: string;
  summary: string | null;
  winningPositions: Position[];
  capturePairs: CapturedPair[];
  threats: OpenEndedThreat[];
}

function toSvg(row: number, col: number): { x: number; y: number } {
  return { x: PADDING + col * CELL_SIZE, y: PADDING + row * CELL_SIZE };
}

function positionKey(position: Position): string {
  return `${position.row}:${position.col}`;
}

function uniquePositions(positions: Position[]): Position[] {
  const seen = new Set<string>();
  return positions.filter(position => {
    const key = positionKey(position);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export default function Board() {
  const { gameState } = useGame();
  const { requestMove, canLocalMove } = useSharedGame();
  const { settings } = useSettings();
  const [cursor, setCursor] = useState<{ row: number; col: number } | null>(null);
  const [transientCue, setTransientCue] = useState<TransientBoardCue | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const lastMove = gameState?.moves[gameState.moves.length - 1];
  const clearTransientCue = useCallback(() => {
    setTransientCue(null);
  }, []);

  const transientCandidate: TransientBoardCue | null = gameState
    ? (() => {
        const threatPatterns = gameState.gameOver
          ? []
          : detectOpenEndedThreats(gameState.board, gameState.players.length);

        if (gameState.gameOver && gameState.winner !== null) {
          const winner = gameState.players[gameState.winner];
          return {
            key: `gameover:${gameState.moves.length}:${gameState.winReason}:${lastMove?.turnNumber ?? 0}`,
            summary: gameState.winReason === 'five-in-a-row'
              ? `${winner.name} wins with five in a row.`
              : `${winner.name} wins on captures.`,
            winningPositions: gameState.winReason === 'five-in-a-row' ? gameState.winningPositions : [],
            capturePairs: gameState.winReason === 'captures' ? (lastMove?.captures ?? []) : [],
            threats: [],
          };
        }

        if (threatPatterns.length > 0) {
          return {
            key: `threat:${gameState.moves.length}:${threatPatterns.map(threat => `${threat.playerId}:${threat.positions.map(positionKey).join('|')}`).join(';')}`,
            summary: null,
            winningPositions: [],
            capturePairs: [],
            threats: threatPatterns,
          };
        }

        return null;
      })()
    : null;

  const handleClick = useCallback((row: number, col: number) => {
    clearTransientCue();
    if (!gameState || gameState.gameOver) return;
    if (!canLocalMove(gameState)) return;
    requestMove({ row, col });
  }, [canLocalMove, clearTransientCue, gameState, requestMove]);

  // Play sounds when state changes
  const prevMovesRef = useRef(0);
  useEffect(() => {
    if (!gameState || !settings.soundEnabled) return;
    const currentMoves = gameState.moves.length;
    if (currentMoves > prevMovesRef.current) {
      const lastMove = gameState.moves[currentMoves - 1];
      if (lastMove?.captures.length > 0) {
        playCaptureSound();
      } else {
        playPlaceSound();
      }
    }
    prevMovesRef.current = currentMoves;
  }, [gameState?.moves.length]);

  useEffect(() => {
    if (!transientCandidate) {
      setTransientCue(null);
      return;
    }

    setTransientCue(transientCandidate);
    const timeoutId = window.setTimeout(() => {
      setTransientCue(current => current?.key === transientCandidate.key ? null : current);
    }, TRANSIENT_INDICATOR_MS);

    return () => window.clearTimeout(timeoutId);
  }, [transientCandidate?.key]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!gameState || gameState.gameOver) return;
    const cur = cursor || { row: 9, col: 9 };
    let next = { ...cur };

    switch (e.key) {
      case 'ArrowUp': next.row = Math.max(0, cur.row - 1); break;
      case 'ArrowDown': next.row = Math.min(18, cur.row + 1); break;
      case 'ArrowLeft': next.col = Math.max(0, cur.col - 1); break;
      case 'ArrowRight': next.col = Math.min(18, cur.col + 1); break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        clearTransientCue();
        handleClick(cur.row, cur.col);
        return;
      default: return;
    }
    e.preventDefault();
    clearTransientCue();
    setCursor(next);
  }, [clearTransientCue, cursor, gameState, handleClick]);

  if (!gameState) return null;

  const canInteract = canLocalMove(gameState);
  const winningHighlightKeys = new Set((transientCue?.winningPositions ?? []).map(positionKey));
  const threatStonePositions = uniquePositions((transientCue?.threats ?? []).flatMap(threat => threat.positions));
  const threatStoneKeys = new Set(threatStonePositions.map(positionKey));
  const threatOpenEnds = uniquePositions((transientCue?.threats ?? []).flatMap(threat => threat.openEnds));
  const captureHighlights = uniquePositions((transientCue?.capturePairs ?? []).flatMap(pair => [pair.pos1, pair.pos2]));

  const isWinningPos = (r: number, c: number) =>
    winningHighlightKeys.has(`${r}:${c}`);

  return (
    <div className="relative flex items-center justify-center w-full">
      {transientCue?.summary && (
        <div className="transient-banner pointer-events-none absolute left-1/2 top-3 z-[60] -translate-x-1/2 rounded-full border border-amber-300/50 bg-slate-900/85 px-4 py-2 text-sm font-medium text-amber-100 shadow-lg backdrop-blur-sm">
          {transientCue.summary}
        </div>
      )}
      <svg
        ref={svgRef}
        viewBox={`0 0 ${BOARD_PX} ${BOARD_PX}`}
        className="w-full max-w-[min(90vw,90vh)] aspect-square"
        role="grid"
        aria-label="Pente game board"
        tabIndex={0}
        onKeyDown={handleKeyDown}
      >
        {/* Board background */}
        <rect x="0" y="0" width={BOARD_PX} height={BOARD_PX} fill="#DEB887" rx="4" />
        <rect x={PADDING - 2} y={PADDING - 2}
              width={(BOARD_SIZE - 1) * CELL_SIZE + 4}
              height={(BOARD_SIZE - 1) * CELL_SIZE + 4}
              fill="#D4A76A" rx="1" />

        {/* Grid lines */}
        {Array.from({ length: BOARD_SIZE }, (_, i) => {
          const pos = PADDING + i * CELL_SIZE;
          const start = PADDING;
          const end = PADDING + (BOARD_SIZE - 1) * CELL_SIZE;
          return (
            <g key={`grid-${i}`}>
              <line x1={start} y1={pos} x2={end} y2={pos}
                    className="board-line" stroke="#8B7355" strokeWidth="0.8" />
              <line x1={pos} y1={start} x2={pos} y2={end}
                    className="board-line" stroke="#8B7355" strokeWidth="0.8" />
            </g>
          );
        })}

        {/* Star points */}
        {STAR_POINTS.map(([r, c]) => {
          const { x, y } = toSvg(r, c);
          return <circle key={`star-${r}-${c}`} cx={x} cy={y} r="2.5" fill="#5C4033" />;
        })}

        {/* Threat open ends */}
        {threatOpenEnds.map(position => {
          const { x, y } = toSvg(position.row, position.col);
          return (
            <circle
              key={`threat-end-${position.row}-${position.col}`}
              cx={x}
              cy={y}
              r="6.4"
              fill="none"
              stroke="rgba(96,165,250,0.92)"
              strokeWidth="1.3"
              className="board-threat-end"
            />
          );
        })}

        {/* Capture victory markers */}
        {(transientCue?.capturePairs ?? []).map((pair, index) => {
          const start = toSvg(pair.pos1.row, pair.pos1.col);
          const end = toSvg(pair.pos2.row, pair.pos2.col);
          return (
            <g key={`capture-pair-${index}`}>
              <line
                x1={start.x}
                y1={start.y}
                x2={end.x}
                y2={end.y}
                stroke="rgba(248,113,113,0.82)"
                strokeWidth="1.8"
                strokeDasharray="4,3"
                className="board-capture-link"
              />
            </g>
          );
        })}
        {captureHighlights.map(position => {
          const { x, y } = toSvg(position.row, position.col);
          return (
            <circle
              key={`capture-highlight-${position.row}-${position.col}`}
              cx={x}
              cy={y}
              r="7"
              fill="rgba(248,113,113,0.16)"
              stroke="rgba(252,165,165,0.9)"
              strokeWidth="1.4"
              className="board-capture-mark"
            />
          );
        })}

        {/* Coordinate labels */}
        {settings.showCoordinates && (
          <>
            {Array.from({ length: BOARD_SIZE }, (_, i) => (
              <g key={`label-${i}`}>
                <text x={PADDING + i * CELL_SIZE} y={PADDING - 8}
                      textAnchor="middle" fontSize="6" fill="#8B7355" fontWeight="bold">
                  {COL_LABELS[i]}
                </text>
                <text x={PADDING - 10} y={PADDING + i * CELL_SIZE + 2}
                      textAnchor="middle" fontSize="6" fill="#8B7355" fontWeight="bold">
                  {BOARD_SIZE - i}
                </text>
              </g>
            ))}
          </>
        )}

        {/* Click targets for empty intersections */}
        {Array.from({ length: BOARD_SIZE }, (_, r) =>
          Array.from({ length: BOARD_SIZE }, (_, c) => {
            if (gameState.board[r][c] !== null) return null;
            const { x, y } = toSvg(r, c);
            const valid = canInteract && isValidMove(gameState, { row: r, col: c });
            return (
              <circle
                key={`target-${r}-${c}`}
                cx={x} cy={y} r={CELL_SIZE / 2}
                fill="transparent"
                className={valid ? 'cursor-pointer' : ''}
                onClick={() => handleClick(r, c)}
                role="gridcell"
                aria-label={`${COL_LABELS[c]}${BOARD_SIZE - r}${valid ? '' : ' (unavailable)'}`}
              >
                <title>{`${COL_LABELS[c]}${BOARD_SIZE - r}`}</title>
              </circle>
            );
          })
        )}

        {/* Placed stones */}
        {Array.from({ length: BOARD_SIZE }, (_, r) =>
          Array.from({ length: BOARD_SIZE }, (_, c) => {
            const playerId = gameState.board[r][c];
            if (playerId === null) return null;
            const player = gameState.players[playerId];
            const { x, y } = toSvg(r, c);
            const isNew = lastMove?.position.row === r && lastMove?.position.col === c;
            const isRecent = isNew;
            return (
              <Stone
                key={`stone-${r}-${c}`}
                cx={x} cy={y}
                color={player.color}
                playerIndex={playerId}
                isWinning={isWinningPos(r, c)}
                isNew={isNew}
                isRecent={isRecent}
                isThreat={threatStoneKeys.has(`${r}:${c}`)}
                isCaptureTrigger={Boolean(
                  transientCue?.capturePairs.length &&
                  lastMove?.position.row === r &&
                  lastMove.position.col === c
                )}
              />
            );
          })
        )}

        {/* Keyboard cursor */}
        {cursor && (
          <rect
            x={toSvg(cursor.row, cursor.col).x - CELL_SIZE / 2}
            y={toSvg(cursor.row, cursor.col).y - CELL_SIZE / 2}
            width={CELL_SIZE} height={CELL_SIZE}
            fill="none" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="3,2" rx="2"
          />
        )}
      </svg>
    </div>
  );
}
