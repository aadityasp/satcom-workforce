'use client';

import { useState } from 'react';
import { Plus, MessageSquare, Loader2, Search } from 'lucide-react';
import { useChatStore } from '@/store/chat';
import { useChat } from '@/hooks';
import { ConversationItem } from './ConversationItem';
import { NewChatModal } from './NewChatModal';

export function ConversationList() {
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewChat, setShowNewChat] = useState(false);

  const { conversations, isLoadingConversations, setActiveConversation, activeConversationId } = useChat({
    autoConnect: false,
  });

  const filteredConversations = conversations.filter((c) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();

    // Search by name
    if (c.name?.toLowerCase().includes(query)) return true;

    // Search by member names/emails
    return c.members.some(
      (m) =>
        m.user.email.toLowerCase().includes(query) ||
        m.user.profile?.firstName?.toLowerCase().includes(query) ||
        m.user.profile?.lastName?.toLowerCase().includes(query)
    );
  });

  return (
    <div className="flex flex-col h-full border-r border-silver-200 bg-white">
      {/* Header */}
      <div className="p-4 border-b border-silver-200">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-lg text-navy-900 flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Messages
          </h2>
          <button
            onClick={() => setShowNewChat(true)}
            className="p-2 hover:bg-silver-100 rounded-lg transition-colors"
          >
            <Plus className="h-4 w-4 text-silver-500" />
          </button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-silver-400" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input pl-9 h-9"
          />
        </div>
      </div>

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-2">
          {isLoadingConversations ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-silver-400" />
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="text-center py-8 text-silver-500">
              {searchQuery ? 'No conversations found' : 'No conversations yet'}
            </div>
          ) : (
            filteredConversations.map((conversation) => (
              <ConversationItem
                key={conversation.id}
                conversation={conversation}
                isActive={conversation.id === activeConversationId}
                onClick={() => setActiveConversation(conversation.id)}
              />
            ))
          )}
        </div>
      </div>

      {/* New chat modal */}
      <NewChatModal open={showNewChat} onOpenChange={setShowNewChat} />
    </div>
  );
}
