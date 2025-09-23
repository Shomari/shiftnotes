/**
 * Faculty Detail View - Comprehensive analytics for individual faculty member
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Button } from './ui/Button';
import { User } from '../lib/types';
import { apiClient } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

const { width } = Dimensions.get('window');
const isTablet = width > 768;

interface FacultyDetailData {
  faculty: {
    id: string;
    name: string;
    department: string;
    total_assessments: number;
    avg_assessments_per_month: number;
    avg_turnaround_days: number;
    avg_entrustment_level: number;
    active_months: number;
    first_assessment_date: string | null;
    last_assessment_date: string | null;
  };
  monthly_breakdown: Array<{
    month: string;
    assessment_count: number;
    avg_entrustment: number;
  }>;
  competency_breakdown: Array<{
    competency_name: string;
    assessment_count: number;
    avg_entrustment: number;
  }>;
  trainee_breakdown: Array<{
    trainee_name: string;
    assessment_count: number;
    avg_entrustment: number;
    last_assessment_date: string | null;
  }>;
  recent_assessments: Array<{
    id: string;
    trainee_name: string;
    epa_code: string;
    epa_title: string;
    entrustment_level: number;
    shift_date: string;
    created_at: string;
  }>;
}

interface FacultyDetailViewProps {
  facultyId: string;
  onBack: () => void;
}

export function FacultyDetailView({ facultyId, onBack }: FacultyDetailViewProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [facultyData, setFacultyData] = useState<FacultyDetailData | null>(null);

  useEffect(() => {
    loadFacultyData();
  }, [facultyId]);

  const loadFacultyData = async () => {
    try {
      setLoading(true);
      // For now, we'll use the existing faculty dashboard API and filter for this faculty
      const dashboardData = await apiClient.getFacultyDashboard();
      
      // Find the specific faculty member
      const faculty = dashboardData.faculty_stats.find((f: any) => f.faculty_id === facultyId);
      
      if (!faculty) {
        throw new Error('Faculty member not found');
      }

      // Create detailed view data structure
      const detailData: FacultyDetailData = {
        faculty: {
          id: faculty.faculty_id,
          name: faculty.faculty_name,
          department: faculty.department || 'Emergency Medicine',
          total_assessments: faculty.total_assessments,
          avg_assessments_per_month: faculty.avg_assessments_per_month,
          avg_turnaround_days: faculty.avg_turnaround_days,
          avg_entrustment_level: faculty.avg_entrustment_level,
          active_months: faculty.active_months,
          first_assessment_date: faculty.first_assessment_date,
          last_assessment_date: faculty.last_assessment_date,
        },
        monthly_breakdown: faculty.monthly_breakdown || [],
        competency_breakdown: [], // TODO: Add competency breakdown API
        trainee_breakdown: [], // TODO: Add trainee breakdown API
        recent_assessments: [], // TODO: Add recent assessments API
      };

      setFacultyData(detailData);
    } catch (error) {
      console.error('Error loading faculty data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString();
  };

  const getEntrustmentColor = (level: number) => {
    if (level >= 4) return '#059669'; // Green
    if (level >= 3) return '#0891b2'; // Blue
    if (level >= 2) return '#ea580c'; // Orange
    return '#dc2626'; // Red
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Button
            title="← Back"
            onPress={onBack}
            variant="outline"
            style={styles.backButton}
          />
          <Text style={styles.pageTitle}>Faculty Details</Text>
        </View>
        
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Loading faculty data...</Text>
        </View>
      </View>
    );
  }

  if (!facultyData) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Button
            title="← Back"
            onPress={onBack}
            variant="outline"
            style={styles.backButton}
          />
          <Text style={styles.pageTitle}>Faculty Details</Text>
        </View>
        
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Faculty member not found</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Button
            title="← Back"
            onPress={onBack}
            variant="outline"
            style={styles.backButton}
          />
          <Text style={styles.pageTitle}>Faculty Details</Text>
        </View>

        {/* Faculty Overview */}
        <Card style={styles.overviewCard}>
          <CardHeader>
            <CardTitle>{facultyData.faculty.name}</CardTitle>
            <Text style={styles.subtitle}>{facultyData.faculty.department}</Text>
          </CardHeader>
          
          <CardContent>
            <View style={styles.overviewGrid}>
              <View style={styles.overviewItem}>
                <Text style={styles.overviewValue}>{facultyData.faculty.total_assessments}</Text>
                <Text style={styles.overviewLabel}>Total Assessments</Text>
              </View>
              
              <View style={styles.overviewItem}>
                <Text style={styles.overviewValue}>{facultyData.faculty.avg_assessments_per_month.toFixed(1)}</Text>
                <Text style={styles.overviewLabel}>Assessments/Month</Text>
              </View>
              
              <View style={styles.overviewItem}>
                <Text style={styles.overviewValue}>{facultyData.faculty.avg_turnaround_days.toFixed(1)}</Text>
                <Text style={styles.overviewLabel}>Avg Turnaround (days)</Text>
              </View>
              
              <View style={styles.overviewItem}>
                <Text style={[
                  styles.overviewValue,
                  { color: getEntrustmentColor(facultyData.faculty.avg_entrustment_level) }
                ]}>
                  {facultyData.faculty.avg_entrustment_level.toFixed(2)}
                </Text>
                <Text style={styles.overviewLabel}>Avg Entrustment</Text>
              </View>
            </View>
            
            <View style={styles.dateInfo}>
              <Text style={styles.dateText}>
                First Assessment: {formatDate(facultyData.faculty.first_assessment_date)}
              </Text>
              <Text style={styles.dateText}>
                Last Assessment: {formatDate(facultyData.faculty.last_assessment_date)}
              </Text>
              <Text style={styles.dateText}>
                Active for {facultyData.faculty.active_months} months
              </Text>
            </View>
          </CardContent>
        </Card>

        {/* Monthly Activity Chart */}
        {facultyData.monthly_breakdown.length > 0 && (
          <Card style={styles.chartCard}>
            <CardHeader>
              <CardTitle>Monthly Assessment Activity</CardTitle>
              <Text style={styles.subtitle}>Assessment volume and quality over time</Text>
            </CardHeader>
            
            <CardContent>
              <View style={styles.monthlyChart}>
                {facultyData.monthly_breakdown.map((month, index) => {
                  const maxAssessments = Math.max(...facultyData.monthly_breakdown.map(m => m.assessment_count));
                  const heightPercent = maxAssessments > 0 ? (month.assessment_count / maxAssessments) * 100 : 0;
                  const actualHeight = Math.max(heightPercent, month.assessment_count > 0 ? 12 : 0);
                  
                  return (
                    <View key={index} style={styles.monthlyBar}>
                      <Text style={styles.monthlyBarValue}>{month.assessment_count}</Text>
                      <View 
                        style={[
                          styles.monthlyBarFill,
                          { 
                            height: actualHeight,
                            backgroundColor: month.assessment_count > 0 ? '#3b82f6' : '#e5e7eb'
                          }
                        ]} 
                      />
                      <Text style={styles.monthlyBarLabel}>{month.month}</Text>
                      <Text style={styles.monthlyEntrustment}>
                        {month.avg_entrustment ? month.avg_entrustment.toFixed(1) : '-'}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </CardContent>
          </Card>
        )}

        {/* Performance Insights */}
        <Card style={styles.insightsCard}>
          <CardHeader>
            <CardTitle>Performance Insights</CardTitle>
          </CardHeader>
          
          <CardContent>
            <View style={styles.insightsList}>
              <View style={styles.insightItem}>
                <Text style={styles.insightIcon}>📊</Text>
                <View style={styles.insightContent}>
                  <Text style={styles.insightTitle}>Assessment Volume</Text>
                  <Text style={styles.insightText}>
                    {facultyData.faculty.avg_assessments_per_month >= 10 
                      ? 'High assessment volume - active evaluator'
                      : facultyData.faculty.avg_assessments_per_month >= 5
                      ? 'Moderate assessment volume'
                      : 'Lower assessment volume - consider engagement strategies'
                    }
                  </Text>
                </View>
              </View>
              
              <View style={styles.insightItem}>
                <Text style={styles.insightIcon}>⏱️</Text>
                <View style={styles.insightContent}>
                  <Text style={styles.insightTitle}>Turnaround Time</Text>
                  <Text style={styles.insightText}>
                    {facultyData.faculty.avg_turnaround_days <= 2 
                      ? 'Excellent - completes assessments promptly'
                      : facultyData.faculty.avg_turnaround_days <= 4
                      ? 'Good - reasonable completion time'
                      : 'Consider reminder system for timely completion'
                    }
                  </Text>
                </View>
              </View>
              
              <View style={styles.insightItem}>
                <Text style={styles.insightIcon}>🎯</Text>
                <View style={styles.insightContent}>
                  <Text style={styles.insightTitle}>Entrustment Levels</Text>
                  <Text style={styles.insightText}>
                    {facultyData.faculty.avg_entrustment_level >= 3.5 
                      ? 'High standards - promotes advanced competency'
                      : facultyData.faculty.avg_entrustment_level >= 2.5
                      ? 'Balanced approach to resident evaluation'
                      : 'Conservative evaluator - ensures thorough training'
                    }
                  </Text>
                </View>
              </View>
              
              <View style={styles.insightItem}>
                <Text style={styles.insightIcon}>📈</Text>
                <View style={styles.insightContent}>
                  <Text style={styles.insightTitle}>Engagement</Text>
                  <Text style={styles.insightText}>
                    Active for {facultyData.faculty.active_months} months with consistent evaluation patterns
                  </Text>
                </View>
              </View>
            </View>
          </CardContent>
        </Card>
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
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    gap: 16,
  },
  backButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#1e293b',
    flex: 1,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748b',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
  },
  overviewCard: {
    margin: 16,
    marginBottom: 8,
  },
  overviewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    gap: 16,
    marginBottom: 16,
  },
  overviewItem: {
    alignItems: 'center',
    minWidth: 80,
  },
  overviewValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1e293b',
  },
  overviewLabel: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
    textAlign: 'center',
  },
  dateInfo: {
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 8,
    gap: 4,
  },
  dateText: {
    fontSize: 14,
    color: '#64748b',
  },
  chartCard: {
    margin: 16,
    marginBottom: 8,
  },
  monthlyChart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    height: 120,
    paddingHorizontal: 8,
    paddingVertical: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
  },
  monthlyBar: {
    alignItems: 'center',
    minWidth: 40,
    height: '100%',
    justifyContent: 'flex-end',
  },
  monthlyBarFill: {
    width: 32,
    minHeight: 8,
    borderRadius: 4,
    marginVertical: 4,
  },
  monthlyBarLabel: {
    fontSize: 11,
    color: '#6b7280',
    textAlign: 'center',
    fontWeight: '500',
    marginTop: 4,
  },
  monthlyBarValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
    marginBottom: 4,
  },
  monthlyEntrustment: {
    fontSize: 10,
    color: '#3b82f6',
    textAlign: 'center',
    fontWeight: '500',
    marginTop: 2,
  },
  insightsCard: {
    margin: 16,
    marginBottom: 32,
  },
  insightsList: {
    gap: 16,
  },
  insightItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  insightIcon: {
    fontSize: 24,
    width: 32,
    textAlign: 'center',
  },
  insightContent: {
    flex: 1,
  },
  insightTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  insightText: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
  },
});
