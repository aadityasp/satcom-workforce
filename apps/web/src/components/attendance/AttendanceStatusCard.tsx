'use client';

/**
 * AttendanceStatusCard Component
 *
 * Main attendance status display with check-in/out, break controls,
 * and work statistics. Includes progress indicators against policy.
 */

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Clock,
  Coffee,
  LogOut,
  MapPin,
  Loader2,
  Play,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import type { AttendanceDay, WorkMode, BreakType, CheckOutSummary } from '@/hooks/useAttendance';
import { CheckInModal } from './CheckInModal';
import { CheckOutModal } from './CheckOutModal';
import { BreakModal } from './BreakModal';

interface AttendanceStatusCardProps {
  attendance: AttendanceDay | null;
  isLoading: boolean;
  isActionLoading: boolean;
  onCheckIn: (workMode: WorkMode, latitude?: number, longitude?: number) => Promise<boolean>;
  onCheckOut: (latitude?: number, longitude?: number) => Promise<CheckOutSummary | null>;
  onStartBreak: (type: BreakType) => Promise<boolean>;
  onEndBreak: () => Promise<boolean>;
}

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
}

function formatTime(isoString: string): string {
  return new Date(isoString).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getProgressColor(current: number, target: number): string {
  const ratio = current / target;
  if (ratio >= 1) return 'bg-success';
  if (ratio >= 0.75) return 'bg-blue-500';
  if (ratio >= 0.5) return 'bg-warning';
  return 'bg-silver-300';
}

export function AttendanceStatusCard({
  attendance,
  isLoading,
  isActionLoading,
  onCheckIn,
  onCheckOut,
  onStartBreak,
  onEndBreak,
}: AttendanceStatusCardProps) {
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [showCheckOutModal, setShowCheckOutModal] = useState(false);
  const [showBreakModal, setShowBreakModal] = useState(false);
  const [elapsedBreakMinutes, setElapsedBreakMinutes] = useState(0);

  // Calculate elapsed break time for active break
  useEffect(() => {
    if (!attendance?.currentBreak) {
      setElapsedBreakMinutes(0);
      return;
    }

    const updateElapsed = () => {
      const startTime = new Date(attendance.currentBreak!.startTime).getTime();
      const now = Date.now();
      setElapsedBreakMinutes(Math.round((now - startTime) / 60000));
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 60000);
    return () => clearInterval(interval);
  }, [attendance?.currentBreak]);

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-silver-200 p-6 flex items-center justify-center h-48">
        <Loader2 size={32} className="animate-spin text-blue-500" />
      </div>
    );
  }

  if (!attendance) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-silver-200 p-6">
        <p className="text-silver-500">Unable to load attendance data.</p>
      </div>
    );
  }

  const status = attendance.status;
  const isCheckedIn = status === 'working' || status === 'on_break';
  const isOnBreak = status === 'on_break';
  const isCheckedOut = status === 'checked_out';

  const totalBreakMinutes = attendance.totalBreakMinutes + attendance.totalLunchMinutes;
  const policyTarget = (attendance.policy?.standardWorkHours || 8) * 60;
  const maxBreakMinutes = (attendance.policy?.breakDurationMinutes || 15) + (attendance.policy?.lunchDurationMinutes || 60);

  const handleCheckIn = async (workMode: WorkMode) => {
    await onCheckIn(workMode);
    setShowCheckInModal(false);
  };

  const handleCheckOut = async () => {
    await onCheckOut();
    setShowCheckOutModal(false);
  };

  const handleStartBreak = async (type: BreakType) => {
    await onStartBreak(type);
    setShowBreakModal(false);
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl shadow-sm border border-silver-200 p-6"
      >
        {/* Main Status */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div
              className={`w-14 h-14 rounded-xl flex items-center justify-center ${
                isOnBreak
                  ? 'bg-warning-light'
                  : isCheckedIn
                  ? 'bg-success-light'
                  : isCheckedOut
                  ? 'bg-blue-100'
                  : 'bg-silver-100'
              }`}
            >
              {isOnBreak ? (
                <Coffee size={28} className="text-warning" />
              ) : (
                <Clock
                  size={28}
                  className={
                    isCheckedIn ? 'text-success' : isCheckedOut ? 'text-blue-500' : 'text-silver-400'
                  }
                />
              )}
            </div>
            <div>
              <p className="text-sm text-silver-500">Today&apos;s Status</p>
              <p className="text-lg font-semibold text-navy-900">
                {isCheckedOut ? (
                  <>
                    Day completed{' '}
                    <span className="ml-2 text-sm font-normal text-silver-500">
                      ({formatTime(attendance.checkInTime!)} - {formatTime(attendance.checkOutTime!)})
                    </span>
                  </>
                ) : isOnBreak ? (
                  <>
                    On {attendance.currentBreak?.type}{' '}
                    <span className="ml-2 text-sm font-normal text-silver-500">
                      ({formatDuration(elapsedBreakMinutes)} elapsed)
                    </span>
                  </>
                ) : isCheckedIn ? (
                  <>
                    Checked in at {formatTime(attendance.checkInTime!)}{' '}
                    <span className="ml-2 text-sm font-normal text-silver-500">
                      ({attendance.workMode})
                    </span>
                  </>
                ) : (
                  'Not checked in yet'
                )}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3">
            {isCheckedOut ? (
              <div className="text-sm text-silver-500 flex items-center gap-2">
                <CheckCircle size={18} className="text-success" /> Day complete
              </div>
            ) : isCheckedIn ? (
              <>
                {isOnBreak ? (
                  <button
                    onClick={onEndBreak}
                    disabled={isActionLoading}
                    className="btn-secondary flex items-center gap-2"
                  >
                    {isActionLoading ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <Play size={18} />
                    )}{' '}
                    End Break
                  </button>
                ) : (
                  <button
                    onClick={() => setShowBreakModal(true)}
                    disabled={isActionLoading}
                    className="btn-secondary flex items-center gap-2"
                  >
                    <Coffee size={18} /> Take Break
                  </button>
                )}
                <button
                  onClick={() => setShowCheckOutModal(true)}
                  disabled={isActionLoading || isOnBreak}
                  className="btn-primary flex items-center gap-2 bg-error hover:bg-error/90 disabled:opacity-50"
                >
                  <LogOut size={18} /> Check Out
                </button>
              </>
            ) : (
              <button
                onClick={() => setShowCheckInModal(true)}
                disabled={isActionLoading}
                className="btn-primary flex items-center gap-2"
              >
                {isActionLoading ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <MapPin size={18} />
                )}{' '}
                Check In
              </button>
            )}
          </div>
        </div>

        {/* Statistics */}
        {(isCheckedIn || isCheckedOut) && (
          <div className="mt-6 pt-6 border-t border-silver-100">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Work Time */}
              <div>
                <p className="text-xs text-silver-500 uppercase tracking-wider mb-1">Work Time</p>
                <p className="text-lg font-semibold text-navy-900">
                  {formatDuration(attendance.totalWorkMinutes)}
                </p>
                <div className="mt-2 h-1.5 bg-silver-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${getProgressColor(
                      attendance.totalWorkMinutes,
                      policyTarget
                    )} transition-all`}
                    style={{
                      width: `${Math.min(100, (attendance.totalWorkMinutes / policyTarget) * 100)}%`,
                    }}
                  />
                </div>
              </div>

              {/* Break Time */}
              <div>
                <p className="text-xs text-silver-500 uppercase tracking-wider mb-1">Break Time</p>
                <p className="text-lg font-semibold text-navy-900">
                  {formatDuration(totalBreakMinutes + elapsedBreakMinutes)}
                </p>
                <div className="mt-2 h-1.5 bg-silver-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${
                      totalBreakMinutes + elapsedBreakMinutes > maxBreakMinutes
                        ? 'bg-warning'
                        : 'bg-orange-400'
                    } transition-all`}
                    style={{
                      width: `${Math.min(
                        100,
                        ((totalBreakMinutes + elapsedBreakMinutes) / maxBreakMinutes) * 100
                      )}%`,
                    }}
                  />
                </div>
                {totalBreakMinutes + elapsedBreakMinutes > maxBreakMinutes && (
                  <p className="text-xs text-warning mt-1 flex items-center gap-1">
                    <AlertCircle size={12} /> Exceeds policy
                  </p>
                )}
              </div>

              {/* Target */}
              <div>
                <p className="text-xs text-silver-500 uppercase tracking-wider mb-1">Target</p>
                <p className="text-lg font-semibold text-navy-900">
                  {formatDuration(policyTarget)}
                </p>
              </div>

              {/* Overtime / Remaining */}
              <div>
                <p className="text-xs text-silver-500 uppercase tracking-wider mb-1">
                  {attendance.totalWorkMinutes >= policyTarget ? 'Overtime' : 'Remaining'}
                </p>
                <p
                  className={`text-lg font-semibold ${
                    attendance.totalWorkMinutes >= policyTarget ? 'text-success' : 'text-blue-600'
                  }`}
                >
                  {attendance.totalWorkMinutes >= policyTarget
                    ? `+${formatDuration(attendance.totalWorkMinutes - policyTarget)}`
                    : formatDuration(policyTarget - attendance.totalWorkMinutes)}
                </p>
              </div>
            </div>
          </div>
        )}
      </motion.div>

      {/* Modals */}
      <CheckInModal
        isOpen={showCheckInModal}
        isLoading={isActionLoading}
        onClose={() => setShowCheckInModal(false)}
        onCheckIn={handleCheckIn}
      />

      <CheckOutModal
        isOpen={showCheckOutModal}
        isLoading={isActionLoading}
        attendance={attendance}
        onClose={() => setShowCheckOutModal(false)}
        onCheckOut={handleCheckOut}
      />

      <BreakModal
        isOpen={showBreakModal}
        isLoading={isActionLoading}
        onClose={() => setShowBreakModal(false)}
        onStartBreak={handleStartBreak}
      />
    </>
  );
}
