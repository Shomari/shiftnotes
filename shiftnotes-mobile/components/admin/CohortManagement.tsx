/**
 * Cohort Management component 
 * Dedicated component for managing cohorts, separated from User Management
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Dimensions,
} from 'react-native';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { apiClient, ApiCohort } from '../../lib/api';
import { format } from 'date-fns';
import { 
  Plus, 
  PencilSimple, 
  GraduationCap
} from 'phosphor-react-native';


const { width } = Dimensions.get('window');
const isTablet = width >= 768;

// Sample data matching the web screenshots (will be replaced with API calls)
const sampleCohorts = [
  { id: '1', name: 'PGY-1 2024', year: 2024, startDate: '2024-06-29', trainees: 2 },
  { id: '2', name: 'PGY-2 2023', year: 2023, startDate: '2023-06-29', trainees: 1 },
  { id: '3', name: 'PGY-3 2022', year: 2022, startDate: '2022-06-29', trainees: 0 },
];

interface CohortManagementProps {
  onAddCohort: () => void;
  onEditCohort: (cohortId: string) => void;
}

export function CohortManagement({ onAddCohort, onEditCohort }: CohortManagementProps) {
  const [loading, setLoading] = useState(false);
  const [cohorts, setCohorts] = useState<ApiCohort[]>([]);
  
  // Load data on component mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // For now, using sample data. Replace with actual API call when available.
      // const cohortsResponse = await apiClient.getCohorts();
      
      // Keep using sample data as fallback
      setCohorts(sampleCohorts.map(c => ({
        id: c.id,
        name: c.name,
        year: c.year,
        start_date: c.startDate,
        is_active: true,
        trainee_count: c.trainees
      })));
    } catch (error) {
      console.error('Error loading cohorts:', error);
      // Keep using sample data as fallback
      setCohorts(sampleCohorts.map(c => ({
        id: c.id,
        name: c.name,
        year: c.year,
        start_date: c.startDate,
        is_active: true,
        trainee_count: c.trainees
      })));
    } finally {
      setLoading(false);
    }
  };

  const handleEditCohort = (cohort: ApiCohort) => {
    console.log('Editing cohort:', cohort);
    onEditCohort(cohort.id);
  };


  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.pageTitle}>Cohort Management</Text>
            <Text style={styles.pageSubtitle}>Manage trainee cohorts and their members</Text>
          </View>
        </View>

        {/* Cohorts Section */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleContainer}>
            <GraduationCap size={20} color="#374151" />
            <Text style={styles.sectionTitle}>Cohorts ({cohorts.length})</Text>
          </View>
          <Button
            title="Add Cohort"
            onPress={onAddCohort}
            icon={<Plus size={16} color="#ffffff" />}
            size="sm"
          />
        </View>

        {cohorts.map(cohort => (
          <Card key={cohort.id} style={styles.cohortCard}>
            <CardHeader style={styles.cohortCardHeader}>
              <View style={styles.cohortInfo}>
                <Text style={styles.cohortName}>{cohort.name}</Text>
                <View style={[styles.badge, styles.statusActive]}>
                  <Text style={styles.badgeText}>Active</Text>
                </View>
              </View>
              <View style={styles.cohortActions}>
                <Pressable style={styles.actionButton} onPress={() => handleEditCohort(cohort)}>
                  <PencilSimple size={16} color="#64748b" />
                  <Text style={styles.actionButtonText}>Edit</Text>
                </Pressable>
              </View>
            </CardHeader>
            <CardContent>
              <Text style={styles.cohortDetails}>
                Start Date: {cohort.start_date ? format(new Date(cohort.start_date), 'M/d/yyyy') : 'N/A'}
              </Text>
              <Text style={styles.cohortDetails}>Trainees: {cohort.trainee_count || 0}</Text>
            </CardContent>
          </Card>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
    ...(isTablet && {
      alignItems: 'center',
    }),
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  pageSubtitle: {
    fontSize: 14,
    color: '#64748b',
  },

  // Section Header
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
  },

  // Cohort Cards
  cohortCard: {
    marginBottom: 16,
  },
  cohortCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
  },
  cohortInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cohortName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  cohortActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#f8fafc',
  },
  actionButtonText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  cohortDetails: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 4,
  },

  // Badges
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusActive: {
    backgroundColor: '#dcfce7',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#374151',
    textTransform: 'uppercase',
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    width: '100%',
    maxWidth: 500,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 25,
    elevation: 25,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#64748b',
    padding: 20,
    paddingTop: 0,
    paddingBottom: 0,
  },
  modalBody: {
    padding: 20,
  },
  modalFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  formField: {
    marginBottom: 16,
  },
  datePickerContainer: {
    position: 'relative',
    zIndex: 1000,
    isolation: 'isolate',
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 6,
  },
});
