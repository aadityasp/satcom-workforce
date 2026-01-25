/**
 * TypingIndicator Component
 *
 * Shows animated dots and names when users are typing.
 * Used in chat thread view.
 *
 * @module components/chat/TypingIndicator
 */

import { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { colors, typography, spacing } from '../../theme';
import { Conversation } from '../../store/chat';

interface TypingIndicatorProps {
  typingUserIds: string[];
  members: Conversation['members'];
}

/**
 * Animated dot component
 */
function AnimatedDot({ delay }: { delay: number }) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 300,
          useNativeDriver: true,
        }),
      ])
    );

    animation.start();
    return () => animation.stop();
  }, [delay, opacity]);

  return <Animated.View style={[styles.dot, { opacity }]} />;
}

export function TypingIndicator({ typingUserIds, members }: TypingIndicatorProps) {
  if (typingUserIds.length === 0) return null;

  const typingNames = typingUserIds
    .map((userId) => {
      const member = members.find((m) => m.userId === userId);
      return member?.user?.profile?.firstName || 'Someone';
    })
    .slice(0, 3);

  let text: string;
  if (typingNames.length === 1) {
    text = `${typingNames[0]} is typing...`;
  } else if (typingNames.length === 2) {
    text = `${typingNames[0]} and ${typingNames[1]} are typing...`;
  } else {
    text = `${typingNames[0]} and ${typingNames.length - 1} others are typing...`;
  }

  return (
    <View style={styles.container}>
      <View style={styles.dotsContainer}>
        <AnimatedDot delay={0} />
        <AnimatedDot delay={150} />
        <AnimatedDot delay={300} />
      </View>
      <Text style={styles.text}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: spacing[2],
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.silver[400],
    marginHorizontal: 2,
  },
  text: {
    fontSize: typography.fontSize.sm,
    color: colors.silver[500],
    fontStyle: 'italic',
  },
});

export default TypingIndicator;
