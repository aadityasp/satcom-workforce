'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MessageSquare, Wifi, WifiOff } from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import { useChatStore } from '@/store/chat';
import { useChat } from '@/hooks';
import { ConversationList, MessageThread, MessageComposer } from '@/components/chat';

export default function ChatPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuthStore();
  const isAuthenticated = !!user;
  const { isConnected, connectionError } = useChat();

  const activeConversationId = useChatStore((state) => state.activeConversationId);
  const conversations = useChatStore((state) => state.conversations);

  const activeConversation = conversations.find((c) => c.id === activeConversationId);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  // Get display name for header
  const getHeaderTitle = () => {
    if (!activeConversation) return 'Chat';

    if (activeConversation.name) return activeConversation.name;

    if (activeConversation.type === 'Direct') {
      const currentUserId = useAuthStore.getState().user?.id;
      const other = activeConversation.members.find((m) => m.userId !== currentUserId);
      if (other?.user.profile) {
        return `${other.user.profile.firstName} ${other.user.profile.lastName}`;
      }
      return other?.user.email || 'Direct Message';
    }

    return 'Group Chat';
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex bg-white rounded-xl border border-silver-200 overflow-hidden">
      {/* Sidebar - Conversation List */}
      <div className="w-80 flex-shrink-0">
        <ConversationList />
      </div>

      {/* Main area - Message Thread */}
      <div className="flex-1 flex flex-col">
        {activeConversation ? (
          <>
            {/* Header */}
            <div className="p-4 border-b border-silver-200 flex items-center justify-between bg-white">
              <div className="flex items-center gap-3">
                <h2 className="font-semibold text-navy-900">{getHeaderTitle()}</h2>
                {activeConversation.type !== 'Direct' && (
                  <span className="text-sm text-silver-500">
                    {activeConversation.members.length} members
                  </span>
                )}
              </div>
              <div
                className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${
                  isConnected
                    ? 'bg-success-light text-success-dark'
                    : 'bg-error-light text-error-dark'
                }`}
              >
                {isConnected ? (
                  <>
                    <Wifi className="h-3 w-3" />
                    Connected
                  </>
                ) : (
                  <>
                    <WifiOff className="h-3 w-3" />
                    {connectionError || 'Disconnected'}
                  </>
                )}
              </div>
            </div>

            {/* Messages */}
            <MessageThread conversation={activeConversation} />

            {/* Composer */}
            <MessageComposer threadId={activeConversation.id} />
          </>
        ) : (
          // No conversation selected
          <div className="flex-1 flex items-center justify-center bg-silver-50">
            <div className="card max-w-md p-8 text-center">
              <div className="flex items-center justify-center gap-2 mb-4">
                <MessageSquare className="h-8 w-8 text-blue-600" />
                <h3 className="text-xl font-semibold text-navy-900">Welcome to Chat</h3>
              </div>
              <p className="text-silver-500 mb-4">
                Select a conversation from the sidebar or start a new one.
              </p>
              <div
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${
                  isConnected
                    ? 'bg-success-light text-success-dark'
                    : 'bg-silver-100 text-silver-500'
                }`}
              >
                {isConnected ? (
                  <>
                    <Wifi className="h-3.5 w-3.5" />
                    Connected
                  </>
                ) : (
                  <>
                    <div className="h-3.5 w-3.5 rounded-full bg-silver-300 animate-pulse" />
                    Connecting...
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
