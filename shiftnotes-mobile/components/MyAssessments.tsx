/**
 * My Assessments component for ShiftNotes Mobile
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
} from 'react-native';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Button } from './ui/Button';
import { Select } from './ui/Select';
import { apiClient, ApiAssessment } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

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
}

export function MyAssessments({ onViewAssessment }: MyAssessmentsProps) {
  const { user } = useAuth();
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
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

  const filteredAssessments = assessments.filter((assessment) => {
    // For trainees, search by evaluator name; for others, search by trainee name
    const searchField = user?.role === 'trainee' ? assessment.evaluator_name : assessment.trainee_name;
    const matchesSearch = searchField
      .toLowerCase()
      .includes(searchText.toLowerCase());
    const matchesStatus = !statusFilter || assessment.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'submitted':
        return '#3b82f6';
      case 'draft':
        return '#f59e0b';
      case 'locked':
        return '#10b981';
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
      case 'locked':
        return 'Locked';
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
          <CardHeader>
            <View style={styles.filtersHeader}>
              <Text style={styles.filtersIcon}>🔍</Text>
              <CardTitle>Filters</CardTitle>
            </View>
          </CardHeader>
          <CardContent>
            <View style={styles.filtersContainer}>
              {/* Search */}
              <View style={styles.filterField}>
                <Text style={styles.filterLabel}>Search</Text>
                <TextInput
                  style={styles.searchInput}
                  placeholder={user?.role === 'trainee' ? "Search by evaluator or EPA..." : "Search by trainee or EPA..."}
                  value={searchText}
                  onChangeText={setSearchText}
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
                    { label: 'Submitted', value: 'Submitted' },
                    { label: 'Draft', value: 'Draft' },
                    { label: 'Locked', value: 'Locked' },
                  ]}
                />
              </View>

              {/* Date Filters */}
              <View style={styles.filterField}>
                <Text style={styles.filterLabel}>Start Date</Text>
                <TextInput
                  style={styles.dateInput}
                  placeholder="mm/dd/yyyy"
                  value={startDate}
                  onChangeText={setStartDate}
                />
              </View>

              <View style={styles.filterField}>
                <Text style={styles.filterLabel}>End Date</Text>
                <TextInput
                  style={styles.dateInput}
                  placeholder="mm/dd/yyyy"
                  value={endDate}
                  onChangeText={setEndDate}
                />
              </View>

              {/* Results Count */}
              <View style={styles.filterField}>
                <Text style={styles.filterLabel}>Results</Text>
                <View style={styles.resultsCount}>
                  <Text style={styles.resultsText}>
                    {filteredAssessments.length} assessments
                  </Text>
                </View>
              </View>
            </View>
          </CardContent>
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
                  <Button
                    title="View"
                    onPress={() => onViewAssessment?.(assessment.id!)}
                    variant="outline"
                    size="sm"
                    icon="👁️"
                  />
                </View>

                {/* Assessment Details */}
                <View style={styles.assessmentDetails}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailIcon}>📅</Text>
                    <Text style={styles.detailText}>{new Date(assessment.shift_date).toLocaleDateString()}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailIcon}>📍</Text>
                    <Text style={styles.detailText}>{assessment.location}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailIcon}>🕒</Text>
                    <Text style={styles.detailText}>{assessment.updatedAt}</Text>
                  </View>
                </View>

                {/* EPAs Assessed */}
                <View style={styles.epasSection}>
                  <Text style={styles.epasTitle}>
                    EPAs Assessed ({assessment.epas.length})
                  </Text>
                  <View style={styles.epasList}>
                    {assessment.epas.map((epa, index) => (
                      <View key={index} style={styles.epaBadge}>
                        <Text style={styles.epaText}>
                          {epa.code} - Level {epa.level}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>

                {/* Average Entrustment */}
                <View style={styles.entrustmentSection}>
                  <Text style={styles.entrustmentLabel}>Average Entrustment:</Text>
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
  },
  filtersHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  filtersIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  filtersContainer: {
    gap: 16,
  },
  filterField: {
    gap: 8,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    backgroundColor: '#ffffff',
    minHeight: 40,
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



