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
  Modal,
  TouchableOpacity,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Select } from '../ui/Select';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { CustomDatePicker } from '../ui/DatePicker';
import { ExportButton } from '../ui/ExportButton';
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

interface Cohort {
  id: string;
  name: string;
  year: number;
  start_date: string;
  is_active: boolean;
  trainee_count: number;
}

export function CompetencyGrid({ user }: CompetencyGridProps) {
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [selectedCohort, setSelectedCohort] = useState<string>('');
  const [filteredTrainees, setFilteredTrainees] = useState<User[]>([]);
  const [selectedTrainee, setSelectedTrainee] = useState<string>('');
  const [competencyData, setCompetencyData] = useState<CompetencyData[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Date filter state
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Export modal state
  const [exportModalVisible, setExportModalVisible] = useState(false);
  const [exportStartDate, setExportStartDate] = useState('');
  const [exportEndDate, setExportEndDate] = useState('');

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
    loadCohorts();
  }, [user]);

  useEffect(() => {
    // Clear trainee selection and load trainees when cohort changes
    setSelectedTrainee('');
    if (selectedCohort) {
      loadTraineesForCohort(selectedCohort);
    } else {
      setFilteredTrainees([]);
    }
  }, [selectedCohort]);

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

  const loadCohorts = async () => {
    try {
      const cohorts = await apiClient.getCohorts();
      setCohorts(cohorts || []);
    } catch (error) {
      console.error('Failed to load cohorts:', error);
      Alert.alert('Error', 'Failed to load cohorts');
    }
  };

  const loadTraineesForCohort = async (cohortId: string) => {
    try {
      setLoading(true);
      // Get trainees for the specific cohort - much more efficient!
      const response = await apiClient.getCohortUsers(cohortId);
      
      // Filter to only trainees (the backend returns all users for the cohort)
      const traineeUsers = response.results?.filter((u: User) => u.role === 'trainee') || [];
      
      // Sort alphabetically by last name
      const sortedTrainees = traineeUsers.sort((a, b) => {
        const getLastName = (name: string) => {
          const parts = name.split(' ');
          return parts[parts.length - 1].toLowerCase();
        };
        
        const lastNameA = getLastName(a.name);
        const lastNameB = getLastName(b.name);
        
        return lastNameA.localeCompare(lastNameB);
      });
      
      console.log(`Found ${sortedTrainees.length} trainees for cohort:`, sortedTrainees.map(t => t.name));
      setFilteredTrainees(sortedTrainees);
    } catch (error) {
      console.error('Error loading trainees for cohort:', error);
      Alert.alert('Error', 'Failed to load trainees for selected cohort');
      setFilteredTrainees([]);
    } finally {
      setLoading(false);
    }
  };

  const loadCompetencyData = async (traineeId: string) => {
    try {
      setLoading(true);
      console.log('Loading competency data for trainee ID:', traineeId);
      
      // Use the new backend endpoint that does all calculations efficiently
      const gridData = await apiClient.getCompetencyGridData(traineeId, startDate, endDate);
      console.log('Received grid data:', gridData);
      
      // Transform backend data to match frontend interface
      const processedData: CompetencyData[] = [];
      
      for (const competency of gridData.competencies) {
        for (const subCompetency of competency.sub_competencies) {
          processedData.push({
            subCompetencyId: subCompetency.id,
            subCompetencyTitle: subCompetency.title,
            coreCompetencyTitle: competency.title,
            averageRating: subCompetency.average_entrustment || 0,
            totalAssessments: subCompetency.total_assessments,
            milestoneLevel: subCompetency.milestone_level || 0
          });
        }
      }
      
      console.log('Processed competency data:', processedData.length, 'items');
      console.log('Coverage:', gridData.summary.coverage_percentage + '%');
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

  const selectedTraineeData = filteredTrainees.find(t => t.id === selectedTrainee);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Card style={styles.headerCard}>
        <CardHeader>
          <View style={styles.headerContent}>
            <View style={styles.headerText}>
              <CardTitle>Competency Grid</CardTitle>
              <Text style={styles.subtitle}>
                Visual milestone tracking for trainee competency development
              </Text>
            </View>
            
            {/* Export Button - Leadership Only */}
            {user?.role === 'leadership' && (
              <TouchableOpacity
                style={styles.exportButton}
                onPress={() => setExportModalVisible(true)}
                activeOpacity={0.7}
              >
                <MaterialIcons name="file-download" size={18} color="#475569" />
                <Text style={styles.exportButtonText}>Export</Text>
              </TouchableOpacity>
            )}
          </View>
        </CardHeader>
        
        <CardContent>
          <View style={styles.controls}>
            <View style={styles.controlRow}>
              <View style={styles.controlGroup}>
                <Text style={styles.label}>Select Cohort:</Text>
                <Select
                  key={`cohort-select-${cohorts.length}`}
                  value={selectedCohort}
                  onValueChange={setSelectedCohort}
                  placeholder="Choose a cohort"
                  options={[
                    { value: '', label: 'Select a cohort' },
                    ...cohorts.map(cohort => ({
                      value: cohort.id,
                      label: cohort.name
                    }))
                  ]}
                  disabled={loading || cohorts.length === 0}
                />
              </View>
            </View>
            
            {selectedCohort && (
              <View style={styles.controlRow}>
                <View style={styles.controlGroup}>
                  <Text style={styles.label}>Select Trainee:</Text>
                  <Select
                    key={`trainee-select-${selectedCohort}-${filteredTrainees.length}`}
                    value={selectedTrainee}
                    onValueChange={setSelectedTrainee}
                    placeholder={filteredTrainees.length === 0 ? "No trainees in this cohort" : "Choose a trainee to view competency grid"}
                    options={[
                      { value: '', label: 'Select a trainee' },
                      ...filteredTrainees.map(trainee => ({
                        value: trainee.id,
                        label: trainee.name
                      }))
                    ]}
                    disabled={loading || filteredTrainees.length === 0}
                  />
                </View>
              </View>
            )}
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
                <View style={styles.dateFiltersSection}>
                  <Text style={styles.dateFiltersHelper}>* Filtered by shift date</Text>
                  <View style={styles.dateFiltersRow}>
                    <CustomDatePicker
                      label="Start Date"
                      value={startDate}
                      onChange={setStartDate}
                      placeholder="Select start date"
                    />

                    <CustomDatePicker
                      label="End Date"
                      value={endDate}
                      onChange={setEndDate}
                      placeholder="Select end date"
                    />
                  </View>
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
              Program: {selectedTraineeData.program_name || 'Emergency Medicine'}
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

      {/* Export Modal */}
      <Modal
        visible={exportModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setExportModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Export Competency Grid to CSV</Text>
              <TouchableOpacity
                onPress={() => setExportModalVisible(false)}
                style={styles.modalCloseButton}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.modalDescription}>
                Export program-wide competency grid data for all trainees. Optionally filter by date range or cohort:
              </Text>

              <View style={styles.modalDatePickers}>
                <CustomDatePicker
                  label="Start Date (Optional)"
                  value={exportStartDate}
                  onChange={setExportStartDate}
                  placeholder="Select start date"
                />

                <CustomDatePicker
                  label="End Date (Optional)"
                  value={exportEndDate}
                  onChange={setExportEndDate}
                  placeholder="Select end date"
                />
              </View>

              {selectedCohort && (
                <Text style={styles.modalFilterNote}>
                  📊 Current cohort filter will be applied
                </Text>
              )}
            </View>

            <View style={styles.modalFooter}>
              <Button
                title="Cancel"
                onPress={() => setExportModalVisible(false)}
                variant="outline"
                style={styles.modalCancelButton}
              />

              <View style={styles.modalExportButtonWrapper}>
                <ExportButton
                  exportType="competency-grid"
                  startDate={exportStartDate}
                  endDate={exportEndDate}
                  cohortId={selectedCohort || undefined}
                  disabled={false}
                  label="Export CSV"
                  onExportComplete={() => {
                    setExportModalVisible(false);
                    setExportStartDate('');
                    setExportEndDate('');
                  }}
                />
              </View>
            </View>
          </View>
        </View>
      </Modal>
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
  dateFiltersSection: {
    marginBottom: 8,
  },
  dateFiltersHelper: {
    fontSize: 12,
    color: '#6b7280',
    fontStyle: 'italic',
    marginBottom: 12,
  },
  dateFiltersRow: {
    gap: 16,
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
  // Header styles
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  exportButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  exportButtonText: {
    color: '#475569',
    fontSize: 13,
    fontWeight: '500',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    width: '100%',
    maxWidth: 500,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    overflow: 'visible',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1e293b',
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
  },
  modalCloseText: {
    fontSize: 20,
    color: '#64748b',
    fontWeight: '600',
  },
  modalBody: {
    padding: 20,
    overflow: 'visible',
  },
  modalDescription: {
    fontSize: 16,
    color: '#475569',
    marginBottom: 20,
  },
  modalDatePickers: {
    gap: 16,
  },
  modalFilterNote: {
    marginTop: 16,
    fontSize: 14,
    color: '#3b82f6',
    fontStyle: 'italic',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  modalCancelButton: {
    flex: 1,
  },
  modalExportButtonWrapper: {
    flex: 1,
  },
});
