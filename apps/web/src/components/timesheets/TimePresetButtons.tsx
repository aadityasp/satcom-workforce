'use client';

/**
 * TimePresetButtons Component
 *
 * Quick duration selection buttons for timesheet entry.
 */

interface TimePresetButtonsProps {
  onSelect: (minutes: number) => void;
  selectedMinutes?: number;
}

const presets = [
  { label: '30m', minutes: 30 },
  { label: '1h', minutes: 60 },
  { label: '2h', minutes: 120 },
  { label: '4h', minutes: 240 },
];

export function TimePresetButtons({ onSelect, selectedMinutes }: TimePresetButtonsProps) {
  return (
    <div className="flex gap-2">
      {presets.map((p) => (
        <button
          key={p.label}
          type="button"
          onClick={() => onSelect(p.minutes)}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            selectedMinutes === p.minutes
              ? 'bg-blue-600 text-white'
              : 'bg-silver-100 text-silver-600 hover:bg-silver-200'
          }`}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}
