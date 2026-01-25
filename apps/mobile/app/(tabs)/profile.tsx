/**
 * Profile Tab
 *
 * Displays user profile information and settings.
 * Allows logout and profile management.
 */

import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import {
  User,
  Mail,
  Briefcase,
  Bell,
  MapPin,
  Shield,
  HelpCircle,
  LogOut,
  ChevronRight,
  Moon,
} from 'lucide-react-native';
import { useAuthStore } from '../../src/store/auth';
import { colors, typography, borderRadius, shadows, spacing } from '../../src/theme';
import { OfflineIndicator } from '../../src/components/common/OfflineIndicator';

export default function ProfileScreen() {
  const { user, logout } = useAuthStore();
  const [notifications, setNotifications] = useState(true);
  const [locationEnabled, setLocationEnabled] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  /**
   * Handle logout with confirmation
   */
  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/login');
          },
        },
      ]
    );
  };

  /**
   * Menu item component
   */
  const MenuItem = ({
    icon,
    label,
    value,
    onPress,
    showChevron = true,
    danger = false,
  }: {
    icon: React.ReactNode;
    label: string;
    value?: string;
    onPress?: () => void;
    showChevron?: boolean;
    danger?: boolean;
  }) => (
    <TouchableOpacity
      style={styles.menuItem}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={styles.menuItemLeft}>
        <View style={[styles.menuIcon, danger && styles.menuIconDanger]}>
          {icon}
        </View>
        <Text style={[styles.menuLabel, danger && styles.menuLabelDanger]}>
          {label}
        </Text>
      </View>
      <View style={styles.menuItemRight}>
        {value && <Text style={styles.menuValue}>{value}</Text>}
        {showChevron && (
          <ChevronRight size={20} color={colors.silver[400]} />
        )}
      </View>
    </TouchableOpacity>
  );

  /**
   * Toggle item component
   */
  const ToggleItem = ({
    icon,
    label,
    value,
    onValueChange,
  }: {
    icon: React.ReactNode;
    label: string;
    value: boolean;
    onValueChange: (value: boolean) => void;
  }) => (
    <View style={styles.menuItem}>
      <View style={styles.menuItemLeft}>
        <View style={styles.menuIcon}>{icon}</View>
        <Text style={styles.menuLabel}>{label}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: colors.silver[300], true: colors.blue[200] }}
        thumbColor={value ? colors.blue[600] : colors.silver[100]}
      />
    </View>
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      {/* Profile Header */}
      <Animated.View
        entering={FadeInDown.duration(300)}
        style={styles.headerCard}
      >
        <View style={styles.avatarLarge}>
          <Text style={styles.avatarLargeText}>
            {user?.profile?.firstName?.[0]}
            {user?.profile?.lastName?.[0]}
          </Text>
        </View>
        <Text style={styles.userName}>
          {user?.profile?.firstName} {user?.profile?.lastName}
        </Text>
        <Text style={styles.userEmail}>{user?.email}</Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>{user?.role}</Text>
        </View>
        <OfflineIndicator showWhenOnline />
      </Animated.View>

      {/* Personal Info Section */}
      <Animated.View
        entering={FadeInDown.duration(300).delay(100)}
        style={styles.section}
      >
        <Text style={styles.sectionTitle}>Personal Information</Text>
        <View style={styles.menuCard}>
          <MenuItem
            icon={<User size={20} color={colors.blue[600]} />}
            label="Full Name"
            value={`${user?.profile?.firstName} ${user?.profile?.lastName}`}
            showChevron={false}
          />
          <View style={styles.menuDivider} />
          <MenuItem
            icon={<Mail size={20} color={colors.blue[600]} />}
            label="Email"
            value={user?.email}
            showChevron={false}
          />
          <View style={styles.menuDivider} />
          <MenuItem
            icon={<Briefcase size={20} color={colors.blue[600]} />}
            label="Designation"
            value={user?.profile?.designation || 'Not set'}
            showChevron={false}
          />
        </View>
      </Animated.View>

      {/* Preferences Section */}
      <Animated.View
        entering={FadeInDown.duration(300).delay(200)}
        style={styles.section}
      >
        <Text style={styles.sectionTitle}>Preferences</Text>
        <View style={styles.menuCard}>
          <ToggleItem
            icon={<Bell size={20} color={colors.blue[600]} />}
            label="Push Notifications"
            value={notifications}
            onValueChange={setNotifications}
          />
          <View style={styles.menuDivider} />
          <ToggleItem
            icon={<MapPin size={20} color={colors.blue[600]} />}
            label="Location Services"
            value={locationEnabled}
            onValueChange={setLocationEnabled}
          />
          <View style={styles.menuDivider} />
          <ToggleItem
            icon={<Moon size={20} color={colors.blue[600]} />}
            label="Dark Mode"
            value={darkMode}
            onValueChange={setDarkMode}
          />
        </View>
      </Animated.View>

      {/* Support Section */}
      <Animated.View
        entering={FadeInDown.duration(300).delay(300)}
        style={styles.section}
      >
        <Text style={styles.sectionTitle}>Support</Text>
        <View style={styles.menuCard}>
          <MenuItem
            icon={<Shield size={20} color={colors.blue[600]} />}
            label="Privacy Policy"
            onPress={() => {}}
          />
          <View style={styles.menuDivider} />
          <MenuItem
            icon={<HelpCircle size={20} color={colors.blue[600]} />}
            label="Help & Support"
            onPress={() => {}}
          />
        </View>
      </Animated.View>

      {/* Logout Section */}
      <Animated.View
        entering={FadeInDown.duration(300).delay(400)}
        style={styles.section}
      >
        <View style={styles.menuCard}>
          <MenuItem
            icon={<LogOut size={20} color={colors.semantic.error.main} />}
            label="Logout"
            onPress={handleLogout}
            showChevron={false}
            danger
          />
        </View>
      </Animated.View>

      {/* Version */}
      <Animated.View
        entering={FadeInDown.duration(300).delay(500)}
        style={styles.versionContainer}
      >
        <Text style={styles.versionText}>Satcom Workforce v1.0.0</Text>
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.silver[50],
  },
  contentContainer: {
    padding: spacing[4],
    paddingBottom: spacing[8],
  },
  headerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius['2xl'],
    padding: spacing[6],
    alignItems: 'center',
    marginBottom: spacing[4],
    ...shadows.md,
  },
  avatarLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.blue[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  avatarLargeText: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: 'bold',
    color: colors.blue[600],
  },
  userName: {
    fontSize: typography.fontSize.xl,
    fontWeight: 'bold',
    color: colors.navy[900],
  },
  userEmail: {
    fontSize: typography.fontSize.base,
    color: colors.silver[500],
    marginTop: spacing[1],
  },
  roleBadge: {
    backgroundColor: colors.blue[50],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.full,
    marginTop: spacing[3],
  },
  roleText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
    color: colors.blue[600],
  },
  section: {
    marginBottom: spacing[4],
  },
  sectionTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: colors.silver[500],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing[2],
    marginLeft: spacing[2],
  },
  menuCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.xl,
    ...shadows.sm,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[4],
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.blue[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing[3],
  },
  menuIconDanger: {
    backgroundColor: colors.semantic.error.light,
  },
  menuLabel: {
    fontSize: typography.fontSize.base,
    color: colors.navy[900],
  },
  menuLabelDanger: {
    color: colors.semantic.error.main,
  },
  menuItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  menuValue: {
    fontSize: typography.fontSize.sm,
    color: colors.silver[500],
    maxWidth: 150,
  },
  menuDivider: {
    height: 1,
    backgroundColor: colors.silver[100],
    marginLeft: spacing[4] + 36 + spacing[3],
  },
  versionContainer: {
    alignItems: 'center',
    marginTop: spacing[4],
  },
  versionText: {
    fontSize: typography.fontSize.sm,
    color: colors.silver[400],
  },
});
