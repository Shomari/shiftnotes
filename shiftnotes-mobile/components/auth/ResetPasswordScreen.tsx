import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { Card, CardContent } from '../ui/Card';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import config from '../../env.config';

interface ResetPasswordScreenProps {
  uidb64: string;
  token: string;
  onSuccess: () => void;
  onBack: () => void;
}

export function ResetPasswordScreen({ uidb64, token, onSuccess, onBack }: ResetPasswordScreenProps) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [userInfo, setUserInfo] = useState<{ name: string; email: string } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    verifyToken();
  }, []);

  const verifyToken = async () => {
    setIsVerifying(true);
    try {
      const response = await fetch(`${config.API_BASE_URL}/auth/verify-reset-token/${uidb64}/${token}/`);
      const data = await response.json();

      if (response.ok && data.valid) {
        setTokenValid(true);
        setUserInfo({ name: data.name, email: data.email });
      } else {
        setTokenValid(false);
        Alert.alert('Invalid Link', data.error || 'This password reset link is invalid or has expired.');
      }
    } catch (error) {
      console.error('Token verification error:', error);
      setTokenValid(false);
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResetPassword = async () => {
    // Clear previous errors
    setErrorMessage('');
    
    // Validation
    if (!password || !confirmPassword) {
      const msg = 'Please fill in both password fields';
      setErrorMessage(msg);
      if (Platform.OS === 'web') {
        window.alert(msg);
      } else {
        Alert.alert('Error', msg);
      }
      return;
    }

    if (password !== confirmPassword) {
      const msg = 'Passwords do not match';
      setErrorMessage(msg);
      if (Platform.OS === 'web') {
        window.alert(msg);
      } else {
        Alert.alert('Error', msg);
      }
      return;
    }

    if (password.length < 8) {
      const msg = 'Password must be at least 8 characters long';
      setErrorMessage(msg);
      if (Platform.OS === 'web') {
        window.alert(msg);
      } else {
        Alert.alert('Error', msg);
      }
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${config.API_BASE_URL}/auth/reset-password/${uidb64}/${token}/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          password,
          confirm_password: confirmPassword,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        const successMsg = 'Your password has been reset successfully. You can now log in with your new password.';
        if (Platform.OS === 'web') {
          window.alert(successMsg);
          onSuccess();
        } else {
          Alert.alert('Success!', successMsg, [{ text: 'OK', onPress: onSuccess }]);
        }
      } else {
        const errMsg = Array.isArray(data.error) ? data.error.join(', ') : data.error;
        setErrorMessage(errMsg || 'Failed to reset password');
        if (Platform.OS === 'web') {
          window.alert(errMsg || 'Failed to reset password');
        } else {
          Alert.alert('Error', errMsg || 'Failed to reset password');
        }
      }
    } catch (error) {
      console.error('Password reset error:', error);
      const errMsg = 'Network error. Please try again.';
      setErrorMessage(errMsg);
      if (Platform.OS === 'web') {
        window.alert(errMsg);
      } else {
        Alert.alert('Error', errMsg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (isVerifying) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContent}>
          <View style={styles.logo}>
            <Text style={styles.logoIcon}>🔐</Text>
          </View>
          <Text style={styles.loadingText}>Verifying reset link...</Text>
        </View>
      </View>
    );
  }

  if (!tokenValid) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <View style={styles.logo}>
            <Text style={styles.logoIcon}>❌</Text>
          </View>
          <Text style={styles.appName}>Invalid Link</Text>
          <Text style={styles.tagline}>This password reset link is not valid</Text>
        </View>

        <Card style={styles.card}>
          <CardContent>
            <View style={styles.errorContent}>
              <Text style={styles.errorTitle}>Link Expired or Invalid</Text>
              <Text style={styles.errorMessage}>
                This password reset link has expired or is no longer valid. 
                Please request a new password reset link.
              </Text>
              
              <Button
                title="Back to Login"
                onPress={onBack}
                style={styles.backButton}
              />
            </View>
          </CardContent>
        </Card>
      </ScrollView>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <View style={styles.logo}>
            <Text style={styles.logoIcon}>🔐</Text>
          </View>
          <Text style={styles.appName}>Reset Password</Text>
          <Text style={styles.tagline}>Set your new password</Text>
        </View>

      <Card style={styles.card}>
        <CardContent>
          <View style={styles.formHeader}>
            <Text style={styles.formTitle}>Set New Password</Text>
            {userInfo && (
              <Text style={styles.formSubtitle}>
                Setting password for {userInfo.name} ({userInfo.email})
              </Text>
            )}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>New Password</Text>
            <Input
              value={password}
              onChangeText={setPassword}
              placeholder="Enter new password"
              secureTextEntry
              autoComplete="new-password"
              editable={!isLoading}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Confirm New Password</Text>
            <Input
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Confirm new password"
              secureTextEntry
              autoComplete="new-password"
              editable={!isLoading}
            />
          </View>

          <View style={styles.passwordRequirements}>
            <Text style={styles.requirementsTitle}>Password Requirements:</Text>
            <Text style={styles.requirementItem}>• At least 8 characters long</Text>
            <Text style={styles.requirementItem}>• Include uppercase and lowercase letters</Text>
            <Text style={styles.requirementItem}>• Include at least one number</Text>
          </View>

          <View style={styles.buttonContainer}>
            <Button
              title={isLoading ? "Resetting..." : "Reset Password"}
              onPress={handleResetPassword}
              disabled={!password || !confirmPassword || isLoading}
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
    </KeyboardAvoidingView>
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
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  loadingText: {
    fontSize: 18,
    color: '#6b7280',
    marginTop: 16,
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
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  passwordRequirements: {
    backgroundColor: '#f0f9ff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
  },
  requirementsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  requirementItem: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
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
  errorContent: {
    alignItems: 'center',
    textAlign: 'center',
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#dc2626',
    marginBottom: 16,
  },
  errorMessage: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
});
