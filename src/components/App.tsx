import { useState, useCallback, useEffect } from 'react';
import { useGame } from '../context/GameContext';
import { useSharedGame } from '../context/SharedGameContext';
import type { GameConfig } from '../engine/types';
import MainMenu from './MainMenu';
import GameSetup from './GameSetup';
import GameView from './GameView';
import Rules from './Rules';
import Settings from './Settings';
import SharedGameSetup from './SharedGameSetup';

type Screen = 'menu' | 'setup' | 'shared' | 'game' | 'rules' | 'settings';

export default function App() {
  const [screen, setScreen] = useState<Screen>('menu');
  const [prevScreen, setPrevScreen] = useState<Screen>('menu');
  const { startGame, loadSavedGame } = useGame();
  const { phase, mode, leaveSharedGame } = useSharedGame();

  const goTo = useCallback((s: Screen) => {
    setPrevScreen(screen);
    setScreen(s);
  }, [screen]);

  const handleStartGame = useCallback((config: GameConfig) => {
    startGame(config);
    setScreen('game');
  }, [startGame]);

  const handleResume = useCallback(() => {
    if (loadSavedGame()) {
      setScreen('game');
    }
  }, [loadSavedGame]);

  const handleSettingsBack = useCallback(() => {
    setScreen(prevScreen === 'settings' ? 'menu' : prevScreen);
  }, [prevScreen]);

  useEffect(() => {
    if (mode !== 'shared') return;
    if (phase === 'in-game') {
      setScreen('game');
      return;
    }
    if (phase === 'lobby' && screen === 'game') {
      setScreen('shared');
    }
  }, [mode, phase, screen]);

  const handleMenuFromGame = useCallback(() => {
    if (mode === 'shared') {
      leaveSharedGame();
    }
    goTo('menu');
  }, [goTo, leaveSharedGame, mode]);

  const handleSharedBack = useCallback(() => {
    if (mode === 'shared') {
      leaveSharedGame();
    }
    goTo('menu');
  }, [goTo, leaveSharedGame, mode]);

  return (
    <div className="h-full flex flex-col">
      {screen === 'menu' && (
        <MainMenu
          onNewGame={() => goTo('setup')}
          onSharedGame={() => goTo('shared')}
          onResume={handleResume}
          onRules={() => goTo('rules')}
          onSettings={() => goTo('settings')}
        />
      )}
      {screen === 'setup' && (
        <GameSetup
          onStart={handleStartGame}
          onBack={() => goTo('menu')}
        />
      )}
      {screen === 'shared' && (
        <SharedGameSetup onBack={handleSharedBack} />
      )}
      {screen === 'game' && (
        <GameView
          onMenu={handleMenuFromGame}
          onNewGame={() => goTo('setup')}
          onSettings={() => goTo('settings')}
        />
      )}
      {screen === 'rules' && (
        <Rules onBack={() => goTo('menu')} />
      )}
      {screen === 'settings' && (
        <Settings onBack={handleSettingsBack} />
      )}
    </div>
  );
}
