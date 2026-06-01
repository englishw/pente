import { useSettings } from '../context/SettingsContext';

interface SettingsProps {
  onBack: () => void;
}

export default function Settings({ onBack }: SettingsProps) {
  const { settings, updateSettings } = useSettings();

  return (
    <div className="max-w-md mx-auto p-6 fade-in">
      <h2 className="text-3xl font-bold text-amber-400 mb-6">Settings</h2>

      <div className="flex flex-col gap-4">
        <Toggle
          label="Show Coordinates"
          checked={settings.showCoordinates}
          onChange={v => updateSettings({ showCoordinates: v })}
        />
        <Toggle
          label="Sound Effects"
          checked={settings.soundEnabled}
          onChange={v => updateSettings({ soundEnabled: v })}
        />
        <Toggle
          label="High Contrast Mode"
          checked={settings.highContrast}
          onChange={v => updateSettings({ highContrast: v })}
        />
        <Toggle
          label="Color-Blind Mode"
          checked={settings.colorBlindMode}
          onChange={v => updateSettings({ colorBlindMode: v })}
        />

        <div className="bg-slate-700/50 rounded-lg p-4">
          <label className="text-slate-200 font-medium block mb-2">Animation Speed</label>
          <div className="flex gap-2">
            {[
              { value: 0.5, label: 'Slow' },
              { value: 1, label: 'Normal' },
              { value: 2, label: 'Fast' },
            ].map(opt => (
              <button
                key={opt.value}
                className={`btn btn-sm flex-1 ${settings.animationSpeed === opt.value ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => updateSettings({ animationSpeed: opt.value })}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <button className="btn btn-secondary mt-6" onClick={onBack}>← Back</button>
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between bg-slate-700/50 rounded-lg p-4 cursor-pointer">
      <span className="text-slate-200 font-medium">{label}</span>
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative w-11 h-6 rounded-full transition-colors ${checked ? 'bg-amber-500' : 'bg-slate-500'}`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${checked ? 'translate-x-5' : ''}`}
        />
      </button>
    </label>
  );
}
