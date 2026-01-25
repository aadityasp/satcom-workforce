/**
 * Conversation List Screen
 *
 * Displays all conversations with search and new chat creation.
 * Navigates to individual message threads.
 *
 * @module app/chat/index
 */

import { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Plus, Search, X, Users, User } from 'lucide-react-native';
import { colors, typography, borderRadius, spacing, shadows } from '../../src/theme';
import { useChat, useConversationList } from '../../src/hooks';
import { useChatStore, Conversation } from '../../src/store/chat';
import { ConversationItem } from '../../src/components/chat';
import { useAuthStore } from '../../src/store/auth';
import { API_URL } from '../../src/lib/api';

interface UserSearchResult {
  id: string;
  email: string;
  profile?: {
    firstName: string;
    lastName: string;
    avatarUrl?: string;
  } | null;
}

export default function ConversationListScreen() {
  const router = useRouter();
  const { user, accessToken } = useAuthStore();
  const { isConnected } = useChat();
  const { conversations, isLoading, refresh, createConversation } = useConversationList();
  const currentUserId = useChatStore((state) => state.currentUserId);

  // New chat modal state
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<UserSearchResult[]>([]);
  const [groupName, setGroupName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Search users
  const handleSearch = useCallback(
    async (query: string) => {
      setSearchQuery(query);
      if (!query.trim() || !accessToken) {
        setSearchResults([]);
        return;
      }

      setIsSearching(true);
      try {
        const response = await fetch(
          `${API_URL}/chat/users/search?q=${encodeURIComponent(query)}`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );

        if (response.ok) {
          const { data } = await response.json();
          // Filter out current user
          setSearchResults(data.filter((u: UserSearchResult) => u.id !== user?.id));
        }
      } catch (error) {
        console.error('Search failed:', error);
      } finally {
        setIsSearching(false);
      }
    },
    [accessToken, user?.id]
  );

  // Toggle user selection
  const toggleUserSelection = (userResult: UserSearchResult) => {
    setSelectedUsers((prev) =>
      prev.find((u) => u.id === userResult.id)
        ? prev.filter((u) => u.id !== userResult.id)
        : [...prev, userResult]
    );
  };

  // Create conversation
  const handleCreateConversation = async () => {
    if (selectedUsers.length === 0) return;

    setIsCreating(true);
    try {
      const userIds = selectedUsers.map((u) => u.id);
      const name = selectedUsers.length > 1 ? groupName.trim() || undefined : undefined;
      const conversation = await createConversation(userIds, name);

      if (conversation) {
        closeModal();
        router.push(`/chat/${conversation.id}`);
      }
    } catch (error) {
      console.error('Failed to create conversation:', error);
    } finally {
      setIsCreating(false);
    }
  };

  // Close modal and reset state
  const closeModal = () => {
    setShowNewChatModal(false);
    setSearchQuery('');
    setSearchResults([]);
    setSelectedUsers([]);
    setGroupName('');
  };

  // Navigate to thread
  const handleConversationPress = (conversation: Conversation) => {
    router.push(`/chat/${conversation.id}`);
  };

  // Render conversation item
  const renderConversation = ({ item }: { item: Conversation }) => (
    <ConversationItem
      conversation={item}
      currentUserId={currentUserId || ''}
      onPress={() => handleConversationPress(item)}
    />
  );

  // Empty state
  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Users size={48} color={colors.silver[300]} />
      <Text style={styles.emptyTitle}>No conversations yet</Text>
      <Text style={styles.emptySubtitle}>
        Start a new chat by tapping the + button
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Connection indicator */}
      {!isConnected && (
        <View style={styles.connectionBanner}>
          <Text style={styles.connectionText}>Connecting...</Text>
        </View>
      )}

      {/* Conversation list */}
      <FlatList
        data={conversations}
        keyExtractor={(item) => item.id}
        renderItem={renderConversation}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refresh} />
        }
        ListEmptyComponent={!isLoading ? renderEmptyState : null}
        contentContainerStyle={conversations.length === 0 ? styles.emptyContainer : undefined}
      />

      {/* New chat FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setShowNewChatModal(true)}
        activeOpacity={0.8}
      >
        <Plus size={24} color="#FFFFFF" />
      </TouchableOpacity>

      {/* New chat modal */}
      <Modal
        visible={showNewChatModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeModal}
      >
        <View style={styles.modalContainer}>
          {/* Modal header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={closeModal}>
              <X size={24} color={colors.navy[900]} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>New Conversation</Text>
            <TouchableOpacity
              onPress={handleCreateConversation}
              disabled={selectedUsers.length === 0 || isCreating}
            >
              <Text
                style={[
                  styles.createButton,
                  (selectedUsers.length === 0 || isCreating) && styles.createButtonDisabled,
                ]}
              >
                {isCreating ? 'Creating...' : 'Create'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Selected users */}
          {selectedUsers.length > 0 && (
            <View style={styles.selectedContainer}>
              <View style={styles.selectedChips}>
                {selectedUsers.map((u) => (
                  <TouchableOpacity
                    key={u.id}
                    style={styles.chip}
                    onPress={() => toggleUserSelection(u)}
                  >
                    <Text style={styles.chipText}>
                      {u.profile?.firstName || u.email}
                    </Text>
                    <X size={14} color={colors.blue[600]} />
                  </TouchableOpacity>
                ))}
              </View>

              {/* Group name input (for groups) */}
              {selectedUsers.length > 1 && (
                <TextInput
                  style={styles.groupNameInput}
                  value={groupName}
                  onChangeText={setGroupName}
                  placeholder="Group name (optional)"
                  placeholderTextColor={colors.silver[400]}
                />
              )}
            </View>
          )}

          {/* Search input */}
          <View style={styles.searchContainer}>
            <Search size={20} color={colors.silver[400]} />
            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={handleSearch}
              placeholder="Search by name or email..."
              placeholderTextColor={colors.silver[400]}
              autoFocus
            />
          </View>

          {/* Search results */}
          {isSearching ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={colors.blue[600]} />
            </View>
          ) : (
            <FlatList
              data={searchResults}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.userItem}
                  onPress={() => toggleUserSelection(item)}
                >
                  <View style={styles.userAvatar}>
                    <User size={20} color={colors.blue[600]} />
                  </View>
                  <View style={styles.userInfo}>
                    <Text style={styles.userName}>
                      {item.profile
                        ? `${item.profile.firstName} ${item.profile.lastName}`
                        : item.email}
                    </Text>
                    <Text style={styles.userEmail}>{item.email}</Text>
                  </View>
                  {selectedUsers.find((u) => u.id === item.id) && (
                    <View style={styles.checkmark}>
                      <Text style={styles.checkmarkText}>Selected</Text>
                    </View>
                  )}
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                searchQuery.length > 0 ? (
                  <View style={styles.noResults}>
                    <Text style={styles.noResultsText}>No users found</Text>
                  </View>
                ) : (
                  <View style={styles.noResults}>
                    <Text style={styles.noResultsText}>
                      Search for users to start a conversation
                    </Text>
                  </View>
                )
              }
            />
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  connectionBanner: {
    backgroundColor: colors.semantic.warning.light,
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[4],
    alignItems: 'center',
  },
  connectionText: {
    fontSize: typography.fontSize.sm,
    color: colors.semantic.warning.dark,
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing[8],
  },
  emptyTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: colors.navy[900],
    marginTop: spacing[4],
  },
  emptySubtitle: {
    fontSize: typography.fontSize.base,
    color: colors.silver[500],
    textAlign: 'center',
    marginTop: spacing[2],
  },
  fab: {
    position: 'absolute',
    bottom: spacing[6],
    right: spacing[4],
    width: 56,
    height: 56,
    borderRadius: borderRadius.full,
    backgroundColor: colors.blue[600],
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.lg,
  },

  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.silver[200],
  },
  modalTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: colors.navy[900],
  },
  createButton: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: colors.blue[600],
  },
  createButtonDisabled: {
    color: colors.silver[400],
  },
  selectedContainer: {
    padding: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.silver[200],
  },
  selectedChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.blue[50],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1.5],
    borderRadius: borderRadius.full,
    gap: spacing[1],
  },
  chipText: {
    fontSize: typography.fontSize.sm,
    color: colors.blue[600],
  },
  groupNameInput: {
    marginTop: spacing[3],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderWidth: 1,
    borderColor: colors.silver[300],
    borderRadius: borderRadius.lg,
    fontSize: typography.fontSize.base,
    color: colors.navy[900],
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: colors.silver[200],
    gap: spacing[2],
  },
  searchInput: {
    flex: 1,
    fontSize: typography.fontSize.base,
    color: colors.navy[900],
    paddingVertical: spacing[1],
  },
  loadingContainer: {
    paddingVertical: spacing[8],
    alignItems: 'center',
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.silver[100],
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: colors.blue[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing[3],
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: typography.fontSize.base,
    fontWeight: '500',
    color: colors.navy[900],
  },
  userEmail: {
    fontSize: typography.fontSize.sm,
    color: colors.silver[500],
    marginTop: spacing[0.5],
  },
  checkmark: {
    backgroundColor: colors.blue[100],
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.md,
  },
  checkmarkText: {
    fontSize: typography.fontSize.xs,
    color: colors.blue[600],
    fontWeight: '500',
  },
  noResults: {
    paddingVertical: spacing[8],
    alignItems: 'center',
  },
  noResultsText: {
    fontSize: typography.fontSize.base,
    color: colors.silver[500],
    textAlign: 'center',
  },
});
