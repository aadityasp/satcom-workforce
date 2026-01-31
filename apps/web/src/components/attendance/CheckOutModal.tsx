'use client';

/**
 * CheckOutModal Component
 *
 * Confirmation modal for checking out with summary display.
 */

import { motion, AnimatePresence } from 'framer-motion';
import { X, LogOut, Loader2, Clock, Coffee, TrendingUp } from 'lucide-react';
import type { CheckOutSummary, AttendanceDay } from '@/hooks/useAttendance';

interface CheckOutModalProps {
  isOpen: boolean;
  isLoading: boolean;
  attendance: AttendanceDay | null;
  summary?: CheckOutSummary | null;
  onClose: () => void;
  onCheckOut: () => Promise<void>;
}

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
}

export function CheckOutModal({
  isOpen,
  isLoading,
  attendance,
  summary,
  onClose,
  onCheckOut,
}: CheckOutModalProps) {
  const handleCheckOut = async () => {
    await onCheckOut();
  };

  const totalBreak = attendance
    ? (attendance.totalBreakMinutes || 0) + (attendance.totalLunchMinutes || 0)
    : 0;

  const workMinutes = attendance?.totalWorkMinutes || 0;
  const policyTarget = (attendance?.policy?.standardWorkHours || 8) * 60;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div
              className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-silver-100">
                <h2 className="text-lg font-semibold text-navy-900">Check Out</h2>
                <button
                  onClick={onClose}
                  className="p-2 text-silver-500 hover:text-navy-900 transition-colors rounded-lg hover:bg-silver-50"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Content */}
              <div className="p-4">
                {/* Summary preview */}
                <div className="bg-silver-50 rounded-xl p-4 mb-4">
                  <p className="text-sm text-silver-600 mb-3">Today&apos;s summary:</p>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="text-center">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg mx-auto mb-2 flex items-center justify-center">
                        <Clock size={18} className="text-blue-600" />
                      </div>
                      <p className="text-xs text-silver-500">Work Time</p>
                      <p className="font-semibold text-navy-900">{formatDuration(workMinutes)}</p>
                    </div>
                    <div className="text-center">
                      <div className="w-10 h-10 bg-orange-100 rounded-lg mx-auto mb-2 flex items-center justify-center">
                        <Coffee size={18} className="text-orange-600" />
                      </div>
                      <p className="text-xs text-silver-500">Break Time</p>
                      <p className="font-semibold text-navy-900">{formatDuration(totalBreak)}</p>
                    </div>
                    <div className="text-center">
                      <div className="w-10 h-10 bg-green-100 rounded-lg mx-auto mb-2 flex items-center justify-center">
                        <TrendingUp size={18} className="text-green-600" />
                      </div>
                      <p className="text-xs text-silver-500">
                        {workMinutes >= policyTarget ? 'Overtime' : 'Remaining'}
                      </p>
                      <p
                        className={`font-semibold ${
                          workMinutes >= policyTarget ? 'text-green-600' : 'text-navy-900'
                        }`}
                      >
                        {workMinutes >= policyTarget
                          ? `+${formatDuration(workMinutes - policyTarget)}`
                          : formatDuration(policyTarget - workMinutes)}
                      </p>
                    </div>
                  </div>
                </div>

                <p className="text-sm text-silver-600">
                  Are you sure you want to check out? This will end your work day.
                </p>

                {attendance?.currentBreak && (
                  <div className="mt-3 p-3 bg-warning-light rounded-lg text-sm text-warning flex items-center gap-2">
                    <Coffee size={16} />
                    You have an active break. Checking out will end it automatically.
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex gap-3 p-4 border-t border-silver-100 bg-silver-50">
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-2.5 text-silver-600 bg-white border border-silver-200 rounded-lg hover:bg-silver-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCheckOut}
                  disabled={isLoading}
                  className="flex-1 px-4 py-2.5 bg-error text-white rounded-lg hover:bg-error/90 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Checking out...
                    </>
                  ) : (
                    <>
                      <LogOut size={18} />
                      Check Out
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
