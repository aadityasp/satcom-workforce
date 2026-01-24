/**
 * Login Screen
 *
 * Handles user authentication with email and password.
 * Features animated entrance and form validation.
 */

import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeInDown,
  FadeInUp,
} from 'react-native-reanimated';
import { Eye, EyeOff } from 'lucide-react-native';
import { useAuthStore } from '../src/store/auth';
import { colors, typography, borderRadius, shadows } from '../src/theme';

export default function LoginScreen() {
  const { login, isLoading, error, setError } = useAuthStore();

  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  /**
   * Handle form submission
   */
  const handleLogin = async () => {
    // Basic validation
    if (!email.trim() || !password.trim()) {
      setError('Please enter email and password');
      return;
    }

    const success = await login(email.trim(), password);
    if (success) {
      router.replace('/(tabs)');
    }
  };

  return (
    <LinearGradient
      colors={[colors.navy[900], colors.navy[950]]}
      style={styles.container}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <Animated.View
          entering={FadeInDown.duration(400).delay(100)}
          style={styles.content}
        >
          {/* Logo and Header */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Text style={styles.logoText}>S</Text>
            </View>
            <Text style={styles.title}>Welcome to Workforce</Text>
            <Text style={styles.subtitle}>Sign in to continue to your dashboard</Text>
          </View>

          {/* Login Form */}
          <Animated.View
            entering={FadeInUp.duration(400).delay(200)}
            style={styles.form}
          >
            {/* Email Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="you@satcom.com"
                placeholderTextColor={colors.silver[400]}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
              />
            </View>

            {/* Password Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={[styles.input, styles.passwordInput]}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Enter your password"
                  placeholderTextColor={colors.silver[400]}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoComplete="password"
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff size={20} color={colors.silver[400]} />
                  ) : (
                    <Eye size={20} color={colors.silver[400]} />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Error Message */}
            {error && (
              <Animated.View
                entering={FadeInDown.duration(200)}
                style={styles.errorContainer}
              >
                <Text style={styles.errorText}>{error}</Text>
              </Animated.View>
            )}

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.button, isLoading && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.buttonText}>Sign In</Text>
              )}
            </TouchableOpacity>

            {/* Forgot Password Link */}
            <TouchableOpacity style={styles.forgotPassword}>
              <Text style={styles.forgotPasswordText}>Forgot password?</Text>
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>

        {/* Demo Credentials */}
        <Animated.View
          entering={FadeInUp.duration(400).delay(400)}
          style={styles.demoContainer}
        >
          <Text style={styles.demoText}>
            Demo: admin@satcom.com / Password123!
          </Text>
        </Animated.View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  content: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius['2xl'],
    padding: 32,
    ...shadows.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoContainer: {
    width: 64,
    height: 64,
    backgroundColor: colors.blue[600],
    borderRadius: borderRadius.xl,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  logoText: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  title: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: 'bold',
    color: colors.navy[900],
    marginBottom: 8,
  },
  subtitle: {
    fontSize: typography.fontSize.base,
    color: colors.silver[500],
    textAlign: 'center',
  },
  form: {
    gap: 20,
  },
  inputGroup: {
    gap: 6,
  },
  label: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
    color: colors.navy[700],
  },
  input: {
    backgroundColor: colors.silver[50],
    borderWidth: 1,
    borderColor: colors.silver[200],
    borderRadius: borderRadius.lg,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: typography.fontSize.base,
    color: colors.navy[900],
  },
  passwordContainer: {
    position: 'relative',
  },
  passwordInput: {
    paddingRight: 50,
  },
  eyeButton: {
    position: 'absolute',
    right: 16,
    top: '50%',
    transform: [{ translateY: -10 }],
  },
  errorContainer: {
    backgroundColor: colors.semantic.error + '15',
    borderRadius: borderRadius.lg,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  errorText: {
    fontSize: typography.fontSize.sm,
    color: colors.semantic.error,
  },
  button: {
    backgroundColor: colors.blue[600],
    borderRadius: borderRadius.lg,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  forgotPassword: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  forgotPasswordText: {
    fontSize: typography.fontSize.sm,
    color: colors.blue[600],
  },
  demoContainer: {
    marginTop: 24,
    alignItems: 'center',
  },
  demoText: {
    fontSize: typography.fontSize.sm,
    color: colors.silver[400],
  },
});
