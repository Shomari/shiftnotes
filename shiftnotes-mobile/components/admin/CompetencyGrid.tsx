/**
 * Competency Grid component for Admin users
 * Visual milestone tracking similar to ACGME competency reports
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Select } from '../ui/Select';
import { User } from '../../lib/types';
import { apiClient } from '../../lib/api';

const { width } = Dimensions.get('window');
const isTablet = width >= 768;

interface CompetencyData {
  subCompetencyId: string;
  subCompetencyTitle: string;
  coreCompetencyTitle: string;
  averageRating: number;
  totalAssessments: number;
  milestoneLevel: number;
}

interface CompetencyGridProps {
  user: User | null;
}

export function CompetencyGrid({ user }: CompetencyGridProps) {
  const [trainees, setTrainees] = useState<User[]>([]);
  const [selectedTrainee, setSelectedTrainee] = useState<string>('');
  const [competencyData, setCompetencyData] = useState<CompetencyData[]>([]);
  const [loading, setLoading] = useState(false);

  // Core competency categories matching ACGME structure
  const competencyCategories = [
    'Patient Care',
    'Medical Knowledge', 
    'Systems-Based Practice',
    'Practice-Based Learning and Improvement',
    'Professionalism',
    'Interpersonal and Communication Skills'
  ];

  const milestoneLabels = [
    'Not Yet Completed Level 1',
    'Level 1', 
    'Level 2',
    'Level 3', 
    'Level 4',
    'Level 5',
    'Not Yet Assessable'
  ];

  useEffect(() => {
    loadTrainees();
  }, [user]);

  useEffect(() => {
    console.log('Selected trainee changed:', selectedTrainee);
    if (selectedTrainee) {
      loadCompetencyData(selectedTrainee);
    } else {
      console.log('No trainee selected yet');
    }
  }, [selectedTrainee]);

  const loadTrainees = async () => {
    try {
      setLoading(true);
      // Get all trainees in the admin's organization
      const response = await apiClient.getUsers();
      const traineeUsers = response.results.filter(
        (u: User) => u.role === 'trainee' && u.organization === user?.organization
      );
      console.log('Found trainees:', traineeUsers.map(t => ({id: t.id, name: t.name})));
      setTrainees(traineeUsers);
    } catch (error) {
      console.error('Error loading trainees:', error);
      Alert.alert('Error', 'Failed to load trainees');
    } finally {
      setLoading(false);
    }
  };

  const loadCompetencyData = async (traineeId: string) => {
    try {
      setLoading(true);
      console.log('Loading competency data for trainee ID:', traineeId);
      console.log('Expected trainee ID from database: 12b32cad-94e8-4996-a123-0945629e1b58');
      
      // Get all assessments for this trainee
      console.log('About to fetch assessments...');
      let assessments = [];
      try {
        assessments = await apiClient.getAssessmentsForTrainee(traineeId);
        console.log('Fetched assessments:', assessments.length);
        if (assessments.length > 0) {
          console.log('First assessment structure:', assessments[0]);
        } else {
          console.log('No assessments returned from API');
        }
      } catch (assessmentError) {
        console.error('Error fetching assessments:', assessmentError);
        assessments = [];
      }
      
      // Get all subcompetencies and their EPA relationships
      const subCompetenciesResponse = await apiClient.getSubCompetencies();
      const subCompetencyEPAsResponse = await apiClient.getSubCompetencyEPAs();
      
      console.log('Sub-competencies response:', subCompetenciesResponse);
      console.log('Sub-competency EPAs response:', subCompetencyEPAsResponse);
      
      const subCompetencies = subCompetenciesResponse.results || [];
      const subCompetencyEPAs = subCompetencyEPAsResponse.results || [];
      
      console.log('Processed:', subCompetencies.length, 'sub-competencies,', subCompetencyEPAs.length, 'EPA mappings');
      
      // Calculate competency data
      const competencyMap = new Map<string, {
        ratings: number[];
        subCompetency: any;
        coreCompetency: string;
      }>();

      // Initialize map with all subcompetencies
      subCompetencies.forEach((subComp: any) => {
        competencyMap.set(subComp.id, {
          ratings: [],
          subCompetency: subComp,
          coreCompetency: subComp.core_competency_title || 'Unknown'
        });
      });

      // Create EPA to SubCompetency mapping
      const epaToSubCompetencies = new Map<string, string[]>();
      subCompetencyEPAs.forEach((mapping: any) => {
        if (!epaToSubCompetencies.has(mapping.epa)) {
          epaToSubCompetencies.set(mapping.epa, []);
        }
        epaToSubCompetencies.get(mapping.epa)?.push(mapping.sub_competency);
      });
      
      console.log('EPA to SubCompetency mappings created:', epaToSubCompetencies.size, 'unique EPAs');
      console.log('Sample mapping EPA IDs:', Array.from(epaToSubCompetencies.keys()).slice(0, 3));

      // Collect all EPA ratings grouped by subcompetency
      let totalRatingsCollected = 0;
      let mappingsFound = 0;
      let mappingsNotFound = 0;
      
      // Log sample assessment EPA IDs for debugging
      console.log('About to process', assessments.length, 'assessments');
      if (assessments.length > 0 && assessments[0].assessment_epas?.length > 0) {
        console.log('Sample assessment EPA IDs:', assessments[0].assessment_epas.map((ae: any) => ae.epa).slice(0, 3));
      } else {
        console.log('No assessment EPAs found in first assessment');
      }
      
      assessments.forEach((assessment: any, index: number) => {
        if (index === 0) {
          console.log('Processing first assessment:', assessment.id, 'EPAs:', assessment.assessment_epas?.length || 0);
        }
        assessment.assessment_epas?.forEach((assessmentEpa: any) => {
          const subCompIds = epaToSubCompetencies.get(assessmentEpa.epa);
          if (subCompIds) {
            mappingsFound++;
            subCompIds.forEach((subCompId: string) => {
              const entry = competencyMap.get(subCompId);
              if (entry) {
                entry.ratings.push(assessmentEpa.entrustment_level);
                totalRatingsCollected++;
              }
            });
          } else {
            mappingsNotFound++;
            // Debug: log the EPA ID that wasn't found
            if (mappingsNotFound <= 3) {
              console.log(`Missing mapping for EPA: ${assessmentEpa.epa} (${assessmentEpa.epa_code})`);
            }
          }
        });
      });
      
      console.log(`EPA Mapping Results: ${mappingsFound} found, ${mappingsNotFound} not found`);
      console.log('Total ratings collected:', totalRatingsCollected);

      // Calculate averages and milestone levels
      const processedData: CompetencyData[] = [];
      competencyMap.forEach((entry, subCompId) => {
        if (entry.ratings.length > 0) {
          // Has assessment data - calculate average
          const average = entry.ratings.reduce((sum, rating) => sum + rating, 0) / entry.ratings.length;
          const milestoneLevel = Math.round(average);
          
          processedData.push({
            subCompetencyId: subCompId,
            subCompetencyTitle: entry.subCompetency.title,
            coreCompetencyTitle: entry.coreCompetency,
            averageRating: average,
            totalAssessments: entry.ratings.length,
            milestoneLevel: milestoneLevel
          });
        } else {
          // No assessment data - show as "Not Yet Completed"
          processedData.push({
            subCompetencyId: subCompId,
            subCompetencyTitle: entry.subCompetency.title,
            coreCompetencyTitle: entry.coreCompetency,
            averageRating: 0,
            totalAssessments: 0,
            milestoneLevel: 0 // 0 represents "Not Yet Completed"
          });
        }
      });
      
      console.log('Final processed data:', processedData.length, 'competencies with data');

      // Group by core competency and sort
      processedData.sort((a, b) => {
        if (a.coreCompetencyTitle !== b.coreCompetencyTitle) {
          return a.coreCompetencyTitle.localeCompare(b.coreCompetencyTitle);
        }
        return a.subCompetencyTitle.localeCompare(b.subCompetencyTitle);
      });

      setCompetencyData(processedData);
    } catch (error) {
      console.error('Error loading competency data:', error);
      console.error('Error details:', JSON.stringify(error));
      Alert.alert('Error', `Failed to load competency data: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const renderMilestoneCell = (level: number, targetLevel: number) => {
    const isActive = level === targetLevel;
    return (
      <View key={targetLevel} style={[
        styles.milestoneCell,
        isActive && styles.activeMilestoneCell
      ]}>
        {isActive && <View style={styles.milestoneDot} />}
      </View>
    );
  };

  const renderCompetencyRow = (item: CompetencyData, index: number) => {
    return (
      <View key={item.subCompetencyId} style={styles.competencyRow}>
        <View style={styles.competencyLabel}>
          <Text style={styles.competencyText} numberOfLines={2}>
            {item.subCompetencyTitle}
          </Text>
          <Text style={styles.assessmentCount}>
            ({item.totalAssessments} assessments)
          </Text>
        </View>
        
        <View style={styles.milestoneGrid}>
          {[0, 1, 2, 3, 4, 5, 6].map(level => 
            renderMilestoneCell(item.milestoneLevel, level)
          )}
        </View>
      </View>
    );
  };

  const renderCompetencySection = (categoryTitle: string, items: CompetencyData[]) => {
    if (items.length === 0) return null;

    return (
      <View key={categoryTitle} style={styles.competencySection}>
        <Text style={styles.sectionHeader}>{categoryTitle}</Text>
        {items.map((item, index) => renderCompetencyRow(item, index))}
      </View>
    );
  };

  const selectedTraineeData = trainees.find(t => t.id === selectedTrainee);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Card style={styles.headerCard}>
        <CardHeader>
          <CardTitle>Competency Grid</CardTitle>
          <Text style={styles.subtitle}>
            Visual milestone tracking for trainee competency development
          </Text>
        </CardHeader>
        
        <CardContent>
          <View style={styles.controls}>
            <Text style={styles.label}>Select Trainee:</Text>
            <Select
              key={`trainee-select-${user?.organization}-${trainees.length}`}
              value={selectedTrainee}
              onValueChange={setSelectedTrainee}
              placeholder={loading ? "Loading trainees..." : "Choose a trainee to view competency grid"}
              options={[
                { value: '', label: 'Select a trainee' },
                ...trainees.map(trainee => ({
                  value: trainee.id,
                  label: `${trainee.name} (${trainee.department || 'No Department'})`
                }))
              ]}
              disabled={loading || trainees.length === 0}
            />
          </View>
        </CardContent>
      </Card>

      {selectedTraineeData && (
        <Card style={styles.gridCard}>
          <CardHeader>
            <CardTitle>
              Milestone Summary: {selectedTraineeData.name}
            </CardTitle>
            <Text style={styles.programInfo}>
              Program: {selectedTraineeData.department || 'Unknown Department'}
            </Text>
          </CardHeader>

          <CardContent>
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#0066cc" />
                <Text style={styles.loadingText}>Loading competency data...</Text>
              </View>
            ) : competencyData.length > 0 ? (
              <View>
                {/* Grid Header */}
                <View style={styles.gridHeader}>
                  <View style={styles.headerLabel}>
                    <Text style={styles.headerText}>Competency</Text>
                  </View>
                  <View style={styles.milestoneHeader}>
                    {milestoneLabels.map((label, index) => (
                      <View key={index} style={styles.milestoneHeaderCell}>
                        <Text style={styles.milestoneHeaderText} numberOfLines={2}>
                          {label}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>

                {/* Competency Grid */}
                {competencyCategories.map(category => {
                  const categoryItems = competencyData.filter(
                    item => item.coreCompetencyTitle === category
                  );
                  return renderCompetencySection(category, categoryItems);
                })}
              </View>
            ) : selectedTrainee ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>
                  No assessment data available for this trainee
                </Text>
              </View>
            ) : null}
          </CardContent>
        </Card>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  headerCard: {
    margin: 16,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
  },
  controls: {
    marginTop: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 8,
  },
  gridCard: {
    margin: 16,
    marginTop: 8,
  },
  programInfo: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748b',
  },
  gridHeader: {
    flexDirection: 'row',
    borderBottomWidth: 2,
    borderBottomColor: '#e2e8f0',
    paddingBottom: 8,
    marginBottom: 16,
  },
  headerLabel: {
    flex: 2,
    paddingRight: 16,
  },
  headerText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  milestoneHeader: {
    flex: 3,
    flexDirection: 'row',
  },
  milestoneHeaderCell: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  milestoneHeaderText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#475569',
    textAlign: 'center',
  },
  competencySection: {
    marginBottom: 24,
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  competencyRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  competencyLabel: {
    flex: 2,
    paddingRight: 16,
  },
  competencyText: {
    fontSize: 14,
    color: '#1e293b',
    lineHeight: 18,
  },
  assessmentCount: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  milestoneGrid: {
    flex: 3,
    flexDirection: 'row',
  },
  milestoneCell: {
    flex: 1,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 4,
  },
  activeMilestoneCell: {
    backgroundColor: '#dbeafe',
  },
  milestoneDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#1d4ed8',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
  },
});
