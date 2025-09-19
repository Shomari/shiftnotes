/**
 * Competency Grid component for Coordinator users
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
  Platform,
} from 'react-native';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Select } from '../ui/Select';
import { Input } from '../ui/Input';
import { User } from '../../lib/types';
import { apiClient } from '../../lib/api';

// Web-only import for date picker
let DatePicker: any = null;
if (Platform.OS === 'web') {
  try {
    DatePicker = require('react-datepicker');
    require('react-datepicker/dist/react-datepicker.css');
  } catch (e) {
    console.log('react-datepicker not available');
  }
}

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
  
  // Date filter state
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);

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
    'Not Yet Completed',
    'Level 1', 
    'Level 1.5',
    'Level 2',
    'Level 2.5',
    'Level 3',
    'Level 3.5', 
    'Level 4',
    'Level 4.5',
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
  }, [selectedTrainee, startDate, endDate]);

  // Function to round up to nearest 0.5
  const roundUpToNearestHalf = (value: number): number => {
    return Math.ceil(value * 2) / 2;
  };

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
        // Format date parameters if they exist
        const startDateStr = startDate ? startDate.toISOString().split('T')[0] : undefined;
        const endDateStr = endDate ? endDate.toISOString().split('T')[0] : undefined;
        
        assessments = await apiClient.getAssessmentsForTrainee(traineeId, startDateStr, endDateStr);
        console.log('Fetched assessments:', assessments.length, 'with date filter:', { startDateStr, endDateStr });
        if (assessments.length > 0) {
          console.log('First assessment structure:', assessments[0]);
        } else {
          console.log('No assessments returned from API');
        }
      } catch (assessmentError) {
        console.error('Error fetching assessments:', assessmentError);
        assessments = [];
      }
      
      // Get the selected trainee and their program
      const selectedTraineeData = trainees.find(t => t.id === traineeId);
      if (!selectedTraineeData) {
        console.error('Selected trainee not found');
        return;
      }
      
      // Determine trainee's program - each trainee belongs to one program
      let traineeProgram = null;
      if (selectedTraineeData.program) {
        traineeProgram = selectedTraineeData.program;
      } else {
        // Fallback: infer program from department/specialty
        const department = selectedTraineeData.department;
        console.log('No program found, inferring from department:', department);
        
        // Get all programs to match by specialty
        const programsResponse = await apiClient.getPrograms(user?.organization || '');
        const allPrograms = programsResponse.results || [];
        traineeProgram = allPrograms.find(p => 
          department && (
            department.toLowerCase().includes(p.specialty.toLowerCase()) ||
            p.specialty.toLowerCase().includes(department.toLowerCase())
          )
        );
      }
      
      if (!traineeProgram) {
        Alert.alert('Error', 'Could not determine trainee program');
        return;
      }
      
      console.log('Trainee program:', traineeProgram.name, traineeProgram.id);
      
      // Get ALL sub-competencies for this specific program
      const subCompetenciesResponse = await apiClient.getSubCompetencies(undefined, traineeProgram.id);
      const subCompetencyEPAsResponse = await apiClient.getSubCompetencyEPAs();
      
      console.log('Sub-competencies response:', subCompetenciesResponse);
      
      const subCompetencies = subCompetenciesResponse.results || [];
      const subCompetencyEPAs = subCompetencyEPAsResponse.results || [];
      
      console.log(`Found ${subCompetencies.length} sub-competencies for program: ${traineeProgram.name}`);
      
      // STEP 1: Initialize ALL sub-competencies with empty data (shows complete grid)
      const competencyMap = new Map<string, {
        ratings: number[];
        subCompetency: any;
        coreCompetency: string;
      }>();

      subCompetencies.forEach((subComp: any) => {
        competencyMap.set(subComp.id, {
          ratings: [],
          subCompetency: subComp,
          coreCompetency: subComp.core_competency_title || 'Unknown'
        });
      });

      // STEP 2: Create EPA to SubCompetency mapping (for filling in assessment data)
      const epaToSubCompetencies = new Map<string, string[]>();
      subCompetencyEPAs.forEach((mapping: any) => {
        if (!epaToSubCompetencies.has(mapping.epa)) {
          epaToSubCompetencies.set(mapping.epa, []);
        }
        epaToSubCompetencies.get(mapping.epa)?.push(mapping.sub_competency);
      });
      
      console.log('EPA to SubCompetency mappings created:', epaToSubCompetencies.size, 'unique EPAs');
      console.log('Sample mapping EPA IDs:', Array.from(epaToSubCompetencies.keys()).slice(0, 3));

      // STEP 3: Fill in assessment data where available
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

      // STEP 4: Generate final data for ALL sub-competencies (complete grid)
      const processedData: CompetencyData[] = [];
      competencyMap.forEach((entry, subCompId) => {
        if (entry.ratings.length > 0) {
          // Has assessment data - calculate average milestone level (round up to nearest 0.5)
          const average = entry.ratings.reduce((sum, rating) => sum + rating, 0) / entry.ratings.length;
          const milestoneLevel = roundUpToNearestHalf(average);
          
          processedData.push({
            subCompetencyId: subCompId,
            subCompetencyTitle: entry.subCompetency.title,
            coreCompetencyTitle: entry.coreCompetency,
            averageRating: average,
            totalAssessments: entry.ratings.length,
            milestoneLevel: milestoneLevel
          });
        } else {
          // No assessment data - show as "Not Yet Completed" (level 0)
          processedData.push({
            subCompetencyId: subCompId,
            subCompetencyTitle: entry.subCompetency.title,
            coreCompetencyTitle: entry.coreCompetency,
            averageRating: 0,
            totalAssessments: 0,
            milestoneLevel: 0 // 0 = "Not Yet Completed"
          });
        }
      });
      
      console.log(`Final grid: ${processedData.length} total sub-competencies (showing complete program curriculum)`);

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

  const renderMatrixCell = (competency: CompetencyData, targetLevel: number | string) => {
    const isCurrentLevel = competency.milestoneLevel === targetLevel;
    const hasData = competency.totalAssessments > 0;
    const isNoDataColumn = targetLevel === 'none';
    
    // Show filled circle for current level or no data column when appropriate
    const shouldShowCircle = (isCurrentLevel && hasData) || (isNoDataColumn && !hasData);
    
    return (
      <View key={targetLevel} style={[
        styles.matrixCell,
        shouldShowCircle && styles.activeMatrixCell,
        !shouldShowCircle && styles.emptyMatrixCell
      ]}>
        {shouldShowCircle && (
          <View style={styles.levelCircle} />
        )}
      </View>
    );
  };

  const renderMatrixRow = (item: CompetencyData, index: number) => {
    const levels = ['none', 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5];
    
    return (
      <View key={item.subCompetencyId} style={styles.matrixRow}>
        <View style={styles.competencyLabel}>
          <Text style={styles.competencyText} numberOfLines={3}>
            {item.subCompetencyTitle}
          </Text>
          <Text style={styles.assessmentCount}>
            {item.totalAssessments > 0 ? `${item.totalAssessments} assessments` : 'No data'}
          </Text>
        </View>
        
        <View style={styles.matrixCells}>
          {levels.map(level => renderMatrixCell(item, level))}
        </View>
      </View>
    );
  };

  const renderMatrixHeader = () => {
    const levels = ['none', 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5];
    
    return (
      <View style={styles.matrixHeader}>
        <View style={styles.competencyLabelHeader}>
          <Text style={styles.headerText}>Sub-Competency</Text>
        </View>
        <View style={styles.matrixCells}>
          {levels.map(level => (
            <View key={level} style={styles.levelHeader}>
              <Text style={styles.levelHeaderText}>
                {level === 'none' ? 'No Data' : level}
              </Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderCompetencySection = (categoryTitle: string, items: CompetencyData[]) => {
    if (items.length === 0) return null;

    return (
      <View key={categoryTitle} style={styles.competencySection}>
        <Text style={styles.sectionHeader}>{categoryTitle}</Text>
        {items.map((item, index) => renderMatrixRow(item, index))}
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
            <View style={styles.controlRow}>
              <View style={styles.controlGroup}>
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
            </View>
            
            {/* Date Filter Controls */}
            <View style={styles.controlRow}>
              <View style={styles.controlGroup}>
                <Text style={styles.label}>Date Range (Optional):</Text>
                <View style={styles.dateFilters}>
                  {Platform.OS === 'web' && DatePicker ? (
                    <>
                      <View style={styles.datePickerContainer}>
                        <Text style={styles.dateLabel}>From:</Text>
                        <DatePicker.default
                          selected={startDate}
                          onChange={(date: Date | null) => setStartDate(date)}
                          placeholderText="Start date"
                          dateFormat="yyyy-MM-dd"
                          className="date-picker-input"
                          isClearable
                        />
                      </View>
                      <View style={styles.datePickerContainer}>
                        <Text style={styles.dateLabel}>To:</Text>
                        <DatePicker.default
                          selected={endDate}
                          onChange={(date: Date | null) => setEndDate(date)}
                          placeholderText="End date"
                          dateFormat="yyyy-MM-dd"
                          className="date-picker-input"
                          isClearable
                          minDate={startDate}
                        />
                      </View>
                    </>
                  ) : (
                    <>
                      <View style={styles.dateInputContainer}>
                        <Text style={styles.dateLabel}>From:</Text>
                        <Input
                          value={startDate ? startDate.toISOString().split('T')[0] : ''}
                          onChangeText={(text) => {
                            if (text) {
                              const date = new Date(text);
                              if (!isNaN(date.getTime())) {
                                setStartDate(date);
                              }
                            } else {
                              setStartDate(null);
                            }
                          }}
                          placeholder="YYYY-MM-DD"
                          style={styles.dateInput}
                        />
                      </View>
                      <View style={styles.dateInputContainer}>
                        <Text style={styles.dateLabel}>To:</Text>
                        <Input
                          value={endDate ? endDate.toISOString().split('T')[0] : ''}
                          onChangeText={(text) => {
                            if (text) {
                              const date = new Date(text);
                              if (!isNaN(date.getTime())) {
                                setEndDate(date);
                              }
                            } else {
                              setEndDate(null);
                            }
                          }}
                          placeholder="YYYY-MM-DD"
                          style={styles.dateInput}
                        />
                      </View>
                    </>
                  )}
                </View>
                <Text style={styles.helpText}>
                  Filter assessments by date range. Leave empty to include all assessments.
                </Text>
              </View>
            </View>
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
              <ScrollView horizontal showsHorizontalScrollIndicator={true}>
                <View style={styles.matrixContainer}>
                  {/* Matrix Header */}
                  {renderMatrixHeader()}
                  
                  {/* Competency Matrix */}
                  {competencyCategories.map(category => {
                    const categoryItems = competencyData.filter(
                      item => item.coreCompetencyTitle === category
                    );
                    return renderCompetencySection(category, categoryItems);
                  })}
                </View>
              </ScrollView>
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
    paddingHorizontal: 1,
  },
  milestoneHeaderText: {
    fontSize: 9,
    fontWeight: '500',
    color: '#475569',
    textAlign: 'center',
    lineHeight: 11,
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
  matrixContainer: {
    minWidth: 1060, // Ensure enough space for the matrix (10 columns now)
  },
  matrixHeader: {
    flexDirection: 'row',
    borderBottomWidth: 2,
    borderBottomColor: '#e2e8f0',
    paddingBottom: 8,
    marginBottom: 8,
    backgroundColor: '#f8fafc',
  },
  competencyLabelHeader: {
    width: 250,
    paddingRight: 16,
    justifyContent: 'center',
  },
  headerText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
  },
  levelHeader: {
    width: 60,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  levelHeaderText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  matrixRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingVertical: 8,
    alignItems: 'center',
  },
  competencyLabel: {
    width: 250,
    paddingRight: 16,
    justifyContent: 'center',
  },
  competencyText: {
    fontSize: 13,
    color: '#1e293b',
    lineHeight: 16,
  },
  assessmentCount: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  matrixCells: {
    flexDirection: 'row',
  },
  matrixCell: {
    width: 60,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
  },
  activeMatrixCell: {
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
  },
  emptyMatrixCell: {
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
  },
  levelCircle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#000000',
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
  controlRow: {
    marginBottom: 16,
  },
  controlGroup: {
    flex: 1,
  },
  dateFilters: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 8,
  },
  datePickerContainer: {
    flex: 1,
    minWidth: 150,
  },
  dateInputContainer: {
    flex: 1,
    minWidth: 150,
  },
  dateLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 4,
  },
  dateInput: {
    fontSize: 14,
  },
  helpText: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 8,
    fontStyle: 'italic',
  },
});
