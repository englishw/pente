import type { GameState } from '../engine/types';

const GAME_KEY = 'pente-game';
const SETTINGS_KEY = 'pente-settings';

export const APP_VERSION = 'v0.12';

export interface Settings {
  showCoordinates: boolean;
  soundEnabled: boolean;
  animationSpeed: number; // 0.5 | 1 | 2
  highContrast: boolean;
  colorBlindMode: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  showCoordinates: true,
  soundEnabled: true,
  animationSpeed: 1,
  highContrast: false,
  colorBlindMode: false,
};

export function saveGame(state: GameState): void {
  try {
    localStorage.setItem(GAME_KEY, JSON.stringify(state));
  } catch {
    // Storage full or unavailable
  }
}

export function loadGame(): GameState | null {
  try {
    const data = localStorage.getItem(GAME_KEY);
    if (!data) return null;
    const parsed = JSON.parse(data) as GameState;

    if (Array.isArray(parsed.players)) {
      parsed.players = parsed.players.map(player => ({
        ...player,
        capturedStones: Array.isArray(player.capturedStones) ? player.capturedStones : [],
      }));
    }

    if (Array.isArray(parsed.moves)) {
      parsed.moves = parsed.moves.map(move => ({
        ...move,
        capturedStonePlayerIds: Array.isArray(move.capturedStonePlayerIds)
          ? move.capturedStonePlayerIds
          : [],
      }));
    }

    return parsed;
  } catch {
    return null;
  }
}

export function clearGame(): void {
  try {
    localStorage.removeItem(GAME_KEY);
  } catch {
    // ignore
  }
}

export function hasSavedGame(): boolean {
  try {
    return localStorage.getItem(GAME_KEY) !== null;
  } catch {
    return false;
  }
}

export function saveSettings(settings: Settings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // ignore
  }
}

export function loadSettings(): Settings {
  try {
    const data = localStorage.getItem(SETTINGS_KEY);
    if (!data) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(data) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}
