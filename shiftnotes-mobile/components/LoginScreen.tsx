/**
 * Login Screen component for EPAnotes Mobile
 * Integrates with Django API authentication
 * 
 * Demo Accounts (for testing/reference):
 * - Coordinator: admin@demo.com (password: password123)
 * - Faculty: faculty@demo.com (password: password123)
 * - Trainee: trainee@demo.com (password: password123)
 * - Leadership: leadership@demo.com (password: password123)
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Dimensions,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Card, CardContent } from './ui/Card';
import { Input } from './ui/Input';
import { Button } from './ui/Button';
import { useAuth } from '../contexts/AuthContext';

const { width } = Dimensions.get('window');
const isTablet = width > 768;

interface LoginScreenProps {
  onNavigateToForgotPassword?: () => void;
}

export function LoginScreen({ onNavigateToForgotPassword }: LoginScreenProps = {}) {
  const { login, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }

    try {
      await login(email.trim(), password);
    } catch (error) {
      console.error('Login error:', error);
      Alert.alert('Login Failed', 'Invalid email or password. Please try again.');
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo and Header */}
        <View style={styles.header}>
          <View style={styles.logo}>
            <Image 
              source={require('../assets/favicon.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.tagline}>Competency tracking made easy.</Text>
        </View>

        {/* Login Form */}
        <Card style={[styles.loginCard, isTablet && styles.loginCardTablet]}>
          <CardContent>
            <View style={styles.formHeader}>
              <Text style={styles.formTitle}>Sign In</Text>
              <Text style={styles.formSubtitle}>
                Enter your credentials to access your dashboard.
              </Text>
            </View>

            {/* Email Field */}
            <View style={styles.field}>
              <Text style={styles.label}>Email</Text>
              <Input
                value={email}
                onChangeText={setEmail}
                placeholder="Enter your email"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                editable={!isLoading}
              />
            </View>

            {/* Password Field */}
            <View style={styles.field}>
              <Text style={styles.label}>Password</Text>
              <Input
                value={password}
                onChangeText={setPassword}
                placeholder="Enter your password"
                secureTextEntry
                autoComplete="password"
                editable={!isLoading}
              />
            </View>

            {/* Sign In Button */}
            <Button
              title={isLoading ? "Signing In..." : "Sign In"}
              onPress={handleLogin}
              disabled={!email || !password || isLoading}
              style={styles.signInButton}
            />

            {/* Forgot Password Link */}
            <Pressable
              style={styles.forgotPasswordLink}
              onPress={() => {
                if (onNavigateToForgotPassword) {
                  onNavigateToForgotPassword();
                } else {
                  Alert.alert('Forgot Password', 'Forgot password feature coming soon!');
                }
              }}
              disabled={isLoading}
            >
              <Text style={styles.forgotPasswordText}>Forgot your password?</Text>
            </Pressable>
          </CardContent>
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
    minHeight: Dimensions.get('window').height - 100,
  },
  
  // Header
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logo: {
    width: 200,
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  logoImage: {
    width: 160,
    height: 160,
  },
  tagline: {
    fontSize: 24,
    color: '#6b7280',
  },

  // Login Card
  loginCard: {
    maxWidth: 400,
    alignSelf: 'center',
    width: '100%',
  },
  loginCardTablet: {
    maxWidth: 480,
  },
  formHeader: {
    marginBottom: 24,
  },
  formTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  formSubtitle: {
    fontSize: 16,
    color: '#6b7280',
  },

  // Form Fields
  field: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  signInButton: {
    marginTop: 8,
    marginBottom: 16,
  },
  forgotPasswordLink: {
    alignSelf: 'center',
    marginBottom: 24,
    paddingVertical: 8,
  },
  forgotPasswordText: {
    color: '#3b82f6',
    fontSize: 14,
    fontWeight: '500',
  },
});