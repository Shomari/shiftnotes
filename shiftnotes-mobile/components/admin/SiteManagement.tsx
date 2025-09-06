/**
 * Site Management component for managing sites within programs
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
} from 'react-native';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Select } from '../ui/Select';
import { 
  apiClient, 
  ApiSite,
  ApiProgram
} from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { 
  PencilSimple, 
  Trash, 
  X,
  Plus,
  MapPin
} from 'phosphor-react-native';

const { width } = Dimensions.get('window');
const isTablet = width > 768;

interface SiteFormData {
  name: string;
  program: string;
}

export function SiteManagement() {
  const { user } = useAuth();
  const [sites, setSites] = useState<ApiSite[]>([]);
  const [programs, setPrograms] = useState<ApiProgram[]>([]);
  const [selectedProgram, setSelectedProgram] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingSite, setEditingSite] = useState<ApiSite | null>(null);
  
  // Form state
  const [formData, setFormData] = useState<SiteFormData>({
    name: '',
    program: '',
  });

  // Load data on component mount and when user changes
  useEffect(() => {
    if (user?.organization) {
      loadData();
    }
  }, [user]);

  // Reload sites when program changes
  useEffect(() => {
    if (selectedProgram && user?.organization) {
      loadSites();
    }
  }, [selectedProgram]);

  const loadData = async () => {
    if (!user?.organization) {
      console.error('No user organization found');
      return;
    }

    setLoading(true);
    try {
      const [programsResponse] = await Promise.all([
        apiClient.getPrograms(user.organization),
      ]);

      setPrograms(programsResponse.results || []);
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const loadSites = async () => {
    if (!selectedProgram || !user?.organization) return;

    setLoading(true);
    try {
      const sitesResponse = await apiClient.getSites(user.organization, selectedProgram);
      setSites(sitesResponse.results || []);
    } catch (error) {
      console.error('Error loading sites:', error);
      Alert.alert('Error', 'Failed to load sites');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSite = () => {
    setFormData({
      name: '',
      program: selectedProgram,
    });
    setEditingSite(null);
    setShowCreateModal(true);
  };

  const handleEditSite = (site: ApiSite) => {
    setFormData({
      name: site.name,
      program: site.program,
    });
    setEditingSite(site);
    setShowCreateModal(true);
  };

  const handleSaveSite = async () => {
    if (!formData.name.trim()) {
      Alert.alert('Error', 'Please enter a site name');
      return;
    }

    try {
      if (editingSite) {
        await apiClient.updateSite(editingSite.id, formData);
      } else {
        await apiClient.createSite(formData);
      }
      
      setShowCreateModal(false);
      loadSites();
      Alert.alert('Success', `Site ${editingSite ? 'updated' : 'created'} successfully`);
    } catch (error) {
      console.error('Error saving site:', error);
      Alert.alert('Error', 'Failed to save site');
    }
  };

  const handleDeleteSite = (site: ApiSite) => {
    Alert.alert(
      'Delete Site',
      `Are you sure you want to delete "${site.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiClient.deleteSite(site.id);
              loadSites();
              Alert.alert('Success', 'Site deleted successfully');
            } catch (error) {
              console.error('Error deleting site:', error);
              Alert.alert('Error', 'Failed to delete site');
            }
          },
        },
      ]
    );
  };

  const renderSiteCard = (site: ApiSite) => {
    return (
      <Card key={site.id} style={styles.siteCard}>
        <CardHeader>
          <View style={styles.siteHeader}>
            <View style={styles.siteInfo}>
              <View style={styles.siteIcon}>
                <MapPin size={20} color="#3b82f6" />
              </View>
              <View style={styles.siteDetails}>
                <Text style={styles.siteName}>{site.name}</Text>
                <Text style={styles.siteProgram}>{site.program_name}</Text>
              </View>
            </View>
            <View style={styles.siteActions}>
              <Pressable
                style={styles.actionButton}
                onPress={() => handleEditSite(site)}
              >
                <PencilSimple size={16} color="#6b7280" />
              </Pressable>
              <Pressable
                style={styles.actionButton}
                onPress={() => handleDeleteSite(site)}
              >
                <Trash size={16} color="#ef4444" />
              </Pressable>
            </View>
          </View>
        </CardHeader>
      </Card>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.pageTitle}>Site Management</Text>
        <Text style={styles.pageSubtitle}>
          Manage clinical sites for your programs
        </Text>
        
        {/* Program Filter */}
        <View style={styles.programFilterContainer}>
          <Text style={styles.programFilterLabel}>
            Select Program {user?.organization_name ? `(${user.organization_name})` : ''}:
          </Text>
          <Select
            value={selectedProgram}
            onValueChange={(value) => setSelectedProgram(value)}
            placeholder={programs.length === 0 ? "No programs available for your organization" : "Choose a program to manage sites"}
            options={[
              { value: '', label: 'All Programs' },
              ...programs.map((program) => ({
                value: program.id,
                label: program.name
              }))
            ]}
          />
        </View>
      </View>

      <ScrollView style={styles.content}>
        {!selectedProgram ? (
          <View style={styles.noProgramSelected}>
            <Text style={styles.noProgramText}>
              {programs.length === 0 
                ? `No programs available for ${user?.organization_name || 'your organization'}. Please contact your administrator.`
                : 'Please select a program to view and manage sites'
              }
            </Text>
          </View>
        ) : (
          <>
            {/* Add Site Button */}
            <View style={styles.addButtonContainer}>
              <Button
                title="Add Site"
                onPress={handleCreateSite}
                icon="plus"
                style={styles.addButton}
              />
            </View>

            {/* Sites List */}
            <View style={styles.sitesList}>
              {sites.map(renderSiteCard)}
            </View>

            {sites.length === 0 && (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>
                  No sites found for this program. Create your first site to get started.
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Create/Edit Site Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {editingSite ? 'Edit Site' : 'Add New Site'}
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
              <Text style={styles.label}>Site Name *</Text>
              <Input
                value={formData.name}
                onChangeText={(text) => setFormData({ ...formData, name: text })}
                placeholder="e.g., Main Hospital, Outpatient Clinic"
                style={styles.input}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Program</Text>
              <Select
                value={formData.program}
                onValueChange={(value) => setFormData({ ...formData, program: value })}
                placeholder="Select a program"
                options={programs.map((program) => ({
                  value: program.id,
                  label: program.name
                }))}
              />
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <Button
              title="Cancel"
              onPress={() => setShowCreateModal(false)}
              style={[styles.button, styles.cancelButton]}
            />
            <Button
              title={editingSite ? 'Update' : 'Create'}
              onPress={handleSaveSite}
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
  programFilterContainer: {
    marginBottom: 10,
  },
  programFilterLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
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
  sitesList: {
    gap: 16,
  },
  siteCard: {
    marginBottom: 16,
  },
  siteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  siteInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  siteIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  siteDetails: {
    flex: 1,
  },
  siteName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
  },
  siteProgram: {
    fontSize: 14,
    color: '#6b7280',
  },
  siteActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#f3f4f6',
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
