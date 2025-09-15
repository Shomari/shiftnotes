/**
 * Add User page component
 * Full page form for creating new users
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
import { apiClient } from '../../lib/api';
import { ArrowLeft, Plus } from 'phosphor-react-native';

interface UserFormData {
  email: string;
  name: string;
  role: string;
  department: string;
}

interface AddUserProps {
  onBack?: () => void;
}

export default function AddUser({ onBack }: AddUserProps) {
  const { user } = useContext(AuthContext);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<UserFormData>({
    email: '',
    name: '',
    role: 'trainee',
    department: '',
  });

  const roleOptions = [
    { label: 'Trainee', value: 'trainee' },
    { label: 'Faculty', value: 'faculty' },
    { label: 'Admin', value: 'admin' },
    { label: 'Leadership', value: 'leadership' },
  ];

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
      const userData = {
        ...formData,
        organization: user?.organization || '',
        program: user?.program || '',
      };

      await apiClient.createUser(userData);
      Alert.alert('Success', 'User created successfully', [
        { text: 'OK', onPress: onBack }
      ]);
    } catch (error) {
      console.error('Error creating user:', error);
      Alert.alert('Error', 'Failed to create user. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (onBack) onBack();
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <Header 
        title="Add New User"
        leftAction={{
          icon: ArrowLeft,
          onPress: handleCancel,
        }}
      />
      
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Card style={styles.formCard}>
          <CardHeader>
            <CardTitle style={styles.cardTitle}>
              <Plus size={20} color="#3b82f6" />
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
            title="Create User"
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
  helpText: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
    fontStyle: 'italic',
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
