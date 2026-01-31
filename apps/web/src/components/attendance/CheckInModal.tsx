'use client';

/**
 * CheckInModal Component
 *
 * Modal for selecting work mode when checking in.
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Building2,
  Home,
  MapPin,
  Car,
  Users,
  Loader2,
} from 'lucide-react';
import type { WorkMode } from '@/hooks/useAttendance';

interface CheckInModalProps {
  isOpen: boolean;
  isLoading: boolean;
  onClose: () => void;
  onCheckIn: (workMode: WorkMode) => Promise<void>;
}

const workModes: { mode: WorkMode; label: string; icon: React.ElementType; color: string }[] = [
  { mode: 'Office', label: 'Office', icon: Building2, color: 'bg-blue-500' },
  { mode: 'Remote', label: 'Remote / WFH', icon: Home, color: 'bg-green-500' },
  { mode: 'CustomerSite', label: 'Customer Site', icon: MapPin, color: 'bg-orange-500' },
  { mode: 'FieldVisit', label: 'Field Visit', icon: Users, color: 'bg-purple-500' },
  { mode: 'Travel', label: 'Travel', icon: Car, color: 'bg-teal-500' },
];

export function CheckInModal({ isOpen, isLoading, onClose, onCheckIn }: CheckInModalProps) {
  const [selectedMode, setSelectedMode] = useState<WorkMode | null>(null);

  const handleCheckIn = async () => {
    if (!selectedMode) return;
    await onCheckIn(selectedMode);
    setSelectedMode(null);
    onClose();
  };

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
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden" onClick={(e) => e.stopPropagation()}>
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-silver-100">
                <h2 className="text-lg font-semibold text-navy-900">Check In</h2>
                <button
                  onClick={onClose}
                  className="p-2 text-silver-500 hover:text-navy-900 transition-colors rounded-lg hover:bg-silver-50"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Content */}
              <div className="p-4">
                <p className="text-sm text-silver-600 mb-4">
                  Select your work mode for today:
                </p>

                <div className="space-y-2">
                  {workModes.map(({ mode, label, icon: Icon, color }) => (
                    <button
                      key={mode}
                      onClick={() => setSelectedMode(mode)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${
                        selectedMode === mode
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-silver-200 hover:border-silver-300 hover:bg-silver-50'
                      }`}
                    >
                      <div className={`w-10 h-10 ${color} rounded-lg flex items-center justify-center`}>
                        <Icon size={20} className="text-white" />
                      </div>
                      <span className="font-medium text-navy-900">{label}</span>
                      {selectedMode === mode && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="ml-auto w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center"
                        >
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </motion.div>
                      )}
                    </button>
                  ))}
                </div>
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
                  onClick={handleCheckIn}
                  disabled={!selectedMode || isLoading}
                  className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Checking in...
                    </>
                  ) : (
                    'Check In'
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
