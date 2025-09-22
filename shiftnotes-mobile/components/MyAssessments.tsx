/**
 * My Assessments component for EPAnotes Mobile
 * Shows list of assessments with filters and detailed cards
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Dimensions,
  TextInput,
  Alert,
  Platform,
} from 'react-native';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Button } from './ui/Button';
import { Select } from './ui/Select';
import { apiClient, ApiAssessment } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

// Web-only imports for react-datepicker
let DatePicker: any = null;
if (Platform.OS === 'web') {
  try {
    DatePicker = require('react-datepicker').default;
    require('react-datepicker/dist/react-datepicker.css');
  } catch (e) {
    console.warn('Failed to load react-datepicker:', e);
  }
}

const { width } = Dimensions.get('window');
const isTablet = width > 768;

interface Assessment extends ApiAssessment {
  trainee_name: string;
  evaluator_name: string;
  epas: Array<{
    code: string;
    level: number;
  }>;
}

// Removed hardcoded sample data - now fetching from API

interface MyAssessmentsProps {
  onViewAssessment?: (assessmentId: string) => void;
  onEditAssessment?: (assessmentId: string) => void;
  onDiscardDraft?: (assessmentId: string) => void;
}

export function MyAssessments({ onViewAssessment, onEditAssessment, onDiscardDraft }: MyAssessmentsProps) {
  const { user } = useAuth();
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [traineeFilter, setTraineeFilter] = useState('');
  const [epaFilter, setEpaFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Fetch assessments on component mount
  useEffect(() => {
    loadAssessments();
  }, []);

  const loadAssessments = async () => {
    try {
      setLoading(true);
      
      // Use different API endpoint based on user role
      const response = user?.role === 'trainee' 
        ? await apiClient.getReceivedAssessments()
        : await apiClient.getMyAssessments();
      
      console.log('Fetched assessments:', response);
      
      // Transform API data to match our interface
      const transformedAssessments: Assessment[] = response.results?.map(assessment => ({
        ...assessment,
        trainee_name: assessment.trainee_name || 'Unknown Trainee',
        evaluator_name: assessment.evaluator_name || 'Unknown Evaluator',
        epas: assessment.assessment_epas?.map(epa => ({
          code: epa.epa_code || 'Unknown EPA',
          level: epa.entrustment_level || 1,
        })) || [],
      })) || [];
      
      setAssessments(transformedAssessments);
    } catch (error) {
      console.error('Error loading assessments:', error);
      Alert.alert('Error', 'Failed to load assessments');
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = () => {
    setTraineeFilter('');
    setEpaFilter('');
    setStatusFilter('');
    setStartDate('');
    setEndDate('');
  };

  const handleDiscardDraft = async (assessmentId: string) => {
    const message = 'Are you sure you want to discard this draft? This action cannot be undone.';
    
    const confirmDiscard = Platform.OS === 'web' 
      ? window.confirm(message)
      : await new Promise<boolean>((resolve) => {
          Alert.alert(
            'Discard Draft',
            message,
            [
              { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
              { text: 'Discard', style: 'destructive', onPress: () => resolve(true) },
            ]
          );
        });

    if (!confirmDiscard) return;

    try {
      await apiClient.deleteAssessment(assessmentId);
      
      // Reload assessments to reflect the deletion
      await loadAssessments();
      
      const successMessage = 'Draft discarded successfully';
      if (Platform.OS === 'web') {
        window.alert(successMessage);
      } else {
        Alert.alert('Success', successMessage);
      }
    } catch (error) {
      console.error('Error discarding draft:', error);
      const errorMessage = 'Failed to discard draft. Please try again.';
      if (Platform.OS === 'web') {
        window.alert(errorMessage);
      } else {
        Alert.alert('Error', errorMessage);
      }
    }
  };

  const toggleFilters = () => {
    setFiltersExpanded(!filtersExpanded);
  };

  // Check if any filters are active
  const hasActiveFilters = traineeFilter || epaFilter || statusFilter || startDate || endDate;

  const filteredAssessments = assessments.filter((assessment) => {
    // Filter by trainee (for faculty view) or evaluator (for trainee view)
    const nameField = user?.role === 'trainee' ? assessment.evaluator_name : assessment.trainee_name;
    const matchesTrainee = !traineeFilter || nameField?.toLowerCase().includes(traineeFilter.toLowerCase());
    
    // Filter by EPA
    const matchesEPA = !epaFilter || assessment.epas.some(epa => 
      epa.code?.toLowerCase().includes(epaFilter.toLowerCase())
    );
    
    // Filter by status
    const matchesStatus = !statusFilter || assessment.status === statusFilter;
    
    // Filter by date range
    const assessmentDate = new Date(assessment.shift_date);
    const matchesStartDate = !startDate || assessmentDate >= new Date(startDate);
    const matchesEndDate = !endDate || assessmentDate <= new Date(endDate);
    
    return matchesTrainee && matchesEPA && matchesStatus && matchesStartDate && matchesEndDate;
  });

  // Extract unique options for dropdowns
  const traineeOptions = Array.from(new Set(
    assessments.map(assessment => 
      user?.role === 'trainee' ? assessment.evaluator_name : assessment.trainee_name
    ).filter(Boolean)
  )).map(name => ({ label: name, value: name }));

  const epaOptions = Array.from(new Set(
    assessments.flatMap(assessment => 
      assessment.epas.map(epa => epa.code).filter(Boolean)
    )
  )).map(code => ({ label: code, value: code }));

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'submitted':
        return '#3b82f6';
      case 'draft':
        return '#f59e0b';
      default:
        return '#6b7280';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'submitted':
        return 'Submitted';
      case 'draft':
        return 'Draft';
      default:
        return status;
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.pageTitle}>My Assessments</Text>
        <Text style={styles.pageSubtitle}>
          {user?.role === 'trainee' 
            ? "Assessments performed on you by evaluators"
            : "Assessments you have created for trainees"
          }
        </Text>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Loading State */}
        {loading && (
          <Card style={styles.loadingCard}>
            <CardContent>
              <Text style={styles.loadingText}>Loading assessments...</Text>
            </CardContent>
          </Card>
        )}

        {/* Filters Section */}
        <Card style={styles.filtersCard}>
          <CardHeader style={styles.filtersCardHeader}>
            <Pressable
              onPress={toggleFilters}
              style={styles.filtersToggleButton}
            >
              <View style={styles.filtersHeader}>
                <Text style={styles.filtersIcon}>🔍</Text>
                <Text style={styles.filtersTitle}>Filters</Text>
                {hasActiveFilters && (
                  <View style={styles.activeFiltersBadge}>
                    <Text style={styles.activeFiltersText}>Active</Text>
                  </View>
                )}
                <View style={styles.filtersHeaderSpacer} />
                <Text style={styles.clickHint}>Click to {filtersExpanded ? 'collapse' : 'expand'}</Text>
                <Text style={styles.resultsCountInHeader}>
                  {filteredAssessments.length} results
                </Text>
                <View style={styles.expandArrowContainer}>
                  <Text style={[styles.expandIcon, { transform: [{ rotate: filtersExpanded ? '180deg' : '0deg' }] }]}>
                    ▼
                  </Text>
                </View>
              </View>
            </Pressable>
          </CardHeader>
          {filtersExpanded && (
            <CardContent>
            <View style={styles.filtersContainer}>
              {/* Trainee Filter */}
              <View style={styles.filterField}>
                <Text style={styles.filterLabel}>
                  {user?.role === 'trainee' ? 'Evaluator' : 'Trainee'}
                </Text>
                <Select
                  value={traineeFilter}
                  onValueChange={setTraineeFilter}
                  placeholder={`All ${user?.role === 'trainee' ? 'Evaluators' : 'Trainees'}`}
                  options={traineeOptions}
                />
              </View>

              {/* EPA Filter */}
              <View style={styles.filterField}>
                <Text style={styles.filterLabel}>EPA</Text>
                <Select
                  value={epaFilter}
                  onValueChange={setEpaFilter}
                  placeholder="All EPAs"
                  options={epaOptions}
                />
              </View>

              {/* Status Filter */}
              <View style={styles.filterField}>
                <Text style={styles.filterLabel}>Status</Text>
                <Select
                  value={statusFilter}
                  onValueChange={setStatusFilter}
                  placeholder="All Statuses"
                  options={[
                    { label: 'Submitted', value: 'submitted' },
                    { label: 'Draft', value: 'draft' },
                  ]}
                />
              </View>

              {/* Date Filters */}
              <View style={styles.filterField}>
                <Text style={styles.filterLabel}>Start Date</Text>
                {Platform.OS === 'web' ? (
                  // Web: Use react-datepicker
                  DatePicker ? (
                    <View style={styles.datePickerContainer}>
                      <DatePicker
                        selected={startDate ? new Date(startDate) : null}
                        onChange={(date: Date | null) => {
                          if (date) {
                            setStartDate(date.toISOString().split('T')[0]);
                          } else {
                            setStartDate('');
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
                              padding: '8px 12px',
                              border: '1px solid #d1d5db',
                              borderRadius: '6px',
                              fontSize: '14px',
                              backgroundColor: '#ffffff',
                              color: '#374151',
                              height: '36px',
                              cursor: 'pointer',
                              boxSizing: 'border-box',
                            }}
                          />
                        }
                      />
                    </View>
                  ) : (
                    // Fallback to simple input if DatePicker fails to load
                    <TextInput
                      style={styles.dateInput}
                      placeholder="mm/dd/yyyy"
                      value={startDate}
                      onChangeText={setStartDate}
                    />
                  )
                ) : (
                  // Mobile: Use regular TextInput
                  <TextInput
                    style={styles.dateInput}
                    placeholder="mm/dd/yyyy"
                    value={startDate}
                    onChangeText={setStartDate}
                  />
                )}
              </View>

              <View style={styles.filterField}>
                <Text style={styles.filterLabel}>End Date</Text>
                {Platform.OS === 'web' ? (
                  // Web: Use react-datepicker
                  DatePicker ? (
                    <View style={styles.datePickerContainer}>
                      <DatePicker
                        selected={endDate ? new Date(endDate) : null}
                        onChange={(date: Date | null) => {
                          if (date) {
                            setEndDate(date.toISOString().split('T')[0]);
                          } else {
                            setEndDate('');
                          }
                        }}
                        dateFormat="MM/dd/yyyy"
                        placeholderText="Select end date"
                        popperClassName="date-picker-popper"
                        wrapperClassName="date-picker-wrapper"
                        withPortal={true}
                        portalId="react-datepicker-portal"
                        isClearable
                        customInput={
                          <input
                            style={{
                              width: '100%',
                              padding: '8px 12px',
                              border: '1px solid #d1d5db',
                              borderRadius: '6px',
                              fontSize: '14px',
                              backgroundColor: '#ffffff',
                              color: '#374151',
                              height: '36px',
                              cursor: 'pointer',
                              boxSizing: 'border-box',
                            }}
                          />
                        }
                      />
                    </View>
                  ) : (
                    // Fallback to simple input if DatePicker fails to load
                    <TextInput
                      style={styles.dateInput}
                      placeholder="mm/dd/yyyy"
                      value={endDate}
                      onChangeText={setEndDate}
                    />
                  )
                ) : (
                  // Mobile: Use regular TextInput
                  <TextInput
                    style={styles.dateInput}
                    placeholder="mm/dd/yyyy"
                    value={endDate}
                    onChangeText={setEndDate}
                  />
                )}
              </View>

              {/* Clear Filters Button */}
              <View style={styles.filterField}>
                <Button
                  title="Clear Filters"
                  onPress={clearFilters}
                  variant="outline"
                  size="sm"
                  style={styles.clearFiltersButton}
                />
              </View>
            </View>
            </CardContent>
          )}
        </Card>

        {/* Assessments List */}
        <View style={styles.assessmentsList}>
          {filteredAssessments.map((assessment) => (
            <Card key={assessment.id} style={styles.assessmentCard}>
              <CardContent>
                {/* Header with trainee name and View button */}
                <View style={styles.assessmentHeader}>
                  <View style={styles.traineeInfo}>
                    <Text style={styles.traineeName}>
                      {user?.role === 'trainee' ? assessment.evaluator_name : assessment.trainee_name}
                    </Text>
                    <View
                      style={[
                        styles.statusBadge,
                        { backgroundColor: getStatusColor(assessment.status) },
                      ]}
                    >
                      <Text style={styles.statusText}>{getStatusLabel(assessment.status)}</Text>
                    </View>
                  </View>
                  <View style={styles.actionButtons}>
                    {assessment.status === 'draft' && (
                      <>
                        <Button
                          title="Edit"
                          onPress={() => onEditAssessment?.(assessment.id!)}
                          variant="default"
                          size="sm"
                          icon="✏️"
                          style={styles.editButton}
                        />
                        <Button
                          title="Discard"
                          onPress={() => handleDiscardDraft(assessment.id!)}
                          variant="outline"
                          size="sm"
                          icon="🗑️"
                          style={styles.discardButton}
                        />
                      </>
                    )}
                    <Button
                      title="View"
                      onPress={() => onViewAssessment?.(assessment.id!)}
                      variant="outline"
                      size="sm"
                      icon="👁️"
                    />
                  </View>
                </View>

                {/* Assessment Details */}
                <View style={styles.assessmentDetails}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailIcon}>📅</Text>
                    <Text style={styles.detailText}>Shift: {new Date(assessment.shift_date).toLocaleDateString()}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailIcon}>📍</Text>
                    <Text style={styles.detailText}>{assessment.location}</Text>
                  </View>
                </View>

                {/* EPA Assessed */}
                <View style={styles.epasSection}>
                  <Text style={styles.epasTitle}>
                    EPA Assessed
                  </Text>
                  <View style={styles.epasList}>
                    {assessment.epas.length > 0 ? (
                      <View style={styles.epaBadge}>
                        <Text style={styles.epaText}>
                          {assessment.epas[0].code} - Level {assessment.epas[0].level}
                        </Text>
                      </View>
                    ) : (
                      <Text style={styles.noEpaText}>No EPA assessed</Text>
                    )}
                  </View>
                </View>

                {/* Entrustment Level */}
                <View style={styles.entrustmentSection}>
                  <Text style={styles.entrustmentLabel}>Entrustment Level:</Text>
                  <Text style={styles.entrustmentValue}>
                    {assessment.average_entrustment ? assessment.average_entrustment.toFixed(1) : 'N/A'}
                  </Text>
                </View>
              </CardContent>
            </Card>
          ))}
        </View>

        {/* Empty State */}
        {filteredAssessments.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>
              No assessments found matching your filters
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 20,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  pageSubtitle: {
    fontSize: 16,
    color: '#6b7280',
  },
  
  // Filters
  filtersCard: {
    margin: 16,
    marginBottom: 8,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    padding: 0, // Override Card default padding
  },
  filtersCardHeader: {
    margin: 0,
    marginBottom: 0, // Override Card header default margin
    padding: 0,
  },
  filtersToggleButton: {
    padding: 0,
    margin: 0,
    justifyContent: 'center',
    alignItems: 'stretch',
    width: '100%',
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    minHeight: 48,
  },
  filtersHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    width: '100%',
    minHeight: 48,
  },
  filtersIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  filtersTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
  },
  activeFiltersBadge: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 8,
  },
  activeFiltersText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '500',
  },
  filtersHeaderSpacer: {
    flex: 1,
  },
  clickHint: {
    fontSize: 12,
    color: '#9ca3af',
    fontStyle: 'italic',
    marginRight: 12,
  },
  resultsCountInHeader: {
    fontSize: 14,
    color: '#64748b',
    marginRight: 8,
    fontWeight: '500',
  },
  expandArrowContainer: {
    backgroundColor: '#f3f4f6',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 4,
  },
  expandIcon: {
    fontSize: 14,
    color: '#374151',
    fontWeight: 'bold',
  },
  filtersContainer: {
    gap: 16,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  filterField: {
    gap: 8,
    marginBottom: 4,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 6,
    marginLeft: 2,
  },
  dateInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    backgroundColor: '#ffffff',
    minHeight: 40,
  },
  datePickerContainer: {
    position: 'relative',
    zIndex: 1000,
    isolation: 'isolate',
  },
  resultsCount: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 6,
  },
  resultsText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  clearFiltersButton: {
    alignSelf: 'flex-start',
    marginTop: 8,
  },

  // Assessment Cards
  assessmentsList: {
    padding: 16,
    paddingTop: 8,
    gap: 12,
  },
  assessmentCard: {
    marginBottom: 4,
  },
  assessmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  traineeInfo: {
    flex: 1,
    gap: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  editButton: {
    marginRight: 4,
  },
  discardButton: {
    marginRight: 4,
    borderColor: '#ef4444',
  },
  traineeName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#ffffff',
  },
  assessmentDetails: {
    gap: 8,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailIcon: {
    fontSize: 16,
    width: 20,
  },
  detailText: {
    fontSize: 14,
    color: '#6b7280',
  },
  epasSection: {
    marginBottom: 16,
  },
  epasTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  epasList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  epaBadge: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  epaText: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '500',
  },
  noEpaText: {
    fontSize: 12,
    color: '#9ca3af',
    fontStyle: 'italic',
  },
  entrustmentSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  entrustmentLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  entrustmentValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: '#9ca3af',
    fontStyle: 'italic',
  },
  loadingCard: {
    marginBottom: 16,
  },
  loadingText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    paddingVertical: 20,
  },
});



