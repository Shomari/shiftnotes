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
import { ArrowLeft, Plus, Calendar } from 'phosphor-react-native';

// Web-only imports for react-datepicker
let DatePicker: any = null;
if (Platform.OS === 'web') {
  try {
    DatePicker = require('react-datepicker').default;
    // Import our local CSS file instead of the problematic node_modules version
    require('../../assets/react-datepicker.css');
    
    // Add custom styles for z-index fix
    const style = document.createElement('style');
    style.textContent = `
      .react-datepicker-popper {
        z-index: 99999 !important;
      }
      .react-datepicker {
        z-index: 99999 !important;
      }
      .react-datepicker__portal {
        z-index: 99999 !important;
      }
      .date-picker-popper {
        z-index: 99999 !important;
      }
      .react-datepicker-wrapper {
        width: 100%;
        z-index: 10 !important;
        position: relative !important;
      }
      .react-datepicker__input-container {
        width: 100%;
      }
      .react-datepicker__input-container input {
        width: 100% !important;
      }
    `;
    document.head.appendChild(style);
  } catch (e) {
    console.warn('Failed to load react-datepicker:', e);
  }
}

interface CohortFormData {
  name: string;
  startDate: string;
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
    startDate: '',
  });

  const handleSave = async () => {
    // Validation
    if (!formData.name) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      // Derive year from start date if provided
      const year = formData.startDate ? new Date(formData.startDate).getFullYear() : new Date().getFullYear();
      
      const cohortData = {
        ...formData,
        year: year,
        // TODO: Replace with actual API call when available
        // await apiClient.createCohort(cohortData);
      };

      console.log('Creating cohort:', cohortData);
      
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

              <View style={styles.formGroup}>
                <Text style={styles.label}>Start Date</Text>
                {Platform.OS === 'web' ? (
                  // Web: Use react-datepicker
                  DatePicker ? (
                    <View style={styles.datePickerContainer}>
                      <DatePicker
                        selected={formData.startDate ? new Date(formData.startDate) : null}
                        onChange={(date: Date | null) => {
                          if (date) {
                            setFormData({ ...formData, startDate: date.toISOString().split('T')[0] });
                          } else {
                            setFormData({ ...formData, startDate: '' });
                          }
                        }}
                        dateFormat="MM/dd/yyyy"
                        placeholderText="Select start date"
                        popperClassName="date-picker-popper"
                        wrapperClassName="date-picker-wrapper"
                        withPortal={true}
                        portalId="react-datepicker-portal"
                        isClearable
                        customInput={
                          <input
                            style={{
                              width: '100%',
                              padding: '12px 16px',
                              border: '1px solid #d1d5db',
                              borderRadius: '8px',
                              fontSize: '16px',
                              backgroundColor: '#ffffff',
                              color: '#374151',
                              height: '48px',
                              cursor: 'pointer',
                              boxSizing: 'border-box',
                            }}
                          />
                        }
                      />
                    </View>
                  ) : (
                    // Fallback to Input if DatePicker fails to load
                    <Input
                      value={formData.startDate}
                      onChangeText={(text) => setFormData({ ...formData, startDate: text })}
                      placeholder="mm/dd/yyyy"
                      icon={<Calendar size={16} color="#64748b" />}
                      style={styles.input}
                    />
                  )
                ) : (
                  // Mobile: Use regular Input
                  <Input
                    value={formData.startDate}
                    onChangeText={(text) => setFormData({ ...formData, startDate: text })}
                    placeholder="mm/dd/yyyy"
                    icon={<Calendar size={16} color="#64748b" />}
                    style={styles.input}
                  />
                )}
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
  datePickerContainer: {
    position: 'relative',
    zIndex: 1000,
    isolation: 'isolate',
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
