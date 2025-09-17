/**
 * Edit User page component
 * Full page form for editing existing users with deactivation option
 */

import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
// Navigation handled by parent component
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { Header } from '../ui/Header';
import { AuthContext } from '../../contexts/AuthContext';
import { apiClient, ApiUser } from '../../lib/api';
import { ArrowLeft, PencilSimple, UserMinus, UserCheck } from 'phosphor-react-native';

interface UserFormData {
  email: string;
  name: string;
  role: string;
  department: string;
}

interface EditUserProps {
  userId: string;
  onBack?: () => void;
}

export default function EditUser({ userId, onBack }: EditUserProps) {
  const { user } = useContext(AuthContext);
  const [loading, setLoading] = useState(false);
  const [loadingUser, setLoadingUser] = useState(true);
  const [userData, setUserData] = useState<ApiUser | null>(null);
  const [formData, setFormData] = useState<UserFormData>({
    email: '',
    name: '',
    role: 'trainee',
    department: '',
  });

  const roleOptions = [
    { label: 'Trainee', value: 'trainee' },
    { label: 'Faculty', value: 'faculty' },
    { label: 'Coordinator', value: 'admin' },
    { label: 'Leadership', value: 'leadership' },
  ];

  useEffect(() => {
    loadUser();
  }, [userId]);

  const loadUser = async () => {
    if (!userId) return;
    
    setLoadingUser(true);
    try {
      const usersResponse = await apiClient.getUsers();
      const foundUser = usersResponse.results?.find(u => u.id === userId);
      
      if (foundUser) {
        setUserData(foundUser);
        setFormData({
          email: foundUser.email,
          name: foundUser.name,
          role: foundUser.role,
          department: foundUser.department || '',
        });
      } else {
        Alert.alert('Error', 'User not found');
        if (onBack) onBack();
      }
    } catch (error) {
      console.error('Error loading user:', error);
      Alert.alert('Error', 'Failed to load user data');
      if (onBack) onBack();
    } finally {
      setLoadingUser(false);
    }
  };

  const handleSave = async () => {
    // Validation
    if (!formData.email || !formData.name || !formData.role) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (!formData.email.includes('@')) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    setLoading(true);
    try {
      console.log('Updating user with data:', formData);
      await apiClient.updateUser(userId, formData);
      console.log('User updated successfully, redirecting back');
      // Directly call onBack instead of relying on Alert which doesn't work well in web
      onBack?.();
    } catch (error) {
      console.error('Error updating user:', error);
      Alert.alert('Error', 'Failed to update user. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivate = () => {
    const isActive = !userData?.deactivated_at;
    const action = isActive ? 'deactivate' : 'reactivate';
    const actionTitle = isActive ? 'Deactivate User' : 'Reactivate User';
    const actionMessage = isActive 
      ? `Are you sure you want to deactivate ${userData?.name}? They will no longer appear in reports and cannot log in.`
      : `Are you sure you want to reactivate ${userData?.name}? They will be able to log in and appear in reports again.`;

    Alert.alert(
      actionTitle,
      actionMessage,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: action === 'deactivate' ? 'Deactivate' : 'Reactivate',
          style: action === 'deactivate' ? 'destructive' : 'default',
          onPress: async () => {
            setLoading(true);
            try {
              const updateData = {
                ...formData,
                deactivated_at: isActive ? new Date().toISOString() : null,
              };
              
              await apiClient.updateUser(userId, updateData);
              console.log(`User ${action}d successfully, redirecting back`);
              // Directly call onBack instead of relying on Alert which doesn't work well in web
              onBack?.();
            } catch (error) {
              console.error(`Error ${action}ing user:`, error);
              Alert.alert('Error', `Failed to ${action} user. Please try again.`);
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleCancel = () => {
    if (onBack) onBack();
  };

  if (loadingUser) {
    return (
      <View style={styles.container}>
        <Header 
          title="Edit User"
          leftAction={{
            icon: ArrowLeft,
            onPress: handleCancel,
          }}
        />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading user data...</Text>
        </View>
      </View>
    );
  }

  const isActive = !userData?.deactivated_at;

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <Header 
        title="Edit User"
        leftAction={{
          icon: ArrowLeft,
          onPress: handleCancel,
        }}
      />
      
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Status Card */}
        <Card style={styles.statusCard}>
          <CardContent>
            <View style={styles.statusRow}>
              <View style={styles.statusInfo}>
                <Text style={styles.statusLabel}>Status</Text>
                <View style={[styles.statusBadge, isActive ? styles.statusActive : styles.statusInactive]}>
                  <Text style={[styles.statusText, isActive ? styles.statusActiveText : styles.statusInactiveText]}>
                    {isActive ? 'Active' : 'Deactivated'}
                  </Text>
                </View>
              </View>
              <Button
                title={isActive ? 'Deactivate' : 'Reactivate'}
                onPress={handleDeactivate}
                variant={isActive ? 'destructive' : 'default'}
                icon={isActive ? UserMinus : UserCheck}
                style={styles.deactivateButton}
              />
            </View>
            {!isActive && userData?.deactivated_at && (
              <Text style={styles.deactivatedDate}>
                Deactivated on {new Date(userData.deactivated_at).toLocaleDateString()}
              </Text>
            )}
          </CardContent>
        </Card>

        {/* Form Card */}
        <Card style={styles.formCard}>
          <CardHeader>
            <CardTitle style={styles.cardTitle}>
              <PencilSimple size={20} color="#3b82f6" />
              <Text style={styles.cardTitleText}>User Information</Text>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Email *</Text>
              <Input
                value={formData.email}
                onChangeText={(text) => setFormData({ ...formData, email: text })}
                placeholder="user@hospital.edu"
                keyboardType="email-address"
                autoCapitalize="none"
                style={styles.input}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Full Name *</Text>
              <Input
                value={formData.name}
                onChangeText={(text) => setFormData({ ...formData, name: text })}
                placeholder="John Doe"
                style={styles.input}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Role *</Text>
              <Select
                value={formData.role}
                onValueChange={(value) => setFormData({ ...formData, role: value })}
                options={roleOptions}
                style={styles.select}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Department</Text>
              <Input
                value={formData.department}
                onChangeText={(text) => setFormData({ ...formData, department: text })}
                placeholder="e.g. Emergency Medicine"
                style={styles.input}
              />
            </View>
          </CardContent>
        </Card>

        <View style={styles.actions}>
          <Button
            title="Cancel"
            onPress={handleCancel}
            variant="outline"
            style={styles.cancelButton}
          />
          <Button
            title="Save Changes"
            onPress={handleSave}
            loading={loading}
            style={styles.saveButton}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6b7280',
  },
  statusCard: {
    marginBottom: 16,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusInfo: {
    flex: 1,
  },
  statusLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  statusActive: {
    backgroundColor: '#dcfce7',
  },
  statusInactive: {
    backgroundColor: '#fef2f2',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  statusActiveText: {
    color: '#166534',
  },
  statusInactiveText: {
    color: '#dc2626',
  },
  deactivateButton: {
    minWidth: 120,
  },
  deactivatedDate: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 8,
    fontStyle: 'italic',
  },
  formCard: {
    marginBottom: 24,
  },
  cardTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitleText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 6,
  },
  input: {
    marginBottom: 0,
  },
  select: {
    marginBottom: 0,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    paddingBottom: 32,
  },
  cancelButton: {
    flex: 1,
  },
  saveButton: {
    flex: 1,
  },
});
