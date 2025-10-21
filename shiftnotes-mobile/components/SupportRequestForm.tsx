import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Input } from './ui/Input';
import { Select } from './ui/Select';
import { Button } from './ui/Button';
import { useAuth } from '../contexts/AuthContext';
import { apiClient } from '../lib/api';

interface SupportRequestFormData {
  subject: string;
  category: string;
  priority: string;
  description: string;
  stepsToReproduce?: string;
  expectedBehavior?: string;
  actualBehavior?: string;
}

interface SupportRequestFormProps {
  onBack: () => void;
}

const CATEGORY_OPTIONS = [
  { label: 'Technical Issue', value: 'technical' },
  { label: 'Bug Report', value: 'bug' },
  { label: 'Feature Request', value: 'feature' },
  { label: 'Account/Login Issue', value: 'account' },
  { label: 'Data/Assessment Issue', value: 'data' },
  { label: 'General Question', value: 'question' },
  { label: 'Training/How-to', value: 'training' },
  { label: 'Other', value: 'other' },
];

const PRIORITY_OPTIONS = [
  { label: 'Low - General question or minor issue', value: 'low' },
  { label: 'Medium - Issue affecting normal use', value: 'medium' },
  { label: 'High - Issue blocking important tasks', value: 'high' },
  { label: 'Urgent - Critical system problem', value: 'urgent' },
];

export function SupportRequestForm({ onBack }: SupportRequestFormProps) {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showTechnicalFields, setShowTechnicalFields] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
    watch,
    reset,
  } = useForm<SupportRequestFormData>({
    defaultValues: {
      subject: '',
      category: '',
      priority: 'medium',
      description: '',
      stepsToReproduce: '',
      expectedBehavior: '',
      actualBehavior: '',
    },
  });

  const selectedCategory = watch('category');

  // Show technical fields for bug reports and technical issues
  React.useEffect(() => {
    setShowTechnicalFields(selectedCategory === 'bug' || selectedCategory === 'technical');
  }, [selectedCategory]);

  const onSubmit = async (data: SupportRequestFormData) => {
    setIsSubmitting(true);
    
    try {
      // Prepare support request data
      const supportRequest = {
        ...data,
        user_email: user?.email || 'unknown@example.com',
        user_name: user?.name || 'Unknown User',
        user_role: user?.role || 'unknown',
        user_organization: user?.organization_name || 'Unknown Organization',
        submitted_at: new Date().toISOString(),
        browser_info: Platform.OS === 'web' ? navigator.userAgent : `Mobile App - ${Platform.OS}`,
      };

      console.log('Support request to be submitted:', supportRequest);
      
      // Submit support request to backend
      const response = await apiClient.submitSupportRequest(supportRequest);
      
      // Show success message with reference number
      const successMessage = Platform.OS === 'web' 
        ? `Support Request Submitted!\n\nThank you for your request. We'll get back to you at ${user?.email} soon.\n\nReference: ${response.reference}`
        : `Support Request Submitted!\n\nThank you for your request. We'll get back to you at ${user?.email} soon.\n\nReference: ${response.reference}`;
      
      if (Platform.OS === 'web') {
        window.alert(successMessage);
      } else {
        Alert.alert('Success', successMessage);
      }
      
      // Clear form and go back
      reset();
      onBack();
      
    } catch (error) {
      console.error('Error submitting support request:', error);
      const errorMessage = 'Failed to submit support request. Please try again or contact support directly.';
      
      if (Platform.OS === 'web') {
        window.alert(`Error\n\n${errorMessage}`);
      } else {
        Alert.alert('Error', errorMessage);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      <Card style={styles.headerCard}>
        <CardHeader>
          <CardTitle>🛟 Support Request</CardTitle>
          <Text style={styles.subtitle}>
            Need help? Submit a support request and we'll get back to you as soon as possible.
          </Text>
        </CardHeader>
      </Card>

      <Card style={styles.formCard}>
        <CardContent>
          {/* Subject */}
          <View style={styles.field}>
            <Text style={styles.label}>Subject *</Text>
            <Controller
              control={control}
              name="subject"
              rules={{ required: 'Please enter a subject' }}
              render={({ field: { onChange, value } }) => (
                <Input
                  value={value}
                  onChangeText={onChange}
                  placeholder="Brief description of your issue or request"
                  style={styles.input}
                />
              )}
            />
            {errors.subject && (
              <Text style={styles.errorText}>{errors.subject.message}</Text>
            )}
          </View>

          {/* Category */}
          <View style={styles.field}>
            <Text style={styles.label}>Category *</Text>
            <Controller
              control={control}
              name="category"
              rules={{ required: 'Please select a category' }}
              render={({ field: { onChange, value } }) => (
                <Select
                  value={value}
                  onValueChange={onChange}
                  placeholder="Select the type of request"
                  options={CATEGORY_OPTIONS}
                  style={styles.select}
                />
              )}
            />
            {errors.category && (
              <Text style={styles.errorText}>{errors.category.message}</Text>
            )}
          </View>

          {/* Priority */}
          <View style={styles.field}>
            <Text style={styles.label}>Priority *</Text>
            <Controller
              control={control}
              name="priority"
              rules={{ required: 'Please select a priority' }}
              render={({ field: { onChange, value } }) => (
                <Select
                  value={value}
                  onValueChange={onChange}
                  placeholder="Select priority level"
                  options={PRIORITY_OPTIONS}
                  style={styles.select}
                />
              )}
            />
            {errors.priority && (
              <Text style={styles.errorText}>{errors.priority.message}</Text>
            )}
          </View>

          {/* Description */}
          <View style={styles.field}>
            <Text style={styles.label}>Description *</Text>
            <Controller
              control={control}
              name="description"
              rules={{ required: 'Please provide a description' }}
              render={({ field: { onChange, value } }) => (
                <Input
                  value={value}
                  onChangeText={onChange}
                  placeholder="Provide detailed information about your issue or request..."
                  multiline
                  numberOfLines={4}
                  style={[styles.input, styles.textArea]}
                />
              )}
            />
            {errors.description && (
              <Text style={styles.errorText}>{errors.description.message}</Text>
            )}
          </View>

          {/* Technical Fields (shown for bugs and technical issues) */}
          {showTechnicalFields && (
            <>
              <Text style={styles.sectionHeader}>Technical Details</Text>
              
              {/* Steps to Reproduce */}
              <View style={styles.field}>
                <Text style={styles.label}>Steps to Reproduce</Text>
                <Controller
                  control={control}
                  name="stepsToReproduce"
                  render={({ field: { onChange, value } }) => (
                    <Input
                      value={value}
                      onChangeText={onChange}
                      placeholder="1. Go to...\n2. Click on...\n3. Enter..."
                      multiline
                      numberOfLines={3}
                      style={[styles.input, styles.textArea]}
                    />
                  )}
                />
              </View>

              {/* Expected Behavior */}
              <View style={styles.field}>
                <Text style={styles.label}>Expected Behavior</Text>
                <Controller
                  control={control}
                  name="expectedBehavior"
                  render={({ field: { onChange, value } }) => (
                    <Input
                      value={value}
                      onChangeText={onChange}
                      placeholder="What should have happened?"
                      multiline
                      numberOfLines={2}
                      style={[styles.input, styles.textArea]}
                    />
                  )}
                />
              </View>

              {/* Actual Behavior */}
              <View style={styles.field}>
                <Text style={styles.label}>Actual Behavior</Text>
                <Controller
                  control={control}
                  name="actualBehavior"
                  render={({ field: { onChange, value } }) => (
                    <Input
                      value={value}
                      onChangeText={onChange}
                      placeholder="What actually happened?"
                      multiline
                      numberOfLines={2}
                      style={[styles.input, styles.textArea]}
                    />
                  )}
                />
              </View>
            </>
          )}

          {/* User Info Display */}
          <View style={styles.userInfoSection}>
            <Text style={styles.sectionHeader}>Your Information</Text>
            <Text style={styles.userInfoText}>Name: {user?.name || 'Unknown'}</Text>
            <Text style={styles.userInfoText}>Email: {user?.email || 'Unknown'}</Text>
            <Text style={styles.userInfoText}>Role: {user?.role || 'Unknown'}</Text>
            <Text style={styles.userInfoText}>
              Organization: {user?.organization_name || 'Unknown'}
            </Text>
            <Text style={styles.helperText}>
              This information will be included with your request to help us assist you better.
            </Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <Button
              title="Cancel"
              onPress={onBack}
              style={[styles.button, styles.cancelButton]}
              textStyle={styles.cancelButtonText}
            />
            <Button
              title={isSubmitting ? "Submitting..." : "Submit Request"}
              onPress={handleSubmit(onSubmit)}
              disabled={isSubmitting}
              style={[styles.button, styles.submitButton]}
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
    backgroundColor: '#f8fafc',
  },
  headerCard: {
    margin: 16,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
  },
  formCard: {
    margin: 16,
    marginTop: 8,
    marginBottom: 32,
  },
  field: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    backgroundColor: '#ffffff',
    minHeight: 40,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  select: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 6,
    backgroundColor: '#ffffff',
  },
  errorText: {
    fontSize: 12,
    color: '#ef4444',
    marginTop: 4,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginTop: 16,
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  userInfoSection: {
    backgroundColor: '#f9fafb',
    padding: 16,
    borderRadius: 8,
    marginTop: 16,
    marginBottom: 24,
  },
  userInfoText: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 4,
  },
  helperText: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 8,
    fontStyle: 'italic',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 6,
  },
  cancelButton: {
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  cancelButtonText: {
    color: '#374151',
  },
  submitButton: {
    backgroundColor: '#3b82f6',
  },
});
