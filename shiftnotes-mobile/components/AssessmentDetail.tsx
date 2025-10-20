/**
 * Assessment Detail component for EPAnotes Mobile
 * Shows detailed view of a single assessment with EPAs and comments
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Dimensions,
  Alert,
  Platform,
} from 'react-native';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Button } from './ui/Button';
import { apiClient, ApiAssessment } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

const { width } = Dimensions.get('window');
const isTablet = width > 768;

interface AssessmentDetailProps {
  assessmentId: string;
  onBack: () => void;
}

interface Assessment extends ApiAssessment {
  epas: Array<{
    code: string;
    title: string;
    level: number;
  }>;
}

export function AssessmentDetail({ assessmentId, onBack }: AssessmentDetailProps) {
  const { user } = useAuth();
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadAssessmentDetail();
  }, [assessmentId]);

  const loadAssessmentDetail = async () => {
    try {
      setLoading(true);
      // Get the specific assessment by ID - much more efficient!
      const foundAssessment = await apiClient.getAssessment(assessmentId);
      console.log('Fetched assessment detail:', foundAssessment);
      
      // Transform API data to match our interface
      const transformedAssessment: Assessment = {
        ...foundAssessment,
        epas: foundAssessment.assessment_epas?.map(epa => ({
          code: epa.epa_code || 'Unknown EPA',
          title: epa.epa_title || 'Unknown Title',
          level: epa.entrustment_level || 1,
          entrustment_level_description: epa.entrustment_level_description || '',
        })) || [],
      };
      
      setAssessment(transformedAssessment);
    } catch (error) {
      console.error('Error loading assessment detail:', error);
      Alert.alert('Error', 'Failed to load assessment details');
      onBack();
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (Platform.OS === 'web') {
      // Web platform - use window.confirm
      const confirmed = window.confirm(
        'Are you sure you want to delete this assessment? This action cannot be undone.'
      );
      
      if (!confirmed) return;
      
      try {
        setDeleting(true);
        await apiClient.deleteAssessment(assessmentId);
        alert('Assessment deleted successfully');
        onBack();
      } catch (error: any) {
        console.error('Error deleting assessment:', error);
        const errorMessage = error.response?.data?.detail || 'Failed to delete assessment. Please try again.';
        alert(errorMessage);
      } finally {
        setDeleting(false);
      }
    } else {
      // Mobile platform - use Alert.alert
      Alert.alert(
        'Delete Assessment',
        'Are you sure you want to delete this assessment? This action cannot be undone.',
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              try {
                setDeleting(true);
                await apiClient.deleteAssessment(assessmentId);
                Alert.alert('Success', 'Assessment deleted successfully');
                onBack();
              } catch (error: any) {
                console.error('Error deleting assessment:', error);
                const errorMessage = error.response?.data?.detail || 'Failed to delete assessment. Please try again.';
                Alert.alert('Error', errorMessage);
              } finally {
                setDeleting(false);
              }
            },
          },
        ]
      );
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

  const getEntrustmentLevelColor = (level: number) => {
    if (level === 1) return '#f97316'; // Orange
    if (level <= 3) return '#f59e0b'; // Yellow
    return '#3b82f6'; // Blue
  };

  const getEntrustmentLevelText = (epa: any) => {
    // Use the EPA-specific entrustment level description from the backend
    // This comes from the SubCompetency milestone level descriptions
    return epa.entrustment_level_description || 'Unknown level';
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.pageTitle}>Loading Assessment...</Text>
        </View>
        <ScrollView style={styles.scrollView}>
          <Card style={styles.loadingCard}>
            <CardContent>
              <Text style={styles.loadingText}>Loading assessment details...</Text>
            </CardContent>
          </Card>
        </ScrollView>
      </View>
    );
  }

  if (!assessment) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.pageTitle}>Assessment Not Found</Text>
        </View>
        <ScrollView style={styles.scrollView}>
          <Card style={styles.errorCard}>
            <CardContent>
              <Text style={styles.errorText}>This assessment could not be found.</Text>
              <Button title="Go Back" onPress={onBack} style={styles.backButton} />
            </CardContent>
          </Card>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Button
            title="← Back"
            onPress={onBack}
            variant="outline"
            size="sm"
            style={styles.backButton}
          />
          <Text style={styles.pageTitle}>Assessment Details</Text>
          {assessment.can_delete && (
            <Button
              title="Delete"
              onPress={handleDelete}
              variant="outline"
              size="sm"
              loading={deleting}
              disabled={deleting}
              style={styles.deleteButton}
            />
          )}
        </View>
        <Text style={styles.pageSubtitle}>
          {user?.role === 'trainee' 
            ? `Assessment by ${assessment.evaluator_name || 'Unknown Evaluator'}`
            : `Assessment for ${assessment.trainee_name || 'Unknown Trainee'}`
          }
        </Text>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Assessment Overview */}
        <Card style={styles.overviewCard}>
          <CardHeader>
            <View style={styles.cardHeaderWithIcon}>
              <Text style={styles.cardIcon}>📋</Text>
              <View style={styles.cardTitleContainer}>
                <CardTitle>Assessment Overview</CardTitle>
                <Text style={styles.cardSubtitle}>
                  {new Date(assessment.shift_date).toLocaleDateString()} • {assessment.location}
                </Text>
              </View>
            </View>
          </CardHeader>
          <CardContent>
            <View style={styles.overviewDetails}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Status:</Text>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: getStatusColor(assessment.status) },
                  ]}
                >
                  <Text style={styles.statusText}>{getStatusLabel(assessment.status)}</Text>
                </View>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Shift Date:</Text>
                <Text style={styles.detailValue}>
                  {new Date(assessment.shift_date).toLocaleDateString()}
                </Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Location:</Text>
                <Text style={styles.detailValue}>{assessment.location}</Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Evaluator:</Text>
                <Text style={styles.detailValue}>{assessment.evaluator_name || 'Unknown Evaluator'}</Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Trainee:</Text>
                <Text style={styles.detailValue}>{assessment.trainee_name || 'Unknown Trainee'}</Text>
              </View>
            </View>
          </CardContent>
        </Card>

        {/* EPAs Assessed */}
        <Card style={styles.epasCard}>
          <CardHeader>
            <View style={styles.cardHeaderWithIcon}>
              <Text style={styles.cardIcon}>🎯</Text>
              <View style={styles.cardTitleContainer}>
                <CardTitle>EPAs Assessed ({assessment.epas.length})</CardTitle>
                <Text style={styles.cardSubtitle}>
                  Entrustment levels and feedback
                </Text>
              </View>
            </View>
          </CardHeader>
          <CardContent>
            <View style={styles.epasList}>
              {assessment.epas.map((epa, index) => (
                <View key={index} style={styles.epaCard}>
                  <View style={styles.epaHeader}>
                    <Text style={styles.epaCode}>
                      {epa.code}: {epa.title}
                    </Text>
                    <View style={[styles.entrustmentBadge, { backgroundColor: getEntrustmentLevelColor(epa.level) }]}>
                      <Text style={styles.entrustmentLevel}>Level {epa.level}</Text>
                    </View>
                  </View>
                  
                  <Text style={styles.entrustmentDescription}>
                    {getEntrustmentLevelText(epa)}
                  </Text>
                </View>
              ))}
            </View>
          </CardContent>
        </Card>

        {/* Overall Feedback */}
        {(assessment.what_went_well || assessment.what_could_improve) && (
          <Card style={styles.epasCard}>
            <CardHeader>
              <View style={styles.cardHeaderWithIcon}>
                <Text style={styles.cardIcon}>📝</Text>
                <View style={styles.cardTitleContainer}>
                  <CardTitle>Overall Feedback</CardTitle>
                </View>
              </View>
            </CardHeader>
            <CardContent>
              <View style={styles.feedbackSection}>
                {assessment.what_went_well && (
                  <View style={styles.feedbackItem}>
                    <Text style={styles.feedbackLabel}>What went well:</Text>
                    <Text style={styles.feedbackText}>{assessment.what_went_well}</Text>
                  </View>
                )}
                {assessment.what_could_improve && (
                  <View style={styles.feedbackItem}>
                    <Text style={styles.feedbackLabel}>What could improve:</Text>
                    <Text style={styles.feedbackText}>{assessment.what_could_improve}</Text>
                  </View>
                )}
              </View>
            </CardContent>
          </Card>
        )}

        {/* Private Comments (only for faculty/leadership, NOT trainees) */}
        {user?.role !== 'trainee' && assessment.private_comments && (
          <Card style={styles.commentsCard}>
            <CardHeader>
              <View style={styles.cardHeaderWithIcon}>
                <Text style={styles.cardIcon}>💬</Text>
                <View style={styles.cardTitleContainer}>
                  <CardTitle>Private Comments</CardTitle>
                  <Text style={styles.cardSubtitle}>
                    Internal notes and additional feedback
                  </Text>
                </View>
              </View>
            </CardHeader>
            <CardContent>
              <Text style={styles.commentsText}>{assessment.private_comments}</Text>
            </CardContent>
          </Card>
        )}

        {/* Assessment Summary */}
        <Card style={styles.summaryCard}>
          <CardHeader>
            <View style={styles.cardHeaderWithIcon}>
              <Text style={styles.cardIcon}>📊</Text>
              <View style={styles.cardTitleContainer}>
                <CardTitle>Assessment Summary</CardTitle>
                <Text style={styles.cardSubtitle}>
                  Overall performance metrics
                </Text>
              </View>
            </View>
          </CardHeader>
          <CardContent>
            <View style={styles.summaryStats}>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Total EPAs</Text>
                <Text style={styles.statValue}>{assessment.epas.length}</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Average Entrustment</Text>
                <Text style={styles.statValue}>
                  {assessment.average_entrustment ? assessment.average_entrustment.toFixed(1) : 'N/A'}
                </Text>
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
    backgroundColor: '#ffffff',
    paddingHorizontal: isTablet ? 24 : 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  backButton: {
    marginRight: 12,
  },
  deleteButton: {
    marginLeft: 'auto',
    backgroundColor: '#fee2e2',
    borderColor: '#ef4444',
  },
  pageTitle: {
    fontSize: isTablet ? 24 : 20,
    fontWeight: '700',
    color: '#1e293b',
    flex: 1,
  },
  pageSubtitle: {
    fontSize: isTablet ? 16 : 14,
    color: '#64748b',
    lineHeight: isTablet ? 24 : 20,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: isTablet ? 24 : 16,
    paddingTop: 16,
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
  errorCard: {
    marginBottom: 16,
  },
  errorText: {
    fontSize: 16,
    color: '#ef4444',
    textAlign: 'center',
    marginBottom: 16,
  },
  overviewCard: {
    marginBottom: 16,
  },
  cardHeaderWithIcon: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  cardIcon: {
    fontSize: 20,
    marginRight: 12,
    marginTop: 2,
  },
  cardTitleContainer: {
    flex: 1,
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
    lineHeight: 20,
  },
  overviewDetails: {
    gap: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  detailValue: {
    fontSize: 14,
    color: '#6b7280',
    flex: 1,
    textAlign: 'right',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
  },
  epasCard: {
    marginBottom: 16,
  },
  epasList: {
    gap: 16,
  },
  epaCard: {
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  epaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  epaCode: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    flex: 1,
  },
  entrustmentBadge: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  entrustmentLevel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
  },
  entrustmentDescription: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 12,
    fontStyle: 'italic',
  },
  feedbackSection: {
    gap: 12,
  },
  feedbackItem: {
    gap: 4,
  },
  feedbackLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  feedbackText: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  commentsCard: {
    marginBottom: 16,
  },
  commentsText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  summaryCard: {
    marginBottom: 16,
  },
  summaryStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#e2e8f0',
  },
});
