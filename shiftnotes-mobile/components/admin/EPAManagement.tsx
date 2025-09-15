/**
 * EPA Management component for Admin users
 * Redesigned to match the image layout with statistics and sections
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Modal,
  Dimensions,
  Platform,
  Alert,
} from 'react-native';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
// import { Checkbox } from '../ui/Checkbox';
import { 
  apiClient, 
  ApiEPA, 
  ApiCoreCompetency, 
  ApiSubCompetency, 
  ApiSubCompetencyEPA,
  ApiEPACategory,
  ApiProgram
} from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { 
  PencilSimple, 
  Trash, 
  X,
  CaretDown,
  CaretRight,
  ToggleLeft,
  ToggleRight
} from 'phosphor-react-native';

const { width } = Dimensions.get('window');
const isTablet = width >= 768;

interface EPAFormData {
  code: string;
  title: string;
  description: string;
  category: string;
  is_active: boolean;
  sub_competencies: string[];
}

interface GroupedSubCompetencies {
  [coreCompetencyId: string]: {
    coreCompetency: ApiCoreCompetency;
    subCompetencies: ApiSubCompetency[];
  };
}

export function EPAManagement() {
  const { user } = useAuth();
  const [epas, setEPAs] = useState<ApiEPA[]>([]);
  const [epaCategories, setEpaCategories] = useState<ApiEPACategory[]>([]);
  const [coreCompetencies, setCoreCompetencies] = useState<ApiCoreCompetency[]>([]);
  const [subCompetencies, setSubCompetencies] = useState<ApiSubCompetency[]>([]);
  const [subCompetencyEPAs, setSubCompetencyEPAs] = useState<ApiSubCompetencyEPA[]>([]);
  const [program, setProgram] = useState<ApiProgram | null>(null);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingEPA, setEditingEPA] = useState<ApiEPA | null>(null);
  const [expandedCompetencies, setExpandedCompetencies] = useState<Set<string>>(new Set());
  
  // Form state
  const [formData, setFormData] = useState<EPAFormData>({
    code: '',
    title: '',
    description: '',
    category: '',
    is_active: true,
    sub_competencies: [],
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
      const [epasResponse, epaCategoriesResponse, coreCompetenciesResponse, subCompetenciesResponse, subCompetencyEPAsResponse] = await Promise.all([
        apiClient.getEPAs(user.program),
        apiClient.getEPACategories(user.program),
        apiClient.getCoreCompetencies(),
        apiClient.getSubCompetencies(),
        apiClient.getSubCompetencyEPAs(),
      ]);

      setEPAs(epasResponse.results || []);
      setEpaCategories(epaCategoriesResponse.results || []);
      setCoreCompetencies(coreCompetenciesResponse.results || []);
      setSubCompetencies(subCompetenciesResponse.results || []);
      setSubCompetencyEPAs(subCompetencyEPAsResponse.results || []);
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', 'Failed to load data');
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
          subCompetencies: [],
        };
      }
    }
    if (acc[coreId]) {
      acc[coreId].subCompetencies.push(subComp);
    }
    return acc;
  }, {} as GroupedSubCompetencies);

  // Calculate active EPAs for section title
  const activeEPAs = epas.filter(epa => epa.is_active).length;

  // Group EPAs by category
  const epasByCategory = epas.reduce((acc, epa) => {
    const categoryName = epa.category_title || epa.category;
    if (!acc[categoryName]) {
      acc[categoryName] = [];
    }
    acc[categoryName].push(epa);
    return acc;
  }, {} as Record<string, ApiEPA[]>);

  const handleCreateEPA = () => {
    setEditingEPA(null);
    setFormData({
      code: 'EPA 23', // Pre-filled as shown in image
      title: '',
      description: '',
      category: '',
      is_active: true,
      sub_competencies: [],
    });
    setShowCreateModal(true);
  };

  const handleEditEPA = (epa: ApiEPA) => {
    setEditingEPA(epa);
    setFormData({
      code: epa.code,
      title: epa.title,
      description: epa.description || '',
      category: epa.category,
      is_active: epa.is_active || true,
      sub_competencies: epa.sub_competencies?.map(sc => sc.id) || [],
    });
    setShowCreateModal(true);
  };

  const handleSaveEPA = async () => {
    if (!formData.code || !formData.title || !formData.category) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const epaData = {
        code: formData.code,
        title: formData.title,
        description: formData.description,
        category: formData.category,
        is_active: formData.is_active,
        program: user?.program || '',
      };

      let savedEPA: ApiEPA;
      if (editingEPA) {
        // Update existing EPA
        savedEPA = await apiClient.updateEPA(editingEPA.id, epaData);
      } else {
        // Create new EPA
        savedEPA = await apiClient.createEPA(epaData);
      }

      // Handle sub-competency relationships
      await handleSubCompetencyRelationships(savedEPA.id);

      setShowCreateModal(false);
      loadData();
      Alert.alert('Success', `EPA ${editingEPA ? 'updated' : 'created'} successfully`);
    } catch (error) {
      console.error('Error saving EPA:', error);
      Alert.alert('Error', 'Failed to save EPA');
    } finally {
      setLoading(false);
    }
  };

  const handleSubCompetencyRelationships = async (epaId: string) => {
    // Get current relationships for this EPA
    const currentRelationships = subCompetencyEPAs.filter(rel => rel.epa === epaId);
    const currentSubCompIds = currentRelationships.map(rel => rel.sub_competency);

    // Determine which relationships to add and remove
    const toAdd = formData.sub_competencies.filter(id => !currentSubCompIds.includes(id));
    const toRemove = currentSubCompIds.filter(id => !formData.sub_competencies.includes(id));

    // Remove old relationships
    for (const rel of currentRelationships) {
      if (toRemove.includes(rel.sub_competency)) {
        await apiClient.deleteSubCompetencyEPA(rel.id);
      }
    }

    // Add new relationships
    for (const subCompId of toAdd) {
      await apiClient.createSubCompetencyEPA({
        sub_competency: subCompId,
        epa: epaId,
      });
    }
  };

  const handleDeleteEPA = async (epa: ApiEPA) => {
    Alert.alert(
      'Delete EPA',
      `Are you sure you want to delete "${epa.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              await apiClient.deleteEPA(epa.id);
              loadData();
              Alert.alert('Success', 'EPA deleted successfully');
            } catch (error) {
              console.error('Error deleting EPA:', error);
              Alert.alert('Error', 'Failed to delete EPA');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const toggleCompetencyExpansion = (coreId: string) => {
    setExpandedCompetencies(prev => {
      const newSet = new Set(prev);
      if (newSet.has(coreId)) {
        newSet.delete(coreId);
      } else {
        newSet.add(coreId);
      }
      return newSet;
    });
  };

  const toggleSubCompetencySelection = (subCompId: string) => {
    setFormData(prev => ({
      ...prev,
      sub_competencies: prev.sub_competencies.includes(subCompId)
        ? prev.sub_competencies.filter(id => id !== subCompId)
        : [...prev.sub_competencies, subCompId],
    }));
  };

  const getSubCompetencyDisplayName = (subComp: ApiSubCompetency) => {
    const coreComp = coreCompetencies.find(c => c.id === subComp.core_competency);
    const coreTitle = coreComp?.title || 'Unknown';
    const subCompNumber = subComp.code.replace(/[^\d]/g, '') || '';
    return `${coreTitle} ${subCompNumber}: ${subComp.title}`;
  };


  const renderEPACard = (epa: ApiEPA) => (
    <Card key={epa.id} style={styles.epaCard}>
      <CardContent>
        <View style={styles.epaHeader}>
          <View style={styles.epaInfo}>
            <View style={styles.epaTitleRow}>
              <View style={[styles.categoryTag, { backgroundColor: getCategoryColor(epa.category_title || epa.category) }]}>
                <Text style={styles.categoryText}>{epa.category_title || epa.category}</Text>
              </View>
            </View>
            <Text style={styles.epaTitle}>{epa.title}</Text>
            <Text style={styles.epaDescription}>{epa.description}</Text>
          </View>
          <View style={styles.epaActions}>
            <Pressable
              style={styles.actionButton}
              onPress={() => handleEditEPA(epa)}
            >
              <PencilSimple size={16} color="#3b82f6" />
            </Pressable>
            <Pressable
              style={styles.actionButton}
              onPress={() => handleDeleteEPA(epa)}
            >
              <Trash size={16} color="#ef4444" />
            </Pressable>
          </View>
        </View>
      </CardContent>
    </Card>
  );

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      'Emergency Care': '#ef4444',
      'Patient Assessment': '#3b82f6',
      'Procedural Skills': '#10b981',
      'Communication': '#f59e0b',
      'Professionalism': '#8b5cf6',
      'Systems-Based Practice': '#06b6d4',
    };
    return colors[category] || '#6b7280';
  };

  const renderSubCompetencySelector = () => (
    <View style={styles.subCompetencySelector}>
      <Text style={styles.label}>Associated Sub-Competencies</Text>
      <Text style={styles.helperText}>
        Select the sub-competencies that this EPA addresses
      </Text>
      
      <ScrollView style={styles.competencyList} nestedScrollEnabled>
        {Object.entries(groupedSubCompetencies).map(([coreId, group]) => (
          <View key={coreId} style={styles.competencyGroup}>
            <Pressable
              style={styles.competencyHeader}
              onPress={() => toggleCompetencyExpansion(coreId)}
            >
              <Text style={styles.competencyTitle}>{group.coreCompetency.title}</Text>
              {expandedCompetencies.has(coreId) ? (
                <CaretDown size={16} color="#64748b" />
              ) : (
                <CaretRight size={16} color="#64748b" />
              )}
            </Pressable>
            
            {expandedCompetencies.has(coreId) && (
              <View style={styles.subCompetencyList}>
                {group.subCompetencies.map((subComp) => (
                  <Pressable
                    key={subComp.id}
                    style={styles.subCompetencyItem}
                    onPress={() => toggleSubCompetencySelection(subComp.id)}
                  >
                    <View style={[styles.checkbox, formData.sub_competencies.includes(subComp.id) && styles.checkboxChecked]}>
                      {formData.sub_competencies.includes(subComp.id) && (
                        <Text style={styles.checkmark}>✓</Text>
                      )}
                    </View>
                    <Text style={styles.subCompetencyText}>
                      {getSubCompetencyDisplayName(subComp)}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        ))}
      </ScrollView>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.pageTitle}>EPA Bank Management</Text>
        <Text style={styles.pageSubtitle}>
          Manage the library of Entrustable Professional Activities (EPAs) used in assessments
        </Text>
        
        {/* Program Info */}
        {program && (
          <View style={styles.programInfoContainer}>
            <Text style={styles.programInfoLabel}>
              Managing EPAs for: <Text style={styles.programInfoName}>{program.name} ({program.abbreviation})</Text>
            </Text>
          </View>
        )}
      </View>

      <ScrollView style={styles.content}>
        {program ? (
          <>
            {/* Add EPA Button */}
            <View style={styles.addButtonContainer}>
              <Button
                title="Add EPA"
                onPress={handleCreateEPA}
                style={styles.addButton}
                icon="plus"
              />
            </View>

        {/* Active EPAs Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Active EPAs ({activeEPAs})</Text>
          <Text style={styles.sectionDescription}>
            EPAs currently available for use in assessments
          </Text>
          
          {Object.entries(epasByCategory).map(([category, categoryEPAs]) => (
            <View key={category} style={styles.categorySection}>
              {categoryEPAs.filter(epa => epa.is_active).map(renderEPACard)}
            </View>
          ))}
        </View>
          </>
        ) : (
          <View style={styles.noProgramSelected}>
            <Text style={styles.noProgramText}>
              Loading program data...
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Create/Edit Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {editingEPA ? 'Edit EPA' : 'Create New EPA'}
            </Text>
            <Text style={styles.modalSubtitle}>
              {editingEPA ? 'Update EPA details' : 'Add a new EPA to the assessment bank.'}
            </Text>
            <Pressable
              style={styles.closeButton}
              onPress={() => setShowCreateModal(false)}
            >
              <X size={24} color="#64748b" />
            </Pressable>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.field}>
              <Text style={styles.label}>EPA Code *</Text>
              <Input
                value={formData.code}
                onChangeText={(text) => setFormData(prev => ({ ...prev, code: text }))}
                placeholder="EPA 23"
                style={styles.input}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Category *</Text>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                placeholder="Select category"
                options={Array.from(new Set(epaCategories.map(cat => cat.title))).map(title => ({
                  label: title,
                  value: title,
                }))}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Title *</Text>
              <Input
                value={formData.title}
                onChangeText={(text) => setFormData(prev => ({ ...prev, title: text }))}
                placeholder="Brief title describing the EPA"
                style={styles.input}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Description *</Text>
              <Input
                value={formData.description}
                onChangeText={(text) => setFormData(prev => ({ ...prev, description: text }))}
                placeholder="Detailed description of what this EPA involves"
                multiline
                numberOfLines={4}
                style={[styles.input, styles.textArea]}
              />
            </View>

            {renderSubCompetencySelector()}

            <View style={styles.field}>
              <Text style={styles.label}>Active Status</Text>
              <Pressable
                style={styles.toggleRow}
                onPress={() => setFormData(prev => ({ ...prev, is_active: !prev.is_active }))}
              >
                {formData.is_active ? (
                  <ToggleRight size={32} color="#3b82f6" />
                ) : (
                  <ToggleLeft size={32} color="#d1d5db" />
                )}
                <Text style={styles.toggleLabel}>
                  {formData.is_active ? 'Active' : 'Inactive'}
                </Text>
              </Pressable>
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <Button
              title="Cancel"
              onPress={() => setShowCreateModal(false)}
              style={styles.cancelButton}
              textStyle={styles.cancelButtonText}
            />
            <Button
              title={loading ? 'Saving...' : editingEPA ? 'Update EPA' : 'Create EPA'}
              onPress={handleSaveEPA}
              style={styles.saveButton}
              textStyle={styles.saveButtonText}
              disabled={loading}
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
    backgroundColor: '#f8fafc',
  },
  header: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
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
  noProgramSelected: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  noProgramText: {
    fontSize: 18,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  pageSubtitle: {
    fontSize: 16,
    color: '#64748b',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  addButtonContainer: {
    marginBottom: 24,
    alignItems: 'flex-end',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  addButtonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 16,
  },
  categorySection: {
    marginBottom: 24,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
    paddingLeft: 8,
  },
  epaCard: {
    marginBottom: 12,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  epaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 16,
  },
  epaInfo: {
    flex: 1,
    marginRight: 12,
  },
  epaTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  epaCode: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginRight: 12,
  },
  categoryTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#ffffff',
  },
  epaTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
    lineHeight: 22,
  },
  epaDescription: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
  },
  epaActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#f1f5f9',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  modalHeader: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    position: 'relative',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#64748b',
  },
  closeButton: {
    position: 'absolute',
    top: 20,
    right: 24,
    padding: 4,
  },
  modalContent: {
    flex: 1,
    padding: 24,
  },
  field: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 6,
  },
  helperText: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: '#ffffff',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  subCompetencySelector: {
    marginBottom: 20,
  },
  competencyList: {
    maxHeight: 300,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    backgroundColor: '#ffffff',
  },
  competencyGroup: {
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  competencyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f8fafc',
  },
  competencyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  subCompetencyList: {
    backgroundColor: '#ffffff',
  },
  subCompetencyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  subCompetencyText: {
    fontSize: 14,
    color: '#374151',
    marginLeft: 12,
    flex: 1,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#d1d5db',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  checkboxChecked: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  checkmark: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  toggleLabel: {
    fontSize: 14,
    color: '#374151',
    marginLeft: 12,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  cancelButtonText: {
    color: '#64748b',
    fontWeight: '500',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#3b82f6',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  saveButtonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
});