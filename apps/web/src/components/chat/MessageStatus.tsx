'use client';

import { Check, CheckCheck, Clock } from 'lucide-react';
import { MessageStatus as Status } from '@/store/chat';

interface MessageStatusProps {
  status?: Status;
  className?: string;
}

export function MessageStatus({ status, className = '' }: MessageStatusProps) {
  if (!status || status === 'sending') {
    return <Clock className={`h-3.5 w-3.5 text-silver-400 ${className}`} />;
  }

  if (status === 'failed') {
    return <span className={`text-xs text-error ${className}`}>Failed</span>;
  }

  if (status === 'sent') {
    return <Check className={`h-3.5 w-3.5 text-silver-400 ${className}`} />;
  }

  if (status === 'delivered') {
    return <CheckCheck className={`h-3.5 w-3.5 text-silver-400 ${className}`} />;
  }

  // read
  return <CheckCheck className={`h-3.5 w-3.5 text-blue-500 ${className}`} />;
}
