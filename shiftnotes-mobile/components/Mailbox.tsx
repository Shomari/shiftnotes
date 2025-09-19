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
import { Button } from './ui/Button';
import { apiClient } from '../lib/api';

interface Assessment {
  id: string;
  trainee_name: string;
  evaluator_name: string;
  shift_date: string;
  private_comments: string;
  is_read_by_current_user: boolean;
  created_at: string;
  assessment_epas: Array<{
    epa_code: string;
    epa_title: string;
    entrustment_level: number;
  }>;
}

interface MailboxData {
  results: Assessment[];
  count: number;
  unread_count: number;
}

export function Mailbox() {
  const [mailboxData, setMailboxData] = useState<MailboxData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadMailboxData = async () => {
    try {
      const data = await apiClient.getMailboxAssessments();
      setMailboxData(data);
    } catch (error) {
      console.error('Failed to load mailbox data:', error);
      Alert.alert('Error', 'Failed to load mailbox data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleMarkAsRead = async (assessmentId: string) => {
    try {
      await apiClient.markAssessmentAsRead(assessmentId);
      
      // Remove the assessment from the list
      setMailboxData(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          results: prev.results.filter(assessment => assessment.id !== assessmentId),
          count: prev.count - 1,
          unread_count: prev.unread_count - 1,
        };
      });

      Alert.alert('Success', 'Assessment marked as read');
    } catch (error) {
      console.error('Failed to mark assessment as read:', error);
      Alert.alert('Error', 'Failed to mark assessment as read');
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadMailboxData();
  };

  useEffect(() => {
    loadMailboxData();
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getEntrustmentLabel = (level: number) => {
    const labels = {
      1: 'Level 1 - Requires constant supervision',
      2: 'Level 2 - Requires considerable supervision',
      3: 'Level 3 - Requires minimal supervision',
      4: 'Level 4 - Requires indirect supervision',
      5: 'Level 5 - No supervision required',
    };
    return labels[level as keyof typeof labels] || `Level ${level}`;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading mailbox...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>📬 Leadership Mailbox</Text>
        <Text style={styles.subtitle}>
          Assessments with private comments ({mailboxData?.unread_count || 0} unread)
        </Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {mailboxData?.results.length === 0 ? (
          <Card style={styles.emptyCard}>
            <CardContent>
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>📭</Text>
                <Text style={styles.emptyTitle}>No Unread Messages</Text>
                <Text style={styles.emptySubtitle}>
                  All assessments with private comments have been reviewed
                </Text>
              </View>
            </CardContent>
          </Card>
        ) : (
          mailboxData?.results.map((assessment) => (
            <Card key={assessment.id} style={styles.assessmentCard}>
              <CardHeader>
                <View style={styles.cardHeader}>
                  <View style={styles.headerLeft}>
                    <CardTitle style={styles.cardTitle}>
                      Assessment: {assessment.trainee_name}
                    </CardTitle>
                    <Text style={styles.evaluatorText}>
                      By {assessment.evaluator_name} • {formatDate(assessment.shift_date)}
                    </Text>
                  </View>
                  <View style={styles.headerRight}>
                    <View style={styles.unreadIndicator} />
                  </View>
                </View>
              </CardHeader>
              
              <CardContent>
                {/* EPA Information */}
                {assessment.assessment_epas.length > 0 && (
                  <View style={styles.epaSection}>
                    <Text style={styles.sectionLabel}>EPA Assessed:</Text>
                    {assessment.assessment_epas.map((epa, index) => (
                      <View key={index} style={styles.epaItem}>
                        <Text style={styles.epaCode}>{epa.epa_code}</Text>
                        <Text style={styles.epaTitle}>{epa.epa_title}</Text>
                        <Text style={styles.entrustmentLevel}>
                          {getEntrustmentLabel(epa.entrustment_level)}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Private Comments */}
                <View style={styles.commentsSection}>
                  <Text style={styles.sectionLabel}>Private Comments:</Text>
                  <View style={styles.commentsBox}>
                    <Text style={styles.commentsText}>
                      {assessment.private_comments}
                    </Text>
                  </View>
                </View>

                {/* Action Button */}
                <View style={styles.actionSection}>
                  <Button
                    title="Mark as Read"
                    onPress={() => handleMarkAsRead(assessment.id)}
                    style={styles.markReadButton}
                  />
                </View>
              </CardContent>
            </Card>
          ))
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
  emptyCard: {
    marginTop: 40,
  },
  emptyState: {
    alignItems: 'center',
    padding: 32,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  assessmentCard: {
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    marginLeft: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  evaluatorText: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  unreadIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ef4444',
  },
  epaSection: {
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  epaItem: {
    backgroundColor: '#f3f4f6',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  epaCode: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  epaTitle: {
    fontSize: 14,
    color: '#374151',
    marginTop: 2,
  },
  entrustmentLevel: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 4,
  },
  commentsSection: {
    marginBottom: 20,
  },
  commentsBox: {
    backgroundColor: '#fef3c7',
    borderWidth: 1,
    borderColor: '#f59e0b',
    borderRadius: 8,
    padding: 12,
  },
  commentsText: {
    fontSize: 14,
    color: '#92400e',
    lineHeight: 20,
  },
  actionSection: {
    alignItems: 'flex-end',
  },
  markReadButton: {
    paddingHorizontal: 20,
  },
});
