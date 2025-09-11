/**
 * Overview/Dashboard component for ShiftNotes Mobile
 * Matches the web version design with responsive layout
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
} from 'react-native';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Button } from './ui/Button';
import { apiClient, ApiAssessment } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

const { width } = Dimensions.get('window');
const isTablet = width > 768;

interface OverviewProps {
  onNewAssessment: () => void;
  userInfo?: {
    name: string;
    role: string;
  };
  user?: any; // User object from AuthContext
}

export function Overview({ onNewAssessment, userInfo, user: userProp }: OverviewProps) {
  const { user: authUser } = useAuth();
  const user = userProp || authUser;
  const [assessments, setAssessments] = useState<ApiAssessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    thisMonth: 0,
    total: 0,
    recentActivity: [] as ApiAssessment[],
  });

  // Fetch data on component mount
  useEffect(() => {
    loadOverviewData();
  }, []);

  const loadOverviewData = async () => {
    try {
      setLoading(true);
      
      // Admin users don't fetch assessment data
      if (user?.role === 'admin' || user?.role === 'system-admin') {
        setStats({
          thisMonth: 0,
          total: 0,
          recentActivity: [],
        });
        setAssessments([]);
        return;
      }
      
      // Use different API endpoint based on user role
      const response = user?.role === 'trainee' 
        ? await apiClient.getReceivedAssessments()
        : await apiClient.getMyAssessments();
      
      console.log('Fetched overview assessments:', response);
      
      const allAssessments = response.results || [];
      setAssessments(allAssessments);
      
      // Calculate stats
      const now = new Date();
      const thisMonth = allAssessments.filter(assessment => {
        const assessmentDate = new Date(assessment.shift_date);
        return assessmentDate.getMonth() === now.getMonth() && 
               assessmentDate.getFullYear() === now.getFullYear();
      }).length;
      
      const recentActivity = allAssessments
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 3);
      
      setStats({
        thisMonth,
        total: allAssessments.length,
        recentActivity,
      });
    } catch (error) {
      console.error('Error loading overview data:', error);
      Alert.alert('Error', 'Failed to load overview data');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header Section */}
        <View style={styles.header}>
          <Text style={styles.welcomeTitle}>
            Welcome, {userInfo?.name || 'Dr. Sarah Chen'}
          </Text>
          <Text style={styles.welcomeSubtitle}>
            {user?.role === 'trainee' 
              ? "View your assessment results and progress"
              : user?.role === 'admin' || user?.role === 'system-admin'
              ? "Manage system settings and user accounts"
              : "Create and manage trainee assessments"
            }
          </Text>
          
          {(user?.role === 'faculty' || user?.role === 'leadership') && (
            <Button
              title="New Assessment"
              onPress={onNewAssessment}
              style={styles.newAssessmentButton}
              icon="➕"
            />
          )}
        </View>

        {/* Cards Section */}
        <View style={[styles.cardsContainer, isTablet && styles.cardsContainerTablet]}>
          {/* Recent Activity Card */}
          <Card style={[styles.card, isTablet && styles.cardTablet]}>
            <CardHeader>
              <View style={styles.cardHeaderWithIcon}>
                <Text style={styles.cardIcon}>📋</Text>
                <View style={styles.cardTitleContainer}>
                  <CardTitle>Recent Activity</CardTitle>
                  <Text style={styles.cardSubtitle}>
                    {user?.role === 'admin' || user?.role === 'system-admin'
                      ? "System activity and updates"
                      : "Your latest assessments and updates"
                    }
                  </Text>
                </View>
              </View>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Text style={styles.emptyStateText}>Loading...</Text>
              ) : stats.recentActivity.length > 0 ? (
                <View style={styles.activityList}>
                  {stats.recentActivity.map((assessment, index) => (
                    <View key={assessment.id || index} style={styles.activityItem}>
                      <View style={styles.activityIcon}>
                        <Text style={styles.activityIconText}>📋</Text>
                      </View>
                      <View style={styles.activityContent}>
                        <Text style={styles.activityTitle}>
                          {user?.role === 'trainee' 
                            ? `Assessment by ${assessment.evaluator_name || 'Unknown Evaluator'}`
                            : `Assessment for ${assessment.trainee_name || 'Unknown Trainee'}`
                          }
                        </Text>
                        <Text style={styles.activitySubtitle}>
                          {new Date(assessment.shift_date).toLocaleDateString()} • {assessment.status}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.emptyStateText}>
                  {user?.role === 'admin' || user?.role === 'system-admin'
                    ? "No system activity to display"
                    : "No recent activity to display"
                  }
                </Text>
              )}
            </CardContent>
          </Card>

          {/* Quick Stats Card */}
          <Card style={[styles.card, isTablet && styles.cardTablet]}>
            <CardHeader>
              <View style={styles.cardHeaderWithIcon}>
                <Text style={styles.cardIcon}>📊</Text>
                <View style={styles.cardTitleContainer}>
                  <CardTitle>Quick Stats</CardTitle>
                  <Text style={styles.cardSubtitle}>
                    {user?.role === 'admin' || user?.role === 'system-admin'
                      ? "System metrics at a glance"
                      : "Key metrics at a glance"
                    }
                  </Text>
                </View>
              </View>
            </CardHeader>
            <CardContent>
              {loading ? (
                <View style={styles.statsContainer}>
                  <View style={styles.statItem}>
                    <Text style={styles.statLabel}>This Month</Text>
                    <Text style={styles.statValue}>...</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statItem}>
                    <Text style={styles.statLabel}>Total</Text>
                    <Text style={styles.statValue}>...</Text>
                  </View>
                </View>
              ) : (
                <View style={styles.statsContainer}>
                  <View style={styles.statItem}>
                    <Text style={styles.statLabel}>
                      {user?.role === 'admin' || user?.role === 'system-admin' ? 'Active Users' : 'This Month'}
                    </Text>
                    <Text style={styles.statValue}>{stats.thisMonth}</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statItem}>
                    <Text style={styles.statLabel}>
                      {user?.role === 'admin' || user?.role === 'system-admin' ? 'Total Users' : 'Total'}
                    </Text>
                    <Text style={styles.statValue}>{stats.total}</Text>
                  </View>
                </View>
              )}
            </CardContent>
          </Card>

          {/* Notifications Card */}
          <Card style={[styles.card, isTablet && styles.cardTablet]}>
            <CardHeader>
              <View style={styles.cardHeaderWithIcon}>
                <Text style={styles.cardIcon}>🔔</Text>
                <View style={styles.cardTitleContainer}>
                  <CardTitle>Notifications</CardTitle>
                  <Text style={styles.cardSubtitle}>
                    Important updates and reminders
                  </Text>
                </View>
              </View>
            </CardHeader>
            <CardContent>
              <Text style={styles.emptyStateText}>
                All caught up! No notifications.
              </Text>
            </CardContent>
          </Card>
        </View>
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
    padding: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  welcomeTitle: {
    fontSize: isTablet ? 24 : 20,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
    lineHeight: isTablet ? 32 : 28,
  },
  welcomeSubtitle: {
    fontSize: isTablet ? 16 : 14,
    color: '#6b7280',
    marginBottom: 16,
    lineHeight: isTablet ? 24 : 20,
  },
  newAssessmentButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: isTablet ? 24 : 20,
    paddingVertical: isTablet ? 12 : 10,
  },
  cardsContainer: {
    padding: 16,
  },
  cardsContainerTablet: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    padding: 24,
  },
  card: {
    marginBottom: 16,
  },
  cardTablet: {
    width: '48%',
    marginBottom: 24,
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
  emptyStateText: {
    fontSize: 14,
    color: '#9ca3af',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 20,
  },
  activityList: {
    gap: 12,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  activityIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  activityIconText: {
    fontSize: 16,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 2,
  },
  activitySubtitle: {
    fontSize: 12,
    color: '#6b7280',
  },
  statsContainer: {
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
    fontSize: 32,
    fontWeight: '700',
    color: '#1f2937',
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#e5e7eb',
    marginHorizontal: 16,
  },
});



