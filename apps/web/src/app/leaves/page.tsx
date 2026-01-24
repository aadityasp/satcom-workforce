'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Calendar, CheckCircle, Clock, XCircle } from 'lucide-react';

export default function LeavesPage() {
  const router = useRouter();

  const leaves = [
    { id: 1, type: 'Annual Leave', from: 'Jan 25', to: 'Jan 27', days: 3, status: 'Pending' },
    { id: 2, type: 'Sick Leave', from: 'Jan 10', to: 'Jan 10', days: 1, status: 'Approved' },
    { id: 3, type: 'WFH', from: 'Jan 5', to: 'Jan 5', days: 1, status: 'Approved' },
    { id: 4, type: 'Casual Leave', from: 'Dec 20', to: 'Dec 22', days: 3, status: 'Rejected' },
  ];

  const balances = [
    { type: 'Annual', used: 5, total: 20 },
    { type: 'Sick', used: 2, total: 10 },
    { type: 'Casual', used: 3, total: 5 },
  ];

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'Approved': return { bg: 'bg-success-light', text: 'text-success', icon: CheckCircle };
      case 'Rejected': return { bg: 'bg-error-light', text: 'text-error', icon: XCircle };
      default: return { bg: 'bg-warning-light', text: 'text-warning', icon: Clock };
    }
  };

  return (
    <div className="min-h-screen bg-silver-50">
      <header className="bg-white border-b border-silver-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button onClick={() => router.back()} className="p-2 hover:bg-silver-100 rounded-lg">
                <ArrowLeft size={20} />
              </button>
              <h1 className="text-lg font-semibold text-navy-900">Leave Management</h1>
            </div>
            <button className="btn-primary flex items-center gap-2">
              <Plus size={18} />
              Request Leave
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Leave Balances */}
        <div className="grid grid-cols-3 gap-4">
          {balances.map((bal) => (
            <div key={bal.type} className="bg-white rounded-xl border border-silver-200 p-4">
              <p className="text-sm text-silver-500">{bal.type} Leave</p>
              <div className="mt-2 flex items-end gap-1">
                <span className="text-2xl font-bold text-navy-900">{bal.total - bal.used}</span>
                <span className="text-silver-500 mb-1">/ {bal.total} days</span>
              </div>
              <div className="mt-2 h-2 bg-silver-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full"
                  style={{ width: `${((bal.total - bal.used) / bal.total) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Leave Requests */}
        <div className="bg-white rounded-xl border border-silver-200 overflow-hidden">
          <div className="p-4 border-b border-silver-100">
            <h2 className="font-semibold text-navy-900">Leave Requests</h2>
          </div>
          <div className="divide-y divide-silver-100">
            {leaves.map((leave) => {
              const style = getStatusStyle(leave.status);
              const StatusIcon = style.icon;
              return (
                <div key={leave.id} className="p-4 hover:bg-silver-50 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <Calendar size={20} className="text-purple-600" />
                    </div>
                    <div>
                      <h3 className="font-medium text-navy-900">{leave.type}</h3>
                      <p className="text-sm text-silver-500">{leave.from} - {leave.to} ({leave.days} days)</p>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm flex items-center gap-1 ${style.bg} ${style.text}`}>
                    <StatusIcon size={14} />
                    {leave.status}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}
