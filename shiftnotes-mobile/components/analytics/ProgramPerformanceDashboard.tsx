import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, Dimensions, Alert, ActivityIndicator } from 'react-native';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Select } from '../ui/Select';
import { User } from '../../lib/types';
import { apiClient } from '../../lib/api';

interface ProgramPerformanceProps {
  user: User;
}

interface ProgramStats {
  programId: string;
  programName: string;
  totalTrainees: number;
  totalAssessments: number;
  averageCompetencyLevel: number;
  epaCompletionRate: number;
  activeTrainees: number;
  recentAssessments: number;
}

interface CompetencyDistribution {
  level: number;
  count: number;
  percentage: number;
}

const ProgramPerformanceDashboard: React.FC<ProgramPerformanceProps> = ({ user }) => {
  const [loading, setLoading] = useState(true);
  const [selectedTimeframe, setSelectedTimeframe] = useState('3months');
  const [programStats, setProgramStats] = useState<ProgramStats[]>([]);
  const [competencyDistribution, setCompetencyDistribution] = useState<CompetencyDistribution[]>([]);
  const [totalMetrics, setTotalMetrics] = useState({
    totalTrainees: 0,
    totalAssessments: 0,
    averageLevel: 0,
    activeTraineesCount: 0
  });

  useEffect(() => {
    loadProgramPerformanceData();
  }, [selectedTimeframe]);

  const loadProgramPerformanceData = async () => {
    setLoading(true);
    try {
      console.log('Loading program performance data...');
      
      // Get all programs for the organization
      const programsResponse = await apiClient.getPrograms();
      const programs = programsResponse.results || [];
      console.log('Programs:', programs.length);

      // Get all trainees for the organization
      const traineesResponse = await apiClient.getUsers();
      const allTrainees = (traineesResponse.results || []).filter(u => u.role === 'trainee');
      console.log('Total trainees:', allTrainees.length);

      // Get all assessments for analysis
      const assessmentsResponse = await apiClient.getAssessments({ limit: 500 });
      const allAssessments = assessmentsResponse.results || [];
      console.log('Total assessments:', allAssessments.length);

        // Calculate program statistics
        const programStatsData: ProgramStats[] = [];
        let totalAssessments = 0;
        let totalCompetencySum = 0;
        let totalCompetencyCount = 0;
        let totalActiveTrainees = 0;

      // Calculate competency level distribution
      const levelDistribution: { [key: number]: number } = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

      for (const program of programs) {
        const programTrainees = allTrainees.filter(t => 
          t.programs?.some(p => p.id === program.id)
        );
        
        const programAssessments = allAssessments.filter(a => 
          programTrainees.some(t => t.id === a.trainee)
        );

        // Calculate average competency level for this program
        let competencySum = 0;
        let competencyCount = 0;
        let recentAssessments = 0;
        
        const cutoffDate = new Date();
        const months = selectedTimeframe === '1month' ? 1 : selectedTimeframe === '3months' ? 3 : 6;
        cutoffDate.setMonth(cutoffDate.getMonth() - months);

        programAssessments.forEach(assessment => {
          const assessmentDate = new Date(assessment.shift_date || assessment.created_at);
          const isRecent = assessmentDate >= cutoffDate;
          
          if (isRecent) {
            recentAssessments++;
          }
          
          assessment.assessment_epas?.forEach(epaAssessment => {
            const level = epaAssessment.entrustment_level;
            competencySum += level;
            competencyCount++;
            
            // Add to distribution
            if (level >= 1 && level <= 5) {
              levelDistribution[level]++;
            }
          });
        });

        const avgCompetencyLevel = competencyCount > 0 ? competencySum / competencyCount : 0;
        const epaCompletionRate = programTrainees.length > 0 ? (programAssessments.length / programTrainees.length) * 100 : 0;
        
        // Calculate active trainees (those with recent assessments)
        const activeTrainees = programTrainees.filter(trainee => {
          const traineeAssessments = programAssessments.filter(a => a.trainee === trainee.id);
          const traineeRecentAssessments = traineeAssessments.filter(a => {
            const assessmentDate = new Date(a.shift_date || a.created_at);
            return assessmentDate >= cutoffDate;
          });
          return traineeRecentAssessments.length > 0;
        }).length;

        programStatsData.push({
          programId: program.id,
          programName: program.name,
          totalTrainees: programTrainees.length,
          totalAssessments: programAssessments.length,
          averageCompetencyLevel: avgCompetencyLevel,
          epaCompletionRate: epaCompletionRate,
          activeTrainees: activeTrainees,
          recentAssessments: recentAssessments
        });

        totalAssessments += programAssessments.length;
        totalCompetencySum += competencySum;
        totalCompetencyCount += competencyCount;
        totalActiveTrainees += activeTrainees;
      }

      // Convert distribution to percentages
      const totalLevels = Object.values(levelDistribution).reduce((sum, count) => sum + count, 0);
      const distributionData: CompetencyDistribution[] = Object.entries(levelDistribution).map(([level, count]) => ({
        level: parseInt(level),
        count,
        percentage: totalLevels > 0 ? (count / totalLevels) * 100 : 0
      }));

      setProgramStats(programStatsData);
      setCompetencyDistribution(distributionData);
      setTotalMetrics({
        totalTrainees: allTrainees.length,
        totalAssessments,
        averageLevel: totalCompetencyCount > 0 ? totalCompetencySum / totalCompetencyCount : 0,
        activeTraineesCount: totalActiveTrainees
      });

      console.log('Program performance data loaded successfully');
    } catch (error) {
      console.error('Error loading program performance data:', error);
      Alert.alert('Error', 'Failed to load program performance data');
    } finally {
      setLoading(false);
    }
  };

  const getPerformanceColor = (level: number): string => {
    if (level >= 4) return '#10B981'; // Green
    if (level >= 3) return '#F59E0B'; // Yellow
    return '#EF4444'; // Red
  };

  const getActivityColor = (active: number, total: number): string => {
    const percentage = total > 0 ? (active / total) * 100 : 0;
    if (percentage >= 90) return '#10B981'; // Green
    if (percentage >= 70) return '#F59E0B'; // Yellow
    return '#EF4444'; // Red
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.loadingText}>Loading program performance data...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Program Performance Dashboard</Text>
        <Text style={styles.subtitle}>Comprehensive overview of all programs</Text>
      </View>

      {/* Time Filter */}
      <Card style={styles.filterCard}>
        <CardContent>
          <Text style={styles.filterLabel}>Time Period:</Text>
          <Select
            value={selectedTimeframe}
            onValueChange={setSelectedTimeframe}
            options={[
              { value: '1month', label: 'Last Month' },
              { value: '3months', label: 'Last 3 Months' },
              { value: '6months', label: 'Last 6 Months' }
            ]}
            placeholder="Select timeframe"
          />
        </CardContent>
      </Card>

      {/* Overview Metrics */}
      <View style={styles.metricsGrid}>
        <Card style={[styles.metricCard, { backgroundColor: '#F0F9FF' }]}>
          <CardContent style={styles.metricContent}>
            <Text style={styles.metricValue}>{totalMetrics.totalTrainees}</Text>
            <Text style={styles.metricLabel}>Total Trainees</Text>
          </CardContent>
        </Card>

        <Card style={[styles.metricCard, { backgroundColor: '#F0FDF4' }]}>
          <CardContent style={styles.metricContent}>
            <Text style={styles.metricValue}>{totalMetrics.totalAssessments}</Text>
            <Text style={styles.metricLabel}>Total Assessments</Text>
          </CardContent>
        </Card>

        <Card style={[styles.metricCard, { backgroundColor: getPerformanceColor(totalMetrics.averageLevel) + '20' }]}>
          <CardContent style={styles.metricContent}>
            <Text style={[styles.metricValue, { color: getPerformanceColor(totalMetrics.averageLevel) }]}>
              {totalMetrics.averageLevel.toFixed(1)}
            </Text>
            <Text style={styles.metricLabel}>Avg Competency Level</Text>
          </CardContent>
        </Card>

        <Card style={[styles.metricCard, { backgroundColor: getActivityColor(totalMetrics.activeTraineesCount, totalMetrics.totalTrainees) + '20' }]}>
          <CardContent style={styles.metricContent}>
            <Text style={[styles.metricValue, { color: getActivityColor(totalMetrics.activeTraineesCount, totalMetrics.totalTrainees) }]}>
              {totalMetrics.activeTraineesCount}
            </Text>
            <Text style={styles.metricLabel}>Active Trainees</Text>
          </CardContent>
        </Card>
      </View>

      {/* Program Breakdown */}
      <Card style={styles.programCard}>
        <CardHeader>
          <CardTitle>Program Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          {programStats.map((program) => (
            <View key={program.programId} style={styles.programRow}>
              <View style={styles.programInfo}>
                <Text style={styles.programName}>{program.programName}</Text>
                <Text style={styles.programSubtitle}>
                  {program.totalTrainees} trainees • {program.totalAssessments} assessments
                </Text>
              </View>
              
              <View style={styles.programMetrics}>
                <View style={styles.programMetric}>
                  <Text style={[styles.programMetricValue, { color: getPerformanceColor(program.averageCompetencyLevel) }]}>
                    {program.averageCompetencyLevel.toFixed(1)}
                  </Text>
                  <Text style={styles.programMetricLabel}>Avg Level</Text>
                </View>
                
                <View style={styles.programMetric}>
                  <Text style={[styles.programMetricValue, { color: getActivityColor(program.activeTrainees, program.totalTrainees) }]}>
                    {program.activeTrainees}
                  </Text>
                  <Text style={styles.programMetricLabel}>Active</Text>
                </View>
                
                <View style={styles.programMetric}>
                  <Text style={styles.programMetricValue}>
                    {program.recentAssessments}
                  </Text>
                  <Text style={styles.programMetricLabel}>Recent</Text>
                </View>
              </View>
            </View>
          ))}
        </CardContent>
      </Card>

      {/* Competency Distribution */}
      <Card style={styles.distributionCard}>
        <CardHeader>
          <CardTitle>Competency Level Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <View style={styles.distributionChart}>
            {competencyDistribution.map((item) => (
              <View key={item.level} style={styles.distributionBar}>
                <View 
                  style={[
                    styles.distributionFill, 
                    { 
                      height: `${Math.max(item.percentage, 5)}%`,
                      backgroundColor: getPerformanceColor(item.level)
                    }
                  ]} 
                />
                <Text style={styles.distributionLabel}>Level {item.level}</Text>
                <Text style={styles.distributionValue}>{item.count}</Text>
                <Text style={styles.distributionPercent}>{item.percentage.toFixed(1)}%</Text>
              </View>
            ))}
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
  filterCard: {
    margin: 16,
    marginBottom: 8,
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 8,
    justifyContent: 'space-between',
  },
  metricCard: {
    width: '48%',
    marginBottom: 8,
  },
  metricContent: {
    alignItems: 'center',
    padding: 16,
  },
  metricValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
  },
  programCard: {
    margin: 16,
    marginTop: 8,
  },
  programRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  programInfo: {
    flex: 1,
  },
  programName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 4,
  },
  programSubtitle: {
    fontSize: 14,
    color: '#64748B',
  },
  programMetrics: {
    flexDirection: 'row',
    gap: 16,
  },
  programMetric: {
    alignItems: 'center',
    minWidth: 45,
  },
  programMetricValue: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  programMetricLabel: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
  },
  distributionCard: {
    margin: 16,
    marginTop: 8,
    marginBottom: 32,
  },
  distributionChart: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: 200,
    paddingTop: 20,
  },
  distributionBar: {
    alignItems: 'center',
    flex: 1,
    height: '100%',
    justifyContent: 'flex-end',
  },
  distributionFill: {
    width: 40,
    backgroundColor: '#3B82F6',
    borderRadius: 4,
    marginBottom: 8,
  },
  distributionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 2,
  },
  distributionValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 2,
  },
  distributionPercent: {
    fontSize: 11,
    color: '#64748B',
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

export default ProgramPerformanceDashboard;
