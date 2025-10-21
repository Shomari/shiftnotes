import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
  Pressable,
} from 'react-native';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Button } from './ui/Button';
import { Select } from './ui/Select';
import { CustomDatePicker } from './ui/DatePicker';
import { ApiAssessment } from '../lib/api';
import { apiClient } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

// Web-only imports for react-datepicker
let DatePicker: any = null;
if (Platform.OS === 'web') {
  try {
    DatePicker = require('react-datepicker').default;
    require('react-datepicker/dist/react-datepicker.css');
    
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

interface AllAssessmentsProps {
  onViewAssessment?: (assessmentId: string) => void;
  onEditAssessment?: (assessmentId: string) => void;
}

interface Assessment extends ApiAssessment {
  epas: Array<{
    code: string;
    title: string;
    level: number;
  }>;
}

export function AllAssessments({ onViewAssessment, onEditAssessment }: AllAssessmentsProps) {
  const { user } = useAuth();
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [traineeFilter, setTraineeFilter] = useState('');
  const [facultyFilter, setFacultyFilter] = useState('');
  const [epaFilter, setEpaFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrevious, setHasPrevious] = useState(false);
  const pageSize = 10;
  
  // Filter options loaded separately (value = ID, label = name for display)
  const [traineeOptions, setTraineeOptions] = useState<Array<{label: string, value: string}>>([]);
  const [facultyOptions, setFacultyOptions] = useState<Array<{label: string, value: string}>>([]);
  const [epaOptions, setEpaOptions] = useState<Array<{label: string, value: string}>>([]);

  // Fetch assessments when page or filters change
  useEffect(() => {
    loadAssessments();
  }, [currentPage, traineeFilter, facultyFilter, epaFilter, startDate, endDate]);

  // Load filter options once on mount
  useEffect(() => {
    loadFilterOptions();
  }, []);

  const loadAssessments = async () => {
    try {
      setLoading(true);
      
      // Get assessments with pagination and ID-based filtering
      const response = await apiClient.getAssessments({
        limit: pageSize,
        page: currentPage,
        trainee_id: traineeFilter || undefined,
        evaluator_id: facultyFilter || undefined,
        epa_id: epaFilter || undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
      });
      
      console.log('Fetched assessments page:', currentPage, 'with ID-based filters:', {
        trainee_id: traineeFilter,
        evaluator_id: facultyFilter,
        epa_id: epaFilter
      });
      
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

  const loadFilterOptions = async () => {
    try {
      // Load all trainees using dedicated endpoint (value = ID, label = name)
      const traineesResponse = await apiClient.getTrainees();
      const allTrainees = traineesResponse.results || [];
      const traineeOpts = allTrainees
        .sort((a, b) => a.name.split(' ').pop()!.localeCompare(b.name.split(' ').pop()!)) // Sort by last name
        .map(trainee => ({ label: trainee.name, value: trainee.id })); // Store ID as value
      setTraineeOptions(traineeOpts);

      // Load all faculty using dedicated endpoint (value = ID, label = name)
      const facultyResponse = await apiClient.getFaculty();
      const allFaculty = facultyResponse.results || [];
      const facultyOpts = allFaculty
        .sort((a, b) => a.name.split(' ').pop()!.localeCompare(b.name.split(' ').pop()!)) // Sort by last name
        .map(faculty => ({ label: faculty.name, value: faculty.id })); // Store ID as value
      setFacultyOptions(facultyOpts);

      // Load all EPAs for filter (value = ID, label = formatted code + title)
      const epasResponse = await apiClient.getEPAs();
      const allEPAs = epasResponse.results || [];
      const epaOpts = allEPAs
        .sort((a, b) => {
          // Extract numbers from EPA codes for proper numerical sorting
          const getEpaNumber = (code: string) => {
            const match = code.match(/EPA(\d+)/);
            return match ? parseInt(match[1]) : 0;
          };
          return getEpaNumber(a.code) - getEpaNumber(b.code);
        })
        .map(epa => {
          // Format EPA code with space (EPA1 → EPA 1)
          const formattedCode = epa.code.replace(/EPA(\d+)/, 'EPA $1');
          return { label: `${formattedCode} - ${epa.title}`, value: epa.id };
        });
      setEpaOptions(epaOpts);
    } catch (error) {
      console.error('Error loading filter options:', error);
      // Don't show alert for filter options - just log the error
    }
  };

  const clearFilters = () => {
    setTraineeFilter('');
    setFacultyFilter('');
    setEpaFilter('');
    setStartDate('');
    setEndDate('');
    setCurrentPage(1); // Reset to first page when clearing filters
  };

  const handleFilterChange = (filterSetter: (value: string) => void, value: string) => {
    filterSetter(value);
    setCurrentPage(1); // Reset to first page when filter changes
  };

  const goToPage = (page: number) => {
    setCurrentPage(page);
  };

  const goToPreviousPage = () => {
    if (hasPrevious) {
      setCurrentPage(currentPage - 1);
    }
  };

  const goToNextPage = () => {
    if (hasNext) {
      setCurrentPage(currentPage + 1);
    }
  };

  const toggleFilters = () => {
    setFiltersExpanded(!filtersExpanded);
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

  // Check if any filters are active
  const hasActiveFilters = traineeFilter || facultyFilter || epaFilter || startDate || endDate;

  // No client-side filtering - backend handles all filtering via API parameters
  const filteredAssessments = assessments;

  // Calculate pagination info
  const totalPages = Math.ceil(totalCount / pageSize);
  const startResult = ((currentPage - 1) * pageSize) + 1;
  const endResult = Math.min(currentPage * pageSize, totalCount);


  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.pageTitle}>All Assessments</Text>
        <Text style={styles.pageSubtitle}>View all assessments across the program</Text>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Loading State */}
        {loading && (
          <Card style={styles.loadingCard}>
            <CardContent>
              <ActivityIndicator size="large" color="#0066cc" style={styles.loadingSpinner} />
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
                <Text style={styles.resultsCountInHeader} numberOfLines={1} ellipsizeMode="tail">
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
                <Text style={styles.filterLabel}>Trainee</Text>
                <Select
                  value={traineeFilter}
                  onValueChange={(value) => handleFilterChange(setTraineeFilter, value)}
                  placeholder="All Trainees"
                  options={traineeOptions}
                />
              </View>

              {/* Faculty Filter */}
              <View style={styles.filterField}>
                <Text style={styles.filterLabel}>Faculty</Text>
                <Select
                  value={facultyFilter}
                  onValueChange={(value) => handleFilterChange(setFacultyFilter, value)}
                  placeholder="All Faculty"
                  options={facultyOptions}
                />
              </View>

              {/* EPA Filter */}
              <View style={styles.filterField}>
                <Text style={styles.filterLabel}>EPA</Text>
                <Select
                  value={epaFilter}
                  onValueChange={(value) => handleFilterChange(setEpaFilter, value)}
                  placeholder="All EPAs"
                  options={epaOptions}
                />
              </View>


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

        {/* Pagination Info */}
        {totalCount > 0 && (
          <Card style={styles.paginationInfoCard}>
            <CardContent>
              <Text style={styles.paginationInfoText}>
                Showing {startResult}-{endResult} of {totalCount} assessments
                {hasActiveFilters && ' (filtered)'}
              </Text>
            </CardContent>
          </Card>
        )}

        {/* Assessments List */}
        <View style={styles.assessmentsList}>
          {filteredAssessments.map((assessment) => (
            <Card key={assessment.id} style={styles.assessmentCard}>
              <CardContent>
                {/* Header with trainee and faculty names and action buttons */}
                <View style={styles.assessmentHeader}>
                  <View style={styles.assessmentInfo}>
                    <Text style={styles.traineeName}>{assessment.trainee_name}</Text>
                    <Text style={styles.facultyName}>by {assessment.evaluator_name}</Text>
                  </View>
                  <View style={styles.actionButtons}>
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
                        <Text style={styles.epaLevelText}>
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
        {totalPages > 1 && (
          <Card style={styles.paginationCard}>
            <CardContent>
              <View style={styles.paginationControls}>
                <Button
                  title="← Previous"
                  onPress={goToPreviousPage}
                  variant="outline"
                  size="sm"
                  disabled={!hasPrevious}
                  style={!hasPrevious ? {...styles.paginationButton, ...styles.disabledButton} : styles.paginationButton}
                />
                
                <View style={styles.pageInfo}>
                  <Text style={styles.pageText}>
                    Page {currentPage} of {totalPages}
                  </Text>
                </View>
                
                <Button
                  title="Next →"
                  onPress={goToNextPage}
                  variant="outline"
                  size="sm"
                  disabled={!hasNext}
                  style={!hasNext ? {...styles.paginationButton, ...styles.disabledButton} : styles.paginationButton}
                />
              </View>
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {filteredAssessments.length === 0 && !loading && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>
              No assessments found{hasActiveFilters ? ' matching your filters' : ''}
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
  scrollView: {
    flex: 1,
  },
  loadingCard: {
    margin: 16,
  },
  loadingSpinner: {
    marginBottom: 16,
  },
  loadingText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#64748b',
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
    flexShrink: 1,
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
    marginTop: 16,
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
  assessmentInfo: {
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
  traineeName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  facultyName: {
    fontSize: 14,
    color: '#6b7280',
    fontStyle: 'italic',
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '500',
  },
  assessmentDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 12,
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
    color: '#4b5563',
  },
  epasSection: {
    marginBottom: 12,
  },
  epasTitle: {
    fontSize: 14,
    fontWeight: '500',
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
    color: '#6b7280',
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
    fontWeight: '500',
    color: '#374151',
  },
  entrustmentValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
  },
  
  // Pagination styles
  paginationInfoCard: {
    margin: 16,
    marginBottom: 8,
  },
  paginationInfoText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
  },
  paginationCard: {
    margin: 16,
    marginTop: 8,
  },
  paginationControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  paginationButton: {
    minWidth: 100,
  },
  disabledButton: {
    opacity: 0.5,
  },
  pageInfo: {
    flex: 1,
    alignItems: 'center',
  },
  pageText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
});
