import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, Dimensions, Alert, ActivityIndicator } from 'react-native';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Select } from '../ui/Select';
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

  const timeframeOptions = [
    { value: '1', label: '1 Month' },
    { value: '3', label: '3 Months' },
    { value: '6', label: '6 Months' },
    { value: '12', label: '12 Months' },
  ];

  // Load dashboard data when timeframe changes
  useEffect(() => {
    loadDashboardData();
  }, [selectedTimeframe]);


  const loadDashboardData = async () => {
    try {
      setLoading(true);
      console.log('Loading dashboard data for user program, timeframe:', selectedTimeframe);
      
      const data = await apiClient.getProgramPerformanceData(selectedTimeframe);
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

          {/* Trainee Breakdown */}
          <Card style={styles.tableCard}>
            <CardHeader>
              <CardTitle>Trainee Performance</CardTitle>
            </CardHeader>
            
            <CardContent>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderText, { flex: 2 }]}>Name</Text>
                <Text style={[styles.tableHeaderText, { flex: 1 }]}>Assessments</Text>
                <Text style={[styles.tableHeaderText, { flex: 1 }]}>Avg Level</Text>
                <Text style={[styles.tableHeaderText, { flex: 1 }]}>Status</Text>
              </View>
              
              {dashboardData.trainee_breakdown.map((trainee, index) => (
                <View key={trainee.id} style={styles.tableRow}>
                  <View style={{ flex: 2 }}>
                    <Text style={styles.traineeNameText}>{trainee.name}</Text>
                    <Text style={styles.traineeDeptText}>{trainee.department}</Text>
                  </View>
                  <Text style={[styles.tableText, { flex: 1 }]}>
                    {trainee.assessments_in_period}
                  </Text>
                  <Text style={[
                    styles.tableText, 
                    { flex: 1, color: getMetricColor(trainee.average_competency_level, 'level') }
                  ]}>
                    {trainee.average_competency_level.toFixed(1)}
                  </Text>
                  <View style={[styles.statusBadge, { 
                    backgroundColor: trainee.is_active ? '#dcfce7' : '#fef2f2',
                    flex: 1
                  }]}>
                    <Text style={[styles.statusText, {
                      color: trainee.is_active ? '#166534' : '#991b1b'
                    }]}>
                      {trainee.is_active ? 'Active' : 'Inactive'}
                    </Text>
                  </View>
                </View>
              ))}
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
                  <View style={styles.trendsBars}>
                    {dashboardData.trends.monthly_assessments.map((trend, index) => (
                      <View key={index} style={styles.trendsBar}>
                        <View 
                          style={[
                            styles.trendsBarFill, 
                            { 
                              height: `${Math.min(Math.max((trend.assessments / Math.max(...dashboardData.trends.monthly_assessments.map(t => t.assessments))) * 85, 8), 85)}%`,
                              backgroundColor: '#3B82F6'
                            }
                          ]} 
                        />
                        <Text style={styles.trendsBarLabel}>{trend.month}</Text>
                        <Text style={styles.trendsBarValue}>{trend.assessments}</Text>
                      </View>
                    ))}
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
                  <View style={styles.trendsBars}>
                    {dashboardData.trends.monthly_entrustment.map((trend, index) => {
                      const maxLevel = 5; // EPA levels typically go from 1-5
                      const heightPercent = Math.min(Math.max((trend.average_entrustment / maxLevel) * 85, 8), 85);
                      return (
                        <View key={index} style={styles.trendsBar}>
                          <View 
                            style={[
                              styles.trendsBarFill, 
                              { 
                                height: `${heightPercent}%`,
                                backgroundColor: getMetricColor(trend.average_entrustment, 'level')
                              }
                            ]} 
                          />
                          <Text style={styles.trendsBarLabel}>{trend.month}</Text>
                          <Text style={styles.trendsBarValue}>{trend.average_entrustment.toFixed(1)}</Text>
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
  },
  controlGroup: {
    flex: 1,
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
  trendsBars: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: 120,
    marginHorizontal: 8,
  },
  trendsBar: {
    alignItems: 'center',
    flex: 1,
    height: '100%',
    justifyContent: 'flex-end',
    marginHorizontal: 2,
  },
  trendsBarFill: {
    width: 28,
    borderRadius: 4,
    marginBottom: 8,
    minHeight: 6,
  },
  trendsBarLabel: {
    fontSize: 10,
    color: '#64748B',
    marginBottom: 2,
    textAlign: 'center',
  },
  trendsBarValue: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#1E293B',
    textAlign: 'center',
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
});

export default ProgramPerformanceDashboard;