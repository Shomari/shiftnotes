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
  cohort?: string;
}

interface AddUserProps {
  onBack?: () => void;
}

export default function AddUser({ onBack }: AddUserProps) {
  const { user } = useContext(AuthContext);
  const [loading, setLoading] = useState(false);
  const [cohorts, setCohorts] = useState<any[]>([]);
  const [loadingCohorts, setLoadingCohorts] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({});
  const [formData, setFormData] = useState<UserFormData>({
    email: '',
    name: '',
    role: 'trainee',
    department: '',
    cohort: '',
  });

  const roleOptions = [
    { label: 'Trainee', value: 'trainee' },
    { label: 'Faculty', value: 'faculty' },
    { label: 'Coordinator', value: 'admin' },
    { label: 'Leadership', value: 'leadership' },
  ];

  const loadCohorts = async () => {
    if (!user?.program) return;
    
    setLoadingCohorts(true);
    try {
      const cohortsData = await apiClient.getCohorts(user.program);
      setCohorts(cohortsData);
    } catch (error) {
      console.error('Failed to load cohorts:', error);
      Alert.alert('Error', 'Failed to load cohorts');
    } finally {
      setLoadingCohorts(false);
    }
  };

  useEffect(() => {
    if (formData.role === 'trainee') {
      loadCohorts();
    }
  }, [formData.role, user?.program]);

  const handleSave = async () => {
    // Clear previous validation errors
    setValidationErrors({});
    
    // Validate required fields
    const fieldErrors: {[key: string]: string} = {};
    
    if (!formData.email || !formData.email.trim()) {
      fieldErrors.email = 'Please enter an email address';
    } else if (!formData.email.includes('@')) {
      fieldErrors.email = 'Please enter a valid email address';
    }
    
    if (!formData.name || !formData.name.trim()) {
      fieldErrors.name = 'Please enter a full name';
    }
    
    if (!formData.role) {
      fieldErrors.role = 'Please select a role';
    }
    
    // Require cohort for trainees
    if (formData.role === 'trainee' && !formData.cohort) {
      fieldErrors.cohort = 'Please select a cohort for trainees';
    }
    
    // If there are validation errors, set them and return
    if (Object.keys(fieldErrors).length > 0) {
      setValidationErrors(fieldErrors);
      return;
    }

    setLoading(true);
    try {
      const userData = {
        ...formData,
        organization: user?.organization || '',
        program: user?.program || '',
        // Only include cohort if user is a trainee and cohort is selected
        ...(formData.role === 'trainee' && formData.cohort && { cohort: formData.cohort }),
      };

      await apiClient.createUser(userData);
      
      const successMessage = 'User created successfully';
      if (Platform.OS === 'web') {
        window.alert(successMessage);
        onBack?.();
      } else {
        Alert.alert('Success', successMessage, [
          { text: 'OK', onPress: onBack }
        ]);
      }
    } catch (error: any) {
      console.error('Error creating user:', error);
      
      // Parse API error response
      let errorMessage = 'Failed to create user. Please try again.';
      let fieldError = '';
      
      if (error.response && error.response.data) {
        console.log('User creation error response:', error.response.data);
        
        // Check for DRF ValidationError format
        if (error.response.data.email) {
          const emailError = Array.isArray(error.response.data.email) 
            ? error.response.data.email[0] 
            : error.response.data.email;
          fieldError = emailError;
          errorMessage = emailError;
          setValidationErrors({ email: emailError });
        } else if (error.response.data.error) {
          errorMessage = error.response.data.error;
        } else if (error.response.data.non_field_errors) {
          const nonFieldError = Array.isArray(error.response.data.non_field_errors)
            ? error.response.data.non_field_errors[0]
            : error.response.data.non_field_errors;
          errorMessage = nonFieldError;
        }
      }
      
      if (Platform.OS === 'web') {
        window.alert(errorMessage);
      } else {
        Alert.alert('Error', errorMessage);
      }
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
              {validationErrors.email && (
                <Text style={styles.errorText}>{validationErrors.email}</Text>
              )}
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Full Name *</Text>
              <Input
                value={formData.name}
                onChangeText={(text) => setFormData({ ...formData, name: text })}
                placeholder="John Doe"
                style={styles.input}
              />
              {validationErrors.name && (
                <Text style={styles.errorText}>{validationErrors.name}</Text>
              )}
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Role *</Text>
              <Select
                value={formData.role}
                onValueChange={(value) => setFormData(prev => ({
                  ...prev,
                  role: value,
                  // Clear cohort if role changes away from trainee
                  cohort: value === 'trainee' ? prev.cohort : ''
                }))}
                options={roleOptions}
                style={styles.select}
              />
              {validationErrors.role && (
                <Text style={styles.errorText}>{validationErrors.role}</Text>
              )}
            </View>

            {formData.role === 'trainee' && (
              <View style={styles.formGroup}>
                <Text style={styles.label}>Cohort *</Text>
                <Select
                  value={formData.cohort || ''}
                  onValueChange={(value) => setFormData({ ...formData, cohort: value })}
                  options={cohorts.map(cohort => ({
                    label: cohort.name,
                    value: cohort.id
                  }))}
                  placeholder={loadingCohorts ? "Loading cohorts..." : "Select cohort"}
                  disabled={loadingCohorts || cohorts.length === 0}
                  style={styles.select}
                />
                {validationErrors.cohort && (
                  <Text style={styles.errorText}>{validationErrors.cohort}</Text>
                )}
                {cohorts.length === 0 && !loadingCohorts && (
                  <Text style={styles.helpText}>No cohorts available. Please create a cohort first.</Text>
                )}
              </View>
            )}

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
  errorText: {
    fontSize: 12,
    color: '#ef4444',
    marginTop: 4,
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
