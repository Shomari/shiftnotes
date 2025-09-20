/**
 * Competency Management component for managing core competencies and sub-competencies
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Alert,
  Modal,
  Dimensions,
  Platform,
} from 'react-native';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Select } from '../ui/Select';
import { 
  apiClient, 
  ApiCoreCompetency, 
  ApiSubCompetency,
  ApiProgram
} from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { 
  PencilSimple, 
  Trash, 
  X,
  Plus,
  CaretDown,
  CaretRight
} from 'phosphor-react-native';

const { width } = Dimensions.get('window');
const isTablet = width > 768;

interface CompetencyFormData {
  code: string;
  title: string;
  program: string;
}

interface SubCompetencyFormData {
  code: string;
  title: string;
  core_competency: string;
  program: string;
  milestone_level_1: string;
  milestone_level_2: string;
  milestone_level_3: string;
  milestone_level_4: string;
  milestone_level_5: string;
}

interface GroupedSubCompetencies {
  [coreCompetencyId: string]: {
    coreCompetency: ApiCoreCompetency;
    subCompetencies: ApiSubCompetency[];
  };
}

export function CompetencyManagement() {
  const { user } = useAuth();
  const [coreCompetencies, setCoreCompetencies] = useState<ApiCoreCompetency[]>([]);
  const [subCompetencies, setSubCompetencies] = useState<ApiSubCompetency[]>([]);
  const [program, setProgram] = useState<ApiProgram | null>(null);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSubCompetencyModal, setShowSubCompetencyModal] = useState(false);
  const [editingCompetency, setEditingCompetency] = useState<ApiCoreCompetency | null>(null);
  const [editingSubCompetency, setEditingSubCompetency] = useState<ApiSubCompetency | null>(null);
  const [expandedCompetencies, setExpandedCompetencies] = useState<Set<string>>(new Set());
  
  // Form state
  const [formData, setFormData] = useState<CompetencyFormData>({
    code: '',
    title: '',
    program: '',
  });
  
  // Validation error states
  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({});
  const [subCompetencyValidationErrors, setSubCompetencyValidationErrors] = useState<{[key: string]: string}>({});

  const [subCompetencyFormData, setSubCompetencyFormData] = useState<SubCompetencyFormData>({
    code: '',
    title: '',
    core_competency: '',
    program: '',
    milestone_level_1: '',
    milestone_level_2: '',
    milestone_level_3: '',
    milestone_level_4: '',
    milestone_level_5: '',
  });

  // Initialize when user is available and auto-load their program data
  useEffect(() => {
    if (user?.program) {
      setProgram({
        id: user.program,
        name: user.program_name || '',
        abbreviation: user.program_abbreviation || '',
        org: user.organization
      });
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    if (!user?.program) {
      console.error('No user program found');
      return;
    }

    setLoading(true);
    try {
      const [coreCompetenciesResponse, subCompetenciesResponse] = await Promise.all([
        apiClient.getCoreCompetencies(user.program),
        apiClient.getSubCompetencies(undefined, user.program),
      ]);

      setCoreCompetencies(coreCompetenciesResponse.results || []);
      setSubCompetencies(subCompetenciesResponse.results || []);
    } catch (error) {
      console.error('Error loading competencies:', error);
      Alert.alert('Error', 'Failed to load competencies');
    } finally {
      setLoading(false);
    }
  };

  // Group sub-competencies by core competency
  const groupedSubCompetencies: GroupedSubCompetencies = subCompetencies.reduce((acc, subComp) => {
    const coreId = subComp.core_competency;
    if (!acc[coreId]) {
      const coreComp = coreCompetencies.find(c => c.id === coreId);
      if (coreComp) {
        acc[coreId] = {
          coreCompetency: coreComp,
          subCompetencies: []
        };
      }
    }
    if (acc[coreId]) {
      acc[coreId].subCompetencies.push(subComp);
    }
    return acc;
  }, {} as GroupedSubCompetencies);

  const handleCreateCompetency = () => {
    setValidationErrors({});
    setFormData({
      code: '',
      title: '',
      program: user?.program || '',
    });
    setEditingCompetency(null);
    setShowCreateModal(true);
  };

  const handleEditCompetency = (competency: ApiCoreCompetency) => {
    setValidationErrors({});
    setFormData({
      code: competency.code,
      title: competency.title,
      program: competency.program,
    });
    setEditingCompetency(competency);
    setShowCreateModal(true);
  };

  const handleSaveCompetency = async () => {
    // Clear previous validation errors
    setValidationErrors({});
    
    // Validate required fields
    const fieldErrors: {[key: string]: string} = {};
    
    if (!formData.code || !formData.code.trim()) {
      fieldErrors.code = 'Please enter a competency code';
    }
    
    if (!formData.title || !formData.title.trim()) {
      fieldErrors.title = 'Please enter a competency title';
    }
    
    // If there are validation errors, set them and return
    if (Object.keys(fieldErrors).length > 0) {
      setValidationErrors(fieldErrors);
      return;
    }

    try {
      if (editingCompetency) {
        await apiClient.updateCoreCompetency(editingCompetency.id, formData);
      } else {
        await apiClient.createCoreCompetency(formData);
      }
      
      setShowCreateModal(false);
      await loadData();
      
      const successMessage = `Competency ${editingCompetency ? 'updated' : 'created'} successfully`;
      if (Platform.OS === 'web') {
        window.alert(successMessage);
      } else {
        Alert.alert('Success', successMessage);
      }
    } catch (error: any) {
      console.error('Error saving competency:', error);
      
      // Parse API error response
      let errorMessage = 'Failed to save competency. Please try again.';
      
      if (error.response && error.response.data) {
        console.log('Competency error response:', error.response.data);
        
        // Check for DRF ValidationError format
        if (error.response.data.code) {
          const codeError = Array.isArray(error.response.data.code) 
            ? error.response.data.code[0] 
            : error.response.data.code;
          setValidationErrors({ code: codeError });
          errorMessage = codeError;
        } else if (error.response.data.error) {
          errorMessage = error.response.data.error;
        }
      }
      
      if (Platform.OS === 'web') {
        window.alert(errorMessage);
      } else {
        Alert.alert('Error', errorMessage);
      }
    }
  };

  const handleDeleteCompetency = (competency: ApiCoreCompetency) => {
    Alert.alert(
      'Delete Competency',
      `Are you sure you want to delete "${competency.title}"? This will also delete all associated sub-competencies.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiClient.deleteCoreCompetency(competency.id);
              loadData();
              Alert.alert('Success', 'Competency deleted successfully');
            } catch (error) {
              console.error('Error deleting competency:', error);
              Alert.alert('Error', 'Failed to delete competency');
            }
          },
        },
      ]
    );
  };

  const handleCreateSubCompetency = (coreCompetency: ApiCoreCompetency) => {
    setSubCompetencyValidationErrors({});
    setSubCompetencyFormData({
      code: '',
      title: '',
      core_competency: coreCompetency.id,
      program: user?.program || '',
      milestone_level_1: '',
      milestone_level_2: '',
      milestone_level_3: '',
      milestone_level_4: '',
      milestone_level_5: '',
    });
    setEditingSubCompetency(null);
    setShowSubCompetencyModal(true);
  };

  const handleEditSubCompetency = (subCompetency: ApiSubCompetency) => {
    setSubCompetencyValidationErrors({});
    setSubCompetencyFormData({
      code: subCompetency.code,
      title: subCompetency.title,
      core_competency: subCompetency.core_competency,
      program: subCompetency.program,
      milestone_level_1: subCompetency.milestone_level_1 || '',
      milestone_level_2: subCompetency.milestone_level_2 || '',
      milestone_level_3: subCompetency.milestone_level_3 || '',
      milestone_level_4: subCompetency.milestone_level_4 || '',
      milestone_level_5: subCompetency.milestone_level_5 || '',
    });
    setEditingSubCompetency(subCompetency);
    setShowSubCompetencyModal(true);
  };

  const handleSaveSubCompetency = async () => {
    // Clear previous validation errors
    setSubCompetencyValidationErrors({});
    
    // Validate required fields
    const fieldErrors: {[key: string]: string} = {};
    
    if (!subCompetencyFormData.code || !subCompetencyFormData.code.trim()) {
      fieldErrors.code = 'Please enter a sub-competency code';
    }
    
    if (!subCompetencyFormData.title || !subCompetencyFormData.title.trim()) {
      fieldErrors.title = 'Please enter a sub-competency title';
    }
    
    if (!subCompetencyFormData.core_competency) {
      fieldErrors.core_competency = 'Please select a core competency';
    }
    
    // If there are validation errors, set them and return
    if (Object.keys(fieldErrors).length > 0) {
      setSubCompetencyValidationErrors(fieldErrors);
      return;
    }

    try {
      if (editingSubCompetency) {
        await apiClient.updateSubCompetency(editingSubCompetency.id, subCompetencyFormData);
      } else {
        await apiClient.createSubCompetency(subCompetencyFormData);
      }
      
      setShowSubCompetencyModal(false);
      await loadData();
      
      const successMessage = `Sub-competency ${editingSubCompetency ? 'updated' : 'created'} successfully`;
      if (Platform.OS === 'web') {
        window.alert(successMessage);
      } else {
        Alert.alert('Success', successMessage);
      }
    } catch (error: any) {
      console.error('Error saving sub-competency:', error);
      
      // Parse API error response
      let errorMessage = 'Failed to save sub-competency. Please try again.';
      
      if (error.response && error.response.data) {
        console.log('Sub-competency error response:', error.response.data);
        
        // Check for DRF ValidationError format
        if (error.response.data.code) {
          const codeError = Array.isArray(error.response.data.code) 
            ? error.response.data.code[0] 
            : error.response.data.code;
          setSubCompetencyValidationErrors({ code: codeError });
          errorMessage = codeError;
        } else if (error.response.data.error) {
          errorMessage = error.response.data.error;
        }
      }
      
      if (Platform.OS === 'web') {
        window.alert(errorMessage);
      } else {
        Alert.alert('Error', errorMessage);
      }
    }
  };

  const handleDeleteSubCompetency = (subCompetency: ApiSubCompetency) => {
    Alert.alert(
      'Delete Sub-Competency',
      `Are you sure you want to delete "${subCompetency.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiClient.deleteSubCompetency(subCompetency.id);
              loadData();
              Alert.alert('Success', 'Sub-competency deleted successfully');
            } catch (error) {
              console.error('Error deleting sub-competency:', error);
              Alert.alert('Error', 'Failed to delete sub-competency');
            }
          },
        },
      ]
    );
  };

  const toggleCompetencyExpansion = (competencyId: string) => {
    const newExpanded = new Set(expandedCompetencies);
    if (newExpanded.has(competencyId)) {
      newExpanded.delete(competencyId);
    } else {
      newExpanded.add(competencyId);
    }
    setExpandedCompetencies(newExpanded);
  };

  const renderCompetencyCard = (competency: ApiCoreCompetency) => {
    const isExpanded = expandedCompetencies.has(competency.id);
    const subComps = groupedSubCompetencies[competency.id]?.subCompetencies || [];

    return (
      <Card key={competency.id} style={styles.competencyCard}>
        <CardHeader>
          <View style={styles.competencyHeader}>
            <Pressable
              style={styles.competencyTitleContainer}
              onPress={() => toggleCompetencyExpansion(competency.id)}
            >
              {isExpanded ? (
                <CaretDown size={16} color="#6b7280" />
              ) : (
                <CaretRight size={16} color="#6b7280" />
              )}
              <Text style={styles.competencyCode}>{competency.code}</Text>
              <Text style={styles.competencyTitle}>{competency.title}</Text>
            </Pressable>
            <View style={styles.competencyActions}>
              <Pressable
                style={styles.actionButton}
                onPress={() => handleCreateSubCompetency(competency)}
              >
                <Plus size={16} color="#3b82f6" />
              </Pressable>
              <Pressable
                style={styles.actionButton}
                onPress={() => handleEditCompetency(competency)}
              >
                <PencilSimple size={16} color="#6b7280" />
              </Pressable>
              <Pressable
                style={styles.actionButton}
                onPress={() => handleDeleteCompetency(competency)}
              >
                <Trash size={16} color="#ef4444" />
              </Pressable>
            </View>
          </View>
        </CardHeader>
        
        {isExpanded && (
          <CardContent>
            <Text style={styles.subCompetenciesLabel}>
              Sub-Competencies ({subComps.length})
            </Text>
            {subComps.map((subComp) => (
              <View key={subComp.id} style={styles.subCompetencyItem}>
                <View style={styles.subCompetencyInfo}>
                  <Text style={styles.subCompetencyCode}>{subComp.code}</Text>
                  <Text style={styles.subCompetencyTitle}>{subComp.title}</Text>
                </View>
                <View style={styles.subCompetencyActions}>
                  <Pressable
                    style={styles.actionButton}
                    onPress={() => handleEditSubCompetency(subComp)}
                  >
                    <PencilSimple size={14} color="#6b7280" />
                  </Pressable>
                  <Pressable
                    style={styles.actionButton}
                    onPress={() => handleDeleteSubCompetency(subComp)}
                  >
                    <Trash size={14} color="#ef4444" />
                  </Pressable>
                </View>
              </View>
            ))}
            {subComps.length === 0 && (
              <Text style={styles.noSubCompetencies}>
                No sub-competencies yet. Click the + button to add one.
              </Text>
            )}
          </CardContent>
        )}
      </Card>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.pageTitle}>Competency Management</Text>
        <Text style={styles.pageSubtitle}>
          Manage core competencies and sub-competencies for your program
        </Text>
        
        {/* Program Info */}
        {program && (
          <View style={styles.programInfoContainer}>
            <Text style={styles.programInfoLabel}>
              Managing Competencies for: <Text style={styles.programInfoName}>{program.name} ({program.abbreviation})</Text>
            </Text>
          </View>
        )}
      </View>

      <ScrollView style={styles.content}>
        {program ? (
          <>
            {/* Add Competency Button */}
            <View style={styles.addButtonContainer}>
              <Button
                title="Add Core Competency"
                onPress={handleCreateCompetency}
                icon="plus"
                style={styles.addButton}
              />
            </View>

            {/* Competencies List */}
            <View style={styles.competenciesList}>
              {coreCompetencies.map(renderCompetencyCard)}
            </View>

            {coreCompetencies.length === 0 && (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>
                  No competencies found for this program. Create your first competency to get started.
                </Text>
              </View>
            )}
          </>
        ) : (
          <View style={styles.noProgramSelected}>
            <Text style={styles.noProgramText}>
              Loading program data...
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Create/Edit Competency Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {editingCompetency ? 'Edit Competency' : 'Add New Competency'}
            </Text>
            <Pressable
              style={styles.closeButton}
              onPress={() => setShowCreateModal(false)}
            >
              <X size={24} color="#6b7280" />
            </Pressable>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.field}>
              <Text style={styles.label}>Code *</Text>
              <Input
                value={formData.code}
                onChangeText={(text) => setFormData({ ...formData, code: text })}
                placeholder="e.g., COMP1"
                style={styles.input}
              />
              {validationErrors.code && (
                <Text style={styles.errorText}>{validationErrors.code}</Text>
              )}
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Title *</Text>
              <Input
                value={formData.title}
                onChangeText={(text) => setFormData({ ...formData, title: text })}
                placeholder="e.g., Patient Care and Procedural Skills"
                style={styles.input}
              />
              {validationErrors.title && (
                <Text style={styles.errorText}>{validationErrors.title}</Text>
              )}
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <Button
              title="Cancel"
              onPress={() => {
                setShowCreateModal(false);
                setValidationErrors({});
              }}
              style={[styles.button, styles.cancelButton]}
            />
            <Button
              title={editingCompetency ? 'Update' : 'Create'}
              onPress={handleSaveCompetency}
              style={[styles.button, styles.saveButton]}
            />
          </View>
        </View>
      </Modal>

      {/* Create/Edit Sub-Competency Modal */}
      <Modal
        visible={showSubCompetencyModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {editingSubCompetency ? 'Edit Sub-Competency' : 'Add New Sub-Competency'}
            </Text>
            <Pressable
              style={styles.closeButton}
              onPress={() => setShowSubCompetencyModal(false)}
            >
              <X size={24} color="#6b7280" />
            </Pressable>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.field}>
              <Text style={styles.label}>Code *</Text>
              <Input
                value={subCompetencyFormData.code}
                onChangeText={(text) => setSubCompetencyFormData({ ...subCompetencyFormData, code: text })}
                placeholder="e.g., COMP1.1"
                style={styles.input}
              />
              {subCompetencyValidationErrors.code && (
                <Text style={styles.errorText}>{subCompetencyValidationErrors.code}</Text>
              )}
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Title *</Text>
              <Input
                value={subCompetencyFormData.title}
                onChangeText={(text) => setSubCompetencyFormData({ ...subCompetencyFormData, title: text })}
                placeholder="e.g., Clinical Reasoning"
                style={styles.input}
              />
              {subCompetencyValidationErrors.title && (
                <Text style={styles.errorText}>{subCompetencyValidationErrors.title}</Text>
              )}
            </View>

            <Text style={styles.milestoneLabel}>Milestone Levels</Text>
            
            {[1, 2, 3, 4, 5].map((level) => (
              <View key={level} style={styles.field}>
                <Text style={styles.label}>Level {level}</Text>
                <Input
                  value={subCompetencyFormData[`milestone_level_${level}` as keyof SubCompetencyFormData] as string}
                  onChangeText={(text) => setSubCompetencyFormData({ 
                    ...subCompetencyFormData, 
                    [`milestone_level_${level}`]: text 
                  })}
                  placeholder={`Level ${level} description`}
                  style={styles.input}
                />
              </View>
            ))}
          </ScrollView>

          <View style={styles.modalFooter}>
            <Button
              title="Cancel"
              onPress={() => {
                setShowSubCompetencyModal(false);
                setSubCompetencyValidationErrors({});
              }}
              style={[styles.button, styles.cancelButton]}
            />
            <Button
              title={editingSubCompetency ? 'Update' : 'Create'}
              onPress={handleSaveSubCompetency}
              style={[styles.button, styles.saveButton]}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    padding: 20,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 8,
  },
  pageSubtitle: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 20,
  },
  programInfoContainer: {
    marginTop: 16,
    marginBottom: 8,
    padding: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
  },
  programInfoLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  programInfoName: {
    fontWeight: '600',
    color: '#1F2937',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  noProgramSelected: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  noProgramText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  addButtonContainer: {
    marginBottom: 20,
  },
  addButton: {
    alignSelf: 'flex-start',
  },
  competenciesList: {
    gap: 16,
  },
  competencyCard: {
    marginBottom: 16,
  },
  competencyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  competencyTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  competencyCode: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3b82f6',
    marginLeft: 8,
    marginRight: 12,
  },
  competencyTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1f2937',
    flex: 1,
  },
  competencyActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#f3f4f6',
  },
  subCompetenciesLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  subCompetencyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 6,
    marginBottom: 8,
  },
  subCompetencyInfo: {
    flex: 1,
  },
  subCompetencyCode: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 2,
  },
  subCompetencyTitle: {
    fontSize: 14,
    color: '#374151',
  },
  subCompetencyActions: {
    flexDirection: 'row',
    gap: 4,
  },
  noSubCompetencies: {
    fontSize: 14,
    color: '#9ca3af',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 20,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
  },
  closeButton: {
    padding: 4,
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  field: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  errorText: {
    fontSize: 12,
    color: '#ef4444',
    marginTop: 4,
  },
  milestoneLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginTop: 20,
    marginBottom: 16,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  button: {
    flex: 1,
  },
  cancelButton: {
    backgroundColor: '#f3f4f6',
  },
  saveButton: {
    backgroundColor: '#3b82f6',
  },
});
