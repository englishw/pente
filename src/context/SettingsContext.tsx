import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { type Settings, DEFAULT_SETTINGS, loadSettings, saveSettings } from '../utils/storage';

interface SettingsContextType {
  settings: Settings;
  updateSettings: (partial: Partial<Settings>) => void;
}

const SettingsContext = createContext<SettingsContextType>({
  settings: DEFAULT_SETTINGS,
  updateSettings: () => {},
});

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(loadSettings);

  useEffect(() => {
    saveSettings(settings);
    document.documentElement.style.setProperty(
      '--animation-speed',
      String(1 / settings.animationSpeed)
    );
    document.documentElement.classList.toggle('high-contrast', settings.highContrast);
  }, [settings]);

  const updateSettings = (partial: Partial<Settings>) => {
    setSettings(prev => ({ ...prev, ...partial }));
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}
