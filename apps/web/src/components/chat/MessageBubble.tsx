'use client';

import { useState } from 'react';
import { format, formatRelative } from 'date-fns';
import { Pencil, Trash2, Check, X } from 'lucide-react';
import { ChatMessage } from '@/store/chat';
import { MessageStatus } from './MessageStatus';
import { useAuthStore } from '@/store/auth';

interface MessageBubbleProps {
  message: ChatMessage;
  showAvatar?: boolean;
  isGrouped?: boolean;
  onEdit?: (messageId: string, content: string) => Promise<void>;
  onDelete?: (messageId: string) => Promise<void>;
}

export function MessageBubble({ message, showAvatar = true, isGrouped = false, onEdit, onDelete }: MessageBubbleProps) {
  const currentUserId = useAuthStore((state) => state.user?.id);
  const isOwn = message.senderId === currentUserId;
  const isDeleted = !!message.deletedAt;

  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content || '');
  const [isLoading, setIsLoading] = useState(false);

  const senderName = message.sender?.profile
    ? `${message.sender.profile.firstName} ${message.sender.profile.lastName}`
    : message.sender?.email || 'Unknown';

  const initials = message.sender?.profile
    ? `${message.sender.profile.firstName?.[0] || ''}${message.sender.profile.lastName?.[0] || ''}`
    : '?';

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return format(date, 'HH:mm');
    } else if (diffDays < 7) {
      return formatRelative(date, now);
    } else {
      return format(date, 'MMM d, HH:mm');
    }
  };

  const handleEdit = async () => {
    console.log('[MessageBubble] handleEdit called', { messageId: message.id, editContent, hasOnEdit: !!onEdit });
    if (!onEdit || !editContent.trim() || editContent === message.content) {
      console.log('[MessageBubble] Skipping edit - no onEdit or same content');
      setIsEditing(false);
      return;
    }
    setIsLoading(true);
    try {
      console.log('[MessageBubble] Calling onEdit...');
      await onEdit(message.id, editContent.trim());
      console.log('[MessageBubble] Edit successful');
      setIsEditing(false);
    } catch (error) {
      console.error('[MessageBubble] Failed to edit message:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    if (!confirm('Delete this message?')) return;
    setIsLoading(true);
    try {
      await onDelete(message.id);
    } catch (error) {
      console.error('Failed to delete message:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className={`group flex gap-2 px-4 ${
        isOwn ? 'flex-row-reverse' : 'flex-row'
      } ${isGrouped ? 'mt-0.5' : 'mt-3'}`}
    >
      {/* Avatar */}
      <div className="w-8 flex-shrink-0">
        {showAvatar && !isOwn && (
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
            {message.sender?.profile?.avatarUrl ? (
              <img
                src={message.sender.profile.avatarUrl}
                alt={senderName}
                className="w-8 h-8 rounded-full object-cover"
              />
            ) : (
              <span className="text-blue-600 text-xs font-medium">{initials}</span>
            )}
          </div>
        )}
      </div>

      {/* Message content */}
      <div className={`flex flex-col max-w-[70%] ${isOwn ? 'items-end' : 'items-start'}`}>
        {/* Sender name (for group chats, not own messages) */}
        {!isOwn && !isGrouped && (
          <span className="text-xs text-silver-500 mb-0.5 ml-1">{senderName}</span>
        )}

        {/* Bubble with actions */}
        <div className="relative flex items-center gap-1">
          {/* Action buttons - always visible for own messages */}
          {isOwn && !isDeleted && !isEditing && (
            <div className="flex items-center gap-1 mr-1">
              <button
                onClick={() => {
                  setEditContent(message.content || '');
                  setIsEditing(true);
                }}
                disabled={isLoading}
                className="p-1.5 hover:bg-silver-100 rounded-full text-silver-400 hover:text-blue-600 transition-colors"
                title="Edit"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={handleDelete}
                disabled={isLoading}
                className="p-1.5 hover:bg-silver-100 rounded-full text-silver-400 hover:text-red-600 transition-colors"
                title="Delete"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* Bubble */}
          {isEditing ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleEdit();
                  } else if (e.key === 'Escape') {
                    setIsEditing(false);
                  }
                }}
                className="px-3 py-2 border border-silver-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[200px]"
                autoFocus
                disabled={isLoading}
              />
              <button
                onClick={handleEdit}
                disabled={isLoading}
                className="p-1.5 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50"
              >
                <Check className="h-4 w-4" />
              </button>
              <button
                onClick={() => setIsEditing(false)}
                disabled={isLoading}
                className="p-1.5 bg-silver-200 text-silver-600 rounded-full hover:bg-silver-300 disabled:opacity-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div
              className={`rounded-2xl px-4 py-2 ${
                isOwn
                  ? 'bg-blue-600 text-white rounded-br-md'
                  : 'bg-silver-100 text-navy-900 rounded-bl-md'
              } ${isDeleted ? 'italic opacity-60' : ''}`}
            >
              {isDeleted ? (
                <span className="text-sm">This message was deleted</span>
              ) : (
                <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
              )}
            </div>
          )}
        </div>

        {/* Meta: time, edited, status */}
        <div className="flex items-center gap-1 mt-0.5 px-1">
          <span className="text-xs text-silver-400">{formatTime(message.createdAt)}</span>
          {message.isEdited && (
            <span className="text-xs text-silver-400">(edited)</span>
          )}
          {isOwn && !isDeleted && <MessageStatus status={message.clientStatus} />}
        </div>
      </div>
    </div>
  );
}
