'use client';

/**
 * Reports Dashboard Router
 *
 * Redirects to role-specific dashboard:
 * - Manager -> /reports/manager
 * - HR/SuperAdmin -> /reports/hr
 * - Employee -> redirect to main dashboard (no reports access)
 */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { Loader2 } from 'lucide-react';

export default function ReportsPage() {
  const router = useRouter();
  const { user, _hasHydrated } = useAuthStore();

  useEffect(() => {
    if (!_hasHydrated) return;

    if (!user) {
      router.push('/login');
      return;
    }

    // Route based on role
    switch (user.role) {
      case 'Manager':
        router.replace('/reports/manager');
        break;
      case 'HR':
      case 'SuperAdmin':
        router.replace('/reports/hr');
        break;
      default:
        // Employees don't have reports access
        router.replace('/dashboard');
        break;
    }
  }, [user, _hasHydrated, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-silver-50">
      <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
    </div>
  );
}
