import { useState, useCallback, useRef, useEffect } from 'react';
import { useGame } from '../context/GameContext';
import { useSettings } from '../context/SettingsContext';
import { BOARD_SIZE } from '../engine/types';
import { isValidMove } from '../engine/validation';
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

function toSvg(row: number, col: number): { x: number; y: number } {
  return { x: PADDING + col * CELL_SIZE, y: PADDING + row * CELL_SIZE };
}

export default function Board() {
  const { gameState, placeMoveAction } = useGame();
  const { settings } = useSettings();
  const [cursor, setCursor] = useState<{ row: number; col: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const lastMove = gameState?.moves[gameState.moves.length - 1];

  const handleClick = useCallback((row: number, col: number) => {
    if (!gameState || gameState.gameOver) return;
    placeMoveAction({ row, col });
  }, [gameState, placeMoveAction]);

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
        handleClick(cur.row, cur.col);
        return;
      default: return;
    }
    e.preventDefault();
    setCursor(next);
  }, [cursor, gameState, handleClick]);

  if (!gameState) return null;

  const isWinningPos = (r: number, c: number) =>
    gameState.winningPositions.some(p => p.row === r && p.col === c);

  return (
    <div className="flex items-center justify-center w-full">
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
            const valid = isValidMove(gameState, { row: r, col: c });
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
            return (
              <Stone
                key={`stone-${r}-${c}`}
                cx={x} cy={y}
                color={player.color}
                playerIndex={playerId}
                isWinning={isWinningPos(r, c)}
                isNew={isNew}
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
