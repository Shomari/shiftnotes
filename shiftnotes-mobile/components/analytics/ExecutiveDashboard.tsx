import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { User } from '../../lib/types';
import { apiClient } from '../../lib/api';

interface ExecutiveDashboardProps {
  user: User;
}

interface KPIMetric {
  label: string;
  value: string | number;
  change: number;
  changeLabel: string;
  color: string;
  backgroundColor: string;
  icon: string;
}

interface TrendData {
  month: string;
  assessments: number;
  averageLevel: number;
}

interface AlertItem {
  type: 'warning' | 'success' | 'info';
  title: string;
  message: string;
  count?: number;
}

const ExecutiveDashboard: React.FC<ExecutiveDashboardProps> = ({ user }) => {
  const [loading, setLoading] = useState(true);
  const [kpiMetrics, setKpiMetrics] = useState<KPIMetric[]>([]);
  const [trendData, setTrendData] = useState<TrendData[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [organizationHealth, setOrganizationHealth] = useState(0);

  useEffect(() => {
    loadExecutiveDashboardData();
  }, []);

  const loadExecutiveDashboardData = async () => {
    setLoading(true);
    try {
      console.log('Loading executive dashboard data...');
      
      // Get all organizational data
      const [programsResponse, usersResponse, assessmentsResponse] = await Promise.all([
        apiClient.getPrograms(),
        apiClient.getUsers(),
        apiClient.getAssessments({ limit: 1000 })
      ]);

      const programs = programsResponse.results || [];
      const users = usersResponse.results || [];
      const assessments = assessmentsResponse.results || [];

      console.log('Data loaded:', { programs: programs.length, users: users.length, assessments: assessments.length });

      // Filter data
      const trainees = users.filter(u => u.role === 'trainee');
      const faculty = users.filter(u => u.role === 'faculty' || u.role === 'leadership');
      
      // Calculate current month's data
      const currentDate = new Date();
      const currentMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const previousMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
      const last30Days = new Date(currentDate.getTime() - 30 * 24 * 60 * 60 * 1000);

      const currentMonthAssessments = assessments.filter(a => 
        new Date(a.shift_date || a.created_at) >= currentMonth
      );
      const previousMonthAssessments = assessments.filter(a => {
        const date = new Date(a.shift_date || a.created_at);
        return date >= previousMonth && date < currentMonth;
      });
      const recentAssessments = assessments.filter(a => 
        new Date(a.shift_date || a.created_at) >= last30Days
      );

      // Calculate overall competency levels
      let totalCompetencySum = 0;
      let totalCompetencyCount = 0;
      let currentMonthCompetencySum = 0;
      let currentMonthCompetencyCount = 0;

      assessments.forEach(assessment => {
        const isCurrentMonth = new Date(assessment.shift_date || assessment.created_at) >= currentMonth;
        
        assessment.assessment_epas?.forEach(epa => {
          totalCompetencySum += epa.entrustment_level;
          totalCompetencyCount++;
          
          if (isCurrentMonth) {
            currentMonthCompetencySum += epa.entrustment_level;
            currentMonthCompetencyCount++;
          }
        });
      });

      const averageCompetencyLevel = totalCompetencyCount > 0 ? totalCompetencySum / totalCompetencyCount : 0;
      const currentMonthAvgLevel = currentMonthCompetencyCount > 0 ? currentMonthCompetencySum / currentMonthCompetencyCount : 0;

      // Calculate total active trainees with recent assessments
      const activeTrainees = trainees.filter(trainee => {
        const traineeAssessments = assessments.filter(a => a.trainee === trainee.id);
        const traineeRecentAssessments = traineeAssessments.filter(a => 
          new Date(a.shift_date || a.created_at) >= last30Days
        );
        return traineeRecentAssessments.length > 0;
      });

      // Calculate faculty engagement
      const activeFaculty = faculty.filter(f => {
        const facultyAssessments = assessments.filter(a => a.evaluator === f.id);
        const recentFacultyAssessments = facultyAssessments.filter(a => 
          new Date(a.shift_date || a.created_at) >= last30Days
        );
        return recentFacultyAssessments.length > 0;
      });

      const facultyEngagementRate = faculty.length > 0 ? (activeFaculty.length / faculty.length) * 100 : 0;

      // Calculate assessment completion rate (target: 2 assessments per trainee per month)
      const targetAssessments = trainees.length * 2;
      const actualAssessments = currentMonthAssessments.length;
      const completionRate = targetAssessments > 0 ? (actualAssessments / targetAssessments) * 100 : 0;

      // Calculate changes from previous month
      const assessmentChange = previousMonthAssessments.length > 0 
        ? ((currentMonthAssessments.length - previousMonthAssessments.length) / previousMonthAssessments.length) * 100 
        : 0;

      // Calculate organization health score (0-100)
      const healthScore = Math.round(
        (Math.min(completionRate, 100) * 0.4) +
        (Math.min(facultyEngagementRate, 100) * 0.3) +
        (Math.min(averageCompetencyLevel * 20, 100) * 0.3)
      );

      // Build KPI metrics
      const kpis: KPIMetric[] = [
        {
          label: 'Organization Health',
          value: `${healthScore}%`,
          change: 0, // Would need historical data
          changeLabel: 'vs last month',
          color: healthScore >= 80 ? '#10B981' : healthScore >= 60 ? '#F59E0B' : '#EF4444',
          backgroundColor: healthScore >= 80 ? '#F0FDF4' : healthScore >= 60 ? '#FFFBEB' : '#FEF2F2',
          icon: '🎯'
        },
        {
          label: 'Assessment Completion',
          value: `${completionRate.toFixed(1)}%`,
          change: assessmentChange,
          changeLabel: 'vs last month',
          color: completionRate >= 80 ? '#10B981' : completionRate >= 60 ? '#F59E0B' : '#EF4444',
          backgroundColor: completionRate >= 80 ? '#F0FDF4' : completionRate >= 60 ? '#FFFBEB' : '#FEF2F2',
          icon: '📋'
        },
        {
          label: 'Active Trainees',
          value: activeTrainees.length,
          change: 0, // Would need historical data
          changeLabel: 'with recent activity',
          color: activeTrainees.length >= trainees.length * 0.9 ? '#10B981' : activeTrainees.length >= trainees.length * 0.7 ? '#F59E0B' : '#EF4444',
          backgroundColor: activeTrainees.length >= trainees.length * 0.9 ? '#F0FDF4' : activeTrainees.length >= trainees.length * 0.7 ? '#FFFBEB' : '#FEF2F2',
          icon: '👨‍⚕️'
        },
        {
          label: 'Faculty Engagement',
          value: `${facultyEngagementRate.toFixed(1)}%`,
          change: 0, // Would need historical data
          changeLabel: 'active this month',
          color: facultyEngagementRate >= 80 ? '#10B981' : facultyEngagementRate >= 60 ? '#F59E0B' : '#EF4444',
          backgroundColor: facultyEngagementRate >= 80 ? '#F0FDF4' : facultyEngagementRate >= 60 ? '#FFFBEB' : '#FEF2F2',
          icon: '👥'
        },
        {
          label: 'Avg Competency Level',
          value: averageCompetencyLevel.toFixed(1),
          change: 0, // Would need historical comparison
          changeLabel: 'organization-wide',
          color: averageCompetencyLevel >= 4 ? '#10B981' : averageCompetencyLevel >= 3 ? '#F59E0B' : '#EF4444',
          backgroundColor: averageCompetencyLevel >= 4 ? '#F0FDF4' : averageCompetencyLevel >= 3 ? '#FFFBEB' : '#FEF2F2',
          icon: '📈'
        }
      ];

      // Generate trend data for the last 6 months
      const trends: TrendData[] = [];
      for (let i = 5; i >= 0; i--) {
        const monthDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
        const nextMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - i + 1, 1);
        
        const monthAssessments = assessments.filter(a => {
          const date = new Date(a.shift_date || a.created_at);
          return date >= monthDate && date < nextMonth;
        });

        let monthCompetencySum = 0;
        let monthCompetencyCount = 0;
        monthAssessments.forEach(a => {
          a.assessment_epas?.forEach(epa => {
            monthCompetencySum += epa.entrustment_level;
            monthCompetencyCount++;
          });
        });

        trends.push({
          month: monthDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          assessments: monthAssessments.length,
          averageLevel: monthCompetencyCount > 0 ? monthCompetencySum / monthCompetencyCount : 0
        });
      }

      // Generate alerts
      const alertItems: AlertItem[] = [];

      if (completionRate < 80) {
        alertItems.push({
          type: 'warning',
          title: 'Assessment Target Below Goal',
          message: `Current completion rate is ${completionRate.toFixed(1)}% (target: 80%)`
        });
      }

      if (facultyEngagementRate < 70) {
        alertItems.push({
          type: 'info',
          title: 'Faculty Engagement Opportunity',
          message: `${(100 - facultyEngagementRate).toFixed(1)}% of faculty have not completed assessments recently`
        });
      }

      if (healthScore >= 85) {
        alertItems.push({
          type: 'success',
          title: 'Excellent Performance',
          message: 'Organization is performing exceptionally well across all metrics'
        });
      }

      setKpiMetrics(kpis);
      setTrendData(trends);
      setAlerts(alertItems);
      setOrganizationHealth(healthScore);

      console.log('Executive dashboard data loaded successfully');
    } catch (error) {
      console.error('Error loading executive dashboard data:', error);
      Alert.alert('Error', 'Failed to load executive dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.loadingText}>Loading executive dashboard...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Executive Dashboard</Text>
        <Text style={styles.subtitle}>Strategic overview and key performance indicators</Text>
      </View>

      {/* Key Performance Indicators */}
      <View style={styles.kpiGrid}>
        {kpiMetrics.map((kpi, index) => (
          <Card key={index} style={[styles.kpiCard, { backgroundColor: kpi.backgroundColor }]}>
            <CardContent style={styles.kpiContent}>
              <View style={styles.kpiHeader}>
                <Text style={styles.kpiIcon}>{kpi.icon}</Text>
                <Text style={[styles.kpiValue, { color: kpi.color }]}>{kpi.value}</Text>
              </View>
              <Text style={styles.kpiLabel}>{kpi.label}</Text>
              {kpi.change !== 0 && (
                <Text style={[styles.kpiChange, { color: kpi.change > 0 ? '#10B981' : '#EF4444' }]}>
                  {kpi.change > 0 ? '+' : ''}{kpi.change.toFixed(1)}% {kpi.changeLabel}
                </Text>
              )}
            </CardContent>
          </Card>
        ))}
      </View>

      {/* Alerts & Notifications */}
      {alerts.length > 0 && (
        <Card style={styles.alertsCard}>
          <CardHeader>
            <CardTitle>🔔 Alerts & Notifications</CardTitle>
          </CardHeader>
          <CardContent>
            {alerts.map((alert, index) => (
              <View key={index} style={[styles.alertItem, { 
                backgroundColor: 
                  alert.type === 'success' ? '#F0FDF4' : 
                  alert.type === 'warning' ? '#FFFBEB' : '#F0F9FF' 
              }]}>
                <View style={styles.alertContent}>
                  <Text style={[styles.alertTitle, {
                    color: 
                      alert.type === 'success' ? '#10B981' : 
                      alert.type === 'warning' ? '#F59E0B' : '#2563EB'
                  }]}>
                    {alert.title}
                  </Text>
                  <Text style={styles.alertMessage}>{alert.message}</Text>
                </View>
                {alert.count && (
                  <View style={[styles.alertBadge, {
                    backgroundColor: 
                      alert.type === 'success' ? '#10B981' : 
                      alert.type === 'warning' ? '#F59E0B' : '#2563EB'
                  }]}>
                    <Text style={styles.alertBadgeText}>{alert.count}</Text>
                  </View>
                )}
              </View>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Trend Analysis */}
      <Card style={styles.trendCard}>
        <CardHeader>
          <CardTitle>📊 Six-Month Trends</CardTitle>
        </CardHeader>
        <CardContent>
          <View style={styles.trendChart}>
            <Text style={styles.trendLabel}>Assessment Volume</Text>
            <View style={styles.trendBars}>
              {trendData.map((trend, index) => (
                <View key={index} style={styles.trendBar}>
                  <View 
                    style={[
                      styles.trendBarFill, 
                      { 
                        height: `${Math.max((trend.assessments / Math.max(...trendData.map(t => t.assessments))) * 100, 10)}%`,
                        backgroundColor: '#3B82F6'
                      }
                    ]} 
                  />
                  <Text style={styles.trendBarLabel}>{trend.month}</Text>
                  <Text style={styles.trendBarValue}>{trend.assessments}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.trendChart}>
            <Text style={styles.trendLabel}>Average Competency Level</Text>
            <View style={styles.trendBars}>
              {trendData.map((trend, index) => (
                <View key={index} style={styles.trendBar}>
                  <View 
                    style={[
                      styles.trendBarFill, 
                      { 
                        height: `${Math.max((trend.averageLevel / 5) * 100, 10)}%`,
                        backgroundColor: trend.averageLevel >= 4 ? '#10B981' : trend.averageLevel >= 3 ? '#F59E0B' : '#EF4444'
                      }
                    ]} 
                  />
                  <Text style={styles.trendBarLabel}>{trend.month}</Text>
                  <Text style={styles.trendBarValue}>{trend.averageLevel.toFixed(1)}</Text>
                </View>
              ))}
            </View>
          </View>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card style={styles.actionsCard}>
        <CardHeader>
          <CardTitle>⚡ Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <View style={styles.actionGrid}>
            <View style={styles.actionItem}>
              <Text style={styles.actionIcon}>📋</Text>
              <Text style={styles.actionTitle}>Generate Report</Text>
              <Text style={styles.actionDescription}>Monthly performance summary</Text>
            </View>
            <View style={styles.actionItem}>
              <Text style={styles.actionIcon}>👥</Text>
              <Text style={styles.actionTitle}>Faculty Review</Text>
              <Text style={styles.actionDescription}>Assessment participation</Text>
            </View>
            <View style={styles.actionItem}>
              <Text style={styles.actionIcon}>⚠️</Text>
              <Text style={styles.actionTitle}>At-Risk Review</Text>
              <Text style={styles.actionDescription}>Trainee intervention plans</Text>
            </View>
            <View style={styles.actionItem}>
              <Text style={styles.actionIcon}>📊</Text>
              <Text style={styles.actionTitle}>Detailed Analytics</Text>
              <Text style={styles.actionDescription}>Deep dive analysis</Text>
            </View>
          </View>
        </CardContent>
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748B',
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 8,
    justifyContent: 'space-between',
  },
  kpiCard: {
    width: '48%',
    marginBottom: 8,
  },
  kpiContent: {
    padding: 16,
  },
  kpiHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  kpiIcon: {
    fontSize: 24,
  },
  kpiValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  kpiLabel: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 4,
  },
  kpiChange: {
    fontSize: 12,
    fontWeight: '600',
  },
  alertsCard: {
    margin: 16,
    marginTop: 8,
  },
  alertItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  alertContent: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  alertMessage: {
    fontSize: 14,
    color: '#64748B',
  },
  alertBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  trendCard: {
    margin: 16,
    marginTop: 8,
  },
  trendChart: {
    marginBottom: 24,
  },
  trendLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
    textAlign: 'center',
  },
  trendBars: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: 120,
  },
  trendBar: {
    alignItems: 'center',
    flex: 1,
    height: '100%',
    justifyContent: 'flex-end',
  },
  trendBarFill: {
    width: 30,
    borderRadius: 4,
    marginBottom: 8,
  },
  trendBarLabel: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 2,
    textAlign: 'center',
  },
  trendBarValue: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  actionsCard: {
    margin: 16,
    marginTop: 8,
    marginBottom: 32,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionItem: {
    width: '48%',
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    alignItems: 'center',
  },
  actionIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 4,
    textAlign: 'center',
  },
  actionDescription: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748B',
  },
});

export default ExecutiveDashboard;
