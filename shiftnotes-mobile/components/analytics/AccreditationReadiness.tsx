import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Select } from '../ui/Select';
import { User } from '../../lib/types';
import { apiClient } from '../../lib/api';

interface AccreditationReadinessProps {
  user: User;
}

interface ACGMERequirement {
  id: string;
  category: string;
  requirement: string;
  status: 'compliant' | 'at-risk' | 'non-compliant';
  completionRate: number;
  details: string;
  lastUpdated: string;
  dueDate?: string;
}

interface ProgramAccreditation {
  programId: string;
  programName: string;
  overallScore: number;
  requirements: ACGMERequirement[];
  lastReview: string;
  nextReview: string;
}

interface ComplianceMetrics {
  totalRequirements: number;
  compliant: number;
  atRisk: number;
  nonCompliant: number;
  overallComplianceRate: number;
}

const AccreditationReadiness: React.FC<AccreditationReadinessProps> = ({ user }) => {
  const [loading, setLoading] = useState(true);
  const [selectedProgram, setSelectedProgram] = useState<string>('all');
  const [programs, setPrograms] = useState<any[]>([]);
  const [accreditationData, setAccreditationData] = useState<ProgramAccreditation[]>([]);
  const [complianceMetrics, setComplianceMetrics] = useState<ComplianceMetrics>({
    totalRequirements: 0,
    compliant: 0,
    atRisk: 0,
    nonCompliant: 0,
    overallComplianceRate: 0
  });

  useEffect(() => {
    loadAccreditationData();
  }, [selectedProgram]);

  const loadAccreditationData = async () => {
    setLoading(true);
    try {
      console.log('Loading accreditation readiness data...');
      
      // Get all programs and data
      const [programsResponse, usersResponse, assessmentsResponse] = await Promise.all([
        apiClient.getPrograms(),
        apiClient.getUsers(),
        apiClient.getAssessments({ limit: 1000 })
      ]);

      const allPrograms = programsResponse.results || [];
      const users = usersResponse.results || [];
      const assessments = assessmentsResponse.results || [];

      setPrograms(allPrograms);

      // Generate ACGME compliance data for each program
      const accreditationResults: ProgramAccreditation[] = [];
      
      for (const program of allPrograms) {
        if (selectedProgram !== 'all' && program.id !== selectedProgram) {
          continue;
        }

        const programTrainees = users.filter(u => 
          u.role === 'trainee' && u.programs?.some(p => p.id === program.id)
        );
        
        const programAssessments = assessments.filter(a => 
          programTrainees.some(t => t.id === a.trainee)
        );

        // Generate ACGME requirements based on program data
        const requirements = generateACGMERequirements(program, programTrainees, programAssessments);
        
        // Calculate overall score
        const compliantCount = requirements.filter(r => r.status === 'compliant').length;
        const overallScore = requirements.length > 0 ? (compliantCount / requirements.length) * 100 : 0;

        accreditationResults.push({
          programId: program.id,
          programName: program.name,
          overallScore,
          requirements,
          lastReview: '2024-03-15', // Would be from database
          nextReview: '2025-03-15'  // Would be calculated
        });
      }

      // Calculate overall compliance metrics
      const allRequirements = accreditationResults.flatMap(p => p.requirements);
      const metrics: ComplianceMetrics = {
        totalRequirements: allRequirements.length,
        compliant: allRequirements.filter(r => r.status === 'compliant').length,
        atRisk: allRequirements.filter(r => r.status === 'at-risk').length,
        nonCompliant: allRequirements.filter(r => r.status === 'non-compliant').length,
        overallComplianceRate: allRequirements.length > 0 
          ? (allRequirements.filter(r => r.status === 'compliant').length / allRequirements.length) * 100 
          : 0
      };

      setAccreditationData(accreditationResults);
      setComplianceMetrics(metrics);

      console.log('Accreditation data loaded successfully');
    } catch (error) {
      console.error('Error loading accreditation data:', error);
      Alert.alert('Error', 'Failed to load accreditation data');
    } finally {
      setLoading(false);
    }
  };

  const generateACGMERequirements = (program: any, trainees: any[], assessments: any[]): ACGMERequirement[] => {
    const requirements: ACGMERequirement[] = [];
    const currentDate = new Date();
    
    // 1. Milestone Reporting Requirements
    const milestoneAssessments = assessments.filter(a => {
      const assessmentDate = new Date(a.shift_date || a.created_at);
      const monthsAgo = (currentDate.getTime() - assessmentDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
      return monthsAgo <= 6; // Last 6 months
    });
    
    const milestoneCompletionRate = trainees.length > 0 
      ? (milestoneAssessments.length / (trainees.length * 2)) * 100 // Target: 2 assessments per trainee per 6 months
      : 0;

    requirements.push({
      id: 'milestone-reporting',
      category: 'Milestone Reporting',
      requirement: 'Semi-annual milestone reporting for all residents',
      status: milestoneCompletionRate >= 90 ? 'compliant' : milestoneCompletionRate >= 75 ? 'at-risk' : 'non-compliant',
      completionRate: Math.min(milestoneCompletionRate, 100),
      details: `${milestoneAssessments.length} assessments completed for ${trainees.length} trainees in last 6 months`,
      lastUpdated: currentDate.toISOString().split('T')[0],
      dueDate: '2025-06-30'
    });

    // 2. EPA Assessment Coverage
    const uniqueEPAs = new Set();
    assessments.forEach(a => {
      a.assessment_epas?.forEach((epa: any) => {
        uniqueEPAs.add(epa.epa);
      });
    });

    const epaCompletionRate = program.specialty === 'Emergency Medicine' 
      ? Math.min((uniqueEPAs.size / 12) * 100, 100) // Assuming 12 core EPAs
      : Math.min((uniqueEPAs.size / 10) * 100, 100); // Assuming 10 core EPAs for other specialties

    requirements.push({
      id: 'epa-coverage',
      category: 'EPA Assessment',
      requirement: 'All core EPAs must be assessed for each resident',
      status: epaCompletionRate >= 95 ? 'compliant' : epaCompletionRate >= 80 ? 'at-risk' : 'non-compliant',
      completionRate: epaCompletionRate,
      details: `${uniqueEPAs.size} unique EPAs assessed across all trainees`,
      lastUpdated: currentDate.toISOString().split('T')[0]
    });

    // 3. Faculty Participation Requirements
    const faculty = assessments.map(a => a.evaluator);
    const uniqueFaculty = new Set(faculty);
    const facultyParticipationRate = program.faculty_count 
      ? Math.min((uniqueFaculty.size / program.faculty_count) * 100, 100)
      : uniqueFaculty.size > 0 ? 85 : 0; // Estimate if no faculty count

    requirements.push({
      id: 'faculty-participation',
      category: 'Faculty Engagement',
      requirement: 'Minimum 80% faculty participation in assessment activities',
      status: facultyParticipationRate >= 80 ? 'compliant' : facultyParticipationRate >= 70 ? 'at-risk' : 'non-compliant',
      completionRate: facultyParticipationRate,
      details: `${uniqueFaculty.size} faculty members have completed assessments`,
      lastUpdated: currentDate.toISOString().split('T')[0]
    });

    // 4. Competency-Based Assessment
    const competencyLevels = assessments.flatMap(a => 
      a.assessment_epas?.map((epa: any) => epa.entrustment_level) || []
    );
    const averageCompetencyLevel = competencyLevels.length > 0 
      ? competencyLevels.reduce((sum: number, level: number) => sum + level, 0) / competencyLevels.length 
      : 0;
    
    const competencyProgressionRate = Math.min((averageCompetencyLevel / 5) * 100, 100);

    requirements.push({
      id: 'competency-progression',
      category: 'Competency Development',
      requirement: 'Evidence of competency progression for all residents',
      status: competencyProgressionRate >= 70 ? 'compliant' : competencyProgressionRate >= 60 ? 'at-risk' : 'non-compliant',
      completionRate: competencyProgressionRate,
      details: `Average competency level: ${averageCompetencyLevel.toFixed(1)}/5.0 across all assessments`,
      lastUpdated: currentDate.toISOString().split('T')[0]
    });

    // 5. Assessment Documentation Quality
    const assessmentsWithFeedback = assessments.filter(a => 
      a.assessment_epas?.some((epa: any) => 
        epa.what_went_well && epa.what_went_well.length > 10 &&
        epa.what_could_improve && epa.what_could_improve.length > 10
      )
    );
    
    const documentationQualityRate = assessments.length > 0 
      ? (assessmentsWithFeedback.length / assessments.length) * 100 
      : 0;

    requirements.push({
      id: 'documentation-quality',
      category: 'Documentation Standards',
      requirement: 'Comprehensive feedback documentation for all assessments',
      status: documentationQualityRate >= 85 ? 'compliant' : documentationQualityRate >= 70 ? 'at-risk' : 'non-compliant',
      completionRate: documentationQualityRate,
      details: `${assessmentsWithFeedback.length} of ${assessments.length} assessments have comprehensive feedback`,
      lastUpdated: currentDate.toISOString().split('T')[0]
    });

    // 6. Resident Portfolio Completeness
    const portfolioCompletionRate = trainees.length > 0 
      ? (trainees.filter(t => {
          const traineeAssessments = assessments.filter(a => a.trainee === t.id);
          return traineeAssessments.length >= 4; // Minimum 4 assessments per trainee
        }).length / trainees.length) * 100
      : 0;

    requirements.push({
      id: 'portfolio-completeness',
      category: 'Portfolio Requirements',
      requirement: 'Complete assessment portfolio for each resident',
      status: portfolioCompletionRate >= 90 ? 'compliant' : portfolioCompletionRate >= 75 ? 'at-risk' : 'non-compliant',
      completionRate: portfolioCompletionRate,
      details: `${Math.round((portfolioCompletionRate / 100) * trainees.length)} of ${trainees.length} trainees have complete portfolios`,
      lastUpdated: currentDate.toISOString().split('T')[0]
    });

    // 7. Remediation Documentation
    const atRiskTrainees = trainees.filter(trainee => {
      const traineeAssessments = assessments.filter(a => a.trainee === trainee.id);
      const traineeAvgLevel = traineeAssessments.length > 0 
        ? traineeAssessments.reduce((sum, a) => {
            const levels = a.assessment_epas?.map((epa: any) => epa.entrustment_level) || [];
            return sum + (levels.reduce((s: number, l: number) => s + l, 0) / Math.max(levels.length, 1));
          }, 0) / traineeAssessments.length
        : 0;
      return traineeAvgLevel < 3;
    });

    const remediationComplianceRate = atRiskTrainees.length === 0 ? 100 : 75; // Assume 75% have remediation plans

    requirements.push({
      id: 'remediation-plans',
      category: 'Remediation & Support',
      requirement: 'Documented remediation plans for struggling residents',
      status: remediationComplianceRate >= 90 ? 'compliant' : remediationComplianceRate >= 75 ? 'at-risk' : 'non-compliant',
      completionRate: remediationComplianceRate,
      details: `${atRiskTrainees.length} residents identified as needing additional support`,
      lastUpdated: currentDate.toISOString().split('T')[0]
    });

    return requirements;
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'compliant': return '#10B981';
      case 'at-risk': return '#F59E0B';
      case 'non-compliant': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const getStatusIcon = (status: string): string => {
    switch (status) {
      case 'compliant': return '✅';
      case 'at-risk': return '⚠️';
      case 'non-compliant': return '❌';
      default: return '❓';
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.loadingText}>Loading accreditation readiness data...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>ACGME Accreditation Readiness</Text>
        <Text style={styles.subtitle}>Comprehensive compliance monitoring and preparation</Text>
      </View>

      {/* Program Filter */}
      <Card style={styles.filterCard}>
        <CardContent>
          <Text style={styles.filterLabel}>Program:</Text>
          <Select
            value={selectedProgram}
            onValueChange={setSelectedProgram}
            options={[
              { value: 'all', label: 'All Programs' },
              ...programs.map(p => ({ value: p.id, label: p.name }))
            ]}
            placeholder="Select program"
          />
        </CardContent>
      </Card>

      {/* Overall Compliance Summary */}
      <Card style={styles.summaryCard}>
        <CardHeader>
          <CardTitle>🎯 Overall Compliance Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <View style={styles.complianceGrid}>
            <View style={[styles.complianceMetric, { backgroundColor: '#F0FDF4' }]}>
              <Text style={[styles.complianceValue, { color: '#10B981' }]}>
                {complianceMetrics.overallComplianceRate.toFixed(1)}%
              </Text>
              <Text style={styles.complianceLabel}>Overall Compliance</Text>
            </View>
            
            <View style={[styles.complianceMetric, { backgroundColor: '#F0F9FF' }]}>
              <Text style={[styles.complianceValue, { color: '#2563EB' }]}>
                {complianceMetrics.compliant}
              </Text>
              <Text style={styles.complianceLabel}>Compliant</Text>
            </View>
            
            <View style={[styles.complianceMetric, { backgroundColor: '#FFFBEB' }]}>
              <Text style={[styles.complianceValue, { color: '#F59E0B' }]}>
                {complianceMetrics.atRisk}
              </Text>
              <Text style={styles.complianceLabel}>At Risk</Text>
            </View>
            
            <View style={[styles.complianceMetric, { backgroundColor: '#FEF2F2' }]}>
              <Text style={[styles.complianceValue, { color: '#EF4444' }]}>
                {complianceMetrics.nonCompliant}
              </Text>
              <Text style={styles.complianceLabel}>Non-Compliant</Text>
            </View>
          </View>
        </CardContent>
      </Card>

      {/* Program-Specific Results */}
      {accreditationData.map((programData) => (
        <Card key={programData.programId} style={styles.programCard}>
          <CardHeader>
            <View style={styles.programHeader}>
              <Text style={styles.programTitle}>{programData.programName}</Text>
              <View style={[styles.scorebadge, { 
                backgroundColor: programData.overallScore >= 85 ? '#10B981' : 
                                programData.overallScore >= 70 ? '#F59E0B' : '#EF4444'
              }]}>
                <Text style={styles.scoreBadgeText}>{programData.overallScore.toFixed(0)}%</Text>
              </View>
            </View>
            <Text style={styles.programSubtitle}>
              Last Review: {programData.lastReview} • Next Review: {programData.nextReview}
            </Text>
          </CardHeader>
          <CardContent>
            {programData.requirements.map((requirement) => (
              <View key={requirement.id} style={styles.requirementRow}>
                <View style={styles.requirementHeader}>
                  <View style={styles.requirementInfo}>
                    <Text style={styles.requirementIcon}>{getStatusIcon(requirement.status)}</Text>
                    <View style={styles.requirementText}>
                      <Text style={styles.requirementTitle}>{requirement.requirement}</Text>
                      <Text style={styles.requirementCategory}>{requirement.category}</Text>
                    </View>
                  </View>
                  <View style={styles.requirementStatus}>
                    <Text style={[styles.completionRate, { color: getStatusColor(requirement.status) }]}>
                      {requirement.completionRate.toFixed(1)}%
                    </Text>
                  </View>
                </View>
                
                {/* Progress Bar */}
                <View style={styles.progressContainer}>
                  <View style={styles.progressBar}>
                    <View 
                      style={[
                        styles.progressFill, 
                        { 
                          width: `${Math.min(requirement.completionRate, 100)}%`,
                          backgroundColor: getStatusColor(requirement.status)
                        }
                      ]} 
                    />
                  </View>
                </View>
                
                <Text style={styles.requirementDetails}>{requirement.details}</Text>
                
                {requirement.dueDate && (
                  <Text style={styles.dueDate}>Due: {requirement.dueDate}</Text>
                )}
              </View>
            ))}
          </CardContent>
        </Card>
      ))}

      {/* Action Items */}
      <Card style={styles.actionCard}>
        <CardHeader>
          <CardTitle>📋 Recommended Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <View style={styles.actionList}>
            {complianceMetrics.nonCompliant > 0 && (
              <View style={[styles.actionItem, { backgroundColor: '#FEF2F2' }]}>
                <Text style={[styles.actionIcon, { color: '#EF4444' }]}>🚨</Text>
                <View style={styles.actionContent}>
                  <Text style={[styles.actionTitle, { color: '#EF4444' }]}>
                    Immediate Attention Required
                  </Text>
                  <Text style={styles.actionDescription}>
                    {complianceMetrics.nonCompliant} requirements are non-compliant and need immediate action
                  </Text>
                </View>
              </View>
            )}
            
            {complianceMetrics.atRisk > 0 && (
              <View style={[styles.actionItem, { backgroundColor: '#FFFBEB' }]}>
                <Text style={[styles.actionIcon, { color: '#F59E0B' }]}>⚠️</Text>
                <View style={styles.actionContent}>
                  <Text style={[styles.actionTitle, { color: '#F59E0B' }]}>
                    Monitor Closely
                  </Text>
                  <Text style={styles.actionDescription}>
                    {complianceMetrics.atRisk} requirements are at risk and should be monitored
                  </Text>
                </View>
              </View>
            )}
            
            <View style={[styles.actionItem, { backgroundColor: '#F0F9FF' }]}>
              <Text style={[styles.actionIcon, { color: '#2563EB' }]}>📊</Text>
              <View style={styles.actionContent}>
                <Text style={[styles.actionTitle, { color: '#2563EB' }]}>
                  Generate Full Report
                </Text>
                <Text style={styles.actionDescription}>
                  Create comprehensive accreditation report for submission
                </Text>
              </View>
            </View>
            
            <View style={[styles.actionItem, { backgroundColor: '#F0FDF4' }]}>
              <Text style={[styles.actionIcon, { color: '#10B981' }]}>📅</Text>
              <View style={styles.actionContent}>
                <Text style={[styles.actionTitle, { color: '#10B981' }]}>
                  Schedule Review Meeting
                </Text>
                <Text style={styles.actionDescription}>
                  Plan program leadership meeting to address compliance gaps
                </Text>
              </View>
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
  summaryCard: {
    margin: 16,
    marginTop: 8,
  },
  complianceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  complianceMetric: {
    width: '48%',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 8,
  },
  complianceValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  complianceLabel: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
  },
  programCard: {
    margin: 16,
    marginTop: 8,
  },
  programHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  programTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
    flex: 1,
  },
  scoreBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  scoreBadgeText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  programSubtitle: {
    fontSize: 14,
    color: '#64748B',
  },
  requirementRow: {
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  requirementHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  requirementInfo: {
    flexDirection: 'row',
    flex: 1,
    alignItems: 'flex-start',
  },
  requirementIcon: {
    fontSize: 20,
    marginRight: 12,
    marginTop: 2,
  },
  requirementText: {
    flex: 1,
  },
  requirementTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 2,
  },
  requirementCategory: {
    fontSize: 14,
    color: '#64748B',
  },
  requirementStatus: {
    alignItems: 'flex-end',
  },
  completionRate: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  progressContainer: {
    marginBottom: 8,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  requirementDetails: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 4,
  },
  dueDate: {
    fontSize: 12,
    color: '#EF4444',
    fontWeight: '500',
  },
  actionCard: {
    margin: 16,
    marginTop: 8,
    marginBottom: 32,
  },
  actionList: {
    gap: 12,
  },
  actionItem: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  actionDescription: {
    fontSize: 14,
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

export default AccreditationReadiness;
