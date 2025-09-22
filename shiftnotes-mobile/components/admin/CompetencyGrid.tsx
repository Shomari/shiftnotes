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
  Pressable,
} from 'react-native';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Select } from '../ui/Select';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { User } from '../../lib/types';
import { apiClient } from '../../lib/api';

// Web-only imports for react-datepicker
let DatePicker: any = null;
if (Platform.OS === 'web') {
  try {
    DatePicker = require('react-datepicker').default;
    try {
      require('react-datepicker/dist/react-datepicker.css');
    } catch (cssError) {
      console.warn('Could not load react-datepicker CSS:', cssError);
    }
    
    // Add custom styles for z-index fix with higher values
    const style = document.createElement('style');
    style.textContent = `
      .react-datepicker-popper {
        z-index: 999999 !important;
      }
      .react-datepicker {
        z-index: 999999 !important;
      }
      .react-datepicker__portal {
        z-index: 999999 !important;
        position: fixed !important;
      }
      .date-picker-popper {
        z-index: 999999 !important;
      }
      .react-datepicker-wrapper {
        width: 100%;
        z-index: 1000 !important;
        position: relative !important;
      }
      .react-datepicker__input-container {
        width: 100%;
        position: relative;
        z-index: 1000;
      }
      .react-datepicker__input-container input {
        width: 100% !important;
        position: relative;
        z-index: 1000;
      }
      .react-datepicker__tab-loop {
        z-index: 999999 !important;
      }
      .react-datepicker-ignore-onclickoutside {
        z-index: 999999 !important;
      }
    `;
    document.head.appendChild(style);
  } catch (e) {
    console.warn('Failed to load react-datepicker:', e);
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
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

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

  const toggleFilters = () => {
    setFiltersExpanded(!filtersExpanded);
  };

  // Check if any filters are active
  const hasActiveFilters = startDate || endDate;

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
        const startDateStr = startDate || undefined;
        const endDateStr = endDate || undefined;
        
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
          </View>
        </CardContent>
      </Card>

      {/* Filters Section */}
      {selectedTrainee && (
        <Card style={styles.filtersCard}>
          <CardHeader style={styles.filtersCardHeader}>
            <Pressable
              onPress={toggleFilters}
              style={styles.filtersToggleButton}
            >
              <View style={styles.filtersHeader}>
                <Text style={styles.filtersIcon}>📅</Text>
                <Text style={styles.filtersTitle}>Date Filters</Text>
                {hasActiveFilters && (
                  <View style={styles.activeFiltersBadge}>
                    <Text style={styles.activeFiltersText}>Active</Text>
                  </View>
                )}
                <View style={styles.filtersHeaderSpacer} />
                <Text style={styles.clickHint}>Click to {filtersExpanded ? 'collapse' : 'expand'}</Text>
                <View style={styles.expandArrowContainer}>
                  <Text style={[styles.expandIcon, { transform: [{ rotate: filtersExpanded ? '180deg' : '0deg' }] }]}>
                    ▼
                  </Text>
                </View>
              </View>
            </Pressable>
          </CardHeader>
          {filtersExpanded && (
            <CardContent>
              <View style={styles.filtersContainer}>
                {/* Date Filters */}
                <View style={styles.filterField}>
                  <Text style={styles.filterLabel}>Start Date</Text>
                  {Platform.OS === 'web' ? (
                    // Web: Use react-datepicker
                    DatePicker ? (
                      <View style={styles.datePickerContainer}>
                        <DatePicker
                          selected={startDate ? new Date(startDate) : null}
                          onChange={(date: Date | null) => {
                            if (date) {
                              setStartDate(date.toISOString().split('T')[0]);
                            } else {
                              setStartDate('');
                            }
                          }}
                          dateFormat="MM/dd/yyyy"
                          placeholderText="Select start date"
                          popperClassName="date-picker-popper"
                          wrapperClassName="date-picker-wrapper"
                          withPortal={true}
                          portalId="react-datepicker-portal-start"
                          isClearable
                          popperModifiers={[
                            {
                              name: 'offset',
                              options: {
                                offset: [0, 10],
                              },
                            },
                            {
                              name: 'preventOverflow',
                              options: {
                                rootBoundary: 'viewport',
                                tether: false,
                                altAxis: true,
                              },
                            },
                          ]}
                          customInput={
                            <input
                              style={{
                                width: '100%',
                                padding: '8px 12px',
                                border: '1px solid #d1d5db',
                                borderRadius: '6px',
                                fontSize: '14px',
                                backgroundColor: '#ffffff',
                                color: '#374151',
                                height: '36px',
                                cursor: 'pointer',
                                boxSizing: 'border-box',
                                position: 'relative',
                                zIndex: 1000,
                              }}
                            />
                          }
                        />
                      </View>
                    ) : (
                      // Fallback to simple input if DatePicker fails to load
                      <Input
                        style={styles.dateInput}
                        placeholder="mm/dd/yyyy"
                        value={startDate}
                        onChangeText={setStartDate}
                      />
                    )
                  ) : (
                    // Mobile: Use regular TextInput
                    <Input
                      style={styles.dateInput}
                      placeholder="mm/dd/yyyy"
                      value={startDate}
                      onChangeText={setStartDate}
                    />
                  )}
                </View>

                <View style={styles.filterField}>
                  <Text style={styles.filterLabel}>End Date</Text>
                  {Platform.OS === 'web' ? (
                    // Web: Use react-datepicker
                    DatePicker ? (
                      <View style={styles.datePickerContainer}>
                        <DatePicker
                          selected={endDate ? new Date(endDate) : null}
                          onChange={(date: Date | null) => {
                            if (date) {
                              setEndDate(date.toISOString().split('T')[0]);
                            } else {
                              setEndDate('');
                            }
                          }}
                          dateFormat="MM/dd/yyyy"
                          placeholderText="Select end date"
                          popperClassName="date-picker-popper"
                          wrapperClassName="date-picker-wrapper"
                          withPortal={true}
                          portalId="react-datepicker-portal-end"
                          isClearable
                          minDate={startDate ? new Date(startDate) : null}
                          popperModifiers={[
                            {
                              name: 'offset',
                              options: {
                                offset: [0, 10],
                              },
                            },
                            {
                              name: 'preventOverflow',
                              options: {
                                rootBoundary: 'viewport',
                                tether: false,
                                altAxis: true,
                              },
                            },
                          ]}
                          customInput={
                            <input
                              style={{
                                width: '100%',
                                padding: '8px 12px',
                                border: '1px solid #d1d5db',
                                borderRadius: '6px',
                                fontSize: '14px',
                                backgroundColor: '#ffffff',
                                color: '#374151',
                                height: '36px',
                                cursor: 'pointer',
                                boxSizing: 'border-box',
                                position: 'relative',
                                zIndex: 1000,
                              }}
                            />
                          }
                        />
                      </View>
                    ) : (
                      // Fallback to simple input if DatePicker fails to load
                      <Input
                        style={styles.dateInput}
                        placeholder="mm/dd/yyyy"
                        value={endDate}
                        onChangeText={setEndDate}
                      />
                    )
                  ) : (
                    // Mobile: Use regular TextInput
                    <Input
                      style={styles.dateInput}
                      placeholder="mm/dd/yyyy"
                      value={endDate}
                      onChangeText={setEndDate}
                    />
                  )}
                </View>

                {/* Clear Filters Button */}
                {hasActiveFilters && (
                  <View style={styles.filterField}>
                    <Button
                      title="Clear Date Filters"
                      onPress={() => {
                        setStartDate('');
                        setEndDate('');
                      }}
                      style={styles.clearFiltersButton}
                    />
                  </View>
                )}
              </View>
            </CardContent>
          )}
        </Card>
      )}
      
      {Platform.OS === 'web' && (
        <View style={{ height: 0, position: 'fixed', top: 0, left: 0, zIndex: 999999 }}>
          <div id="react-datepicker-portal-start" />
          <div id="react-datepicker-portal-end" />
        </View>
      )}

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
  
  // Filters
  filtersCard: {
    margin: 16,
    marginBottom: 8,
    backgroundColor: '#ffffff',
  },
  filtersCardHeader: {
    margin: 0,
    marginBottom: 0, // Override Card header default margin
    padding: 0,
  },
  filtersToggleButton: {
    padding: 0,
    margin: 0,
    justifyContent: 'center',
  },
  filtersHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  filtersIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  filtersTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
  },
  activeFiltersBadge: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 8,
  },
  activeFiltersText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#ffffff',
  },
  filtersHeaderSpacer: {
    flex: 1,
  },
  clickHint: {
    fontSize: 12,
    color: '#6b7280',
    fontStyle: 'italic',
    marginRight: 8,
  },
  expandArrowContainer: {
    paddingHorizontal: 4,
  },
  expandIcon: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '600',
  },
  filtersContainer: {
    gap: 16,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  filterField: {
    gap: 8,
    marginBottom: 4,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 6,
    marginLeft: 2,
  },
  dateInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    backgroundColor: '#ffffff',
    minHeight: 40,
  },
  datePickerContainer: {
    position: 'relative',
    zIndex: 10000,
    isolation: 'isolate',
  },
  clearFiltersButton: {
    alignSelf: 'flex-start',
    marginTop: 8,
  },
});
