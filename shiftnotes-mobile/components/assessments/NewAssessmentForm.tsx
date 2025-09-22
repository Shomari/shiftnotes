/**
 * Mobile version of NewAssessmentForm
 * Updated to match the web version design exactly
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
  Platform,
  Pressable,
  Dimensions,
  KeyboardAvoidingView,
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import DateTimePicker from '@react-native-community/datetimepicker';

// Web-only imports
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
    // Fallback if import fails
    console.warn('Failed to load react-datepicker:', e);
  }
}

import { Button } from '../ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import {
  Assessment,
  EPA,
  AssessmentEPA,
  ENTRUSTMENT_LEVELS,
  User,
  AssessmentFormData,
} from '../../lib/types';
import { apiClient, ApiProgram } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';

const { width } = Dimensions.get('window');
const isTablet = width > 768;

interface NewAssessmentFormProps {
  onNavigate: (routeId: string) => void;
  assessmentId?: string; // Optional - if provided, form will load and edit existing assessment
}

export function NewAssessmentForm({ onNavigate, assessmentId }: NewAssessmentFormProps) {
  const { user } = useAuth();
  
  // State management (updated for single-program architecture)
  const [epas, setEPAs] = useState<EPA[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedEPA, setSelectedEPA] = useState<string>('');
  const [epaAssessment, setEpaAssessment] = useState<Partial<AssessmentEPA>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDraftNotification, setShowDraftNotification] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({});

  // Form handling with react-hook-form (same as web!)
  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm<AssessmentFormData>({
    defaultValues: {
      traineeId: '',
      shiftDate: new Date().toISOString().split('T')[0],
      location: '',
      privateComments: '',
    },
  });

  const trainees = users.filter(u => u.role === 'trainee');

  // Load data on component mount and when user changes
  useEffect(() => {
    if (user?.program) {
      console.log('Loading data for user program:', user.program);
      loadEPAsForProgram(user.program);
      loadTraineesForProgram(user.program);
    }
  }, [user]);

  // Load assessment data for editing when assessmentId is provided
  useEffect(() => {
    if (assessmentId && user?.program) {
      console.log('Loading assessment data for editing:', assessmentId);
      loadAssessmentData(assessmentId);
    }
  }, [assessmentId, user?.program]);

  const loadEPAsForProgram = async (programId: string) => {
    try {
      const epasResponse = await apiClient.getEPAs(programId);
      setEPAs(epasResponse.results?.map(epa => ({
        id: epa.id,
        code: epa.code,
        title: epa.title,
        description: epa.description || '',
        category: epa.category_title || epa.category,
        isActive: epa.is_active !== false,
      })) || []);
    } catch (error) {
      console.error('Error loading EPAs:', error);
      setEPAs([]);
    }
  };

  const loadTraineesForProgram = async (programId: string) => {
    try {
      // Get all trainees from programs the user is associated with
      const usersResponse = await apiClient.getTrainees();
      const allTrainees = usersResponse.results?.map(user => ({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        cohortId: user.cohort || undefined,
        cohortName: user.cohort_name || undefined,
        startDate: user.start_date || undefined,
        department: user.department,
        specialties: user.specialties,
        isActive: true,
        createdAt: user.created_at,
        updatedAt: user.created_at,
      })) || [];

      // Filter trainees by the selected program
      // Note: The backend now only returns trainees from programs the user is associated with
      // We could add additional frontend filtering here if needed
      setUsers(allTrainees);
    } catch (error) {
      console.error('Error loading trainees for program:', error);
      setUsers([]);
    }
  };


  // EPA selection handling (single EPA only)
  const handleEPASelect = (epaId: string) => {
    setSelectedEPA(epaId);
    // Reset assessment data when changing EPA
    setEpaAssessment({
      entrustmentLevel: 1,
      whatWentWell: '',
      whatCouldImprove: '',
    });
  };

  const updateEPAAssessment = (field: string, value: any) => {
    setEpaAssessment(current => ({
      ...current,
      [field]: value,
    }));
  };

  // Load assessment data for editing
  const loadAssessmentData = async (id: string) => {
    try {
      setIsLoading(true);
      console.log('Fetching assessment data:', id);
      
      const assessment = await apiClient.getAssessment(id);
      console.log('Loaded assessment data:', assessment);
      
      // Populate form fields
      setValue('traineeId', assessment.trainee || '');
      setValue('shiftDate', assessment.shift_date || '');
      setValue('location', assessment.location || '');
      setValue('privateComments', assessment.private_comments || '');
      
      // Populate EPA assessment (single EPA only)
      if (assessment.assessment_epas && assessment.assessment_epas.length > 0) {
        const firstEpaAssessment = assessment.assessment_epas[0]; // Take only the first EPA
        if (firstEpaAssessment.epa) {
          setSelectedEPA(firstEpaAssessment.epa);
          setEpaAssessment({
            entrustmentLevel: firstEpaAssessment.entrustment_level || 1,
            whatWentWell: firstEpaAssessment.what_went_well || '',
            whatCouldImprove: firstEpaAssessment.what_could_improve || '',
          });
        }
      }
      
      console.log('Form populated with assessment data');
    } catch (error) {
      console.error('Error loading assessment data:', error);
      Alert.alert('Error', 'Failed to load assessment data');
    } finally {
      setIsLoading(false);
    }
  };

  // Draft notification function
  const showDraftSavedNotification = () => {
    setShowDraftNotification(true);
    // Auto-hide after 3 seconds
    setTimeout(() => {
      setShowDraftNotification(false);
    }, 3000);
  };

  // Form submission
  const onSubmit = async (data: AssessmentFormData, isDraft: boolean = false) => {
    console.log('=== Form submission started ===');
    console.log('Form data:', data);
    console.log('Is draft:', isDraft);
    console.log('Selected EPA:', selectedEPA);
    console.log('EPA assessment:', epaAssessment);
    console.log('Current user:', user);
    console.log('User program:', user?.program);
    
    // Clear previous validation errors
    setValidationErrors({});
    
    // Validate required fields
    const fieldErrors: {[key: string]: string} = {};
    console.log('Starting validation...');
    
    if (!data.traineeId) {
      fieldErrors.traineeId = 'Please select a trainee';
    }
    
    if (!data.shiftDate) {
      fieldErrors.shiftDate = 'Please select a shift date';
    }
    
    if (!data.location) {
      fieldErrors.location = 'Please select a location/site';
    }
    
    if (!user?.program) {
      fieldErrors.program = 'User program not found';
    }
    
    if (!isDraft && !selectedEPA) {
      fieldErrors.epa = 'Please select an EPA to assess';
    }
    
    // Additional validation for non-draft submissions
    if (!isDraft && selectedEPA) {
      if (!epaAssessment?.entrustmentLevel || epaAssessment.entrustmentLevel < 1) {
        fieldErrors.entrustmentLevel = 'Please select an entrustment level for the EPA';
      }
      
      if (!epaAssessment?.whatWentWell?.trim()) {
        fieldErrors.whatWentWell = 'Please provide feedback on what went well';
      }
      
      if (!epaAssessment?.whatCouldImprove?.trim()) {
        fieldErrors.whatCouldImprove = 'Please provide feedback on what could improve';
      }
    }
    
    // Validate that shift date is not in the future
    if (data.shiftDate) {
      const shiftDate = new Date(data.shiftDate);
      const today = new Date();
      today.setHours(23, 59, 59, 999); // End of today
      
      if (shiftDate > today) {
        fieldErrors.shiftDate = 'Shift date cannot be in the future';
      }
    }
    
    // If there are validation errors, set them and return
    if (Object.keys(fieldErrors).length > 0) {
      console.log('Validation errors found:', fieldErrors);
      setValidationErrors(fieldErrors);
      return;
    }

    setIsLoading(true);

    try {
      const assessmentEPAs = selectedEPA ? [{
        epa: selectedEPA,
        entrustment_level: epaAssessment?.entrustmentLevel || 1,
        what_went_well: epaAssessment?.whatWentWell || '',
        what_could_improve: epaAssessment?.whatCouldImprove || '',
      }] : [];

      const assessmentData = {
        trainee: data.traineeId,
        evaluator: user?.id, // Use current authenticated user as evaluator
        shift_date: data.shiftDate,
        location: data.location,
        status: isDraft ? 'draft' as const : 'submitted' as const,
        private_comments: data.privateComments || '',
        assessment_epas: assessmentEPAs,
      };

      console.log('Submitting assessment data:', assessmentData);
      const result = assessmentId 
        ? await apiClient.updateAssessment(assessmentId, assessmentData)
        : await apiClient.createAssessment(assessmentData);
      console.log('Assessment submission result:', result);
      
      console.log('About to show success alert...');
      
      if (isDraft) {
        // For draft saves, show subtle notification and don't navigate away
        console.log('Draft saved successfully');
        if (Platform.OS === 'web') {
          showDraftSavedNotification();
        } else {
          Alert.alert('Draft Saved', 'Your assessment has been saved as a draft.', [
            { text: 'OK', onPress: () => {} }
          ]);
        }
      } else {
        // For final submissions, show full success flow and navigate
        // For web environment, use a different approach
        if (Platform.OS === 'web') {
          console.log('Web platform detected, using confirm instead of Alert');
          const message = 'Assessment submitted successfully! The trainee will be notified.';
          
          if ((window as any).confirm(`Success! 🎉\n\n${message}\n\nClick OK to continue.`)) {
            console.log('Web confirm Continue button pressed');
            // Clear form data
            reset();
            setSelectedEPA('');
            setEpaAssessment({});
            
            console.log('About to navigate to overview...');
            console.log('onNavigate function:', onNavigate);
            // Small delay for better UX, then navigate
            setTimeout(() => {
              console.log('Calling onNavigate with overview');
              try {
                onNavigate('overview');
                console.log('onNavigate called successfully');
              } catch (error) {
                console.error('Error calling onNavigate:', error);
              }
            }, 500);
          }
        } else {
          Alert.alert(
            'Success! 🎉',
            'Assessment submitted successfully! The trainee will be notified.',
            [
              {
                text: 'Continue',
                onPress: () => {
                  console.log('Success alert Continue button pressed');
                  // Clear form data
                  reset();
                  setSelectedEPA('');
                  setEpaAssessment({});
                  
                  console.log('About to navigate to overview...');
                  console.log('onNavigate function:', onNavigate);
                  // Small delay for better UX, then navigate
                  setTimeout(() => {
                    console.log('Calling onNavigate with overview');
                    try {
                      onNavigate('overview');
                      console.log('onNavigate called successfully');
                    } catch (error) {
                      console.error('Error calling onNavigate:', error);
                    }
                  }, 500);
                },
              },
            ]
          );
        }
      }
      console.log('Success alert called');
    } catch (error) {
      console.error('Assessment submission error:', error);
      Alert.alert(
        'Error', 
        'Failed to save assessment. Please check your connection and try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const selectedTrainee = trainees.find(t => t.id === control._formValues?.traineeId);

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 25}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.pageTitle}>{assessmentId ? 'Edit Assessment' : 'New Assessment'}</Text>
        <Text style={styles.pageSubtitle}>
          {assessmentId 
            ? 'Edit this draft assessment before submitting' 
            : 'Complete a post-shift EPA assessment for a trainee'
          }
        </Text>
      </View>

      {/* Draft Saved Notification */}
      {showDraftNotification && (
        <View style={styles.draftNotification}>
          <Text style={styles.draftNotificationText}>✅ Draft saved successfully</Text>
        </View>
      )}

      <View style={[styles.content, isTablet && styles.contentTablet]}>
        {/* Main Form */}
        <ScrollView 
          style={[styles.mainForm, isTablet && styles.mainFormTablet]} 
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollContent}
        >
          {/* Assessment Details Card */}
            <Card style={styles.detailsCard}>
              <CardHeader>
                <CardTitle>Assessment Details</CardTitle>
              </CardHeader>
              <CardContent>
              {/* Trainee and Shift Date Row */}
              <View style={[styles.row, !isTablet && styles.column]}>
                <View style={[styles.field, isTablet && styles.fieldHalf]}>
                  <Text style={styles.label}>Trainee *</Text>
                  <Controller
                    control={control}
                    name="traineeId"
                    rules={{ required: 'Please select a trainee' }}
                    render={({ field: { onChange, value } }) => (
                      <Select
                        value={value}
                        onValueChange={onChange}
                        placeholder="Select trainee"
                        options={trainees.map(trainee => ({
                          label: trainee.name,
                          value: trainee.id,
                        }))}
                      />
                    )}
                  />
                  {errors.traineeId && (
                    <Text style={styles.errorText}>{errors.traineeId.message}</Text>
                  )}
                </View>

                <View style={[styles.field, isTablet && styles.fieldHalf]}>
                  <Text style={styles.label}>Shift Date *</Text>
                  <Controller
                    control={control}
                    name="shiftDate"
                    rules={{ 
                      required: 'Shift date is required',
                      validate: (value) => {
                        const selectedDate = new Date(value);
                        const today = new Date();
                        today.setHours(23, 59, 59, 999); // Set to end of today
                        return selectedDate <= today || 'Shift date cannot be in the future';
                      }
                    }}
                    render={({ field: { onChange, value } }) => (
                      <View>
                        {Platform.OS === 'web' ? (
                          // Web: Use react-datepicker
                          DatePicker ? (
                            <View style={styles.datePickerContainer}>
                              <DatePicker
                                selected={value ? new Date(value) : null}
                                onChange={(date: Date | null) => {
                                  if (date) {
                                    onChange(date.toISOString().split('T')[0]);
                                  }
                                }}
                                dateFormat="MM/dd/yyyy"
                                placeholderText="Select date"
                                maxDate={new Date()} // Prevent future dates
                                popperClassName="date-picker-popper"
                                wrapperClassName="date-picker-wrapper"
                                withPortal={true}
                                portalId="react-datepicker-portal"
                                customInput={
                                  <input
                                    style={{
                                      width: '100%',
                                      padding: '12px 16px',
                                      border: errors.shiftDate ? '1px solid #ef4444' : '1px solid #d1d5db',
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
                              {errors.shiftDate && (
                                <Text style={styles.errorText}>{errors.shiftDate.message}</Text>
                              )}
                            </View>
                          ) : (
                            // Fallback to simple input if DatePicker fails to load
                            <Input
                              value={value}
                              onChangeText={onChange}
                              placeholder="YYYY-MM-DD"
                              error={errors.shiftDate?.message}
                              containerStyle={styles.inputNoMargin}
                            />
                          )
                        ) : (
                          // Mobile: Use DateTimePicker
                          <>
                            <Pressable
                              style={[styles.datePickerButton, errors.shiftDate && styles.datePickerButtonError]}
                              onPress={() => setShowDatePicker(true)}
                            >
                              <Text style={styles.datePickerText}>
                                {value ? new Date(value).toLocaleDateString() : 'Select date'}
                              </Text>
                            </Pressable>
                            {errors.shiftDate && (
                              <Text style={styles.errorText}>{errors.shiftDate.message}</Text>
                            )}
                            {showDatePicker && (
                              <DateTimePicker
                                value={value ? new Date(value) : selectedDate}
                                mode="date"
                                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                maximumDate={new Date()} // Prevent future dates
                                onChange={(event, date) => {
                                  setShowDatePicker(Platform.OS === 'ios');
                                  if (date) {
                                    setSelectedDate(date);
                                    onChange(date.toISOString().split('T')[0]);
                                  }
                                }}
                              />
                            )}
                          </>
                        )}
                      </View>
                    )}
                  />
                </View>
              </View>

              {/* Location/Site */}
              <View style={styles.field}>
                <Text style={styles.label}>Location/Site</Text>
                <Controller
                  control={control}
                  name="location"
                  render={({ field: { onChange, value } }) => (
                    <Select
                      value={value}
                      onValueChange={onChange}
                      placeholder="Select location/site"
                      options={[
                        { label: 'Emergency Department', value: 'Emergency Department' },
                        { label: 'ICU', value: 'ICU' },
                        { label: 'OR', value: 'OR' },
                        { label: 'Trauma Bay', value: 'Trauma Bay' },
                      ]}
                    />
                  )}
                />
                {validationErrors.location && (
                  <Text style={styles.errorText}>{validationErrors.location}</Text>
                )}
              </View>
            </CardContent>
          </Card>

          {/* EPA Selection */}
            <Card style={styles.epaCard}>
            <CardHeader>
              <CardTitle>EPA Selection</CardTitle>
              <Text style={styles.cardSubtitle}>Select the EPA observed during this shift</Text>
            </CardHeader>
            <CardContent>
              <View style={styles.field}>
                  <Text style={styles.label}>Select EPA *</Text>
                  <Select
                    value={selectedEPA}
                    onValueChange={(value) => value && handleEPASelect(value)}
                    placeholder="Choose an EPA to assess"
                    options={epas.map(epa => ({
                      label: `${epa.code}: ${epa.title}`,
                      value: epa.id,
                      subtitle: epa.category,
                    }))}
                  />
                  {validationErrors.epa && (
                    <Text style={styles.errorText}>{validationErrors.epa}</Text>
                  )}
                </View>

              {/* Selected EPA Assessment */}
              {selectedEPA && (() => {
                const epa = epas.find(e => e.id === selectedEPA)!;
                return (
                  <View key={selectedEPA} style={styles.selectedEpa}>
                    <View style={styles.epaHeader}>
                      <View style={styles.epaInfo}>
                        <Text style={styles.epaCode}>{epa.code}</Text>
                        <Text style={styles.epaTitle}>{epa.title}</Text>
                      </View>
                      <Pressable
                        onPress={() => setSelectedEPA('')}
                        style={styles.removeButton}
                      >
                        <Text style={styles.removeText}>✕</Text>
                      </Pressable>
                    </View>

                    {/* EPA Assessment Form */}
                    <View style={styles.epaForm}>
                      {/* Entrustment Level */}
                      <View style={styles.field}>
                        <Text style={styles.label}>Entrustment Level *</Text>
                        <Select
                          value={String(epaAssessment?.entrustmentLevel || 1)}
                          onValueChange={(value) =>
                            updateEPAAssessment('entrustmentLevel', parseInt(value))
                          }
                          placeholder="Select entrustment level"
                          options={Object.entries(ENTRUSTMENT_LEVELS).map(([level, description]) => ({
                            label: `Level ${level}: ${description.split('(')[0].trim()}`,
                            value: level,
                          }))}
                        />
                        {validationErrors.entrustmentLevel && (
                          <Text style={styles.errorText}>{validationErrors.entrustmentLevel}</Text>
                        )}
                      </View>

                      {/* Feedback Fields */}
                      <View style={styles.field}>
                        <Text style={styles.label}>What Went Well *</Text>
                        <Input
                          value={epaAssessment?.whatWentWell || ''}
                          onChangeText={(value) =>
                            updateEPAAssessment('whatWentWell', value)
                          }
                          placeholder="Describe what the trainee did well..."
                          multiline
                          numberOfLines={3}
                          style={styles.textArea}
                          containerStyle={styles.inputNoMargin}
                        />
                        {validationErrors.whatWentWell && (
                          <Text style={styles.errorText}>{validationErrors.whatWentWell}</Text>
                        )}
                      </View>

                      <View style={styles.field}>
                        <Text style={styles.label}>What Could Improve *</Text>
                        <Input
                          value={epaAssessment?.whatCouldImprove || ''}
                          onChangeText={(value) =>
                            updateEPAAssessment('whatCouldImprove', value)
                          }
                          placeholder="Describe areas for improvement..."
                          multiline
                          numberOfLines={3}
                          style={styles.textArea}
                          containerStyle={styles.inputNoMargin}
                        />
                        {validationErrors.whatCouldImprove && (
                          <Text style={styles.errorText}>{validationErrors.whatCouldImprove}</Text>
                        )}
                      </View>
                    </View>
                  </View>
                );
              })()}
            </CardContent>
          </Card>

          {/* Private Comments */}
            <Card style={styles.commentsCard}>
            <CardHeader>
              <CardTitle>Private Comments for Leadership</CardTitle>
              <Text style={styles.cardSubtitle}>Optional comments visible only to leadership (not the trainee)</Text>
            </CardHeader>
            <CardContent>
              <Controller
                control={control}
                name="privateComments"
                render={({ field: { onChange, value } }) => (
                  <Input
                    value={value}
                    onChangeText={onChange}
                    placeholder="Any concerns or additional context for leadership review..."
                    multiline
                    numberOfLines={4}
                    style={styles.textArea}
                    containerStyle={styles.inputNoMargin}
                  />
                )}
              />
            </CardContent>
          </Card>
        </ScrollView>

        {/* Assessment Summary Sidebar */}
        {isTablet && (
          <View style={styles.sidebar}>
            <Card style={styles.summaryCard}>
              <CardHeader>
                <CardTitle>Assessment Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Trainee:</Text>
                  <Text style={styles.summaryValue}>
                    {selectedTrainee?.name || 'Not selected'}
                  </Text>
                </View>
                
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Date:</Text>
                  <Text style={styles.summaryValue}>
                    {control._formValues?.shiftDate || '2025-08-29'}
                  </Text>
                </View>
                
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>EPA:</Text>
                  <Text style={styles.summaryValue}>
                    {selectedEPA ? epas.find(e => e.id === selectedEPA)?.code || 'Selected' : 'None'}
                  </Text>
                </View>

                <View style={styles.summaryActions}>
                  <Button
                    title="Save Draft"
                    onPress={handleSubmit((data) => onSubmit(data, true))}
                    variant="outline"
                    loading={isLoading}
                    disabled={isLoading}
                    style={styles.summaryButton}
                  />
                  <Button
                    title="Submit Assessment"
                    onPress={() => {
                      console.log('Submit Assessment button pressed');
                      handleSubmit((data) => onSubmit(data, false))();
                    }}
                    loading={isLoading}
                    disabled={isLoading}
                    style={styles.summaryButton}
                  />
                </View>
              </CardContent>
            </Card>
          </View>
        )}
      </View>

      {/* Mobile Action Buttons */}
      {!isTablet && (
        <View style={styles.mobileActions}>
          <Button
            title="Save as Draft"
            onPress={handleSubmit((data) => onSubmit(data, true))}
            variant="outline"
            loading={isLoading}
            disabled={isLoading}
            style={styles.mobileActionButton}
          />
          <Button
            title="Submit Assessment"
            onPress={() => {
              console.log('Mobile Submit Assessment button pressed');
              handleSubmit((data) => onSubmit(data, false))();
            }}
            loading={isLoading}
            disabled={isLoading}
            style={styles.mobileActionButton}
          />
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  pageSubtitle: {
    fontSize: 16,
    color: '#64748b',
  },
  draftNotification: {
    backgroundColor: '#dcfce7',
    borderColor: '#16a34a',
    borderWidth: 1,
    borderRadius: 8,
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  draftNotificationText: {
    color: '#15803d',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  contentTablet: {
    flexDirection: 'row',
    padding: 24,
  },
  mainForm: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100, // Extra padding at bottom for keyboard
  },
  mainFormTablet: {
    marginRight: 24,
    flex: 2,
  },
  sidebar: {
    width: 320,
  },
  programCard: {
    marginBottom: 20,
  },
  detailsCard: {
    marginBottom: 20,
  },
  epaCard: {
    marginBottom: 20,
  },
  commentsCard: {
    marginBottom: 20,
  },
  summaryCard: {
    marginBottom: 20,
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
  },
  row: {
    flexDirection: 'row',
    marginHorizontal: -8,
  },
  column: {
    flexDirection: 'column',
    marginHorizontal: 0,
  },
  field: {
    marginBottom: 16,
  },
  fieldHalf: {
    flex: 1,
    marginHorizontal: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 6,
  },

  inputNoMargin: {
    marginBottom: 0,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  errorText: {
    fontSize: 12,
    color: '#ef4444',
    marginTop: 4,
  },
  datePickerButton: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    minHeight: 48,
    justifyContent: 'center',
  },
  datePickerButtonError: {
    borderColor: '#ef4444',
  },
  datePickerText: {
    fontSize: 16,
    color: '#374151',
  },
  webDateContainer: {
    width: '100%',
  },
  webDateInputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  dateSeparator: {
    fontSize: 16,
    color: '#374151',
    marginHorizontal: 8,
    fontWeight: '500',
  },
  datePickerContainer: {
    position: 'relative',
    zIndex: 10,
    isolation: 'isolate',
  },
  selectedEpa: {
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    backgroundColor: '#ffffff',
  },
  epaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  epaInfo: {
    flex: 1,
  },
  epaCode: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3b82f6',
    marginBottom: 4,
  },
  epaTitle: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
  },
  removeButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#fee2e2',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  removeText: {
    fontSize: 12,
    color: '#dc2626',
    fontWeight: '600',
  },
  epaForm: {
    padding: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 14,
    color: '#1e293b',
    fontWeight: '600',
    textAlign: 'right',
    flex: 1,
    marginLeft: 16,
  },
  summaryActions: {
    marginTop: 24,
  },
  summaryButton: {
    marginBottom: 12,
  },
  mobileActions: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  mobileActionButton: {
    flex: 1,
    marginHorizontal: 8,
  },
  noProgramCard: {
    marginBottom: 16,
  },
  noProgramSelected: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noProgramText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
  },
});
