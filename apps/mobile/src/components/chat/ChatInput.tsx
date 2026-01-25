/**
 * ChatInput Component
 *
 * Message input with send button and typing indicator support.
 * Handles multi-line text input and typing status emissions.
 *
 * @module components/chat/ChatInput
 */

import { useState, useRef, useEffect } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { Send } from 'lucide-react-native';
import { colors, typography, borderRadius, spacing } from '../../theme';

interface ChatInputProps {
  onSend: (content: string) => void;
  onTypingStart?: () => void;
  onTypingStop?: () => void;
  disabled?: boolean;
  placeholder?: string;
}

const TYPING_TIMEOUT_MS = 2000;

export function ChatInput({
  onSend,
  onTypingStart,
  onTypingStop,
  disabled = false,
  placeholder = 'Type a message...',
}: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Handle typing indicator
  useEffect(() => {
    return () => {
      // Clear timeout on unmount
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      // Stop typing on unmount
      if (isTyping && onTypingStop) {
        onTypingStop();
      }
    };
  }, []);

  const handleTextChange = (text: string) => {
    setMessage(text);

    // Handle typing indicators
    if (text.length > 0 && !isTyping) {
      // Started typing
      setIsTyping(true);
      onTypingStart?.();
    }

    // Reset typing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    if (text.length > 0) {
      // Set timeout to stop typing
      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false);
        onTypingStop?.();
      }, TYPING_TIMEOUT_MS);
    } else {
      // No text, stop typing immediately
      setIsTyping(false);
      onTypingStop?.();
    }
  };

  const handleSend = () => {
    const trimmedMessage = message.trim();
    if (!trimmedMessage || disabled) return;

    // Clear typing state
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    if (isTyping) {
      setIsTyping(false);
      onTypingStop?.();
    }

    // Send message
    onSend(trimmedMessage);
    setMessage('');
  };

  const canSend = message.trim().length > 0 && !disabled;

  return (
    <View style={styles.container}>
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={message}
          onChangeText={handleTextChange}
          placeholder={placeholder}
          placeholderTextColor={colors.silver[400]}
          multiline
          maxLength={2000}
          editable={!disabled}
          returnKeyType="default"
          blurOnSubmit={false}
        />
        <TouchableOpacity
          style={[styles.sendButton, !canSend && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={!canSend}
          activeOpacity={0.7}
        >
          <Send
            size={20}
            color={canSend ? '#FFFFFF' : colors.silver[400]}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: colors.silver[200],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    paddingBottom: Platform.OS === 'ios' ? spacing[2] : spacing[2],
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: colors.silver[50],
    borderRadius: borderRadius.xl,
    paddingLeft: spacing[4],
    paddingRight: spacing[1],
    paddingVertical: spacing[1],
  },
  input: {
    flex: 1,
    fontSize: typography.fontSize.base,
    color: colors.navy[900],
    maxHeight: 100,
    paddingTop: Platform.OS === 'ios' ? spacing[2] : spacing[1.5],
    paddingBottom: Platform.OS === 'ios' ? spacing[2] : spacing[1.5],
    textAlignVertical: 'center',
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    backgroundColor: colors.blue[600],
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: spacing[2],
  },
  sendButtonDisabled: {
    backgroundColor: colors.silver[200],
  },
});

export default ChatInput;
