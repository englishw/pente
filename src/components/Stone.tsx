import { useSettings } from '../context/SettingsContext';
import { CB_SHAPES } from '../utils/colors';

interface StoneProps {
  cx: number;
  cy: number;
  color: string;
  playerIndex: number;
  isWinning?: boolean;
  isNew?: boolean;
  isRecent?: boolean;
  isThreat?: boolean;
  isCaptureTrigger?: boolean;
  radius?: number;
}

export default function Stone({
  cx,
  cy,
  color,
  playerIndex,
  isWinning,
  isNew,
  isRecent,
  isThreat,
  isCaptureTrigger,
  radius = 8.5,
}: StoneProps) {
  const { settings } = useSettings();
  const gradId = `stone-grad-${cx}-${cy}`;
  const isLight = color === '#f5f5f5' || color === '#ffffff' || color === '#E69F00';

  return (
    <g
      className={`${isNew ? 'stone-enter' : ''} ${isWinning ? 'stone-winning' : ''}`}
      style={{ transformOrigin: `${cx}px ${cy}px` }}
    >
      {isThreat && (
        <circle
          cx={cx}
          cy={cy}
          r={radius + 2.8}
          fill="none"
          stroke="rgba(96,165,250,0.92)"
          strokeWidth="1.4"
          className="stone-threat-ring"
        />
      )}
      {isWinning && (
        <circle
          cx={cx}
          cy={cy}
          r={radius + 3}
          fill="none"
          stroke="rgba(251,191,36,0.95)"
          strokeWidth="1.6"
          className="stone-winning-ring"
        />
      )}
      {isCaptureTrigger && (
        <circle
          cx={cx}
          cy={cy}
          r={radius + 3.4}
          fill="none"
          stroke="rgba(248,113,113,0.95)"
          strokeWidth="1.8"
          className="stone-capture-ring"
        />
      )}
      <defs>
        <radialGradient id={gradId} cx="35%" cy="35%">
          <stop offset="0%" stopColor={isLight ? '#ffffff' : '#666666'} stopOpacity="0.8" />
          <stop offset="100%" stopColor={color} />
        </radialGradient>
      </defs>
      <circle
        cx={cx}
        cy={cy}
        r={radius}
        fill={`url(#${gradId})`}
        stroke={isLight ? '#999' : '#333'}
        strokeWidth="0.5"
      />
      {isRecent && (
        <circle
          cx={cx}
          cy={cy}
          r={radius + 1.6}
          fill="none"
          stroke="rgba(245,158,11,0.95)"
          strokeWidth="1.2"
          className="stone-recent-ring"
        />
      )}
      {settings.colorBlindMode && (
        <CBMarker cx={cx} cy={cy} shape={CB_SHAPES[playerIndex % CB_SHAPES.length]} isLight={isLight} />
      )}
    </g>
  );
}

function CBMarker({ cx, cy, shape, isLight }: { cx: number; cy: number; shape: string; isLight: boolean }) {
  const color = isLight ? '#333' : '#fff';
  const size = 3.5;

  switch (shape) {
    case 'circle':
      return <circle cx={cx} cy={cy} r={size * 0.6} fill="none" stroke={color} strokeWidth="1.2" />;
    case 'cross':
      return (
        <g stroke={color} strokeWidth="1.2" strokeLinecap="round">
          <line x1={cx - size} y1={cy - size} x2={cx + size} y2={cy + size} />
          <line x1={cx + size} y1={cy - size} x2={cx - size} y2={cy + size} />
        </g>
      );
    case 'triangle':
      return (
        <polygon
          points={`${cx},${cy - size} ${cx - size},${cy + size * 0.7} ${cx + size},${cy + size * 0.7}`}
          fill="none" stroke={color} strokeWidth="1.2"
        />
      );
    case 'square':
      return (
        <rect
          x={cx - size * 0.7} y={cy - size * 0.7}
          width={size * 1.4} height={size * 1.4}
          fill="none" stroke={color} strokeWidth="1.2"
        />
      );
    default:
      return null;
  }
}
