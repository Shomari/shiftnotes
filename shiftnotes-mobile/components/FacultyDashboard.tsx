import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  Alert,
  ActivityIndicator,
  Pressable,
  Platform,
} from 'react-native';
import debounce from 'lodash.debounce';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Button } from './ui/Button';
import { Select } from './ui/Select';
import { apiClient } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

// Web-only imports for react-datepicker
let DatePicker: any = null;
if (Platform.OS === 'web') {
  try {
    DatePicker = require('react-datepicker').default;
    require('react-datepicker/dist/react-datepicker.css');
    console.log('DatePicker loaded successfully:', !!DatePicker);
    
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
    console.error('Failed to load react-datepicker:', e);
    DatePicker = null;
  }
}

interface MonthlyData {
  month: string;
  assessment_count: number;
}

interface FacultyStats {
  faculty_id: string;
  faculty_name: string;
  total_assessments: number;
  avg_assessments_per_month: number;
  avg_turnaround_days: number;
  avg_entrustment_level: number;
  last_assessment_date: string | null;
  monthly_breakdown: MonthlyData[];
}

interface FacultyDashboardData {
  faculty_stats: FacultyStats[];
  date_range: {
    start_date: string;
    end_date: string;
  };
  total_faculty: number;
  total_assessments: number;
}

interface FacultyDashboardProps {
  onViewFaculty?: (facultyId: string) => void;
}

export function FacultyDashboard({ onViewFaculty }: FacultyDashboardProps = {}) {
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState<FacultyDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Fetch dashboard data on component mount
  useEffect(() => {
    console.log('DatePicker available:', !!DatePicker, Platform.OS);
    loadDashboardData();
  }, []);

  const loadDashboardData = async (search?: string) => {
    try {
      setLoading(true);
      
      const data = await apiClient.getFacultyDashboard(undefined, startDate, endDate, search || searchQuery);
      console.log('Faculty dashboard data:', data);
      setDashboardData(data);
    } catch (error) {
      console.error('Error loading faculty dashboard:', error);
      Alert.alert('Error', 'Failed to load faculty dashboard data');
    } finally {
      setLoading(false);
    }
  };

  // Debounced search function for performance
  const debouncedSearch = useCallback(
    debounce((searchTerm: string) => {
      loadDashboardData(searchTerm);
    }, 300),
    [startDate, endDate]
  );

  // Reload data when date filters change
  useEffect(() => {
    if (!loading) {
      loadDashboardData();
    }
  }, [startDate, endDate]);

  // Handle search input changes with debouncing
  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    debouncedSearch(text);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setStartDate('');
    setEndDate('');
    loadDashboardData(''); // Reload with empty search
  };

  const handleViewFaculty = (facultyId: string) => {
    console.log('handleViewFaculty called with:', facultyId);
    console.log('onViewFaculty prop:', onViewFaculty);
    if (onViewFaculty) {
      onViewFaculty(facultyId);
    } else {
      console.log('onViewFaculty prop is not provided');
    }
  };

  const toggleFilters = () => {
    setFiltersExpanded(!filtersExpanded);
  };

  // Check if any filters are active
  const hasActiveFilters = searchQuery || startDate || endDate;


  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.pageTitle}>Faculty Dashboard</Text>
        <Text style={styles.pageSubtitle}>Track assessment volume by faculty member</Text>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Loading State */}
        {loading && (
          <Card style={styles.loadingCard}>
            <CardContent>
              <ActivityIndicator size="large" color="#0066cc" style={styles.loadingSpinner} />
              <Text style={styles.loadingText}>Loading faculty dashboard...</Text>
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
                  {dashboardData?.faculty_stats.length || 0} faculty
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
                {/* Faculty Search */}
                <View style={styles.filterField}>
                  <Text style={styles.filterLabel}>Search Faculty</Text>
                  <TextInput
                    style={styles.searchInput}
                    value={searchQuery}
                    onChangeText={handleSearchChange}
                    placeholder="Search by first or last name..."
                    clearButtonMode="while-editing"
                    autoCapitalize="words"
                    autoCorrect={false}
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
                        placeholder="yyyy-mm-dd"
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
                        placeholder="yyyy-mm-dd"
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

        {/* Summary Stats */}
        {dashboardData && (
          <Card style={styles.summaryCard}>
            <CardHeader>
              <CardTitle>📊 Summary Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <View style={styles.summaryGrid}>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryNumber}>{dashboardData.total_faculty}</Text>
                  <Text style={styles.summaryLabel}>Faculty Members</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryNumber}>{dashboardData.total_assessments}</Text>
                  <Text style={styles.summaryLabel}>Total Assessments</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryNumber}>
                    {dashboardData.total_faculty > 0 
                      ? (dashboardData.total_assessments / dashboardData.total_faculty).toFixed(1)
                      : '0'
                    }
                  </Text>
                  <Text style={styles.summaryLabel}>Avg per Faculty</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryNumber}>
                    {dashboardData.faculty_stats.length > 0
                      ? (dashboardData.faculty_stats.reduce((sum, f) => sum + f.avg_turnaround_days, 0) / dashboardData.faculty_stats.length).toFixed(1)
                      : '0'
                    }
                  </Text>
                  <Text style={styles.summaryLabel}>Avg Turnaround (days)</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryNumber}>
                    {dashboardData.faculty_stats.length > 0
                      ? (dashboardData.faculty_stats.reduce((sum, f) => sum + f.avg_entrustment_level, 0) / dashboardData.faculty_stats.length).toFixed(1)
                      : '0'
                    }
                  </Text>
                  <Text style={styles.summaryLabel}>Avg Entrustment</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryNumber}>
                    {Math.round(dashboardData.faculty_stats.reduce((sum, f) => sum + f.monthly_breakdown.length, 0) / Math.max(dashboardData.total_faculty, 1))}
                  </Text>
                  <Text style={styles.summaryLabel}>Avg Active Months</Text>
                </View>
              </View>
            </CardContent>
          </Card>
        )}

        {/* Faculty Assessment Volume */}
        <View style={styles.facultyList}>
          {dashboardData?.faculty_stats.map((faculty) => (
            <Card key={faculty.faculty_id} style={styles.facultyCard}>
              <CardContent>
                {/* Faculty Header */}
                <View style={styles.facultyHeader}>
                  <View style={styles.facultyInfo}>
                    <Text style={styles.facultyName}>{faculty.faculty_name}</Text>
                    <View style={styles.facultyMetrics}>
                      <View style={styles.metricBadge}>
                        <Text style={styles.metricNumber}>{faculty.total_assessments}</Text>
                        <Text style={styles.metricLabel}>Total</Text>
                      </View>
                      <View style={[styles.metricBadge, { backgroundColor: '#3b82f615' }]}>
                        <Text style={[styles.metricNumber, { color: '#3b82f6' }]}>{faculty.monthly_breakdown.length}</Text>
                        <Text style={styles.metricLabel}>Active Months</Text>
                      </View>
                    </View>
                  </View>
                  
                  {/* View Button in Header */}
                  <View style={styles.facultyHeaderActions}>
                    <Button
                      title="View Details"
                      onPress={() => handleViewFaculty(faculty.faculty_id)}
                      variant="outline"
                      size="sm"
                      style={styles.viewButton}
                    />
                  </View>
                </View>

                {/* Faculty Details */}
                <View style={styles.facultyDetails}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailIcon}>📈</Text>
                    <Text style={styles.detailText}>
                      {faculty.avg_assessments_per_month.toFixed(1)} assessments/month
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailIcon}>⏱️</Text>
                    <Text style={styles.detailText}>
                      {faculty.avg_turnaround_days.toFixed(1)} day avg turnaround
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailIcon}>🎯</Text>
                    <Text style={styles.detailText}>
                      {faculty.avg_entrustment_level.toFixed(1)} avg entrustment level
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailIcon}>📅</Text>
                    <Text style={styles.detailText}>
                      Last assessment: {formatDate(faculty.last_assessment_date)}
                    </Text>
                  </View>
                </View>

              </CardContent>
            </Card>
          ))}
        </View>

        {/* Empty State */}
        {dashboardData?.faculty_stats.length === 0 && !loading && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>
              No faculty data found for the selected filters
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

  // Filters (reusing from AllAssessments)
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
    padding: 0,
  },
  filtersCardHeader: {
    margin: 0,
    marginBottom: 0,
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
  searchInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: '#ffffff',
    color: '#374151',
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
  clearFiltersButton: {
    alignSelf: 'flex-start',
    marginTop: 8,
  },

  // Summary Stats
  summaryCard: {
    margin: 16,
    marginTop: 8,
  },
  summaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    flexWrap: 'wrap',
  },
  summaryItem: {
    flex: 1,
    minWidth: 120,
    maxWidth: 150,
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    marginBottom: 8,
  },
  summaryNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
  },

  // Faculty Cards
  facultyList: {
    padding: 16,
    paddingTop: 8,
    gap: 12,
  },
  facultyCard: {
    marginBottom: 4,
  },
  facultyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  facultyHeaderActions: {
    marginLeft: 12,
  },
  facultyInfo: {
    flex: 1,
  },
  facultyName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  facultyMetrics: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  metricBadge: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    alignItems: 'center',
    minWidth: 60,
  },
  metricNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  metricLabel: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 2,
  },
  facultyDetails: {
    gap: 8,
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
  monthlyChartContainer: {
    marginTop: 12,
  },
  monthlyChartTitle: {
    fontSize: 12,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  monthlyChart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    height: 80,
    paddingHorizontal: 8,
    paddingVertical: 8,
    backgroundColor: '#f9fafb',
    borderRadius: 6,
  },
  monthlyBar: {
    alignItems: 'center',
    minWidth: 30,
    height: '100%',
    justifyContent: 'flex-end',
  },
  monthlyBarFill: {
    width: 24,
    minHeight: 4,
    borderRadius: 3,
    marginVertical: 2,
  },
  monthlyBarLabel: {
    fontSize: 10,
    color: '#6b7280',
    textAlign: 'center',
    fontWeight: '500',
  },
  monthlyBarValue: {
    fontSize: 10,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
    marginBottom: 2,
  },
  noDataText: {
    fontSize: 12,
    color: '#9ca3af',
    fontStyle: 'italic',
    textAlign: 'center',
    flex: 1,
    paddingVertical: 20,
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
  viewButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
});
