/**
 * Edit Cohort page component
 * Full page form for editing existing cohorts
 */

import React, { useState, useEffect, useContext } from 'react';
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
import { apiClient, ApiCohort } from '../../lib/api';
import { ArrowLeft, PencilSimple, Calendar } from 'phosphor-react-native';

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

// Sample cohorts data (matches CohortManagement)
const sampleCohorts = [
  { id: '1', name: 'PGY-1 2024', year: 2024, startDate: '2024-06-29', trainees: 2 },
  { id: '2', name: 'PGY-2 2023', year: 2023, startDate: '2023-06-29', trainees: 1 },
  { id: '3', name: 'PGY-3 2022', year: 2022, startDate: '2022-06-29', trainees: 0 },
];

interface CohortFormData {
  name: string;
  startDate: string;
}

interface EditCohortProps {
  cohortId: string;
  onBack?: () => void;
}

export default function EditCohort({ cohortId, onBack }: EditCohortProps) {
  const authContext = useContext(AuthContext);
  const user = authContext?.user;
  const [loading, setLoading] = useState(false);
  const [loadingCohort, setLoadingCohort] = useState(true);
  const [cohortData, setCohortData] = useState<ApiCohort | null>(null);
  const [formData, setFormData] = useState<CohortFormData>({
    name: '',
    startDate: '',
  });

  useEffect(() => {
    loadCohort();
  }, [cohortId]);

  const loadCohort = async () => {
    if (!cohortId) return;
    
    setLoadingCohort(true);
    try {
      // TODO: Replace with actual API call when available
      // const cohortResponse = await apiClient.getCohort(cohortId);
      
      // For now, use sample data
      const foundCohort = sampleCohorts.find(c => c.id === cohortId);
      
      if (foundCohort) {
        const cohort: ApiCohort = {
          id: foundCohort.id,
          name: foundCohort.name,
          year: foundCohort.year,
          start_date: foundCohort.startDate,
          is_active: true,
          trainee_count: foundCohort.trainees
        };
        
        setCohortData(cohort);
        setFormData({
          name: cohort.name,
          startDate: cohort.start_date || '',
        });
      } else {
        Alert.alert('Error', 'Cohort not found');
        if (onBack) onBack();
      }
    } catch (error) {
      console.error('Error loading cohort:', error);
      Alert.alert('Error', 'Failed to load cohort data');
      if (onBack) onBack();
    } finally {
      setLoadingCohort(false);
    }
  };

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
      
      const cohortUpdateData = {
        ...formData,
        year: year,
      };

      console.log('Updating cohort:', cohortId, cohortUpdateData);
      
      // TODO: Replace with actual API call when available
      // await apiClient.updateCohort(cohortId, cohortUpdateData);
      
      // Simulate API call success and reload data
      await loadCohort();
      
      // Show success message using platform-appropriate method
      if (Platform.OS === 'web') {
        alert('Cohort updated successfully.');
      } else {
        Alert.alert('Success', 'Cohort updated successfully.');
      }
    } catch (error) {
      console.error('Error updating cohort:', error);
      if (Platform.OS === 'web') {
        alert('Failed to update cohort. Please try again.');
      } else {
        Alert.alert('Error', 'Failed to update cohort. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (onBack) onBack();
  };

  if (loadingCohort) {
    return (
      <View style={styles.container}>
        <Header 
          title="Edit Cohort"
          leftAction={{
            icon: ArrowLeft,
            onPress: handleCancel
          }}
        />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading cohort...</Text>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <Header 
        title="Edit Cohort"
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
          {/* Status Card */}
          <Card style={styles.statusCard}>
            <CardContent>
              <View style={styles.statusRow}>
                <View style={styles.statusInfo}>
                  <Text style={styles.statusLabel}>Status</Text>
                  <View style={[styles.statusBadge, styles.statusActive]}>
                    <Text style={styles.statusText}>Active</Text>
                  </View>
                </View>
                <View style={styles.statsInfo}>
                  <Text style={styles.statsLabel}>Trainees</Text>
                  <Text style={styles.statsValue}>{cohortData?.trainee_count || 0}</Text>
                </View>
              </View>
            </CardContent>
          </Card>

          {/* Form Card */}
          <Card style={styles.formCard}>
            <CardHeader>
              <CardTitle style={styles.cardTitle}>
                <PencilSimple size={20} color="#3b82f6" />
                <Text style={styles.cardTitleText}>Cohort Information</Text>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Name *</Text>
                <Input
                  value={formData.name}
                  onChangeText={(text) => setFormData({ ...formData, name: text })}
                  placeholder="PGY-1 2024"
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
              title="Save Changes"
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
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#166534',
    textTransform: 'uppercase',
  },
  statsInfo: {
    alignItems: 'flex-end',
  },
  statsLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 4,
  },
  statsValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
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
