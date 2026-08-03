import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import mqtt, { type IClientOptions, type MqttClient } from 'mqtt';
import type { GameState, Position } from '../engine/types';
import { createGame, makeMove } from '../engine/gameEngine';
import { useGame } from './GameContext';

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

interface SharedGameContextType {
  mode: SharedMode;
  role: SharedRole;
  phase: SharedPhase;
  error: string | null;
  roomCode: string | null;
  broker: BrokerOption | null;
  players: SharedPlayer[];
  localSeat: number | null;
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
  localSeat: null,
  createRoom: () => {},
  joinRoom: () => {},
  startSharedGame: () => {},
  returnSharedToLobby: () => {},
  leaveSharedGame: () => {},
  requestMove: () => {},
  canLocalMove: () => true,
});

function normalizeCode(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
}

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

function safeParse<T>(payload: Uint8Array): T | null {
  try {
    return JSON.parse(payload.toString()) as T;
  } catch {
    return null;
  }
}

export function SharedGameProvider({ children }: { children: ReactNode }) {
  const { gameState, loadExternalGame, placeMoveAction } = useGame();

  const [mode, setMode] = useState<SharedMode>('local');
  const [role, setRole] = useState<SharedRole>(null);
  const [phase, setPhase] = useState<SharedPhase>('idle');
  const [error, setError] = useState<string | null>(null);
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [broker, setBroker] = useState<BrokerOption | null>(null);
  const [players, setPlayers] = useState<SharedPlayer[]>([]);
  const [localSeat, setLocalSeat] = useState<number | null>(null);

  const clientRef = useRef<MqttClient | null>(null);
  const gameStateRef = useRef<GameState | null>(null);
  const roleRef = useRef<SharedRole>(null);
  const roomCodeRef = useRef<string | null>(null);
  const localIdRef = useRef<string>('');
  const connectAttemptRef = useRef(0);

  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  useEffect(() => {
    roleRef.current = role;
  }, [role]);

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
    setLocalSeat(null);
    roomCodeRef.current = null;
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

        publishRoster(nextPlayers, phase === 'in-game');
        return nextPlayers;
      });
      return;
    }

    if (topic === `${base}/roster`) {
      const msg = safeParse<{ type: 'roster'; players: SharedPlayer[]; gameStarted: boolean }>(payload);
      if (!msg || msg.type !== 'roster') return;
      setPlayers(msg.players);
      const mine = msg.players.find(p => p.clientId === localIdRef.current);
      setLocalSeat(mine?.seat ?? null);
      setPhase(msg.gameStarted ? 'in-game' : 'lobby');
      return;
    }

    if (topic === `${base}/start`) {
      const msg = safeParse<{ type: 'start'; gameState: GameState; players: SharedPlayer[] }>(payload);
      if (!msg || msg.type !== 'start') return;
      setPlayers(msg.players);
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
  }, [applyHostMove, loadExternalGame, phase, publishRoster]);

  const connectToBroker = useCallback((onConnected: () => void) => {
    const attemptToken = ++connectAttemptRef.current;
    const clientId = `pente-${Math.random().toString(16).slice(2, 10)}`;
    localIdRef.current = clientId;
    let attemptIndex = 0;

    const tryConnect = () => {
      const selected = SHARED_BROKERS[attemptIndex];
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
      setLocalSeat(0);
      publishRoster([host], false);
      setPhase('lobby');
    });
  }, [connectToBroker, publishRoster]);

  const joinRoom = useCallback(({ code, name, color }: JoinArgs) => {
    const room = normalizeCode(code);
    const guestName = name.trim() || 'Guest';

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
      setPhase('lobby');
    });
  }, [connectToBroker]);

  const startSharedGame = useCallback(() => {
    if (role !== 'host' || players.length < 2) return;

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

  const value = useMemo(() => ({
    mode,
    role,
    phase,
    error,
    roomCode,
    broker,
    players,
    localSeat,
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
    localSeat,
    createRoom,
    joinRoom,
    startSharedGame,
    returnSharedToLobby,
    leaveSharedGame,
    requestMove,
    canLocalMove,
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
