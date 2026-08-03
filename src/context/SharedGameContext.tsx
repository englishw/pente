import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import mqtt, { type IClientOptions, type MqttClient } from 'mqtt';
import type { GameState, Position } from '../engine/types';
import { createGame, makeMove } from '../engine/gameEngine';
import { buildSharedGameUrl, getSharedGameCodeFromSearch, normalizeSharedGameCode } from '../utils/sharedGameLinks';
import { PRESET_COLORS } from '../utils/colors';
import { useGame } from './GameContext';

const SHARED_SESSION_KEY = 'pente-shared-session';

export interface BrokerOption {
  id: string;
  label: string;
  url: string;
}

export const SHARED_BROKERS: BrokerOption[] = [
  { id: 'emqx', label: 'broker.emqx.io', url: 'wss://broker.emqx.io:8084/mqtt' },
  { id: 'mosquitto', label: 'test.mosquitto.org', url: 'wss://test.mosquitto.org:8081/mqtt' },
  { id: 'hivemq', label: 'broker.hivemq.com', url: 'wss://broker.hivemq.com:8884/mqtt' },
];

type SharedMode = 'local' | 'shared';
type SharedRole = 'host' | 'guest' | null;
type SharedPhase = 'idle' | 'connecting' | 'lobby' | 'in-game' | 'error';

interface SharedPlayer {
  clientId: string;
  name: string;
  color: string;
  seat: number;
}

interface CreateArgs {
  name: string;
  color: string;
}

interface JoinArgs {
  code: string;
  name: string;
  color: string;
}

interface SharedSessionSnapshot {
  roomCode: string;
  role: 'host' | 'guest';
  brokerId: string;
  playerName: string;
  playerColor: string;
  participantId: string;
}

interface SharedGameContextType {
  mode: SharedMode;
  role: SharedRole;
  phase: SharedPhase;
  error: string | null;
  roomCode: string | null;
  broker: BrokerOption | null;
  players: SharedPlayer[];
  takenColors: string[];
  localSeat: number | null;
  shareLink: string;
  createRoom: (args: CreateArgs) => void;
  joinRoom: (args: JoinArgs) => void;
  startSharedGame: () => void;
  returnSharedToLobby: () => void;
  leaveSharedGame: () => void;
  requestMove: (position: Position) => void;
  canLocalMove: (state: GameState | null) => boolean;
}

const SharedGameContext = createContext<SharedGameContextType>({
  mode: 'local',
  role: null,
  phase: 'idle',
  error: null,
  roomCode: null,
  broker: null,
  players: [],
  takenColors: [],
  localSeat: null,
  shareLink: '/',
  createRoom: () => {},
  joinRoom: () => {},
  startSharedGame: () => {},
  returnSharedToLobby: () => {},
  leaveSharedGame: () => {},
  requestMove: () => {},
  canLocalMove: () => true,
});

function makeCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < 6; i += 1) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}

function getTopic(roomCode: string): string {
  return `pente/shared/v1/${roomCode}`;
}

function normalizeColor(color: string): string {
  return color.trim().toLowerCase();
}

function colorTakenByOther(players: SharedPlayer[], color: string, clientId: string): boolean {
  const wanted = normalizeColor(color);
  return players.some(p => p.clientId !== clientId && normalizeColor(p.color) === wanted);
}

function extractTakenColors(players: SharedPlayer[]): string[] {
  const seen = new Set<string>();
  for (const p of players) {
    const key = normalizeColor(p.color);
    if (key) seen.add(key);
  }
  return Array.from(seen);
}

function safeParse<T>(payload: Uint8Array): T | null {
  try {
    return JSON.parse(payload.toString()) as T;
  } catch {
    return null;
  }
}

function saveSharedSession(snapshot: SharedSessionSnapshot): void {
  try {
    localStorage.setItem(SHARED_SESSION_KEY, JSON.stringify(snapshot));
  } catch {
    // ignore
  }
}

function loadSharedSession(): SharedSessionSnapshot | null {
  try {
    const raw = localStorage.getItem(SHARED_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SharedSessionSnapshot>;
    if (
      typeof parsed.roomCode !== 'string' ||
      (parsed.role !== 'host' && parsed.role !== 'guest') ||
      typeof parsed.brokerId !== 'string' ||
      typeof parsed.playerName !== 'string' ||
      typeof parsed.playerColor !== 'string' ||
      typeof parsed.participantId !== 'string'
    ) {
      return null;
    }

    return {
      roomCode: parsed.roomCode,
      role: parsed.role,
      brokerId: parsed.brokerId,
      playerName: parsed.playerName,
      playerColor: parsed.playerColor,
      participantId: parsed.participantId,
    };
  } catch {
    return null;
  }
}

function clearSharedSession(): void {
  try {
    localStorage.removeItem(SHARED_SESSION_KEY);
  } catch {
    // ignore
  }
}

function makeParticipantId(): string {
  return `p-${Math.random().toString(16).slice(2, 12)}`;
}

export function SharedGameProvider({ children }: { children: ReactNode }) {
  const { gameState, loadExternalGame, placeMoveAction, loadSavedGame } = useGame();

  const [mode, setMode] = useState<SharedMode>('local');
  const [role, setRole] = useState<SharedRole>(null);
  const [phase, setPhase] = useState<SharedPhase>('idle');
  const [error, setError] = useState<string | null>(null);
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [broker, setBroker] = useState<BrokerOption | null>(null);
  const [shareLink, setShareLink] = useState<string>('/');
  const [players, setPlayers] = useState<SharedPlayer[]>([]);
  const [autoJoinPending, setAutoJoinPending] = useState(false);
  const [takenColors, setTakenColors] = useState<string[]>([]);
  const [localSeat, setLocalSeat] = useState<number | null>(null);

  const clientRef = useRef<MqttClient | null>(null);
  const gameStateRef = useRef<GameState | null>(null);
  const roleRef = useRef<SharedRole>(null);
  const phaseRef = useRef<SharedPhase>('idle');
  const roomCodeRef = useRef<string | null>(null);
  const localIdRef = useRef<string>('');
  const selectedBrokerIdRef = useRef<string>(SHARED_BROKERS[0].id);
  const connectAttemptRef = useRef(0);
  const didAutoRestoreRef = useRef(false);

  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  useEffect(() => {
    roleRef.current = role;
  }, [role]);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  const disconnect = useCallback(() => {
    if (clientRef.current) {
      clientRef.current.end(true);
      clientRef.current = null;
    }
  }, []);

  const leaveSharedGame = useCallback(() => {
    connectAttemptRef.current += 1;
    disconnect();
    setMode('local');
    setRole(null);
    setPhase('idle');
    setError(null);
    setRoomCode(null);
    setBroker(null);
    setPlayers([]);
    setTakenColors([]);
    setLocalSeat(null);
    setShareLink('/');
    roomCodeRef.current = null;
    clearSharedSession();
    if (typeof window !== 'undefined') {
      const nextUrl = new URL(window.location.href);
      nextUrl.searchParams.delete('game');
      window.history.replaceState({}, '', `${nextUrl.pathname}${nextUrl.search}`);
    }
  }, [disconnect]);

  const publishRoster = useCallback((nextPlayers: SharedPlayer[], gameStarted: boolean) => {
    const client = clientRef.current;
    const code = roomCodeRef.current;
    if (!client || !code) return;

    client.publish(
      `${getTopic(code)}/roster`,
      JSON.stringify({ type: 'roster', players: nextPlayers, gameStarted }),
      { qos: 1 }
    );
  }, []);

  const publishState = useCallback((nextState: GameState) => {
    const client = clientRef.current;
    const code = roomCodeRef.current;
    if (!client || !code) return;

    client.publish(
      `${getTopic(code)}/state`,
      JSON.stringify({ type: 'state', gameState: nextState }),
      { qos: 1 }
    );
  }, []);

  const publishJoinDenied = useCallback((clientId: string, reason: string, colors: string[]) => {
    const client = clientRef.current;
    const code = roomCodeRef.current;
    if (!client || !code) return;

    client.publish(
      `${getTopic(code)}/join-denied`,
      JSON.stringify({ type: 'join-denied', clientId, reason, takenColors: colors }),
      { qos: 1 }
    );
  }, []);

  const applyHostMove = useCallback((seat: number, position: Position) => {
    const current = gameStateRef.current;
    if (!current || current.gameOver) return;
    if (current.currentPlayerIndex !== seat) return;

    const next = makeMove(current, position);
    if (next === current) return;

    loadExternalGame(next);
    publishState(next);
  }, [loadExternalGame, publishState]);

  const handleMessage = useCallback((topic: string, payload: Uint8Array) => {
    const code = roomCodeRef.current;
    if (!code) return;

    const base = getTopic(code);

    if (topic === `${base}/join` && roleRef.current === 'host') {
      const msg = safeParse<{ type: 'join'; player: Omit<SharedPlayer, 'seat'> }>(payload);
      if (!msg || msg.type !== 'join') return;

      setPlayers(prev => {
        if (colorTakenByOther(prev, msg.player.color, msg.player.clientId)) {
          publishJoinDenied(
            msg.player.clientId,
            'That color is already taken. Pick a different color.',
            extractTakenColors(prev)
          );
          return prev;
        }

        const existing = prev.find(p => p.clientId === msg.player.clientId);
        let nextPlayers = prev;
        if (existing) {
          nextPlayers = prev.map(p => p.clientId === msg.player.clientId
            ? { ...p, name: msg.player.name, color: msg.player.color }
            : p);
        } else if (prev.length < 4) {
          nextPlayers = [...prev, {
            clientId: msg.player.clientId,
            name: msg.player.name,
            color: msg.player.color,
            seat: prev.length,
          }];
        }

        setTakenColors(extractTakenColors(nextPlayers));
        publishRoster(nextPlayers, phaseRef.current === 'in-game');
        return nextPlayers;
      });
      return;
    }

    if (topic === `${base}/join-denied`) {
      const msg = safeParse<{ type: 'join-denied'; clientId: string; reason: string; takenColors?: string[] }>(payload);
      if (!msg || msg.type !== 'join-denied') return;
      if (msg.clientId !== localIdRef.current) return;
      if (Array.isArray(msg.takenColors)) {
        setTakenColors(msg.takenColors.map(normalizeColor));
      }
      setError(msg.reason || 'Unable to join with the selected color.');
      setPhase('error');
      return;
    }

    if (topic === `${base}/roster`) {
      const msg = safeParse<{ type: 'roster'; players: SharedPlayer[]; gameStarted: boolean }>(payload);
      if (!msg || msg.type !== 'roster') return;
      setPlayers(msg.players);
      setTakenColors(extractTakenColors(msg.players));
      const mine = msg.players.find(p => p.clientId === localIdRef.current);
      setLocalSeat(mine?.seat ?? null);
      setPhase(msg.gameStarted ? 'in-game' : 'lobby');
      return;
    }

    if (topic === `${base}/start`) {
      const msg = safeParse<{ type: 'start'; gameState: GameState; players: SharedPlayer[] }>(payload);
      if (!msg || msg.type !== 'start') return;
      setPlayers(msg.players);
      setTakenColors(extractTakenColors(msg.players));
      const mine = msg.players.find(p => p.clientId === localIdRef.current);
      setLocalSeat(mine?.seat ?? null);
      loadExternalGame(msg.gameState);
      setPhase('in-game');
      return;
    }

    if (topic === `${base}/state`) {
      const msg = safeParse<{ type: 'state'; gameState: GameState }>(payload);
      if (!msg || msg.type !== 'state') return;
      loadExternalGame(msg.gameState);
      return;
    }

    if (topic === `${base}/move` && roleRef.current === 'host') {
      const msg = safeParse<{ type: 'move'; seat: number; position: Position }>(payload);
      if (!msg || msg.type !== 'move') return;
      applyHostMove(msg.seat, msg.position);
    }
  }, [applyHostMove, loadExternalGame, publishJoinDenied, publishRoster]);

  const connectToBroker = useCallback((onConnected: () => void, preferredBrokerId?: string) => {
    const attemptToken = ++connectAttemptRef.current;
    const participantId = localIdRef.current || makeParticipantId();
    localIdRef.current = participantId;
    const clientId = `pente-${participantId}`;
    let attemptIndex = 0;
    const preferredIndex = preferredBrokerId
      ? SHARED_BROKERS.findIndex(b => b.id === preferredBrokerId)
      : -1;
    const brokerOrder = preferredIndex >= 0
      ? [SHARED_BROKERS[preferredIndex], ...SHARED_BROKERS.filter((_, i) => i !== preferredIndex)]
      : SHARED_BROKERS;

    const tryConnect = () => {
      const selected = brokerOrder[attemptIndex];
      if (!selected) {
        setError('Could not connect to any public MQTT broker.');
        setPhase('error');
        return;
      }

      setBroker(selected);

      const options: IClientOptions = {
        clientId,
        clean: true,
        connectTimeout: 7000,
        reconnectPeriod: 0,
        keepalive: 30,
      };

      const client = mqtt.connect(selected.url, options);
      let settled = false;

      const failAndRetry = () => {
        if (settled) return;
        if (attemptToken !== connectAttemptRef.current) return;
        settled = true;
        client.end(true);
        attemptIndex += 1;
        tryConnect();
      };

      const timeout = window.setTimeout(failAndRetry, 8000);

      client.on('connect', () => {
        if (attemptToken !== connectAttemptRef.current) {
          client.end(true);
          return;
        }
        const code = roomCodeRef.current;
        if (!code) {
          failAndRetry();
          return;
        }

        client.subscribe(`${getTopic(code)}/#`, { qos: 1 }, err => {
          if (settled) return;
          if (attemptToken !== connectAttemptRef.current) {
            client.end(true);
            return;
          }
          if (err) {
            window.clearTimeout(timeout);
            failAndRetry();
            return;
          }

          settled = true;
          window.clearTimeout(timeout);

          if (clientRef.current && clientRef.current !== client) {
            clientRef.current.end(true);
          }

          clientRef.current = client;
          selectedBrokerIdRef.current = selected.id;
          setError(null);
          onConnected();
        });
      });

      client.on('message', (topic, payload) => {
        if (attemptToken !== connectAttemptRef.current) return;
        handleMessage(topic, payload);
      });

      client.on('error', () => {
        window.clearTimeout(timeout);
        failAndRetry();
      });
    };

    tryConnect();
  }, [handleMessage]);

  const createRoom = useCallback(({ name, color }: CreateArgs) => {
    const hostName = name.trim() || 'Host';
    if (!localIdRef.current) {
      localIdRef.current = makeParticipantId();
    }
    const room = makeCode();
    roomCodeRef.current = room;

    setMode('shared');
    setRole('host');
    setPhase('connecting');
    setError(null);
    setRoomCode(room);

    connectToBroker(() => {
      const host: SharedPlayer = {
        clientId: localIdRef.current,
        name: hostName,
        color,
        seat: 0,
      };
      setPlayers([host]);
      setTakenColors(extractTakenColors([host]));
      setLocalSeat(0);
      saveSharedSession({
        roomCode: room,
        role: 'host',
        brokerId: selectedBrokerIdRef.current,
        playerName: hostName,
        playerColor: color,
        participantId: localIdRef.current,
      });
      publishRoster([host], false);
      setPhase('lobby');
    });
  }, [connectToBroker, publishRoster]);

  const joinRoom = useCallback(({ code, name, color }: JoinArgs) => {
    const room = normalizeSharedGameCode(code);
    const guestName = name.trim() || 'Guest';
    if (!localIdRef.current) {
      localIdRef.current = makeParticipantId();
    }

    if (room.length !== 6) {
      setError('Game code must be exactly 6 characters.');
      return;
    }

    roomCodeRef.current = room;

    setMode('shared');
    setRole('guest');
    setPhase('connecting');
    setError(null);
    setRoomCode(room);

    connectToBroker(() => {
      const client = clientRef.current;
      if (!client) return;

      client.publish(
        `${getTopic(room)}/join`,
        JSON.stringify({
          type: 'join',
          player: {
            clientId: localIdRef.current,
            name: guestName,
            color,
          },
        }),
        { qos: 1 }
      );
      saveSharedSession({
        roomCode: room,
        role: 'guest',
        brokerId: selectedBrokerIdRef.current,
        playerName: guestName,
        playerColor: color,
        participantId: localIdRef.current,
      });
      setPhase('lobby');
    });
  }, [connectToBroker]);

  const startSharedGame = useCallback(() => {
    if (role !== 'host' || players.length < 2) return;

    const seen = new Set<string>();
    for (const p of players) {
      const key = normalizeColor(p.color);
      if (seen.has(key)) {
        setError('Two players cannot share the same color.');
        return;
      }
      seen.add(key);
    }

    const sorted = [...players].sort((a, b) => a.seat - b.seat);
    const config = {
      playerCount: sorted.length,
      playerNames: sorted.map(p => p.name),
      playerColors: sorted.map(p => p.color),
    };

    const initial = createGame(config);
    loadExternalGame(initial);

    const client = clientRef.current;
    const code = roomCodeRef.current;
    if (!client || !code) return;

    client.publish(
      `${getTopic(code)}/start`,
      JSON.stringify({ type: 'start', gameState: initial, players: sorted }),
      { qos: 1 }
    );

    publishRoster(sorted, true);
    setPhase('in-game');
  }, [loadExternalGame, players, publishRoster, role]);

  const returnSharedToLobby = useCallback(() => {
    if (mode !== 'shared' || role !== 'host') return;
    publishRoster(players, false);
    setPhase('lobby');
  }, [mode, players, publishRoster, role]);

  const requestMove = useCallback((position: Position) => {
    if (mode === 'local') {
      placeMoveAction(position);
      return;
    }

    if (phase !== 'in-game') return;
    if (localSeat === null) return;

    if (role === 'host') {
      applyHostMove(localSeat, position);
      return;
    }

    const client = clientRef.current;
    const code = roomCodeRef.current;
    if (!client || !code) return;

    client.publish(
      `${getTopic(code)}/move`,
      JSON.stringify({ type: 'move', seat: localSeat, position }),
      { qos: 1 }
    );
  }, [applyHostMove, localSeat, mode, phase, placeMoveAction, role]);

  const canLocalMove = useCallback((state: GameState | null): boolean => {
    if (!state || state.gameOver) return false;
    if (mode === 'local') return true;
    if (phase !== 'in-game') return false;
    return localSeat !== null && localSeat === state.currentPlayerIndex;
  }, [localSeat, mode, phase]);

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  useEffect(() => {
    if (didAutoRestoreRef.current) return;
    didAutoRestoreRef.current = true;

    const snapshot = loadSharedSession();
    if (!snapshot) return;

    const room = normalizeSharedGameCode(snapshot.roomCode);
    if (room.length !== 6) {
      clearSharedSession();
      return;
    }

    localIdRef.current = snapshot.participantId;

    roomCodeRef.current = room;
    setMode('shared');
    setRole(snapshot.role);
    setPhase('connecting');
    setError(null);
    setRoomCode(room);

    // Restore cached board immediately while live sync reconnects.
    const hadSavedGame = loadSavedGame();

    connectToBroker(() => {
      const client = clientRef.current;
      if (!client) return;

      if (snapshot.role === 'host') {
        setPlayers(prev => {
          const existing = prev.find(p => p.clientId === localIdRef.current);
          const hostPlayer: SharedPlayer = existing ?? {
            clientId: localIdRef.current,
            name: snapshot.playerName,
            color: snapshot.playerColor,
            seat: 0,
          };
          const others = prev.filter(p => p.clientId !== localIdRef.current);
          const nextPlayers = [hostPlayer, ...others].slice(0, 4).map((p, idx) => ({ ...p, seat: idx }));
          setTakenColors(extractTakenColors(nextPlayers));
          setLocalSeat(0);
          const gameStarted = hadSavedGame && !!gameStateRef.current && !gameStateRef.current.gameOver;
          publishRoster(nextPlayers, gameStarted);
          if (gameStateRef.current && gameStarted) {
            publishState(gameStateRef.current);
            setPhase('in-game');
          } else {
            setPhase('lobby');
          }
          return nextPlayers;
        });
        return;
      }

      client.publish(
        `${getTopic(room)}/join`,
        JSON.stringify({
          type: 'join',
          player: {
            clientId: localIdRef.current,
            name: snapshot.playerName,
            color: snapshot.playerColor,
          },
        }),
        { qos: 1 }
      );
      setPhase('lobby');
    }, snapshot.brokerId);
  }, [connectToBroker, loadSavedGame, publishRoster, publishState]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const codeFromUrl = getSharedGameCodeFromSearch(window.location.search);
    if (codeFromUrl) {
      setShareLink(buildSharedGameUrl(codeFromUrl));
      if (!roomCodeRef.current) {
        roomCodeRef.current = codeFromUrl;
        setRoomCode(codeFromUrl);
      }
      setAutoJoinPending(true);
    }
  }, []);

  useEffect(() => {
    if (!roomCode) {
      setShareLink('/');
      return;
    }
    const nextLink = buildSharedGameUrl(roomCode);
    setShareLink(nextLink);
    if (typeof window !== 'undefined') {
      const nextUrl = new URL(window.location.href);
      nextUrl.searchParams.set('game', roomCode);
      window.history.replaceState({}, '', `${nextUrl.pathname}${nextUrl.search}`);
    }
  }, [roomCode]);

  useEffect(() => {
    if (!autoJoinPending || !roomCode || mode === 'shared') return;

    const existing = loadSharedSession();
    if (existing?.roomCode === roomCode) {
      setAutoJoinPending(false);
      return;
    }

    const joinUrlCode = roomCode;
    const pendingName = existing?.playerName || 'Guest';
    const pendingColor = existing?.playerColor || PRESET_COLORS[0];
    setAutoJoinPending(false);
    joinRoom({ code: joinUrlCode, name: pendingName, color: pendingColor });
  }, [autoJoinPending, joinRoom, mode, roomCode]);

  const value = useMemo(() => ({
    mode,
    role,
    phase,
    error,
    roomCode,
    broker,
    players,
    takenColors,
    localSeat,
    shareLink,
    createRoom,
    joinRoom,
    startSharedGame,
    returnSharedToLobby,
    leaveSharedGame,
    requestMove,
    canLocalMove,
  }), [
    mode,
    role,
    phase,
    error,
    roomCode,
    broker,
    players,
    takenColors,
    localSeat,
    createRoom,
    joinRoom,
    startSharedGame,
    returnSharedToLobby,
    leaveSharedGame,
    requestMove,
    canLocalMove,
    shareLink,
  ]);

  return (
    <SharedGameContext.Provider value={value}>
      {children}
    </SharedGameContext.Provider>
  );
}

export function useSharedGame() {
  return useContext(SharedGameContext);
}
