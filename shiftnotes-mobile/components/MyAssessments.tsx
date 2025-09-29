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
import { CustomDatePicker } from './ui/DatePicker';
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
  epas: Array<{
    code: string;
    title: string;
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
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrevious, setHasPrevious] = useState(false);
  const pageSize = 10;
  const [traineeFilter, setTraineeFilter] = useState('');
  const [epaFilter, setEpaFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  // Filter options loaded separately (value = ID, label = name for display)
  const [traineeOptions, setTraineeOptions] = useState<Array<{label: string, value: string}>>([]);
  const [facultyOptions, setFacultyOptions] = useState<Array<{label: string, value: string}>>([]);
  const [epaOptions, setEpaOptions] = useState<Array<{label: string, value: string}>>([]);

  // Load filter options on component mount
  useEffect(() => {
    loadFilterOptions();
  }, []);
  
  // Fetch assessments on component mount and when pagination changes
  useEffect(() => {
    loadAssessments();
  }, [currentPage]);
  
  // Reset to first page when filters change
  useEffect(() => {
    if (currentPage !== 1) {
      setCurrentPage(1);
    } else {
      loadAssessments();
    }
  }, [traineeFilter, epaFilter, statusFilter, startDate, endDate]);

  const loadFilterOptions = async () => {
    try {
      // Load all trainees and faculty for filter dropdowns
      const [traineesResponse, facultyResponse, epasResponse] = await Promise.all([
        apiClient.getTrainees(),
        apiClient.getFaculty(),
        apiClient.getEPAs()
      ]);
      
      // Set trainee options
      const traineeOpts = traineesResponse.results?.map(trainee => ({
        label: trainee.name || 'Unknown Trainee',
        value: trainee.id || ''
      })) || [];
      setTraineeOptions(traineeOpts);
      
      // Set faculty options
      const facultyOpts = facultyResponse.results?.map(faculty => ({
        label: faculty.name || 'Unknown Faculty',
        value: faculty.id || ''
      })) || [];
      setFacultyOptions(facultyOpts);
      
      // Set EPA options with proper formatting and numerical sorting
      const epaOpts = epasResponse.results?.map(epa => ({
        label: `${epa.code?.replace(/EPA(\d+)/, 'EPA $1')} - ${epa.title}`,
        value: epa.id || ''
      })) || [];
      
      // Sort EPAs numerically by their number
      epaOpts.sort((a, b) => {
        const aNum = parseInt(a.label.match(/EPA (\d+)/)?.[1] || '0');
        const bNum = parseInt(b.label.match(/EPA (\d+)/)?.[1] || '0');
        return aNum - bNum;
      });
      
      setEpaOptions(epaOpts);
    } catch (error) {
      console.error('Error loading filter options:', error);
    }
  };
  
  const loadAssessments = async () => {
    try {
      setLoading(true);
      
      // Build filter parameters with IDs
      const filterParams: any = {
        page: currentPage,
        limit: pageSize,
      };
      
      // Add ID-based filters
      if (traineeFilter) {
        if (user?.role === 'trainee') {
          filterParams.evaluator_id = traineeFilter; // For trainees, this filters by evaluator
        } else {
          filterParams.trainee_id = traineeFilter; // For faculty, this filters by trainee
        }
      }
      if (epaFilter) {
        filterParams.epa_id = epaFilter;
      }
      
      // For trainees, always filter by submitted status
      if (user?.role === 'trainee') {
        filterParams.status = 'submitted';
      } else if (statusFilter) {
        filterParams.status = statusFilter;
      }
      
      // Add date filters if set
      if (startDate) {
        filterParams.start_date = startDate;
      }
      if (endDate) {
        filterParams.end_date = endDate;
      }
      
      // Use different API endpoint based on user role
      const response = user?.role === 'trainee' 
        ? await apiClient.getReceivedAssessments(filterParams)
        : await apiClient.getMyAssessments(filterParams);
      
      console.log('Fetched assessments:', response);
      
      // Update pagination state
      setTotalCount(response.count || 0);
      setHasNext(!!response.next);
      setHasPrevious(!!response.previous);
      
      // Transform API data to match our interface
      const transformedAssessments: Assessment[] = response.results?.map(assessment => ({
        ...assessment,
        epas: assessment.assessment_epas?.map(epa => ({
          code: epa.epa_code || 'Unknown EPA',
          title: epa.epa_title || 'Unknown Title',
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
    setCurrentPage(1);
  };
  
  const goToPreviousPage = () => {
    if (hasPrevious && currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };
  
  const goToNextPage = () => {
    if (hasNext) {
      setCurrentPage(currentPage + 1);
    }
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

  // Apply client-side filters only for status (since backend handles ID-based filtering)
  const filteredAssessments = assessments.filter((assessment) => {
    // Filter by status (client-side since it's not complex)
    const matchesStatus = !statusFilter || assessment.status === statusFilter;
    
    return matchesStatus;
  });
  
  // Get appropriate options based on user role
  const getPersonOptions = () => {
    return user?.role === 'trainee' ? facultyOptions : traineeOptions;
  };

  // Color coding for entrustment levels (same as other components)
  const getMetricColor = (value: number | null, type: 'level' | 'percentage') => {
    if (!value) return '#9ca3af';
    if (type === 'level') {
      if (value >= 4) return '#059669'; // Green
      if (value >= 3) return '#0d9488'; // Teal
      if (value >= 2) return '#0891b2'; // Blue
      return '#dc2626'; // Red
    } else {
      if (value >= 80) return '#059669'; // Green
      if (value >= 60) return '#0d9488'; // Teal
      if (value >= 40) return '#0891b2'; // Blue
      return '#dc2626'; // Red
    }
  };

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
                  {totalCount} total, {filteredAssessments.length} on page
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
                  options={getPersonOptions()}
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

              {/* Status Filter - only for non-trainees */}
              {user?.role !== 'trainee' && (
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
              )}

              {/* Date Filters */}
              <View style={styles.dateFiltersSection}>
                <Text style={styles.dateFiltersHelper}>* Filtered by shift date</Text>
                <View style={styles.dateFiltersRow}>
                  <CustomDatePicker
                    label="Start Date"
                    value={startDate}
                    onChange={setStartDate}
                    placeholder="Select start date"
                  />

                  <CustomDatePicker
                    label="End Date"
                    value={endDate}
                    onChange={setEndDate}
                    placeholder="Select end date"
                  />
                </View>
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
                        <Text style={styles.epaText} numberOfLines={2}>
                          {assessment.epas[0].code.replace(/EPA(\d+)/, 'EPA $1')} - {assessment.epas[0].title}
                        </Text>
                        <Text style={[styles.epaLevelText, { color: getMetricColor(assessment.epas[0].level, 'level') }]}>
                          Level {assessment.epas[0].level}
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
                  <Text style={[
                    styles.entrustmentValue,
                    { color: getMetricColor(assessment.average_entrustment || null, 'level') }
                  ]}>
                    {assessment.average_entrustment ? assessment.average_entrustment.toFixed(1) : 'N/A'}
                  </Text>
                </View>
              </CardContent>
            </Card>
          ))}
        </View>

        {/* Pagination Controls */}
        {totalCount > pageSize && (
          <Card style={styles.paginationCard}>
            <CardContent>
              <View style={styles.paginationContainer}>
                <View style={styles.paginationInfo}>
                  <Text style={styles.paginationText}>
                    Page {currentPage} of {Math.ceil(totalCount / pageSize)}
                  </Text>
                  <Text style={styles.paginationText}>
                    Showing {((currentPage - 1) * pageSize) + 1}-{Math.min(currentPage * pageSize, totalCount)} of {totalCount} assessments
                  </Text>
                </View>
                <View style={styles.paginationButtons}>
                  <Button
                    title="Previous"
                    onPress={goToPreviousPage}
                    variant="outline"
                    size="sm"
                    disabled={!hasPrevious}
                    style={!hasPrevious ? {...styles.paginationButton, ...styles.disabledButton} : styles.paginationButton}
                  />
                  <Button
                    title="Next"
                    onPress={goToNextPage}
                    variant="outline"
                    size="sm"
                    disabled={!hasNext}
                    style={!hasNext ? {...styles.paginationButton, ...styles.disabledButton} : styles.paginationButton}
                  />
                </View>
              </View>
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {filteredAssessments.length === 0 && !loading && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>
              {totalCount === 0 ? 'No assessments found' : 'No assessments found matching your filters'}
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
  dateFiltersSection: {
    marginBottom: 8,
  },
  dateFiltersHelper: {
    fontSize: 12,
    color: '#6b7280',
    fontStyle: 'italic',
    marginBottom: 12,
  },
  dateFiltersRow: {
    gap: 16,
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
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    flex: 1,
    minWidth: 0, // Allow shrinking
  },
  epaText: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '500',
    marginBottom: 4,
    flexShrink: 1, // Allow text to shrink
  },
  epaLevelText: {
    fontSize: 11,
    fontWeight: '600',
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
  
  // Pagination
  paginationCard: {
    margin: 16,
    marginTop: 8,
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 16,
  },
  paginationInfo: {
    flex: 1,
    gap: 4,
  },
  paginationText: {
    fontSize: 14,
    color: '#6b7280',
  },
  paginationButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  paginationButton: {
    minWidth: 80,
  },
  disabledButton: {
    opacity: 0.5,
  },
});



