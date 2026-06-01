import { useState, useCallback } from 'react';
import { useGame } from '../context/GameContext';
import type { GameConfig } from '../engine/types';
import MainMenu from './MainMenu';
import GameSetup from './GameSetup';
import GameView from './GameView';
import Rules from './Rules';
import Settings from './Settings';

type Screen = 'menu' | 'setup' | 'game' | 'rules' | 'settings';

export default function App() {
  const [screen, setScreen] = useState<Screen>('menu');
  const [prevScreen, setPrevScreen] = useState<Screen>('menu');
  const { startGame, loadSavedGame } = useGame();

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

  return (
    <div className="h-full flex flex-col">
      {screen === 'menu' && (
        <MainMenu
          onNewGame={() => goTo('setup')}
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
      {screen === 'game' && (
        <GameView
          onMenu={() => goTo('menu')}
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
