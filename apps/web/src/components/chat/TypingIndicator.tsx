'use client';

import { useChatStore, Conversation } from '@/store/chat';

interface TypingIndicatorProps {
  threadId: string;
  members: Conversation['members'];
}

export function TypingIndicator({ threadId, members }: TypingIndicatorProps) {
  const typingUserIds = useChatStore((state) =>
    Array.from(state.typingUsers.get(threadId) || [])
  );

  if (typingUserIds.length === 0) return null;

  const typingNames = typingUserIds
    .map((userId) => {
      const member = members.find((m) => m.userId === userId);
      return member?.user?.profile?.firstName || 'Someone';
    })
    .slice(0, 3);

  const text =
    typingNames.length === 1
      ? `${typingNames[0]} is typing...`
      : typingNames.length === 2
      ? `${typingNames[0]} and ${typingNames[1]} are typing...`
      : `${typingNames[0]} and ${typingNames.length - 1} others are typing...`;

  return (
    <div className="flex items-center gap-2 px-4 py-1 text-sm text-silver-500">
      <div className="flex gap-0.5">
        <span className="animate-bounce inline-block" style={{ animationDelay: '0ms' }}>.</span>
        <span className="animate-bounce inline-block" style={{ animationDelay: '150ms' }}>.</span>
        <span className="animate-bounce inline-block" style={{ animationDelay: '300ms' }}>.</span>
      </div>
      <span>{text}</span>
    </div>
  );
}
