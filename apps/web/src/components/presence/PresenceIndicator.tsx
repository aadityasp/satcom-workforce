'use client';

import { PresenceStatus } from '@/store/presence';

interface PresenceIndicatorProps {
  status: PresenceStatus;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  pulse?: boolean;
}

const statusColors: Record<PresenceStatus, string> = {
  Online: 'bg-success',
  Away: 'bg-warning',
  Offline: 'bg-silver-400',
  Busy: 'bg-error',
};

const statusLabels: Record<PresenceStatus, string> = {
  Online: 'Online',
  Away: 'Away',
  Offline: 'Offline',
  Busy: 'Busy',
};

const sizes = {
  sm: 'w-2 h-2',
  md: 'w-3 h-3',
  lg: 'w-4 h-4',
};

export function PresenceIndicator({
  status,
  size = 'md',
  showLabel = false,
  pulse = false,
}: PresenceIndicatorProps) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="relative">
        <div
          className={`${sizes[size]} ${statusColors[status]} rounded-full border-2 border-white`}
          title={statusLabels[status]}
        />
        {pulse && status === 'Online' && (
          <div
            className={`absolute inset-0 ${sizes[size]} ${statusColors[status]} rounded-full animate-ping opacity-75`}
          />
        )}
      </div>
      {showLabel && (
        <span className="text-xs text-silver-600">{statusLabels[status]}</span>
      )}
    </div>
  );
}
