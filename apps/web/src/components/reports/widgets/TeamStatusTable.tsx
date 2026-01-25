'use client';

/**
 * TeamStatusTable
 *
 * Shows team members with their attendance status today.
 * Per user decision: Inline warning icons next to affected rows.
 */

import { AlertTriangle, XCircle } from 'lucide-react';

interface TeamMember {
  userId: string;
  userName: string;
  checkInTime?: string;
  checkOutTime?: string;
  workMode?: string;
  isLate: boolean;
  isAbsent: boolean;
  currentProject?: string;
}

interface TeamStatusTableProps {
  members: TeamMember[];
}

export function TeamStatusTable({ members }: TeamStatusTableProps) {
  if (members.length === 0) {
    return (
      <div className="text-center py-8 text-silver-500">
        No team members to display
      </div>
    );
  }

  const formatTime = (isoString?: string) => {
    if (!isoString) return '-';
    return new Date(isoString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="text-left text-xs text-silver-500 uppercase border-b border-silver-100">
            <th className="pb-3 font-medium">Employee</th>
            <th className="pb-3 font-medium">Status</th>
            <th className="pb-3 font-medium">Check In</th>
            <th className="pb-3 font-medium">Check Out</th>
            <th className="pb-3 font-medium">Work Mode</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-silver-50">
          {members.map((member) => (
            <tr key={member.userId} className="hover:bg-silver-50">
              <td className="py-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 text-xs font-medium">
                      {member.userName.split(' ').map(n => n[0]).join('')}
                    </span>
                  </div>
                  <span className="text-sm font-medium text-navy-900">{member.userName}</span>
                  {/* Inline warning icon for issues */}
                  {member.isLate && <span title="Late"><AlertTriangle size={14} className="text-warning" /></span>}
                  {member.isAbsent && <span title="Absent"><XCircle size={14} className="text-error" /></span>}
                </div>
              </td>
              <td className="py-3">
                {member.isAbsent ? (
                  <span className="px-2 py-0.5 text-xs rounded-full bg-error-light text-error">
                    Absent
                  </span>
                ) : member.isLate ? (
                  <span className="px-2 py-0.5 text-xs rounded-full bg-warning-light text-warning">
                    Late
                  </span>
                ) : member.checkInTime ? (
                  <span className="px-2 py-0.5 text-xs rounded-full bg-success-light text-success">
                    On Time
                  </span>
                ) : (
                  <span className="px-2 py-0.5 text-xs rounded-full bg-silver-100 text-silver-600">
                    -
                  </span>
                )}
              </td>
              <td className="py-3 text-sm text-navy-900">{formatTime(member.checkInTime)}</td>
              <td className="py-3 text-sm text-navy-900">{formatTime(member.checkOutTime)}</td>
              <td className="py-3 text-sm text-silver-600">{member.workMode || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
