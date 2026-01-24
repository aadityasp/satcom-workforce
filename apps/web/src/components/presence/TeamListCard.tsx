'use client';

import { useRouter } from 'next/navigation';
import { MessageSquare, Phone, Mail } from 'lucide-react';
import { TeamMember } from '@/store/presence';
import { PresenceIndicator } from './PresenceIndicator';
import { formatDistanceToNow } from 'date-fns';

interface TeamListCardProps {
  member: TeamMember;
}

export function TeamListCard({ member }: TeamListCardProps) {
  const router = useRouter();

  const initials = member.profile
    ? `${member.profile.firstName[0]}${member.profile.lastName[0]}`
    : '??';

  const fullName = member.profile
    ? `${member.profile.firstName} ${member.profile.lastName}`
    : 'Unknown User';

  const lastSeen = member.lastSeenAt
    ? formatDistanceToNow(new Date(member.lastSeenAt), { addSuffix: true })
    : 'Never';

  return (
    <div className="bg-white rounded-xl border border-silver-200 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start gap-4">
        {/* Avatar with presence indicator */}
        <div className="relative">
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
            {member.profile?.avatarUrl ? (
              <img
                src={member.profile.avatarUrl}
                alt={fullName}
                className="w-12 h-12 rounded-full object-cover"
              />
            ) : (
              <span className="text-blue-600 font-medium">{initials}</span>
            )}
          </div>
          <div className="absolute -bottom-0.5 -right-0.5">
            <PresenceIndicator status={member.status} size="md" />
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-navy-900 truncate">{fullName}</h3>
          <p className="text-sm text-silver-500 truncate">
            {member.profile?.designation || 'Employee'}
          </p>
          <p className="text-xs text-silver-400 mt-1">
            {member.profile?.department || 'No department'}
            {member.currentWorkMode && ` - ${member.currentWorkMode}`}
          </p>

          {/* Status message */}
          {member.statusMessage && (
            <p className="text-xs text-blue-600 mt-1 truncate italic">
              &quot;{member.statusMessage}&quot;
            </p>
          )}

          {/* Current activity */}
          {member.currentProject && (
            <p className="text-xs text-silver-500 mt-1 truncate">
              Working on: {member.currentProject.name}
              {member.currentTask && ` / ${member.currentTask.name}`}
            </p>
          )}

          {/* Last seen (for offline users) */}
          {member.status === 'Offline' && (
            <p className="text-xs text-silver-400 mt-1">
              Last seen {lastSeen}
            </p>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="mt-4 flex gap-2">
        <button
          onClick={() => router.push(`/chat?user=${member.userId}`)}
          className="flex-1 btn-secondary text-sm py-1.5 flex items-center justify-center gap-2"
        >
          <MessageSquare size={14} />
          Message
        </button>
        <button className="p-2 border border-silver-200 rounded-lg hover:bg-silver-50">
          <Phone size={14} className="text-silver-500" />
        </button>
        <button className="p-2 border border-silver-200 rounded-lg hover:bg-silver-50">
          <Mail size={14} className="text-silver-500" />
        </button>
      </div>
    </div>
  );
}
