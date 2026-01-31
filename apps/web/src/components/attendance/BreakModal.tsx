'use client';

/**
 * BreakModal Component
 *
 * Modal for starting a break with type selection.
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Coffee, UtensilsCrossed, Loader2 } from 'lucide-react';
import type { BreakType } from '@/hooks/useAttendance';

interface BreakModalProps {
  isOpen: boolean;
  isLoading: boolean;
  onClose: () => void;
  onStartBreak: (type: BreakType) => Promise<void>;
}

const breakTypes: { type: BreakType; label: string; icon: React.ElementType; color: string; description: string }[] = [
  {
    type: 'Break',
    label: 'Short Break',
    icon: Coffee,
    color: 'bg-orange-500',
    description: 'Tea/coffee break, stretching, etc.',
  },
  {
    type: 'Lunch',
    label: 'Lunch Break',
    icon: UtensilsCrossed,
    color: 'bg-amber-500',
    description: 'Main meal break',
  },
];

export function BreakModal({ isOpen, isLoading, onClose, onStartBreak }: BreakModalProps) {
  const [selectedType, setSelectedType] = useState<BreakType | null>(null);

  const handleStartBreak = async () => {
    if (!selectedType) return;
    await onStartBreak(selectedType);
    setSelectedType(null);
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
            <div
              className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-silver-100">
                <h2 className="text-lg font-semibold text-navy-900">Start Break</h2>
                <button
                  onClick={onClose}
                  className="p-2 text-silver-500 hover:text-navy-900 transition-colors rounded-lg hover:bg-silver-50"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Content */}
              <div className="p-4">
                <p className="text-sm text-silver-600 mb-4">Select break type:</p>

                <div className="space-y-2">
                  {breakTypes.map(({ type, label, icon: Icon, color, description }) => (
                    <button
                      key={type}
                      onClick={() => setSelectedType(type)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${
                        selectedType === type
                          ? 'border-orange-500 bg-orange-50'
                          : 'border-silver-200 hover:border-silver-300 hover:bg-silver-50'
                      }`}
                    >
                      <div
                        className={`w-10 h-10 ${color} rounded-lg flex items-center justify-center flex-shrink-0`}
                      >
                        <Icon size={20} className="text-white" />
                      </div>
                      <div className="flex-1">
                        <span className="font-medium text-navy-900 block">{label}</span>
                        <span className="text-xs text-silver-500">{description}</span>
                      </div>
                      {selectedType === type && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center flex-shrink-0"
                        >
                          <svg
                            className="w-3 h-3 text-white"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={3}
                              d="M5 13l4 4L19 7"
                            />
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
                  onClick={handleStartBreak}
                  disabled={!selectedType || isLoading}
                  className="flex-1 px-4 py-2.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Starting...
                    </>
                  ) : (
                    <>
                      <Coffee size={18} />
                      Start Break
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
