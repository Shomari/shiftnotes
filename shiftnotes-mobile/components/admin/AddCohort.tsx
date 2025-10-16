/**
 * Add Cohort page component
 * Full page form for creating new cohorts
 */

import React, { useState, useContext } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Header } from '../ui/Header';
import { AuthContext } from '../../contexts/AuthContext';
import { apiClient } from '../../lib/api';
import { ArrowLeft, Plus } from 'phosphor-react-native';

interface CohortFormData {
  name: string;
}

interface AddCohortProps {
  onBack?: () => void;
}

export default function AddCohort({ onBack }: AddCohortProps) {
  const authContext = useContext(AuthContext);
  const user = authContext?.user;
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<CohortFormData>({
    name: '',
  });

  const handleSave = async () => {
    // Validation
    if (!formData.name) {
      Alert.alert('Error', 'Please enter a cohort name');
      return;
    }

    if (!user?.program) {
      Alert.alert('Error', 'No program assigned to your account');
      return;
    }

    setLoading(true);
    try {
      const cohortData = {
        name: formData.name,
        org: user.organization,
        program: user.program,
      };

      console.log('Creating cohort:', cohortData);
      await apiClient.createCohort(cohortData);
      
      // Simulate API call success
      if (Platform.OS === 'web') {
        alert('Cohort created successfully!');
      } else {
        Alert.alert('Success', 'Cohort created successfully', [
          { text: 'OK', onPress: onBack }
        ]);
      }
      
      if (onBack) onBack();
    } catch (error) {
      console.error('Error creating cohort:', error);
      if (Platform.OS === 'web') {
        alert('Failed to create cohort. Please try again.');
      } else {
        Alert.alert('Error', 'Failed to create cohort. Please try again.');
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
        title="Add New Cohort"
        leftAction={{
          icon: ArrowLeft,
          onPress: handleCancel
        }}
      />
      
      <View style={styles.content}>
        <ScrollView 
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
        >
          {/* Form Card */}
          <Card style={styles.formCard}>
            <CardHeader>
              <CardTitle style={styles.cardTitle}>
                <Plus size={20} color="#3b82f6" />
                <Text style={styles.cardTitleText}>Cohort Information</Text>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Name *</Text>
                <Input
                  value={formData.name}
                  onChangeText={(text) => setFormData({ ...formData, name: text })}
                  placeholder="Class of 2026"
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
              title="Create Cohort"
              onPress={handleSave}
              loading={loading}
              style={styles.saveButton}
            />
          </View>
        </ScrollView>
      </View>
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
  scrollView: {
    flex: 1,
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
