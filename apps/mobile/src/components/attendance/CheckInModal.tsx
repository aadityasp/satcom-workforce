/**
 * CheckInModal Component
 *
 * Modal for selecting work mode and initiating check-in.
 * Displays work mode options with icons and handles check-in action.
 *
 * @module components/attendance/CheckInModal
 */

import { useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
import {
  Building2,
  Home,
  Users,
  MapPin,
  Plane,
  X,
} from 'lucide-react-native';
import { colors, typography, borderRadius, shadows, spacing } from '../../theme';
import type { WorkMode } from '../../hooks/useAttendance';

/**
 * Work mode option with icon and label
 */
interface WorkModeOption {
  value: WorkMode;
  label: string;
  icon: React.ReactNode;
  description: string;
}

/**
 * Available work mode options
 */
const WORK_MODE_OPTIONS: WorkModeOption[] = [
  {
    value: 'Office',
    label: 'Office',
    icon: <Building2 size={24} color={colors.blue[600]} />,
    description: 'Working from office location',
  },
  {
    value: 'Remote',
    label: 'Remote',
    icon: <Home size={24} color={colors.blue[600]} />,
    description: 'Working from home',
  },
  {
    value: 'CustomerSite',
    label: 'Customer Site',
    icon: <Users size={24} color={colors.blue[600]} />,
    description: 'At customer location',
  },
  {
    value: 'FieldVisit',
    label: 'Field Visit',
    icon: <MapPin size={24} color={colors.blue[600]} />,
    description: 'On field assignment',
  },
  {
    value: 'Travel',
    label: 'Travel',
    icon: <Plane size={24} color={colors.blue[600]} />,
    description: 'Business travel',
  },
];

/**
 * CheckInModal props
 */
interface CheckInModalProps {
  /** Whether modal is visible */
  visible: boolean;
  /** Close modal callback */
  onClose: () => void;
  /** Check-in callback with selected work mode */
  onCheckIn: (workMode: WorkMode) => Promise<void>;
  /** Loading state for check-in action */
  isLoading: boolean;
}

/**
 * CheckInModal component
 *
 * Displays a modal with work mode selection for check-in.
 *
 * @example
 * ```tsx
 * <CheckInModal
 *   visible={showModal}
 *   onClose={() => setShowModal(false)}
 *   onCheckIn={handleCheckIn}
 *   isLoading={isLoading}
 * />
 * ```
 */
export function CheckInModal({
  visible,
  onClose,
  onCheckIn,
  isLoading,
}: CheckInModalProps) {
  const [selectedMode, setSelectedMode] = useState<WorkMode>('Office');

  const handleCheckIn = async () => {
    await onCheckIn(selectedMode);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Animated.View
          entering={FadeIn.duration(200)}
          style={styles.overlayBackground}
        />
        <Animated.View
          entering={SlideInDown.duration(300).springify()}
          style={styles.modalContainer}
        >
          <Pressable onPress={(e) => e.stopPropagation()}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>Check In</Text>
              <TouchableOpacity
                onPress={onClose}
                style={styles.closeButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <X size={24} color={colors.silver[500]} />
              </TouchableOpacity>
            </View>

            {/* Subtitle */}
            <Text style={styles.subtitle}>
              Select your work mode for today
            </Text>

            {/* Work Mode Options */}
            <View style={styles.optionsContainer}>
              {WORK_MODE_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.optionItem,
                    selectedMode === option.value && styles.optionItemSelected,
                  ]}
                  onPress={() => setSelectedMode(option.value)}
                  disabled={isLoading}
                >
                  <View
                    style={[
                      styles.optionIcon,
                      selectedMode === option.value && styles.optionIconSelected,
                    ]}
                  >
                    {option.icon}
                  </View>
                  <View style={styles.optionText}>
                    <Text
                      style={[
                        styles.optionLabel,
                        selectedMode === option.value && styles.optionLabelSelected,
                      ]}
                    >
                      {option.label}
                    </Text>
                    <Text style={styles.optionDescription}>
                      {option.description}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.radioOuter,
                      selectedMode === option.value && styles.radioOuterSelected,
                    ]}
                  >
                    {selectedMode === option.value && (
                      <View style={styles.radioInner} />
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            {/* Check In Button */}
            <TouchableOpacity
              style={[styles.checkInButton, isLoading && styles.checkInButtonDisabled]}
              onPress={handleCheckIn}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <MapPin size={20} color="#FFFFFF" />
                  <Text style={styles.checkInButtonText}>Check In</Text>
                </>
              )}
            </TouchableOpacity>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  overlayBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: borderRadius['2xl'],
    borderTopRightRadius: borderRadius['2xl'],
    padding: spacing[5],
    paddingBottom: spacing[8],
    ...shadows.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[2],
  },
  title: {
    fontSize: typography.fontSize.xl,
    fontWeight: 'bold',
    color: colors.navy[900],
  },
  closeButton: {
    padding: spacing[2],
  },
  subtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.silver[500],
    marginBottom: spacing[5],
  },
  optionsContainer: {
    gap: spacing[3],
    marginBottom: spacing[5],
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[4],
    borderRadius: borderRadius.xl,
    borderWidth: 2,
    borderColor: colors.silver[200],
    backgroundColor: '#FFFFFF',
  },
  optionItemSelected: {
    borderColor: colors.blue[600],
    backgroundColor: colors.blue[50],
  },
  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.silver[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing[3],
  },
  optionIconSelected: {
    backgroundColor: colors.blue[100],
  },
  optionText: {
    flex: 1,
  },
  optionLabel: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: colors.navy[900],
  },
  optionLabelSelected: {
    color: colors.blue[700],
  },
  optionDescription: {
    fontSize: typography.fontSize.xs,
    color: colors.silver[500],
    marginTop: 2,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.silver[300],
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioOuterSelected: {
    borderColor: colors.blue[600],
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.blue[600],
  },
  checkInButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    paddingVertical: spacing[4],
    borderRadius: borderRadius.lg,
    backgroundColor: colors.blue[600],
  },
  checkInButtonDisabled: {
    opacity: 0.7,
  },
  checkInButtonText: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
