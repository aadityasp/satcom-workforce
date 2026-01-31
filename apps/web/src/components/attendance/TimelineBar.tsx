'use client';

/**
 * TimelineBar Component
 *
 * Visual timeline bar showing work periods, breaks, and events.
 * Displays from 6 AM to 10 PM with hour markers.
 */

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import type { AttendanceEvent, BreakSegment, AttendanceDay } from '@/hooks/useAttendance';

interface TimelineBarProps {
  attendance: AttendanceDay;
}

const START_HOUR = 6; // 6 AM
const END_HOUR = 22; // 10 PM
const TOTAL_HOURS = END_HOUR - START_HOUR;

function getPositionPercent(isoString: string): number {
  const date = new Date(isoString);
  const hour = date.getHours();
  const minute = date.getMinutes();
  const totalMinutes = (hour - START_HOUR) * 60 + minute;
  const totalMinutesInRange = TOTAL_HOURS * 60;
  return Math.max(0, Math.min(100, (totalMinutes / totalMinutesInRange) * 100));
}

export function TimelineBar({ attendance }: TimelineBarProps) {
  const checkInEvent = attendance.events.find((e) => e.type === 'CheckIn');
  const checkOutEvent = attendance.events.find((e) => e.type === 'CheckOut');

  // Calculate work period
  const workPeriod = useMemo(() => {
    if (!checkInEvent) return null;

    const startPercent = getPositionPercent(checkInEvent.timestamp);
    let endPercent: number;

    if (checkOutEvent) {
      endPercent = getPositionPercent(checkOutEvent.timestamp);
    } else {
      // Use current time as end
      const now = new Date();
      const nowStr = now.toISOString();
      endPercent = getPositionPercent(nowStr);
    }

    return {
      start: startPercent,
      width: Math.max(0, endPercent - startPercent),
    };
  }, [checkInEvent, checkOutEvent]);

  // Calculate break periods
  const breakPeriods = useMemo(() => {
    return attendance.breaks.map((breakSegment) => {
      const startPercent = getPositionPercent(breakSegment.startTime);
      let endPercent: number;

      if (breakSegment.endTime) {
        endPercent = getPositionPercent(breakSegment.endTime);
      } else {
        // Active break - use current time
        const now = new Date();
        endPercent = getPositionPercent(now.toISOString());
      }

      return {
        id: breakSegment.id,
        type: breakSegment.type,
        start: startPercent,
        width: Math.max(1, endPercent - startPercent),
        isActive: !breakSegment.endTime,
      };
    });
  }, [attendance.breaks]);

  // Hour markers
  const hourMarkers = useMemo(() => {
    const markers = [];
    for (let h = START_HOUR; h <= END_HOUR; h += 2) {
      const percent = ((h - START_HOUR) / TOTAL_HOURS) * 100;
      markers.push({ hour: h, percent });
    }
    return markers;
  }, []);

  // Current time marker
  const currentTimePercent = useMemo(() => {
    const now = new Date();
    const hour = now.getHours();
    if (hour < START_HOUR || hour >= END_HOUR) return null;
    return getPositionPercent(now.toISOString());
  }, []);

  return (
    <div className="w-full py-4">
      {/* Hour labels */}
      <div className="relative h-4 mb-1">
        {hourMarkers.map(({ hour, percent }) => (
          <span
            key={hour}
            className="absolute text-xs text-silver-400 -translate-x-1/2"
            style={{ left: `${percent}%` }}
          >
            {hour === 12 ? '12pm' : hour > 12 ? `${hour - 12}pm` : `${hour}am`}
          </span>
        ))}
      </div>

      {/* Timeline bar */}
      <div className="relative h-8 bg-silver-100 rounded-full overflow-hidden">
        {/* Work period */}
        {workPeriod && (
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${workPeriod.width}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="absolute top-0 h-full bg-blue-400"
            style={{ left: `${workPeriod.start}%` }}
          />
        )}

        {/* Break periods */}
        {breakPeriods.map((breakPeriod) => (
          <motion.div
            key={breakPeriod.id}
            initial={{ width: 0 }}
            animate={{ width: `${breakPeriod.width}%` }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className={`absolute top-0 h-full ${
              breakPeriod.type === 'Lunch' ? 'bg-amber-400' : 'bg-orange-400'
            } ${breakPeriod.isActive ? 'animate-pulse' : ''}`}
            style={{ left: `${breakPeriod.start}%` }}
          />
        ))}

        {/* Hour tick marks */}
        {hourMarkers.map(({ hour, percent }) => (
          <div
            key={hour}
            className="absolute top-0 h-full w-px bg-white/30"
            style={{ left: `${percent}%` }}
          />
        ))}

        {/* Current time indicator */}
        {currentTimePercent !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute top-0 h-full w-0.5 bg-error"
            style={{ left: `${currentTimePercent}%` }}
          />
        )}

        {/* Check-in marker */}
        {checkInEvent && (
          <div
            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-success rounded-full border-2 border-white shadow"
            style={{ left: `${getPositionPercent(checkInEvent.timestamp)}%` }}
          />
        )}

        {/* Check-out marker */}
        {checkOutEvent && (
          <div
            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-error rounded-full border-2 border-white shadow"
            style={{ left: `${getPositionPercent(checkOutEvent.timestamp)}%` }}
          />
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-3 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 bg-blue-400 rounded" />
          <span className="text-silver-500">Working</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 bg-orange-400 rounded" />
          <span className="text-silver-500">Break</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 bg-amber-400 rounded" />
          <span className="text-silver-500">Lunch</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 bg-success rounded-full" />
          <span className="text-silver-500">Check-in</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 bg-error rounded-full" />
          <span className="text-silver-500">Check-out</span>
        </div>
      </div>
    </div>
  );
}
