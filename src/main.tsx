import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './components/App'
import { GameProvider } from './context/GameContext'
import { SettingsProvider } from './context/SettingsContext'
import { SharedGameProvider } from './context/SharedGameContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SettingsProvider>
      <GameProvider>
        <SharedGameProvider>
          <App />
        </SharedGameProvider>
      </GameProvider>
    </SettingsProvider>
  </StrictMode>,
)
