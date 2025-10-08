/**
 * Mobile version of NewAssessmentForm
 * Updated to match the web version design exactly
 */

import React, { useState, useEffect, useRef } from 'react';
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
  LayoutChangeEvent,
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';

// MUI imports for web only
let MuiRadio: any = null;
let MuiRadioGroup: any = null;
let MuiFormControlLabel: any = null;
let MuiFormControl: any = null;
let MuiFormLabel: any = null;
if (Platform.OS === 'web') {
  try {
    const muiMaterial = require('@mui/material');
    MuiRadio = muiMaterial.Radio;
    MuiRadioGroup = muiMaterial.RadioGroup;
    MuiFormControlLabel = muiMaterial.FormControlLabel;
    MuiFormControl = muiMaterial.FormControl;
    MuiFormLabel = muiMaterial.FormLabel;
  } catch (e) {
    console.warn('Failed to load MUI Radio components:', e);
  }
}

import { Button } from '../ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { CustomDatePicker } from '../ui/DatePicker';
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

// Generate a unique key for list items
const generateUniqueKey = () => `slot_${Date.now()}_${Math.random()}`;

// ============================================================================
// TEMPORARY: EPA Day-of-Week Filtering (MVP Customer Request)
// ============================================================================
// This is a TEMPORARY hardcoded mapping to filter EPAs by shift date day of week.
// TODO: Remove this when permanent solution is implemented
// Maps day of week (0=Sunday, 6=Saturday) to available EPA numbers
const EPA_DAY_OF_WEEK_MAP: Record<number, number[]> = {
  0: [2, 8, 12, 13, 14, 15, 16, 17],        // Sunday
  1: [7, 9, 14, 16, 20, 21, 22],             // Monday
  2: [2, 4, 10, 12, 13, 14, 16, 17],         // Tuesday
  3: [2, 5, 12, 13, 14, 16, 17, 22],         // Wednesday
  4: [2, 3, 12, 13, 14, 16, 17, 18, 22],     // Thursday
  5: [6, 12, 13, 14, 16, 17, 19, 22],        // Friday
  6: [1, 11, 12, 13, 14, 16, 17, 22],        // Saturday
};

/**
 * TEMPORARY: Extract EPA number from EPA code (e.g., "EPA 1" -> 1, "EPA1" -> 1)
 * TODO: Remove this when permanent solution is implemented
 */
const getEpaNumber = (epaCode: string): number | null => {
  const match = epaCode.match(/EPA\s*(\d+)/i);
  return match ? parseInt(match[1], 10) : null;
};
// ============================================================================

interface EpaSlot {
  key: string;
  epaId: string | null;
}

interface NewAssessmentFormProps {
  onNavigate: (routeId: string) => void;
  assessmentId?: string; // Optional - if provided, form will load and edit existing assessment
}

export function NewAssessmentForm({ onNavigate, assessmentId }: NewAssessmentFormProps) {
  const { user } = useAuth();
  
  // State management
  const [epas, setEPAs] = useState<EPA[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [assessmentSlots, setAssessmentSlots] = useState<EpaSlot[]>([
    { key: generateUniqueKey(), epaId: null }
  ]);
  const [epaAssessments, setEpaAssessments] = useState<Record<string, Partial<AssessmentEPA>>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [epaEntrustmentDescriptions, setEpaEntrustmentDescriptions] = useState<{[key: number]: string}>({});
  const [showDraftNotification, setShowDraftNotification] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({});
  const scrollViewRef = useRef<ScrollView>(null);
  const fieldErrorOffsetsRef = useRef<{[key: string]: number}>({ traineeId: 0 });
  const isWeb = Platform.OS === 'web';

  const handleFieldLayout = (key: string) => (event: LayoutChangeEvent) => {
    const { y } = event.nativeEvent.layout;
    fieldErrorOffsetsRef.current[key] = y;
  };

  // Form handling with react-hook-form (same as web!)
  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
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
      loadTraineesForProgram(user.program);
      loadEPAsForProgram(user.program);
      loadEPAEntrustmentDescriptions();
    }
  }, [user?.program]);

  // Load existing assessment data for editing
  useEffect(() => {
    if (assessmentId) {
      loadAssessmentData(assessmentId);
    }
  }, [assessmentId]);

  // TEMPORARY: Clear invalid EPAs when shift date changes (day-of-week filtering)
  // TODO: Remove this when permanent solution is implemented
  const shiftDateValue = watch('shiftDate');
  useEffect(() => {
    if (!shiftDateValue || assessmentSlots.length === 0) return;

    const date = new Date(shiftDateValue);
    const dayOfWeek = date.getDay();
    const allowedEpaNumbers = EPA_DAY_OF_WEEK_MAP[dayOfWeek];

    if (!allowedEpaNumbers) return;

    // Check if any selected EPAs are no longer valid for this day
    const updatedSlots = assessmentSlots.map(slot => {
      if (!slot.epaId) return slot;

      const selectedEpa = epas.find(e => e.id === slot.epaId);
      if (!selectedEpa) return slot;

      const epaNumber = getEpaNumber(selectedEpa.code);
      const isValidForDay = epaNumber !== null && allowedEpaNumbers.includes(epaNumber);

      // If EPA is no longer valid for this day, clear it
      if (!isValidForDay) {
        // Clean up the assessment data for the cleared EPA
        setEpaAssessments(current => {
          const updated = { ...current };
          delete updated[slot.epaId as string];
          return updated;
        });
        return { ...slot, epaId: null };
      }

      return slot;
    });

    // Only update if something changed
    const hasChanges = updatedSlots.some((slot, index) => 
      slot.epaId !== assessmentSlots[index].epaId
    );
    
    if (hasChanges) {
      setAssessmentSlots(updatedSlots);
    }
  }, [shiftDateValue, epas, assessmentSlots]);
  // END TEMPORARY

  // API calls and data loading
  const loadEPAsForProgram = async (programId: string) => {
    try {
      const epasResponse = await apiClient.getEPAs(programId);
      const sortedEPAs = (epasResponse.results || [])
        .sort((a, b) => {
          // Extract numbers from EPA codes for proper numerical sorting
          const getEpaNumber = (code: string) => {
            const match = code.match(/EPA(\d+)/);
            return match ? parseInt(match[1]) : 0;
          };
          return getEpaNumber(a.code) - getEpaNumber(b.code);
        })
        .map(epa => ({
          id: epa.id,
          code: epa.code,
          title: epa.title,
          description: epa.description || '',
          category: epa.category_title || epa.category,
          isActive: epa.is_active !== false,
        }));
      setEPAs(sortedEPAs);
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
        organization: user.organization,
        program: user.program,
        cohortId: user.cohort || undefined,
        cohortName: user.cohort_name || undefined,
        startDate: user.start_date || undefined,
        department: user.department,
        specialties: user.specialties,
        isActive: true,
        created_at: user.created_at,
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

  const loadEPAEntrustmentDescriptions = async () => {
    // Using generic descriptions, no need to fetch anymore
    setEpaEntrustmentDescriptions({
      1: "I had to do it (Requires constant direct supervision and myself or others' hands-on action for completion)",
      2: "I helped a lot (Requires considerable direct supervision and myself or others' guidance for completion)",
      3: "I helped a little (Requires minimal direct supervision or guidance from myself or others for completion)",
      4: "I needed to be there but did not help (Requires indirect supervision and no guidance by myself or others)",
      5: "I didn't need to be there at all (Does not require any supervision or guidance by myself or others)"
    });
  };

  const updateEPAAssessment = (epaId: string, field: keyof AssessmentEPA, value: any) => {
    setEpaAssessments(current => ({
      ...current,
      [epaId]: {
        ...current[epaId],
        [field]: value,
      },
    }));
  };

  const addEpaSlot = () => {
    setAssessmentSlots(current => [
      ...current,
      { key: generateUniqueKey(), epaId: null },
    ]);
  };

  const removeEpaSlot = (key: string) => {
    const slotToRemove = assessmentSlots.find(s => s.key === key);
    if (slotToRemove && slotToRemove.epaId) {
      // Clean up the assessment data for the removed EPA
      setEpaAssessments(current => {
        const updated = { ...current };
        delete updated[slotToRemove.epaId as string];
        return updated;
      });
    }
    setAssessmentSlots(current => current.filter(s => s.key !== key));
  };

  const handleEpaSelectionChange = (key: string, newEpaId: string | null) => {
    const oldSlot = assessmentSlots.find(s => s.key === key);
    const oldEpaId = oldSlot?.epaId;

    // If the EPA is being changed, remove the old EPA's assessment data
    if (oldEpaId && oldEpaId !== newEpaId) {
      setEpaAssessments(current => {
        const updated = { ...current };
        delete updated[oldEpaId];
        return updated;
      });
    }
    
    // Initialize new EPA assessment if it doesn't exist
    if (newEpaId && !epaAssessments[newEpaId]) {
      setEpaAssessments(current => ({
        ...current,
        [newEpaId]: {
          entrustmentLevel: undefined,
          whatWentWell: '',
          whatCouldImprove: '',
        }
      }));
    }

    setAssessmentSlots(current =>
      current.map(s => (s.key === key ? { ...s, epaId: newEpaId } : s))
    );
  };

  const getAvailableEpas = () => {
    const selectedEpaIds = new Set(assessmentSlots.map(s => s.epaId).filter(Boolean));
    
    // TEMPORARY: Filter by day of week if shift date is set
    // TODO: Remove this when permanent solution is implemented
    const shiftDate = watch('shiftDate');
    let dayFilteredEpas = epas;
    
    if (shiftDate) {
      const date = new Date(shiftDate);
      const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday
      const allowedEpaNumbers = EPA_DAY_OF_WEEK_MAP[dayOfWeek];
      
      if (allowedEpaNumbers) {
        dayFilteredEpas = epas.filter(epa => {
          const epaNumber = getEpaNumber(epa.code);
          return epaNumber !== null && allowedEpaNumbers.includes(epaNumber);
        });
      }
    }
    // END TEMPORARY
    
    return dayFilteredEpas.filter(epa => !selectedEpaIds.has(epa.id));
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
      setValue('whatWentWell', assessment.what_went_well || '');
      setValue('whatCouldImprove', assessment.what_could_improve || '');
      
      // Populate EPA assessments
      if (assessment.assessment_epas && assessment.assessment_epas.length > 0) {
        const loadedSlots: EpaSlot[] = assessment.assessment_epas.map(epa => ({
          key: generateUniqueKey(),
          epaId: epa.epa,
        }));
        setAssessmentSlots(loadedSlots.length > 0 ? loadedSlots : [{ key: generateUniqueKey(), epaId: null }]);

        const assessmentsData: Record<string, Partial<AssessmentEPA>> = {};
        assessment.assessment_epas.forEach(epaData => {
          if (epaData.epa) {
            assessmentsData[epaData.epa] = {
              entrustmentLevel: epaData.entrustment_level as 1 | 2 | 3 | 4 | 5,
              whatWentWell: epaData.what_went_well || '',
              whatCouldImprove: epaData.what_could_improve || '',
            };
          }
        });
        setEpaAssessments(assessmentsData);
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
    console.log('Assessment Slots:', assessmentSlots);
    console.log('EPA assessments:', epaAssessments);
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

    if (!isDraft && assessmentSlots.every(s => s.epaId === null)) {
      fieldErrors.epa = 'Please select at least one EPA to assess';
    }

    // Additional validation for non-draft submissions
    if (!isDraft) {
      assessmentSlots.forEach(slot => {
        if (slot.epaId) {
          const assessment = epaAssessments[slot.epaId];
          if (!assessment?.entrustmentLevel) {
            fieldErrors[`${slot.key}-entrustmentLevel`] = 'Please select an entrustment level for this EPA';
          }
        }
      });
      if (!data.whatWentWell?.trim()) {
        fieldErrors.whatWentWell = 'Please provide feedback on what went well';
      }
      if (!data.whatCouldImprove?.trim()) {
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

      setTimeout(() => {
        const baseOrderedKeys = ['traineeId', 'shiftDate', 'location', 'epa'];
        
        const epaOrderedKeys = assessmentSlots.flatMap(slot => slot.epaId ? [
          `${slot.key}-entrustmentLevel`,
        ] : []);

        const allOrderedKeys = [...baseOrderedKeys, ...epaOrderedKeys, 'whatWentWell', 'whatCouldImprove'];
        const firstErrorKey = allOrderedKeys.find(key => key in fieldErrors);
        
        if (!firstErrorKey) {
          // Fallback if a key isn't found in the ordered list
          const firstKey = Object.keys(fieldErrors)[0];
          const keyForScrolling = firstKey.split('-')[0] || firstKey;
          
          if (isWeb) {
            const element = document.querySelector(`[data-field-key="${keyForScrolling}"]`);
            if (element instanceof HTMLElement) {
              element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          } else {
            const y = fieldErrorOffsetsRef.current[keyForScrolling] ?? 0;
            scrollViewRef.current?.scrollTo({ y: Math.max(y - 32, 0), animated: true });
          }
          return;
        }

        const keyForScrolling = firstErrorKey.split('-')[0] || firstErrorKey;
        
        if (isWeb) {
          const element = document.querySelector(`[data-field-key="${keyForScrolling}"]`);
          if (element instanceof HTMLElement) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
          }
        }
        const y = fieldErrorOffsetsRef.current[keyForScrolling] ?? 0;
        scrollViewRef.current?.scrollTo({ y: Math.max(y - 32, 0), animated: true });
      }, 0);
      return;
    }

    setIsLoading(true);

    try {
      const assessmentEPAs = assessmentSlots
        .filter(slot => slot.epaId)
        .map(slot => {
          const epaId = slot.epaId!;
          const assessment = epaAssessments[epaId];
          return {
            epa: epaId,
            entrustment_level: assessment?.entrustmentLevel || 1,
          };
        });

      const assessmentData = {
        trainee: data.traineeId,
        evaluator: user?.id, // Use current authenticated user as evaluator
        shift_date: data.shiftDate,
        location: data.location,
        status: isDraft ? 'draft' as const : 'submitted' as const,
        private_comments: data.privateComments || '',
        what_went_well: data.whatWentWell || '',
        what_could_improve: data.whatCouldImprove || '',
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
            setAssessmentSlots([{ key: generateUniqueKey(), epaId: null }]);
            setEpaAssessments({});

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
                  setAssessmentSlots([{ key: generateUniqueKey(), epaId: null }]);
                  setEpaAssessments({});
                  
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

  const selectedTrainee = users.find(t => t.id === control._formValues?.traineeId);

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
          ref={scrollViewRef}
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
                <View
                  style={[styles.field, isTablet && styles.fieldHalf]}
                  onLayout={handleFieldLayout('traineeId')}
                  {...(isWeb ? { 'data-field-key': 'traineeId' } : {})}
                >
                  <Text style={styles.label}>Trainee *</Text>
                  <Controller
                    control={control}
                    name="traineeId"
                    render={({ field: { onChange, value } }) => (
                      <Select
                        value={value}
                        onValueChange={onChange}
                        placeholder="Select trainee"
                        options={users.map(trainee => ({
                          label: trainee.name,
                          value: trainee.id,
                        }))}
                      />
                    )}
                  />
                  {validationErrors.traineeId && (
                    <Text style={styles.errorText}>{validationErrors.traineeId}</Text>
                  )}
                </View>

                <View
                  style={[styles.field, isTablet && styles.fieldHalf]}
                  onLayout={handleFieldLayout('shiftDate')}
                  {...(isWeb ? { dataSet: { fieldKey: 'shiftDate' } } : {})}
                >
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
                      <CustomDatePicker
                        label="Shift Date *"
                        value={value}
                        onChange={onChange}
                        placeholder="Select date"
                        maxDate={new Date()}
                        error={errors.shiftDate?.message}
                        style={{ marginBottom: 0 }}
                      />
                    )}
                  />
                  {validationErrors.shiftDate && (
                    <Text style={styles.errorText}>{validationErrors.shiftDate}</Text>
                  )}
                </View>
              </View>

              {/* Location/Site */}
              <View
                style={styles.field}
                onLayout={handleFieldLayout('location')}
                {...(isWeb ? { dataSet: { fieldKey: 'location' } } : {})}
              >
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
              <Text style={styles.cardSubtitle}>Select the EPAs observed during this shift</Text>
              {watch('shiftDate') && (
                <Text style={styles.helperText}>
                  📅 Available EPAs are filtered based on the shift date's day of week
                </Text>
              )}
            </CardHeader>
            <CardContent>
              {assessmentSlots.map((slot, index) => {
                const isFirst = index === 0;
                const selectedEpa = slot.epaId ? epas.find(e => e.id === slot.epaId) : null;
                const availableEpas = getAvailableEpas();
                const currentSelection = slot.epaId ? epas.find(e => e.id === slot.epaId) : null;
                const options = (currentSelection ? [currentSelection, ...availableEpas] : availableEpas).map(e => ({
                  label: `${e.code}: ${e.title}`,
                  value: e.id,
                }));


                return (
                  <View 
                    key={slot.key} 
                    style={[styles.selectedEpa, { marginTop: isFirst ? 0 : 20 }]}
                    onLayout={handleFieldLayout(slot.key)}
                    {...(isWeb ? { 'data-field-key': slot.key } : {})}
                  >
                    <View style={styles.epaHeader}>
                      <View style={styles.epaInfo}>
                        <Text style={styles.label}>{isFirst ? "Choose EPA *" : "Choose Another EPA"}</Text>
                        <Select
                          value={slot.epaId || ''}
                          onValueChange={(value) => handleEpaSelectionChange(slot.key, value || null)}
                          placeholder={isFirst ? "Select an EPA to assess" : "Select another EPA"}
                          options={options}
                        />
                         {validationErrors.epa && isFirst && slot.epaId === null && (
                          <Text style={[styles.errorText, { marginTop: 4}]}>{validationErrors.epa}</Text>
                        )}
                      </View>
                      {!isFirst && (
                        <Pressable
                          onPress={() => removeEpaSlot(slot.key)}
                          style={styles.removeButton}
                        >
                          <Text style={styles.removeText}>✕</Text>
                        </Pressable>
                      )}
                    </View>

                    {slot.epaId && selectedEpa && (
                      <View style={styles.epaForm}>
                         {/* Entrustment Level */}
                        <View
                          style={styles.field}
                           onLayout={handleFieldLayout(`${slot.key}-entrustmentLevel`)}
                           {...(isWeb ? { 'data-field-key': `${slot.key}-entrustmentLevel` } : {})}
                        >
                          {Platform.OS === 'web' && MuiFormControl && MuiFormLabel && MuiRadioGroup && MuiFormControlLabel && MuiRadio ? (
                            <MuiFormControl 
                              component="fieldset" 
                              error={!!validationErrors[`${slot.key}-entrustmentLevel`]}
                              sx={{ width: '100%' }}
                            >
                              <MuiFormLabel 
                                component="legend"
                                sx={{
                                  color: validationErrors[`${slot.key}-entrustmentLevel`] ? '#ef4444' : '#374151',
                                  fontSize: '14px',
                                  fontWeight: '500',
                                  marginBottom: '12px',
                                  '&.Mui-focused': {
                                    color: validationErrors[`${slot.key}-entrustmentLevel`] ? '#ef4444' : '#3b82f6',
                                  },
                                }}
                              >
                                Entrustment Level *
                              </MuiFormLabel>
                              <MuiRadioGroup
                                value={String(epaAssessments[slot.epaId]?.entrustmentLevel || '')}
                                onChange={(e: any) => 
                                  updateEPAAssessment(slot.epaId!, 'entrustmentLevel', parseInt(e.target.value))
                                }
                              >
                                {Object.entries(epaEntrustmentDescriptions).map(([level, description]) => {
                                  const parts = description.split(' (');
                                  const mainText = parts[0];
                                  const subtitleText = parts[1] ? `(${parts[1]}` : '';
                                  return (
                                    <MuiFormControlLabel
                                      key={level}
                                      value={level}
                                      control={<MuiRadio />}
                                      label={
                                        <View>
                                          <Text style={{ fontSize: '15px', fontWeight: '500', color: '#1f2937' }}>
                                            Level {level}: {mainText}
                                          </Text>
                                          <Text style={{ fontSize: '13px', color: '#6b7280', marginTop: '2px' }}>
                                            {subtitleText}
                                          </Text>
                                        </View>
                                      }
                                      sx={{
                                        marginBottom: '8px',
                                        marginLeft: '0',
                                        border: '1px solid #e5e7eb',
                                        borderRadius: '8px',
                                        padding: '12px',
                                        backgroundColor: '#ffffff',
                                        '&:hover': {
                                          backgroundColor: '#f9fafb',
                                        },
                                        '& .MuiRadio-root': {
                                          color: '#d1d5db',
                                          '&.Mui-checked': {
                                            color: '#3b82f6',
                                          },
                                        },
                                      }}
                                    />
                                  );
                                })}
                              </MuiRadioGroup>
                              {validationErrors[`${slot.key}-entrustmentLevel`] && (
                                <Text style={styles.errorText}>
                                  {validationErrors[`${slot.key}-entrustmentLevel`]}
                                </Text>
                              )}
                            </MuiFormControl>
                          ) : (
                            <>
                              <Text style={styles.label}>Entrustment Level *</Text>
                              <Select
                                value={String(epaAssessments[slot.epaId]?.entrustmentLevel || '')}
                                onValueChange={(value) =>
                                   updateEPAAssessment(slot.epaId!, 'entrustmentLevel', parseInt(value))
                                }
                                placeholder="Select entrustment level"
                                options={Object.entries(epaEntrustmentDescriptions).map(([level, description]) => {
                                  const parts = description.split(' (');
                                  const mainText = parts[0];
                                  const subtitleText = parts[1] ? parts[1].replace(')', '') : '';
                                  return {
                                    label: `Level ${level}: ${mainText}`,
                                    subtitle: subtitleText,
                                    value: level,
                                  };
                                })}
                              />
                              {validationErrors[`${slot.key}-entrustmentLevel`] && (
                                <Text style={styles.errorText}>
                                  {validationErrors[`${slot.key}-entrustmentLevel`]}
                                </Text>
                              )}
                            </>
                          )}
                        </View>
                      </View>
                    )}
                  </View>
                );
              })}
              
              {/* Add Another EPA Button */}
              <Pressable
                style={styles.addEpaButton}
                onPress={addEpaSlot}
              >
                <Text style={styles.addEpaButtonText}>+ Add Another EPA</Text>
              </Pressable>
            </CardContent>
          </Card>

          {/* Feedback Section */}
          <Card style={styles.detailsCard}>
            <CardHeader>
              <CardTitle>Overall Feedback</CardTitle>
            </CardHeader>
            <CardContent>
              {/* What Went Well */}
              <View style={styles.field} onLayout={handleFieldLayout('whatWentWell')} {...(isWeb ? { 'data-field-key': 'whatWentWell' } : {})}>
                <Text style={styles.label}>What Went Well *</Text>
                <Controller
                  control={control}
                  name="whatWentWell"
                  render={({ field: { onChange, value } }) => (
                    <Input
                      value={value}
                      onChangeText={onChange}
                      placeholder="Describe what the trainee did well..."
                      multiline
                      numberOfLines={3}
                      style={styles.textArea}
                      containerStyle={styles.inputNoMargin}
                    />
                  )}
                />
                {validationErrors.whatWentWell && (
                  <Text style={styles.errorText}>{validationErrors.whatWentWell}</Text>
                )}
              </View>

              {/* What Could Improve */}
              <View style={styles.field} onLayout={handleFieldLayout('whatCouldImprove')} {...(isWeb ? { 'data-field-key': 'whatCouldImprove' } : {})}>
                <Text style={styles.label}>What Could Improve *</Text>
                <Controller
                  control={control}
                  name="whatCouldImprove"
                  render={({ field: { onChange, value } }) => (
                    <Input
                      value={value}
                      onChangeText={onChange}
                      placeholder="Describe areas for improvement..."
                      multiline
                      numberOfLines={3}
                      style={styles.textArea}
                      containerStyle={styles.inputNoMargin}
                    />
                  )}
                />
                {validationErrors.whatCouldImprove && (
                  <Text style={styles.errorText}>{validationErrors.whatCouldImprove}</Text>
                )}
              </View>
            </CardContent>
          </Card>

          {/* Private Comments */}
            <Card style={styles.commentsCard}>
            <CardHeader style={styles.commentsCardHeader}>
              <CardTitle style={styles.commentsCardTitle}>🔒 Private Comments for Leadership</CardTitle>
              <Text style={styles.commentsCardSubtitle}>Optional comments visible only to leadership (not the trainee)</Text>
            </CardHeader>
            <CardContent style={styles.commentsCardContent}>
              <View style={styles.commentsHighlightBox}>
                <Text style={styles.commentsNotice}>
                  💡 Use this section to share concerns, exceptional performance, or context that leadership should know about this assessment.
                </Text>
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
                      style={styles.commentsTextArea}
                      containerStyle={styles.inputNoMargin}
                    />
                  )}
                />
              </View>
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
                  <Text style={styles.summaryLabel}>EPAs:</Text>
                  <Text style={styles.summaryValue}>
                    {assessmentSlots.filter(slot => slot.epaId).map(slot => epas.find(e => e.id === slot.epaId)?.code).join(', ') || 'None'}
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
    borderWidth: 2,
    borderColor: '#fbbf24',
    backgroundColor: '#fefce8',
    shadowColor: '#fbbf24',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 4,
  },
  commentsCardHeader: {
    backgroundColor: '#fefce8',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    marginBottom: 0,
    paddingBottom: 16,
  },
  commentsCardTitle: {
    color: '#a16207',
    fontWeight: '700',
    fontSize: 18,
  },
  commentsCardSubtitle: {
    fontSize: 14,
    color: '#a16207',
    marginTop: 4,
    fontWeight: '500',
  },
  commentsCardContent: {
    backgroundColor: '#fefce8',
    paddingTop: 0,
  },
  commentsHighlightBox: {
    backgroundColor: '#fefce8',
    borderWidth: 1,
    borderColor: '#fbbf24',
    borderRadius: 8,
    padding: 16,
    marginBottom: 0,
  },
  commentsNotice: {
    fontSize: 14,
    color: '#a16207',
    lineHeight: 20,
    marginBottom: 12,
    fontWeight: '500',
  },
  commentsTextArea: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#fbbf24',
    borderRadius: 6,
  },
  summaryCard: {
    marginBottom: 20,
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
  },
  helperText: {
    fontSize: 13,
    color: '#3b82f6',
    marginTop: 8,
    fontStyle: 'italic',
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
  addEpaButton: {
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderStyle: 'dashed',
    alignItems: 'center',
  },
  addEpaButtonText: {
    color: '#6b7280',
    fontSize: 14,
    fontWeight: '600',
  },
});
