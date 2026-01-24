'use client';

import { useState, useRef, useEffect, FormEvent } from 'react';
import { Send } from 'lucide-react';
import { useChat } from '@/hooks';

interface MessageComposerProps {
  threadId: string;
}

export function MessageComposer({ threadId }: MessageComposerProps) {
  const [content, setContent] = useState('');
  const [isSending, setIsSending] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const { sendMessage, startTyping, stopTyping } = useChat({ autoConnect: false });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setContent(e.target.value);

    // Typing indicator
    startTyping(threadId);

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Stop typing after 2 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      stopTyping(threadId);
    }, 2000);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = content.trim();
    if (!trimmed || isSending) return;

    setIsSending(true);
    try {
      await sendMessage(threadId, trimmed);
      setContent('');
      stopTyping(threadId);
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsSending(false);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      stopTyping(threadId);
    };
  }, [threadId, stopTyping]);

  return (
    <form onSubmit={handleSubmit} className="p-4 border-t border-silver-200 bg-white">
      <div className="flex gap-2">
        <input
          type="text"
          value={content}
          onChange={handleChange}
          placeholder="Type a message..."
          className="input flex-1"
          disabled={isSending}
        />
        <button
          type="submit"
          disabled={!content.trim() || isSending}
          className="btn-primary p-2"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </form>
  );
}
