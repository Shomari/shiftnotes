import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ScrollView,
} from 'react-native';
import { Card, CardContent } from '../ui/Card';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import config from '../../env.config';

interface ForgotPasswordScreenProps {
  onBack: () => void;
}

export function ForgotPasswordScreen({ onBack }: ForgotPasswordScreenProps) {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleRequestReset = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${config.API_BASE_URL}/auth/request-password-reset/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim(),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setEmailSent(true);
      } else {
        Alert.alert('Error', data.error || 'Failed to send reset email');
      }
    } catch (error) {
      console.error('Password reset request error:', error);
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (emailSent) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <View style={styles.logo}>
            <Text style={styles.logoIcon}>📧</Text>
          </View>
          <Text style={styles.appName}>Check Your Email</Text>
          <Text style={styles.tagline}>Password reset instructions sent</Text>
        </View>

        <Card style={styles.card}>
          <CardContent>
            <View style={styles.successContent}>
              <Text style={styles.successTitle}>Email Sent!</Text>
              <Text style={styles.successMessage}>
                If an account with that email exists, we've sent password reset instructions to:
              </Text>
              <Text style={styles.emailAddress}>{email}</Text>
              <Text style={styles.instructionText}>
                Please check your email (including spam folder) and follow the link to reset your password.
              </Text>
              
              <View style={styles.buttonContainer}>
                <Button
                  title="Back to Login"
                  onPress={onBack}
                  style={styles.backButton}
                />
                <Button
                  title="Resend Email"
                  onPress={() => {
                    setEmailSent(false);
                    handleRequestReset();
                  }}
                  variant="outline"
                  style={styles.resendButton}
                />
              </View>
            </View>
          </CardContent>
        </Card>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={styles.header}>
        <View style={styles.logo}>
          <Text style={styles.logoIcon}>🔐</Text>
        </View>
        <Text style={styles.appName}>Forgot Password</Text>
        <Text style={styles.tagline}>Enter your email to reset your password</Text>
      </View>

      <Card style={styles.card}>
        <CardContent>
          <View style={styles.formHeader}>
            <Text style={styles.formTitle}>Reset Password</Text>
            <Text style={styles.formSubtitle}>
              Enter the email address associated with your account and we'll send you a link to reset your password.
            </Text>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Email Address</Text>
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

          <View style={styles.buttonContainer}>
            <Button
              title={isLoading ? "Sending..." : "Send Reset Link"}
              onPress={handleRequestReset}
              disabled={!email.trim() || isLoading}
              style={styles.submitButton}
            />
            <Button
              title="Back to Login"
              onPress={onBack}
              variant="outline"
              style={styles.backButton}
            />
          </View>
        </CardContent>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  logoIcon: {
    fontSize: 36,
    color: '#ffffff',
  },
  appName: {
    fontSize: 36,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 8,
  },
  tagline: {
    fontSize: 18,
    color: '#6b7280',
    textAlign: 'center',
  },
  card: {
    maxWidth: 400,
    alignSelf: 'center',
    width: '100%',
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
    lineHeight: 24,
  },
  field: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  buttonContainer: {
    gap: 12,
  },
  submitButton: {
    marginBottom: 0,
  },
  backButton: {
    marginBottom: 0,
  },
  resendButton: {
    marginBottom: 0,
  },
  successContent: {
    alignItems: 'center',
    textAlign: 'center',
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#059669',
    marginBottom: 16,
  },
  successMessage: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 8,
  },
  emailAddress: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
  },
  instructionText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
});
