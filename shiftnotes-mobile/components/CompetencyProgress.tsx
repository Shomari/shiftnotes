import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Card, CardHeader, CardTitle, CardContent } from './ui/Card';
import { apiClient } from '../lib/api';

interface SubCompetency {
  id: string;
  title: string;
  avg_entrustment_level: number | null;
  assessment_count: number;
  epas_count: number;
}

interface Competency {
  id: string;
  title: string;
  avg_entrustment_level: number | null;
  subcompetencies: SubCompetency[];
  total_assessments: number;
}

interface CompetencyProgressData {
  trainee: {
    id: string;
    name: string;
    program: string;
  };
  competencies: Competency[];
  summary: {
    overall_avg_entrustment: number | null;
    total_assessments: number;
    competencies_assessed: number;
    total_competencies: number;
    recent_avg_entrustment: number | null;
  };
}

export function CompetencyProgress() {
  const [progressData, setProgressData] = useState<CompetencyProgressData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadProgressData = async () => {
    try {
      const data = await apiClient.getCompetencyProgress();
      setProgressData(data);
    } catch (error) {
      console.error('Failed to load competency progress:', error);
      Alert.alert('Error', 'Failed to load competency progress data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadProgressData();
  };

  useEffect(() => {
    loadProgressData();
  }, []);

  const getEntrustmentLabel = (level: number) => {
    const labels = {
      1: 'Level 1',
      2: 'Level 2', 
      3: 'Level 3',
      4: 'Level 4',
      5: 'Level 5',
    };
    return labels[Math.round(level) as keyof typeof labels] || `Level ${Math.round(level)}`;
  };

  const getEntrustmentColor = (level: number | null) => {
    if (!level) return '#e5e7eb';
    if (level >= 4) return '#10b981'; // Green - 4 and up
    if (level >= 2) return '#f59e0b'; // Orange - 2-3
    return '#ef4444'; // Red - below 2
  };


  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading competency progress...</Text>
      </View>
    );
  }

  if (!progressData) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>No competency data available</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>📈 Competency Progress</Text>
          <Text style={styles.subtitle}>
            Track your average entrustment levels across competencies
          </Text>
        </View>

        {/* Summary Card */}
        <Card style={styles.summaryCard}>
          <CardHeader>
            <CardTitle style={styles.cardTitle}>Progress Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <View style={styles.summaryGrid}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryNumber}>
                  {progressData.summary.overall_avg_entrustment?.toFixed(1) || 'N/A'}
                </Text>
                <Text style={styles.summaryLabel}>Overall Average</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryNumber}>
                  {progressData.summary.recent_avg_entrustment?.toFixed(1) || 'N/A'}
                </Text>
                <Text style={styles.summaryLabel}>Recent (3 months)</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryNumber}>
                  {progressData.summary.total_assessments}
                </Text>
                <Text style={styles.summaryLabel}>Total Assessments</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryNumber}>
                  {progressData.summary.competencies_assessed}/{progressData.summary.total_competencies}
                </Text>
                <Text style={styles.summaryLabel}>Competencies Assessed</Text>
              </View>
            </View>
          </CardContent>
        </Card>

        {/* Competencies */}
        {progressData.competencies.map((competency) => (
          <Card key={competency.id} style={styles.competencyCard}>
            <CardHeader>
              <View style={styles.competencyHeader}>
                <CardTitle style={styles.competencyTitle}>
                  {competency.title}
                </CardTitle>
                <View style={styles.competencyScore}>
                  {competency.avg_entrustment_level ? (
                    <>
                      <Text style={[
                        styles.scoreText,
                        { color: getEntrustmentColor(competency.avg_entrustment_level) }
                      ]}>
                        {competency.avg_entrustment_level.toFixed(1)}
                      </Text>
                      <Text style={styles.scoreLevelText}>
                        {getEntrustmentLabel(competency.avg_entrustment_level)}
                      </Text>
                    </>
                  ) : (
                    <Text style={styles.noDataText}>No Data</Text>
                  )}
                </View>
              </View>
            </CardHeader>
            
            <CardContent>
              <View style={styles.competencyMeta}>
                <Text style={styles.metaText}>
                  {competency.total_assessments} assessments across {competency.subcompetencies.length} sub-competencies
                </Text>
              </View>

              {/* Sub-competencies */}
              <View style={styles.subcompetenciesContainer}>
                <Text style={styles.subcompetenciesTitle}>Sub-competencies:</Text>
                {competency.subcompetencies.map((subcompetency) => (
                  <View key={subcompetency.id} style={styles.subcompetencyRow}>
                    <View style={styles.subcompetencyInfo}>
                      <Text style={styles.subcompetencyTitle}>{subcompetency.title}</Text>
                      <Text style={styles.subcompetencyMeta}>
                        {subcompetency.assessment_count} assessments • {subcompetency.epas_count} EPAs
                      </Text>
                    </View>
                    <View style={styles.subcompetencyScore}>
                      {subcompetency.avg_entrustment_level ? (
                        <>
                          <View style={[
                            styles.subcompetencyBadge,
                            { backgroundColor: getEntrustmentColor(subcompetency.avg_entrustment_level) }
                          ]}>
                            <Text style={styles.badgeText}>
                              {subcompetency.avg_entrustment_level.toFixed(1)}
                            </Text>
                          </View>
                        </>
                      ) : (
                        <View style={[styles.subcompetencyBadge, styles.noDataBadge]}>
                          <Text style={styles.noDataBadgeText}>-</Text>
                        </View>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            </CardContent>
          </Card>
        ))}

      </ScrollView>
    </View>
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
    backgroundColor: '#f9fafb',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  errorText: {
    fontSize: 18,
    color: '#6b7280',
  },
  header: {
    padding: 20,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  summaryCard: {
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  summaryItem: {
    width: '48%',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    marginBottom: 8,
  },
  summaryNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
  competencyCard: {
    marginBottom: 16,
  },
  competencyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  competencyTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  competencyScore: {
    alignItems: 'flex-end',
    marginLeft: 12,
  },
  scoreText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  scoreLevelText: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  noDataText: {
    fontSize: 14,
    color: '#9ca3af',
    fontStyle: 'italic',
  },
  competencyMeta: {
    marginBottom: 16,
  },
  metaText: {
    fontSize: 14,
    color: '#6b7280',
  },
  subcompetenciesContainer: {
    marginTop: 8,
  },
  subcompetenciesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  subcompetencyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  subcompetencyInfo: {
    flex: 1,
  },
  subcompetencyTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  subcompetencyMeta: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  subcompetencyScore: {
    marginLeft: 12,
  },
  subcompetencyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 32,
    alignItems: 'center',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
  },
  noDataBadge: {
    backgroundColor: '#e5e7eb',
  },
  noDataBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
  },
});
