/**
 * Trainee Performance component for EPAnotes Mobile
 * Shows trainee performance data with cohort filtering and sortable columns
 * Styled to match Program Performance Dashboard
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Dimensions,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Select } from './ui/Select';
import { Button } from './ui/Button';
import { apiClient } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

const { width } = Dimensions.get('window');
const isTablet = width > 768;

interface TraineePerformanceData {
  id: string;
  name: string;
  cohort_id: string | null;
  cohort_name: string;
  total_assessments: number;
  lifetime_assessments: number;
  avg_entrustment_level: number | null;
  latest_assessment_date: string | null;
  has_assessments: boolean;
}

interface CohortOption {
  id: string;
  name: string;
  trainee_count: number;
}

type SortField = 'name' | 'assessments' | 'avg_level' | 'cohort' | 'latest_assessment';
type SortOrder = 'asc' | 'desc';

export function TraineePerformance() {
  const { user } = useAuth();
  const [trainees, setTrainees] = useState<TraineePerformanceData[]>([]);
  const [cohorts, setCohorts] = useState<CohortOption[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [selectedCohort, setSelectedCohort] = useState<string>('');
  const [selectedTimeframe, setSelectedTimeframe] = useState<number>(6); // Default to 6 months
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  
  // Sorting
  const [sortBy, setSortBy] = useState<SortField>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  
  // Summary data
  const [summary, setSummary] = useState<any>(null);

  useEffect(() => {
    loadTraineePerformanceData();
  }, [selectedCohort, selectedTimeframe, sortBy, sortOrder]);

  const timeframeOptions = [
    { value: '3', label: '3 Months' },
    { value: '6', label: '6 Months' },
    { value: '9', label: '9 Months' },
    { value: '12', label: '12 Months' },
    { value: '18', label: '18 Months' },
    { value: '24', label: '24 Months' },
  ];

  const loadTraineePerformanceData = async () => {
    try {
      setLoading(true);
      const data = await apiClient.getTraineePerformanceData(
        selectedCohort || undefined,
        selectedTimeframe.toString(),
        sortBy,
        sortOrder
      );
      
      setTrainees(data.trainees || []);
      setCohorts(data.cohorts || []);
      setSummary(data.summary || {});
    } catch (error) {
      console.error('Error loading trainee performance data:', error);
      Alert.alert('Error', 'Failed to load trainee performance data');
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (field: SortField) => {
    if (sortBy === field) {
      // Toggle sort order if clicking the same column
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // New column, default to ascending
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const clearFilters = () => {
    setSelectedCohort('');
    setSelectedTimeframe(6); // Reset to default 6 months
  };

  const toggleFilters = () => {
    setFiltersExpanded(!filtersExpanded);
  };

  const getSortIcon = (field: SortField) => {
    if (sortBy !== field) return '▼';
    return sortOrder === 'asc' ? '▲' : '▼';
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString();
  };

  // Exact copy of getMetricColor from Program Performance
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

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Loading trainee performance data...</Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Trainee Performance</Text>
        <Text style={styles.subtitle}>Performance metrics and assessment data for all trainees</Text>
      </View>

      {/* Filters */}
      <Card style={styles.filtersCard}>
        <CardHeader style={styles.filtersHeader}>
          <Pressable onPress={toggleFilters} style={styles.filtersToggle}>
            <View style={styles.filtersToggleContent}>
              <Text style={styles.filtersIcon}>🔍</Text>
              <Text style={styles.filtersTitle}>Filters</Text>
              <View style={styles.filtersToggleSpacer} />
              <Text style={styles.filtersToggleHint}>Click to {filtersExpanded ? 'collapse' : 'expand'}</Text>
              <Text style={styles.expandIcon}>{filtersExpanded ? '▲' : '▼'}</Text>
            </View>
          </Pressable>
        </CardHeader>
        {filtersExpanded && (
          <CardContent>
            <View style={styles.filtersContent}>
              <View style={styles.filterRow}>
                <View style={styles.filterField}>
                  <Text style={styles.filterLabel}>Time Period</Text>
                  <Select
                    value={selectedTimeframe.toString()}
                    onValueChange={(value) => setSelectedTimeframe(parseInt(value))}
                    placeholder="6 Months"
                    options={timeframeOptions}
                  />
                </View>
                <View style={styles.filterField}>
                  <Text style={styles.filterLabel}>Cohort</Text>
                  <Select
                    value={selectedCohort}
                    onValueChange={setSelectedCohort}
                    placeholder="All Cohorts"
                    options={[
                      { value: '', label: 'All Cohorts' },
                      ...cohorts.map(cohort => ({
                        value: cohort.id,
                        label: `${cohort.name} (${cohort.trainee_count} trainees)`
                      }))
                    ]}
                  />
                </View>
                <View style={styles.filterActions}>
                  <Button
                    title="Clear Filters"
                    onPress={clearFilters}
                    variant="outline"
                    size="sm"
                  />
                </View>
              </View>
            </View>
          </CardContent>
        )}
      </Card>

      {/* Main Content */}
      <View style={styles.mainContent}>
        {/* Summary Metrics */}
        {summary && (
          <View style={styles.metricsGrid}>
            <Card style={styles.metricCard}>
              <CardContent>
                <Text style={styles.metricValue}>{summary.total_trainees}</Text>
                <Text style={styles.metricLabel}>Total Trainees</Text>
              </CardContent>
            </Card>
            <Card style={styles.metricCard}>
              <CardContent>
                <Text style={styles.metricValue}>{summary.total_assessments}</Text>
                <Text style={styles.metricLabel}>Assessments</Text>
              </CardContent>
            </Card>
            <Card style={styles.metricCard}>
              <CardContent>
                <Text style={styles.metricValue}>{summary.average_assessments_per_trainee}</Text>
                <Text style={styles.metricLabel}>Avg Assessments</Text>
              </CardContent>
            </Card>
            <Card style={styles.metricCard}>
              <CardContent>
                <Text style={[styles.metricValue, { color: getMetricColor(summary.overall_avg_entrustment, 'level') }]}>
                  {summary.overall_avg_entrustment ? summary.overall_avg_entrustment.toFixed(1) : 'N/A'}
                </Text>
                <Text style={styles.metricLabel}>Avg Level</Text>
              </CardContent>
            </Card>
          </View>
        )}

        {/* Trainee Performance Table - Exact copy of Program Performance styling */}
        <Card style={styles.tableCard}>
          <CardHeader>
            <CardTitle>Trainee Performance</CardTitle>
          </CardHeader>
          
          <CardContent>
            <View style={styles.tableHeader}>
              <Pressable style={{ flex: 2 }} onPress={() => handleSort('name')}>
                <Text style={styles.tableHeaderText}>Name {getSortIcon('name')}</Text>
              </Pressable>
              <Pressable style={{ flex: 1 }} onPress={() => handleSort('cohort')}>
                <Text style={styles.tableHeaderText}>Cohort {getSortIcon('cohort')}</Text>
              </Pressable>
              <Pressable style={{ flex: 1 }} onPress={() => handleSort('assessments')}>
                <Text style={styles.tableHeaderText}>Assessments {getSortIcon('assessments')}</Text>
              </Pressable>
              <Pressable style={{ flex: 1 }} onPress={() => handleSort('avg_level')}>
                <Text style={styles.tableHeaderText}>Avg Level {getSortIcon('avg_level')}</Text>
              </Pressable>
            </View>
            
            {trainees.map((trainee, index) => (
              <View key={trainee.id} style={styles.tableRow}>
                <View style={{ flex: 2 }}>
                  <Text style={styles.traineeNameText}>{trainee.name}</Text>
                </View>
                <Text style={[styles.tableText, { flex: 1 }]}>
                  {trainee.cohort_name}
                </Text>
                <Text style={[styles.tableText, { flex: 1 }]}>
                  {trainee.total_assessments}
                </Text>
                <Text style={[
                  styles.tableText, 
                  { flex: 1, color: getMetricColor(trainee.avg_entrustment_level, 'level') }
                ]}>
                  {trainee.avg_entrustment_level ? trainee.avg_entrustment_level.toFixed(1) : 'N/A'}
                </Text>
              </View>
            ))}
          </CardContent>
        </Card>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#64748b',
  },
  
  // Header
  header: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
  },
  
  // Filters (matching Program Performance)
  filtersCard: {
    margin: 16,
    marginBottom: 8,
    backgroundColor: '#ffffff',
  },
  filtersHeader: {
    margin: 0,
    marginBottom: 0,
    padding: 0,
  },
  filtersToggle: {
    padding: 0,
    margin: 0,
    justifyContent: 'center',
  },
  filtersToggleContent: {
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
  filtersToggleSpacer: {
    flex: 1,
  },
  filtersToggleHint: {
    fontSize: 12,
    color: '#6b7280',
    fontStyle: 'italic',
    marginRight: 8,
  },
  expandIcon: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '600',
  },
  filtersContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 16,
  },
  filterField: {
    flex: 1,
    minWidth: 200,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 6,
    marginLeft: 2,
  },
  filterActions: {
    marginBottom: 2,
  },
  
  // Main content
  mainContent: {
    padding: 16,
    paddingTop: 8,
  },
  
  // Metrics grid (matching Program Performance)
  metricsGrid: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  metricCard: {
    flex: 1,
    minWidth: 120,
    backgroundColor: '#ffffff',
  },
  metricValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  
  // Table styles - Exact copy from Program Performance
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
  },
  tableText: {
    fontSize: 14,
    color: '#374151',
    textAlign: 'center',
  },
});
