'use client';

/**
 * TimelineEventList Component
 *
 * Displays a chronological list of attendance events and breaks.
 */

import { motion } from 'framer-motion';
import {
  LogIn,
  LogOut,
  Coffee,
  UtensilsCrossed,
  Clock,
  MapPin,
  AlertTriangle,
} from 'lucide-react';
import type { AttendanceDay, AttendanceEvent, BreakSegment } from '@/hooks/useAttendance';

interface TimelineEventListProps {
  attendance: AttendanceDay;
}

interface TimelineItem {
  id: string;
  type: 'CheckIn' | 'CheckOut' | 'BreakStart' | 'BreakEnd' | 'LunchStart' | 'LunchEnd';
  timestamp: Date;
  data: AttendanceEvent | BreakSegment;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0) {
    return `${hours}h ${mins}m`;
  }
  return `${mins}m`;
}

function getEventIcon(type: TimelineItem['type']) {
  switch (type) {
    case 'CheckIn':
      return <LogIn size={18} className="text-success" />;
    case 'CheckOut':
      return <LogOut size={18} className="text-error" />;
    case 'BreakStart':
    case 'BreakEnd':
      return <Coffee size={18} className="text-orange-500" />;
    case 'LunchStart':
    case 'LunchEnd':
      return <UtensilsCrossed size={18} className="text-amber-500" />;
    default:
      return <Clock size={18} className="text-silver-400" />;
  }
}

function getEventColor(type: TimelineItem['type']): string {
  switch (type) {
    case 'CheckIn':
      return 'bg-success-light border-success';
    case 'CheckOut':
      return 'bg-error-light border-error';
    case 'BreakStart':
    case 'BreakEnd':
      return 'bg-orange-50 border-orange-300';
    case 'LunchStart':
    case 'LunchEnd':
      return 'bg-amber-50 border-amber-300';
    default:
      return 'bg-silver-50 border-silver-200';
  }
}

export function TimelineEventList({ attendance }: TimelineEventListProps) {
  // Build timeline items from events and breaks
  const timelineItems: TimelineItem[] = [];

  // Add check-in/out events
  attendance.events.forEach((event) => {
    timelineItems.push({
      id: event.id,
      type: event.type,
      timestamp: new Date(event.timestamp),
      data: event,
    });
  });

  // Add break start/end events
  attendance.breaks.forEach((breakSegment) => {
    const isLunch = breakSegment.type === 'Lunch';

    timelineItems.push({
      id: `${breakSegment.id}-start`,
      type: isLunch ? 'LunchStart' : 'BreakStart',
      timestamp: new Date(breakSegment.startTime),
      data: breakSegment,
    });

    if (breakSegment.endTime) {
      timelineItems.push({
        id: `${breakSegment.id}-end`,
        type: isLunch ? 'LunchEnd' : 'BreakEnd',
        timestamp: new Date(breakSegment.endTime),
        data: breakSegment,
      });
    }
  });

  // Sort by timestamp
  timelineItems.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  if (timelineItems.length === 0) {
    return (
      <div className="text-center py-8 text-silver-400">
        <Clock size={32} className="mx-auto mb-2" />
        <p>No events yet today</p>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Vertical line */}
      <div className="absolute left-5 top-6 bottom-6 w-px bg-silver-200" />

      <div className="space-y-4">
        {timelineItems.map((item, index) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="flex items-start gap-3"
          >
            {/* Icon circle */}
            <div
              className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center border-2 ${getEventColor(
                item.type
              )}`}
            >
              {getEventIcon(item.type)}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p className="font-medium text-navy-900">
                  {item.type === 'CheckIn' && 'Checked In'}
                  {item.type === 'CheckOut' && 'Checked Out'}
                  {item.type === 'BreakStart' && 'Break Started'}
                  {item.type === 'BreakEnd' && 'Break Ended'}
                  {item.type === 'LunchStart' && 'Lunch Started'}
                  {item.type === 'LunchEnd' && 'Lunch Ended'}
                </p>
                <p className="text-sm text-silver-500">{formatTime(item.timestamp)}</p>
              </div>

              {/* Additional details */}
              <div className="text-sm text-silver-500 mt-0.5">
                {(item.type === 'CheckIn' || item.type === 'CheckOut') && (
                  <div className="flex items-center gap-3">
                    {(item.data as AttendanceEvent).workMode && (
                      <span className="flex items-center gap-1">
                        <MapPin size={14} />
                        {(item.data as AttendanceEvent).workMode}
                      </span>
                    )}
                    {(item.data as AttendanceEvent).verificationStatus !== 'None' && (
                      <span
                        className={`flex items-center gap-1 ${
                          (item.data as AttendanceEvent).verificationStatus.includes('Passed')
                            ? 'text-success'
                            : 'text-warning'
                        }`}
                      >
                        {(item.data as AttendanceEvent).verificationStatus.includes('Failed') && (
                          <AlertTriangle size={14} />
                        )}
                        {(item.data as AttendanceEvent).verificationStatus.replace('Geofence', '')}
                      </span>
                    )}
                  </div>
                )}

                {(item.type === 'BreakEnd' || item.type === 'LunchEnd') &&
                  (item.data as BreakSegment).durationMinutes && (
                    <span>Duration: {formatDuration((item.data as BreakSegment).durationMinutes!)}</span>
                  )}

                {(item.type === 'BreakStart' || item.type === 'LunchStart') &&
                  !(item.data as BreakSegment).endTime && (
                    <span className="text-warning">Currently on break</span>
                  )}
              </div>

              {/* Notes */}
              {(item.type === 'CheckIn' || item.type === 'CheckOut') &&
                (item.data as AttendanceEvent).notes && (
                  <p className="text-sm text-silver-600 mt-1 italic">
                    &quot;{(item.data as AttendanceEvent).notes}&quot;
                  </p>
                )}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
