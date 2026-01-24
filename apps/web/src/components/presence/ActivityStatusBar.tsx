'use client';

import { useState } from 'react';
import { Activity, Edit2, Clock, Briefcase, MessageSquare } from 'lucide-react';
import { usePresenceStore } from '@/store/presence';
import { useAuthStore } from '@/store/auth';
import { PresenceIndicator } from './PresenceIndicator';
import { SetActivityModal } from './SetActivityModal';
import { formatDistanceToNow } from 'date-fns';

export function ActivityStatusBar() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { user } = useAuthStore();
  const { teamMembers, isConnected } = usePresenceStore();

  // Find current user's presence
  const myPresence = teamMembers.find((m) => m.userId === user?.id);

  return (
    <>
      <div className="bg-white rounded-xl border border-silver-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Activity size={18} className="text-navy-600" />
            <h3 className="font-medium text-navy-900">Your Status</h3>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="p-1.5 hover:bg-silver-100 rounded-lg transition-colors"
            title="Update status"
          >
            <Edit2 size={16} className="text-silver-500" />
          </button>
        </div>

        {/* Connection status */}
        <div className="flex items-center gap-2 mb-3">
          <PresenceIndicator
            status={myPresence?.status || (isConnected ? 'Online' : 'Offline')}
            size="md"
            showLabel
          />
          {isConnected && (
            <span className="text-xs text-silver-400">- Real-time sync active</span>
          )}
        </div>

        {/* Current activity */}
        {myPresence?.currentProject ? (
          <div className="bg-blue-50 rounded-lg p-3 mb-3">
            <div className="flex items-center gap-2 text-sm">
              <Briefcase size={14} className="text-blue-600" />
              <span className="font-medium text-blue-900">
                {myPresence.currentProject.name}
              </span>
            </div>
            {myPresence.currentTask && (
              <p className="text-xs text-blue-700 mt-1 ml-5">
                Task: {myPresence.currentTask.name}
              </p>
            )}
          </div>
        ) : (
          <button
            onClick={() => setIsModalOpen(true)}
            className="w-full bg-silver-50 rounded-lg p-3 mb-3 border border-dashed border-silver-300 hover:border-silver-400 transition-colors"
          >
            <div className="flex items-center gap-2 text-sm text-silver-500">
              <Briefcase size={14} />
              <span>Set current activity...</span>
            </div>
          </button>
        )}

        {/* Status message */}
        {myPresence?.statusMessage ? (
          <div className="flex items-start gap-2 text-sm">
            <MessageSquare size={14} className="text-silver-400 mt-0.5" />
            <div>
              <p className="text-navy-900 italic">&quot;{myPresence.statusMessage}&quot;</p>
              {myPresence.statusUpdatedAt && (
                <p className="text-xs text-silver-400 mt-1">
                  <Clock size={10} className="inline mr-1" />
                  {formatDistanceToNow(new Date(myPresence.statusUpdatedAt), { addSuffix: true })}
                </p>
              )}
            </div>
          </div>
        ) : (
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 text-sm text-silver-500 hover:text-navy-900 transition-colors"
          >
            <MessageSquare size={14} />
            <span>Add a status message...</span>
          </button>
        )}
      </div>

      <SetActivityModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
}
