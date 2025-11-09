import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, Dimensions, Alert, ActivityIndicator, Pressable } from 'react-native';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { User } from '../../lib/types';
import { apiClient } from '../../lib/api';

interface ProgramPerformanceProps {
  user: User;
}

interface ProgramPerformanceData {
  program: {
    id: string;
    name: string;
    abbreviation: string;
    specialty: string;
  };
  timeframe: {
    months: number;
    start_date: string;
    end_date: string;
  };
  metrics: {
    total_trainees: number;
    active_trainees: number;
    assessments_in_period: number;
    total_lifetime_assessments: number;
    average_competency_level: number;
  };
  trainee_breakdown: Array<{
    id: string;
    name: string;
    department: string;
    assessments_in_period: number;
    total_assessments: number;
    average_competency_level: number;
    is_active: boolean;
    last_assessment_date: string | null;
  }>;
  competency_breakdown: Array<{
    id: string;
    name: string;
    total_assessments: number;
    average_competency_level: number;
  }>;
  cohort_breakdown: Array<{
    id: string;
    name: string;
    start_date: string;
    trainee_count: number;
    assessment_count: number;
    average_entrustment_level: number | null;
  }>;
  trends: {
    monthly_assessments: Array<{
      month: string;
      assessments: number;
    }>;
    monthly_entrustment: Array<{
      month: string;
      average_entrustment: number;
    }>;
  };
}

const ProgramPerformanceDashboard: React.FC<ProgramPerformanceProps> = ({ user }) => {
  const [loading, setLoading] = useState(true);
  const [selectedTimeframe, setSelectedTimeframe] = useState<number>(6);
  const [dashboardData, setDashboardData] = useState<ProgramPerformanceData | null>(null);
  
  // Filter states
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [cohortFilter, setCohortFilter] = useState('');
  const [traineeFilter, setTraineeFilter] = useState('');
  const [availableTrainees, setAvailableTrainees] = useState<any[]>([]);
  
  // Separate state for full unfiltered options (for dropdowns)
  const [allCohorts, setAllCohorts] = useState<any[]>([]);
  const [allTrainees, setAllTrainees] = useState<any[]>([]);

  const timeframeOptions = [
    { value: '1', label: '1 Month' },
    { value: '3', label: '3 Months' },
    { value: '6', label: '6 Months' },
    { value: '12', label: '12 Months' },
  ];

  // Load initial data for dropdowns (unfiltered)
  useEffect(() => {
    loadDropdownOptions();
  }, []);

  // Load dashboard data when timeframe or filters change
  useEffect(() => {
    loadDashboardData();
  }, [selectedTimeframe, cohortFilter, traineeFilter]);

  // Update available trainees when cohort filter changes
  useEffect(() => {
    if (cohortFilter) {
      // Filter trainees by selected cohort from the full list
      const cohortTrainees = allTrainees.filter(
        (trainee: any) => trainee.cohort === cohortFilter
      );
      setAvailableTrainees(cohortTrainees);
    } else {
      // No cohort filter - show all trainees
      setAvailableTrainees(allTrainees);
    }
  }, [cohortFilter, allTrainees]);

  const toggleFilters = () => {
    setFiltersExpanded(!filtersExpanded);
  };

  const clearFilters = () => {
    setCohortFilter('');
    setTraineeFilter('');
  };

  // Clear trainee filter when cohort changes (since selected trainee might not be in new cohort)
  useEffect(() => {
    if (cohortFilter) {
      setTraineeFilter(''); // Clear trainee selection when cohort changes
    }
  }, [cohortFilter]);

  // Check if any filters are active
  const hasActiveFilters = cohortFilter || traineeFilter;

  const loadDropdownOptions = async () => {
    try {
      // Load all cohorts and trainees for dropdown options (unfiltered)
      const [cohortsResponse, usersResponse] = await Promise.all([
        apiClient.getCohorts(),
        apiClient.getUsers()
      ]);

      // Set all cohorts - getCohorts returns array directly
      setAllCohorts(Array.isArray(cohortsResponse) ? cohortsResponse : []);

      // Set all trainees for the current user's program
      const programTrainees = (usersResponse.results || []).filter(
        (trainee: any) => trainee.role === 'trainee' && trainee.program === user.program
      );
      setAllTrainees(programTrainees);

    } catch (error) {
      console.error('Error loading dropdown options:', error);
    }
  };

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      console.log('Loading dashboard data for user program, timeframe:', selectedTimeframe, 'cohort:', cohortFilter, 'trainee:', traineeFilter);
      
      // Build filter parameters
      const filters: { cohort?: string; trainee?: string } = {};
      if (cohortFilter) filters.cohort = cohortFilter;
      if (traineeFilter) filters.trainee = traineeFilter;
      
      const data = await apiClient.getProgramPerformanceData(selectedTimeframe, filters);
      console.log('Dashboard data loaded:', data);
      
      setDashboardData(data);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      Alert.alert('Error', 'Failed to load program performance data');
    } finally {
      setLoading(false);
    }
  };


  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString();
  };

  const getMetricColor = (value: number, type: 'level' | 'percentage') => {
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

  if (loading && !dashboardData) {
    return (
      <ScrollView style={styles.container}>
        <Card style={styles.headerCard}>
          <CardHeader>
            <CardTitle>Program Performance Dashboard</CardTitle>
            <Text style={styles.subtitle}>Comprehensive overview of program performance</Text>
          </CardHeader>
        </Card>
        
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0066cc" />
          <Text style={styles.loadingText}>Loading program data...</Text>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <Card style={styles.headerCard}>
        <CardHeader>
          <CardTitle>Program Performance Dashboard</CardTitle>
          <Text style={styles.subtitle}>Comprehensive overview of program performance</Text>
        </CardHeader>
        
        <CardContent>
          <View style={styles.controlsRow}>
            <View style={styles.controlGroup}>
              <Text style={styles.controlLabel}>Time Period:</Text>
              <Select
                value={selectedTimeframe.toString()}
                onValueChange={(value) => setSelectedTimeframe(parseInt(value))}
                placeholder="Select timeframe"
                options={timeframeOptions}
                disabled={loading}
              />
            </View>
          </View>
        </CardContent>
      </Card>

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
                      {/* Cohort Filter */}
                      {allCohorts.length > 0 && (
                        <View style={styles.filterField}>
                          <Text style={styles.filterLabel}>Cohort</Text>
                          <Select
                            value={cohortFilter}
                            onValueChange={setCohortFilter}
                            placeholder="All Cohorts"
                            options={[
                              { label: 'All Cohorts', value: '' },
                              ...allCohorts.map(cohort => ({
                                label: cohort.name,
                                value: cohort.id
                              }))
                            ]}
                          />
                        </View>
                      )}

              {/* Trainee Filter */}
              {availableTrainees.length > 0 && (
                <View style={styles.filterField}>
                  <Text style={styles.filterLabel}>Trainee</Text>
                  <Select
                    value={traineeFilter}
                    onValueChange={setTraineeFilter}
                    placeholder="All Trainees"
                    options={[
                      { label: 'All Trainees', value: '' },
                      ...availableTrainees.map(trainee => ({
                        label: trainee.name,
                        value: trainee.id
                      }))
                    ]}
                  />
                </View>
              )}


              {/* Clear Filters Button */}
              {hasActiveFilters && (
                <View style={styles.filterField}>
                  <Button
                    title="Clear Filters"
                    onPress={clearFilters}
                    style={styles.clearFiltersButton}
                  />
                </View>
              )}
            </View>
          </CardContent>
        )}
      </Card>


      {/* Dashboard Content */}
      {dashboardData ? (
        <>
          {/* Key Metrics */}
          <Card style={styles.metricsCard}>
            <CardHeader>
              <CardTitle>{dashboardData.program.name}</CardTitle>
              <Text style={styles.programSubtitle}>
                {dashboardData.program.specialty} • Last {dashboardData.timeframe.months} months
              </Text>
            </CardHeader>
            
            <CardContent>
              <View style={styles.metricsGrid}>
                <View style={styles.metricItem}>
                  <Text style={styles.metricValue}>{dashboardData.metrics.total_trainees}</Text>
                  <Text style={styles.metricLabel}>Total Trainees</Text>
                </View>
                
                <View style={styles.metricItem}>
                  <Text style={styles.metricValue}>{dashboardData.metrics.assessments_in_period}</Text>
                  <Text style={styles.metricLabel}>Assessments</Text>
                </View>
                
                <View style={styles.metricItem}>
                  <Text style={[
                    styles.metricValue, 
                    { color: getMetricColor(dashboardData.metrics.average_competency_level, 'level') }
                  ]}>
                    {dashboardData.metrics.average_competency_level.toFixed(1)}
                  </Text>
                  <Text style={styles.metricLabel}>Avg Level</Text>
                </View>
                
              </View>
            </CardContent>
          </Card>


          {/* Competency Breakdown */}
          {dashboardData.competency_breakdown.length > 0 && (
            <Card style={styles.distributionCard}>
              <CardHeader>
                <CardTitle>Performance by Competency</CardTitle>
              </CardHeader>
              
              <CardContent>
                {dashboardData.competency_breakdown.map((competency) => (
                  <View key={competency.id} style={styles.competencyItem}>
                    <View style={styles.competencyHeader}>
                      <Text style={styles.competencyName}>{competency.name}</Text>
                      <View style={styles.competencyMetrics}>
                        <Text style={styles.competencyAssessments}>
                          {competency.total_assessments} assessments
                        </Text>
                        <Text style={[
                          styles.competencyLevel,
                          { color: getMetricColor(competency.average_competency_level, 'level') }
                        ]}>
                          Avg: {competency.average_competency_level}
                        </Text>
                      </View>
                    </View>
                  </View>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Cohort Breakdown */}
          {dashboardData.cohort_breakdown && dashboardData.cohort_breakdown.length > 0 && (
            <Card style={styles.distributionCard}>
              <CardHeader>
                <CardTitle>Average Entrustment by Cohort</CardTitle>
              </CardHeader>
              
              <CardContent>
                {dashboardData.cohort_breakdown.map((cohort) => (
                  <View key={cohort.id} style={styles.cohortItem}>
                    <View style={styles.cohortHeader}>
                      <View style={styles.cohortInfo}>
                        <Text style={styles.cohortName}>{cohort.name}</Text>
                        <Text style={styles.cohortDetails}>
                          {cohort.trainee_count} trainee{cohort.trainee_count !== 1 ? 's' : ''} • {cohort.assessment_count} assessments
                        </Text>
                      </View>
                      <View style={styles.cohortMetrics}>
                        {cohort.average_entrustment_level !== null ? (
                          <Text style={[
                            styles.cohortLevel,
                            { color: getMetricColor(cohort.average_entrustment_level, 'level') }
                          ]}>
                            {cohort.average_entrustment_level.toFixed(2)}
                          </Text>
                        ) : (
                          <Text style={styles.cohortNoData}>No Data</Text>
                        )}
                      </View>
                    </View>
                  </View>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Six-Month Trends */}
          {dashboardData.trends?.monthly_assessments && dashboardData.trends.monthly_assessments.length > 0 && (
            <Card style={styles.trendsCard}>
              <CardHeader>
                <CardTitle>📊 Six-Month Trends</CardTitle>
              </CardHeader>
              
              <CardContent>
                <View style={styles.trendsChart}>
                  <Text style={styles.trendsLabel}>Assessment Volume</Text>
                  <View style={styles.horizontalBarsContainer}>
                    {dashboardData.trends.monthly_assessments.map((trend, index) => {
                      const maxAssessments = Math.max(...dashboardData.trends.monthly_assessments.map(t => t.assessments));
                      const widthPercent = Math.min(Math.max((trend.assessments / maxAssessments) * 100, 5), 100);
                      return (
                        <View key={index} style={styles.horizontalBarRow}>
                          <Text style={styles.horizontalBarLabel}>{trend.month}</Text>
                          <View style={styles.horizontalBarTrack}>
                            <View 
                              style={[
                                styles.horizontalBarFill, 
                                { 
                                  width: `${widthPercent}%`,
                                  backgroundColor: '#3B82F6'
                                }
                              ]} 
                            />
                          </View>
                          <Text style={styles.horizontalBarValue}>{trend.assessments}</Text>
                        </View>
                      );
                    })}
                  </View>
                </View>

              </CardContent>
            </Card>
          )}

          {/* Monthly Entrustment Trends */}
          {dashboardData.trends?.monthly_entrustment && dashboardData.trends.monthly_entrustment.length > 0 && (
            <Card style={styles.trendsCard}>
              <CardHeader>
                <CardTitle>📈 Monthly Average Entrustment Level</CardTitle>
              </CardHeader>
              
              <CardContent>
                <View style={styles.trendsChart}>
                  <Text style={styles.trendsLabel}>Average Entrustment Level by Month</Text>
                  <View style={styles.horizontalBarsContainer}>
                    {dashboardData.trends.monthly_entrustment.map((trend, index) => {
                      const maxLevel = 5; // EPA levels typically go from 1-5
                      const widthPercent = Math.min(Math.max((trend.average_entrustment / maxLevel) * 100, 5), 100);
                      return (
                        <View key={index} style={styles.horizontalBarRow}>
                          <Text style={styles.horizontalBarLabel}>{trend.month}</Text>
                          <View style={styles.horizontalBarTrack}>
                            <View 
                              style={[
                                styles.horizontalBarFill, 
                                { 
                                  width: `${widthPercent}%`,
                                  backgroundColor: getMetricColor(trend.average_entrustment, 'level')
                                }
                              ]} 
                            />
                          </View>
                          <Text style={styles.horizontalBarValue}>{trend.average_entrustment.toFixed(1)}</Text>
                        </View>
                      );
                    })}
                  </View>
                </View>
              </CardContent>
            </Card>
          )}
        </>
      ) : (
        <Card style={styles.emptyCard}>
          <CardContent>
            <Text style={styles.emptyText}>
              Loading program data...
            </Text>
          </CardContent>
        </Card>
      )}
    </ScrollView>
  );
};

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
  controlsRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 16,
    flexWrap: 'wrap',
    alignItems: 'flex-end',
  },
  controlGroup: {
    flex: 1,
    minWidth: 200,
  },
  controlLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748b',
  },
  metricsCard: {
    margin: 16,
    marginVertical: 8,
  },
  programSubtitle: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
  },
  metricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  metricItem: {
    alignItems: 'center',
    flex: 1,
  },
  metricValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1e293b',
  },
  metricLabel: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
    textAlign: 'center',
  },
  tableCard: {
    margin: 16,
    marginVertical: 8,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: '#e2e8f0',
  },
  tableHeaderText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    textAlign: 'center',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    alignItems: 'center',
  },
  traineeNameText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1e293b',
  },
  traineeDeptText: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  tableText: {
    fontSize: 14,
    color: '#374151',
    textAlign: 'center',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignItems: 'center',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  distributionCard: {
    margin: 16,
    marginVertical: 8,
  },
  distributionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  distributionLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    width: 80,
  },
  distributionBar: {
    flex: 1,
    height: 20,
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    marginHorizontal: 12,
    overflow: 'hidden',
  },
  distributionFill: {
    height: '100%',
    borderRadius: 10,
  },
  distributionPercent: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748b',
    width: 40,
    textAlign: 'right',
  },
  competencyItem: {
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  competencyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  competencyName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    flex: 1,
    marginRight: 12,
  },
  competencyMetrics: {
    alignItems: 'flex-end',
  },
  competencyAssessments: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 2,
  },
  competencyLevel: {
    fontSize: 14,
    fontWeight: '600',
  },
  trendsCard: {
    margin: 16,
    marginVertical: 8,
  },
  trendsChart: {
    marginTop: 8,
  },
  trendsLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 16,
    textAlign: 'center',
  },
  // Horizontal bar chart styles
  horizontalBarsContainer: {
    gap: 12,
    marginTop: 8,
  },
  horizontalBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 32,
  },
  horizontalBarLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
    width: 60,
    textAlign: 'right',
  },
  horizontalBarTrack: {
    flex: 1,
    height: 24,
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    overflow: 'hidden',
  },
  horizontalBarFill: {
    height: '100%',
    borderRadius: 12,
    minWidth: 4,
  },
  horizontalBarValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E293B',
    width: 40,
    textAlign: 'left',
  },
  emptyCard: {
    margin: 16,
    marginVertical: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    padding: 20,
  },
  cohortItem: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  cohortHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cohortInfo: {
    flex: 1,
    marginRight: 12,
  },
  cohortName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  cohortDetails: {
    fontSize: 12,
    color: '#64748b',
  },
  cohortMetrics: {
    alignItems: 'flex-end',
  },
  cohortLevel: {
    fontSize: 16,
    fontWeight: '700',
  },
  cohortNoData: {
    fontSize: 14,
    fontWeight: '500',
    color: '#9ca3af',
  },
  
  // Filter styles
  filtersCard: {
    margin: 16,
    marginBottom: 8,
    backgroundColor: '#ffffff',
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
  },
  filtersHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
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
    borderRadius: 8,
    marginLeft: 8,
  },
  activeFiltersText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#ffffff',
  },
  filtersHeaderSpacer: {
    flex: 1,
  },
  clickHint: {
    fontSize: 12,
    color: '#6b7280',
    fontStyle: 'italic',
    marginRight: 8,
  },
  expandArrowContainer: {
    paddingHorizontal: 4,
  },
  expandIcon: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '600',
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
    zIndex: 10000,
    isolation: 'isolate',
  },
  clearFiltersButton: {
    alignSelf: 'flex-start',
    marginTop: 8,
  },
});

export default ProgramPerformanceDashboard;