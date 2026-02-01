'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function MessagesRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/chat');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-silver-50">
      <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent" />
    </div>
  );
}
