/**
 * EPA Management component for Coordinator users
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
import { Button } from '../ui/Button';
import { Select } from '../ui/Select';
// import { Checkbox } from '../ui/Checkbox';
import { 
  apiClient, 
  ApiEPA, 
  ApiCoreCompetency, 
  ApiSubCompetency, 
  ApiSubCompetencyEPA,
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
  ToggleRight,
  ArrowCounterClockwise
} from 'phosphor-react-native';

const { width } = Dimensions.get('window');
const isTablet = width >= 768;

interface EPAFormData {
  code: string;
  title: string;
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
  const [coreCompetencies, setCoreCompetencies] = useState<ApiCoreCompetency[]>([]);
  const [subCompetencies, setSubCompetencies] = useState<ApiSubCompetency[]>([]);
  const [subCompetencyEPAs, setSubCompetencyEPAs] = useState<ApiSubCompetencyEPA[]>([]);
  const [program, setProgram] = useState<ApiProgram | null>(null);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingEPA, setEditingEPA] = useState<ApiEPA | null>(null);
  const [expandedCompetencies, setExpandedCompetencies] = useState<Set<string>>(new Set());
  const [epaStatusFilter, setEpaStatusFilter] = useState<'active' | 'inactive' | 'all'>('active');
  
  // Form state
  const [formData, setFormData] = useState<EPAFormData>({
    code: '',
    title: '',
    is_active: true,
    sub_competencies: [],
  });
  
  // Validation errors state
  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({});

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
      const [epasResponse, coreCompetenciesResponse, subCompetenciesResponse, subCompetencyEPAsResponse] = await Promise.all([
        apiClient.getEPAs(user.program),
        apiClient.getCoreCompetencies(),
        apiClient.getSubCompetencies(),
        apiClient.getSubCompetencyEPAs(),
      ]);

      setEPAs(epasResponse.results || []);
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
  const activeEPAs = epas.filter(epa => epa.is_active !== false).length;
  
  // Debug EPA counts
  console.log('=== EPA COUNT DEBUG ===');
  console.log('Total EPAs loaded:', epas.length);
  console.log('Active EPAs (is_active !== false):', activeEPAs);
  console.log('EPAs with is_active=true:', epas.filter(epa => epa.is_active === true).length);
  console.log('EPAs with is_active=false:', epas.filter(epa => epa.is_active === false).length);
  console.log('EPAs with is_active=undefined:', epas.filter(epa => epa.is_active === undefined).length);
  console.log('EPA is_active values:', epas.map(epa => ({ code: epa.code, is_active: epa.is_active })));


  const handleCreateEPA = () => {
    setEditingEPA(null);
    setValidationErrors({});
    setFormData({
      code: 'EPA 23', // Pre-filled as shown in image
      title: '',
      is_active: true,
      sub_competencies: [],
    });
    setShowCreateModal(true);
  };

  const handleEditEPA = (epa: ApiEPA) => {
    setEditingEPA(epa);
    setValidationErrors({});
    setFormData({
      code: epa.code,
      title: epa.title,
      is_active: epa.is_active || true,
      sub_competencies: epa.sub_competencies?.map(sc => sc.id) || [],
    });
    setShowCreateModal(true);
  };

  const handleSaveEPA = async () => {
    console.log('handleSaveEPA called', { formData, editingEPA });
    
    // Clear previous validation errors
    setValidationErrors({});
    
    // Validate required fields
    const fieldErrors: {[key: string]: string} = {};
    
    if (!formData.code || !formData.code.trim()) {
      fieldErrors.code = 'Please enter an EPA code';
    }
    
    if (!formData.title || !formData.title.trim()) {
      fieldErrors.title = 'Please enter an EPA title';
    }
    
    // If there are validation errors, set them and return
    if (Object.keys(fieldErrors).length > 0) {
      setValidationErrors(fieldErrors);
      console.log('Validation errors:', fieldErrors);
      return;
    }

    setLoading(true);
    try {
      const epaData = {
        code: formData.code,
        title: formData.title,
        is_active: formData.is_active,
        program: user?.program || '',
      };

      console.log('Saving EPA data:', epaData);

      let savedEPA: ApiEPA;
      if (editingEPA) {
        // Update existing EPA
        console.log('Updating EPA with ID:', editingEPA.id);
        savedEPA = await apiClient.updateEPA(editingEPA.id, epaData);
      } else {
        // Create new EPA
        console.log('Creating new EPA');
        savedEPA = await apiClient.createEPA(epaData);
      }

      console.log('EPA saved successfully:', savedEPA);

      // Handle sub-competency relationships
      try {
        await handleSubCompetencyRelationships(savedEPA.id);
        console.log('Sub-competency relationships handled successfully');
      } catch (subCompError) {
        console.error('Error handling sub-competency relationships:', subCompError);
        throw new Error(`EPA saved but failed to update sub-competency relationships: ${subCompError.message}`);
      }

      setShowCreateModal(false);
      await loadData(); // Make sure data reloads
      
      const successMessage = `EPA ${editingEPA ? 'updated' : 'created'} successfully`;
      if (Platform.OS === 'web') {
        window.alert(successMessage);
      } else {
        Alert.alert('Success', successMessage);
      }
    } catch (error: any) {
      console.error('Error saving EPA:', error);
      
      // Check for specific error types
      let errorMessage = 'Failed to save EPA. Please try again.';
      let fieldError = '';
      
      // Try to parse structured error response from backend
      if (error.response && error.response.data) {
        console.log('Error response data:', error.response.data);
        
        // Check for DRF ValidationError format (field-specific errors)
        if (error.response.data.code) {
          // Field-specific error from ValidationError - could be array or string
          const codeError = Array.isArray(error.response.data.code) 
            ? error.response.data.code[0] 
            : error.response.data.code;
          errorMessage = codeError;
          fieldError = codeError;
        } else if (error.response.data.error) {
          // Generic error format
          errorMessage = error.response.data.error;
          if (errorMessage.toLowerCase().includes('already exists') || 
              errorMessage.toLowerCase().includes('duplicate') ||
              errorMessage.toLowerCase().includes('already in use')) {
            fieldError = 'This EPA code is already taken';
          }
        } else if (error.response.data.non_field_errors) {
          // Handle non_field_errors from DRF
          const nonFieldError = Array.isArray(error.response.data.non_field_errors)
            ? error.response.data.non_field_errors[0]
            : error.response.data.non_field_errors;
          errorMessage = nonFieldError;
          // If it's about unique constraint, treat as code error
          if (nonFieldError.toLowerCase().includes('unique') || 
              nonFieldError.toLowerCase().includes('duplicate')) {
            fieldError = 'This EPA code is already taken';
            errorMessage = 'This EPA code is already taken. Please choose a different code.';
          }
        }
      } else if (error.message) {
        // Fallback to checking error message
        if (error.message.includes('400') || error.message.includes('500')) {
          // Check for duplicate EPA code error indicators
          if (error.message.toLowerCase().includes('unique') || 
              error.message.toLowerCase().includes('duplicate') ||
              error.message.toLowerCase().includes('already exists') ||
              error.message.includes('400')) {
            errorMessage = `EPA code "${formData.code}" is already taken. Please choose a different code.`;
            fieldError = 'This EPA code is already taken';
          }
        }
      }
      
      // Set field-specific error if we detected a duplicate code issue
      if (fieldError) {
        setValidationErrors({ code: fieldError });
      }
      
      if (Platform.OS === 'web') {
        window.alert(errorMessage);
      } else {
        Alert.alert('Error', errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubCompetencyRelationships = async (epaId: string) => {
    console.log('Handling sub-competency relationships for EPA:', epaId);
    console.log('Form sub-competencies:', formData.sub_competencies);
    
    // Get current relationships for this EPA
    const currentRelationships = subCompetencyEPAs.filter(rel => rel.epa === epaId);
    const currentSubCompIds = currentRelationships.map(rel => rel.sub_competency);
    console.log('Current relationships:', currentRelationships);
    console.log('Current sub-competency IDs:', currentSubCompIds);

    // Determine which relationships to add and remove
    const toAdd = formData.sub_competencies.filter(id => !currentSubCompIds.includes(id));
    const toRemove = currentSubCompIds.filter(id => !formData.sub_competencies.includes(id));
    console.log('To add:', toAdd);
    console.log('To remove:', toRemove);

    // Remove old relationships
    for (const rel of currentRelationships) {
      if (toRemove.includes(rel.sub_competency)) {
        console.log('Deleting sub-competency relationship:', rel.id);
        try {
          await apiClient.deleteSubCompetencyEPA(rel.id);
          console.log('Successfully deleted relationship:', rel.id);
        } catch (deleteError) {
          console.error('Error deleting relationship:', rel.id, deleteError);
          throw deleteError;
        }
      }
    }

    // Add new relationships
    for (const subCompId of toAdd) {
      console.log('Creating sub-competency relationship:', { sub_competency: subCompId, epa: epaId });
      try {
        const result = await apiClient.createSubCompetencyEPA({
          sub_competency: subCompId,
          epa: epaId,
        });
        console.log('Successfully created relationship:', result);
      } catch (createError) {
        console.error('Error creating relationship:', { sub_competency: subCompId, epa: epaId }, createError);
        throw createError;
      }
    }
    
    console.log('All sub-competency relationships processed successfully');
  };

  const handleReactivateEPA = async (epa: ApiEPA) => {
    const message = `Reactivate "${epa.title}"?\n\nThis EPA will become available for use in new assessments.`;
    
    const confirmReactivate = Platform.OS === 'web' 
      ? window.confirm(message)
      : await new Promise<boolean>((resolve) => {
          Alert.alert(
            'Reactivate EPA',
            message,
            [
              { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
              { text: 'Reactivate', onPress: () => resolve(true) },
            ]
          );
        });

    if (!confirmReactivate) return;

    setLoading(true);
    try {
      // Update EPA to set is_active = true
      await apiClient.updateEPA(epa.id, { is_active: true });
      await loadData();
      
      const successMessage = 'EPA reactivated successfully';
      if (Platform.OS === 'web') {
        window.alert(successMessage);
      } else {
        Alert.alert('Success', successMessage);
      }
    } catch (error) {
      console.error('Error reactivating EPA:', error);
      const errorMessage = 'Failed to reactivate EPA';
      if (Platform.OS === 'web') {
        window.alert(errorMessage);
      } else {
        Alert.alert('Error', errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivateEPA = async (epa: ApiEPA) => {
    const message = `Deactivate "${epa.title}"?\n\nThis EPA will no longer be available for new assessments, but existing assessments using this EPA will be preserved.\n\nYou can reactivate it later if needed.`;
    
    const confirmDeactivate = Platform.OS === 'web' 
      ? window.confirm(message)
      : await new Promise<boolean>((resolve) => {
          Alert.alert(
            'Deactivate EPA',
            message,
            [
              { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
              { text: 'Deactivate', style: 'destructive', onPress: () => resolve(true) },
            ]
          );
        });

    if (!confirmDeactivate) return;

    setLoading(true);
    try {
      // Update EPA to set is_active = false
      await apiClient.updateEPA(epa.id, { is_active: false });
      await loadData();
      
      const successMessage = 'EPA deactivated successfully';
      if (Platform.OS === 'web') {
        window.alert(successMessage);
      } else {
        Alert.alert('Success', successMessage);
      }
    } catch (error) {
      console.error('Error deactivating EPA:', error);
      const errorMessage = 'Failed to deactivate EPA';
      if (Platform.OS === 'web') {
        window.alert(errorMessage);
      } else {
        Alert.alert('Error', errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEPA = async (epa: ApiEPA) => {
    const message = `Permanently delete "${epa.title}"?\n\nThis action cannot be undone. This EPA can only be deleted if it has never been used in any assessments.`;
    
    const confirmDelete = Platform.OS === 'web' 
      ? window.confirm(message)
      : await new Promise<boolean>((resolve) => {
          Alert.alert(
            'Permanently Delete EPA',
            message,
            [
              { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
              { text: 'Delete Permanently', style: 'destructive', onPress: () => resolve(true) },
            ]
          );
        });

    if (!confirmDelete) return;

    setLoading(true);
    try {
      await apiClient.deleteEPA(epa.id);
      await loadData();
      
      const successMessage = 'EPA permanently deleted';
      if (Platform.OS === 'web') {
        window.alert(successMessage);
      } else {
        Alert.alert('Success', successMessage);
      }
    } catch (error: any) {
      console.error('Error deleting EPA:', error);
      let errorMessage = 'Failed to delete EPA';
      
      // Check for specific error about assessments
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.message?.includes('assessment')) {
        errorMessage = 'Cannot delete EPA: It has been used in assessments';
      }
      
      if (Platform.OS === 'web') {
        window.alert(errorMessage);
      } else {
        Alert.alert('Error', errorMessage);
      }
    } finally {
      setLoading(false);
    }
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

  const closeModal = () => {
    setShowCreateModal(false);
    setEditingEPA(null);
    setValidationErrors({});
    setFormData({
      code: '',
      title: '',
      is_active: true,
      sub_competencies: [],
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

  // Get core competencies that an EPA is mapped to
  const getEpaCompetencies = (epa: ApiEPA) => {
    // Debug: Log EPA details
    console.log(`\n=== EPA ${epa.code} (ID: ${epa.id}) ===`);
    
    // Use the sub_competencies from the EPA object and look up full sub-competency data
    if (epa.sub_competencies && epa.sub_competencies.length > 0) {
      console.log(`EPA ${epa.code} - Found sub_competencies:`, epa.sub_competencies.length);
      
      const competencyIds = new Set<string>();
      epa.sub_competencies.forEach(epaSubComp => {
        // Find the full sub-competency object using the ID
        const fullSubComp = subCompetencies.find(sc => sc.id === epaSubComp.id);
        if (fullSubComp && fullSubComp.core_competency) {
          competencyIds.add(fullSubComp.core_competency);
          console.log(`  - SubComp ${fullSubComp.code} -> CoreComp ${fullSubComp.core_competency}`);
        } else {
          console.log(`  - SubComp ${epaSubComp.code} (${epaSubComp.id}) not found in full list`);
        }
      });
      
      const competencies = Array.from(competencyIds)
        .map(id => coreCompetencies.find(comp => comp.id === id))
        .filter(comp => comp !== undefined) as ApiCoreCompetency[];
        
      console.log(`EPA ${epa.code} - Final competencies:`, competencies.map(c => c.code));
      return competencies;
    }
    
    // Fallback to using subCompetencyEPAs relationships
    const epaSubCompetencyRelations = subCompetencyEPAs.filter(relation => relation.epa === epa.id);
    console.log(`EPA ${epa.code} - Using fallback relations:`, epaSubCompetencyRelations.length);
    
    if (epaSubCompetencyRelations.length === 0) {
      console.log(`EPA ${epa.code} - No relationships found`);
      return [];
    }

    // Get unique core competency IDs from the related sub-competencies
    const competencyIds = new Set<string>();
    epaSubCompetencyRelations.forEach(relation => {
      const subComp = subCompetencies.find(sc => sc.id === relation.sub_competency);
      if (subComp && subComp.core_competency) {
        competencyIds.add(subComp.core_competency);
      }
    });

    // Return the core competency objects
    const competencies = Array.from(competencyIds)
      .map(id => coreCompetencies.find(comp => comp.id === id))
      .filter(comp => comp !== undefined) as ApiCoreCompetency[];
      
    console.log(`EPA ${epa.code} - Fallback competencies:`, competencies.map(c => c.code));
    return competencies;
  };

  // Generate consistent colors for competency codes
  const getCompetencyColor = (competencyCode: string) => {
    const colors: Record<string, string> = {
      'PC': '#3b82f6',    // Patient Care - Blue
      'MK': '#10b981',    // Medical Knowledge - Green
      'PBLI': '#f59e0b',  // Practice-based Learning - Orange
      'ICS': '#8b5cf6',   // Interpersonal & Communication - Purple
      'P': '#ef4444',     // Professionalism - Red
      'SBP': '#06b6d4',   // Systems-based Practice - Cyan
      'COMP': '#64748b',  // General Competency - Gray
    };
    return colors[competencyCode] || '#6b7280';
  };

  // Format EPA code with space (EPA1 -> EPA 1)
  const formatEpaCode = (code: string) => {
    return code.replace(/EPA(\d+)/i, 'EPA $1');
  };

  // Sort EPAs numerically by extracting the number from the code
  const sortEpasNumerically = (epas: ApiEPA[]) => {
    return [...epas].sort((a, b) => {
      const numA = parseInt(a.code.replace(/\D/g, '')) || 0;
      const numB = parseInt(b.code.replace(/\D/g, '')) || 0;
      return numA - numB;
    });
  };

  const renderEPACard = (epa: ApiEPA) => (
    <Card key={epa.id} style={styles.epaCard}>
      <CardContent>
        <View style={styles.epaHeader}>
          <View style={styles.epaInfo}>
            <View style={styles.epaTitleRow}>
              {getEpaCompetencies(epa).map((competency, index) => (
                <View key={index} style={[styles.competencyBadge, { backgroundColor: getCompetencyColor(competency.code) }]}>
                  <Text style={styles.competencyText}>{competency.code}</Text>
                </View>
              ))}
            </View>
            <Text style={styles.epaTitle}>{formatEpaCode(epa.code)}: {epa.title}</Text>
          </View>
          <View style={styles.epaActions}>
            {epa.is_active !== false ? (
              // Active EPA: Show Edit and Deactivate
              <>
                <Pressable
                  style={styles.actionButton}
                  onPress={() => handleEditEPA(epa)}
                >
                  <PencilSimple size={16} color="#3b82f6" />
                </Pressable>
                <Pressable
                  style={styles.actionButton}
                  onPress={() => handleDeactivateEPA(epa)}
                >
                  <Trash size={16} color="#ef4444" />
                </Pressable>
              </>
            ) : (
              // Inactive EPA: Show Reactivate and Delete
              <>
                <Pressable
                  style={[styles.actionButton, styles.reactivateButton]}
                  onPress={() => handleReactivateEPA(epa)}
                >
                  <ArrowCounterClockwise size={16} color="#10b981" />
                </Pressable>
                <Pressable
                  style={styles.actionButton}
                  onPress={() => handleDeleteEPA(epa)}
                >
                  <Trash size={16} color="#ef4444" />
                </Pressable>
              </>
            )}
          </View>
        </View>
      </CardContent>
    </Card>
  );


  const renderSubCompetencySelector = () => (
    <View style={styles.subCompetencySelector}>
      <Text style={styles.label}>ACGME Subcompetencies</Text>
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
            {/* Controls Row */}
            <View style={styles.controlsRow}>
              <View style={styles.statusFilterContainer}>
                <Text style={styles.filterLabel}>Show:</Text>
                <Select
                  value={epaStatusFilter}
                  onValueChange={(value) => setEpaStatusFilter(value as 'active' | 'inactive' | 'all')}
                  placeholder="Active EPAs"
                  options={[
                    { label: 'Active EPAs', value: 'active' },
                    { label: 'Inactive EPAs', value: 'inactive' },
                    { label: 'All EPAs', value: 'all' },
                  ]}
                  style={styles.statusFilterSelect}
                />
              </View>
              
              <Button
                title="Add EPA"
                onPress={handleCreateEPA}
                style={styles.addButton}
                icon="plus"
              />
            </View>

        {/* EPAs Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {epaStatusFilter === 'active' && `Active EPAs (${epas.filter(epa => epa.is_active !== false).length})`}
            {epaStatusFilter === 'inactive' && `Inactive EPAs (${epas.filter(epa => epa.is_active === false).length})`}
            {epaStatusFilter === 'all' && `All EPAs (${epas.length})`}
          </Text>
          <Text style={styles.sectionDescription}>
            {epaStatusFilter === 'active' && 'EPAs currently available for use in assessments'}
            {epaStatusFilter === 'inactive' && 'EPAs that are no longer available for new assessments'}
            {epaStatusFilter === 'all' && 'All EPAs in the system'}
          </Text>
          
          {sortEpasNumerically(epas.filter(epa => {
            if (epaStatusFilter === 'active') return epa.is_active !== false;
            if (epaStatusFilter === 'inactive') return epa.is_active === false;
            return true; // 'all'
          })).map(renderEPACard)}
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
              onPress={closeModal}
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
              {validationErrors.code && (
                <Text style={styles.errorText}>{validationErrors.code}</Text>
              )}
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Title *</Text>
              <Input
                value={formData.title}
                onChangeText={(text) => setFormData(prev => ({ ...prev, title: text }))}
                placeholder="Brief title describing the EPA"
                style={styles.input}
              />
              {validationErrors.title && (
                <Text style={styles.errorText}>{validationErrors.title}</Text>
              )}
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
              onPress={closeModal}
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
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 0,
    gap: 16,
  },
  statusFilterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  statusFilterSelect: {
    flex: 1,
    maxWidth: 200,
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
    flexWrap: 'wrap',
    gap: 6,
  },
  competencyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  competencyText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#ffffff',
  },
  epaTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
    marginTop: 4,
    lineHeight: 22,
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
  reactivateButton: {
    backgroundColor: '#dcfce7', // Light green background for reactivate
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
  errorText: {
    fontSize: 12,
    color: '#ef4444',
    marginTop: 4,
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