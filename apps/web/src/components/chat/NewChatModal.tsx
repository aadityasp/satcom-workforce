'use client';

import { useState, useCallback, useEffect } from 'react';
import { Search, Loader2, User, Users, X } from 'lucide-react';
import { useChat } from '@/hooks';
import { useDebounce } from '@/hooks/useDebounce';

interface UserResult {
  id: string;
  email: string;
  profile?: {
    firstName: string;
    lastName: string;
    avatarUrl?: string;
  } | null;
}

interface NewChatModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NewChatModal({ open, onOpenChange }: NewChatModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<UserResult[]>([]);
  const [groupName, setGroupName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [tab, setTab] = useState<'direct' | 'group'>('direct');

  const { searchUsers, createDirectThread, createGroupThread, setActiveConversation } = useChat({
    autoConnect: false,
  });

  const debouncedQuery = useDebounce(searchQuery, 300);

  // Search users when query changes
  useEffect(() => {
    if (debouncedQuery.length >= 2) {
      setIsSearching(true);
      searchUsers(debouncedQuery)
        .then(setSearchResults)
        .finally(() => setIsSearching(false));
    } else {
      setSearchResults([]);
    }
  }, [debouncedQuery, searchUsers]);

  const handleSelectUser = useCallback((user: UserResult) => {
    if (tab === 'direct') {
      // Start DM immediately
      setIsCreating(true);
      createDirectThread(user.id).then((thread) => {
        if (thread) {
          setActiveConversation(thread.id);
          onOpenChange(false);
          resetState();
        }
        setIsCreating(false);
      });
    } else {
      // Toggle selection for group
      setSelectedUsers((prev) => {
        const exists = prev.find((u) => u.id === user.id);
        if (exists) {
          return prev.filter((u) => u.id !== user.id);
        }
        return [...prev, user];
      });
    }
  }, [tab, createDirectThread, setActiveConversation, onOpenChange]);

  const handleCreateGroup = async () => {
    if (!groupName.trim() || selectedUsers.length < 1) return;

    setIsCreating(true);
    const thread = await createGroupThread(
      groupName.trim(),
      selectedUsers.map((u) => u.id)
    );

    if (thread) {
      setActiveConversation(thread.id);
      onOpenChange(false);
      resetState();
    }
    setIsCreating(false);
  };

  const resetState = () => {
    setSearchQuery('');
    setSearchResults([]);
    setSelectedUsers([]);
    setGroupName('');
  };

  const getUserDisplayName = (user: UserResult) =>
    user.profile ? `${user.profile.firstName} ${user.profile.lastName}` : user.email;

  const getUserInitials = (user: UserResult) =>
    user.profile
      ? `${user.profile.firstName?.[0] || ''}${user.profile.lastName?.[0] || ''}`
      : user.email[0].toUpperCase();

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={() => onOpenChange(false)}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-silver-200">
          <h2 className="text-lg font-semibold text-navy-900">New Conversation</h2>
          <button
            onClick={() => onOpenChange(false)}
            className="p-1 hover:bg-silver-100 rounded-lg"
          >
            <X size={20} className="text-silver-500" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-silver-200">
          <button
            onClick={() => setTab('direct')}
            className={`flex-1 px-4 py-3 text-sm font-medium flex items-center justify-center gap-2 ${
              tab === 'direct'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-silver-500 hover:text-navy-900'
            }`}
          >
            <User size={16} />
            Direct Message
          </button>
          <button
            onClick={() => setTab('group')}
            className={`flex-1 px-4 py-3 text-sm font-medium flex items-center justify-center gap-2 ${
              tab === 'group'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-silver-500 hover:text-navy-900'
            }`}
          >
            <Users size={16} />
            Group Chat
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Search input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-silver-400" />
            <input
              type="text"
              placeholder="Search people..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input pl-9"
            />
          </div>

          {/* Group name input (only for group tab) */}
          {tab === 'group' && (
            <div className="mt-3">
              <label htmlFor="groupName" className="block text-sm font-medium text-navy-900 mb-1">
                Group Name
              </label>
              <input
                id="groupName"
                type="text"
                placeholder="Enter group name..."
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                className="input"
              />
            </div>
          )}

          {/* Selected users (only for group tab) */}
          {tab === 'group' && selectedUsers.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {selectedUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center gap-1 bg-blue-50 text-blue-600 px-2 py-1 rounded-full text-sm"
                >
                  <span>{getUserDisplayName(user)}</span>
                  <button
                    onClick={() => handleSelectUser(user)}
                    className="hover:text-error"
                  >
                    &times;
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Search results */}
          <div className="mt-3 max-h-[200px] overflow-y-auto">
            {isSearching ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-silver-400" />
              </div>
            ) : searchResults.length === 0 && searchQuery.length >= 2 ? (
              <p className="text-center py-4 text-silver-500">No users found</p>
            ) : (
              searchResults.map((user) => {
                const isSelected = selectedUsers.some((u) => u.id === user.id);
                return (
                  <button
                    key={user.id}
                    onClick={() => handleSelectUser(user)}
                    disabled={isCreating}
                    className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-silver-50 transition-colors"
                  >
                    {tab === 'group' && (
                      <input
                        type="checkbox"
                        checked={isSelected}
                        readOnly
                        className="h-4 w-4 text-blue-600 border-silver-300 rounded focus:ring-blue-500"
                      />
                    )}
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                      {user.profile?.avatarUrl ? (
                        <img
                          src={user.profile.avatarUrl}
                          alt={getUserDisplayName(user)}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      ) : (
                        <span className="text-blue-600 text-xs font-medium">{getUserInitials(user)}</span>
                      )}
                    </div>
                    <div className="text-left">
                      <p className="font-medium text-navy-900">{getUserDisplayName(user)}</p>
                      <p className="text-xs text-silver-500">{user.email}</p>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Create group button */}
          {tab === 'group' && (
            <button
              onClick={handleCreateGroup}
              disabled={!groupName.trim() || selectedUsers.length < 1 || isCreating}
              className="btn-primary w-full mt-4 flex items-center justify-center gap-2"
            >
              {isCreating && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              Create Group ({selectedUsers.length} members)
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
