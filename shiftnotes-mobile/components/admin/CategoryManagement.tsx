/**
 * Category Management component for managing EPA Categories within programs
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
import { 
  apiClient, 
  ApiEPACategory,
  ApiProgram
} from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { 
  PencilSimple, 
  Trash, 
  X,
  Plus,
  Tag
} from 'phosphor-react-native';

const { width } = Dimensions.get('window');
const isTablet = width > 768;

interface CategoryFormData {
  title: string;
  program: string;
}

export function CategoryManagement() {
  const { user } = useAuth();
  const [categories, setCategories] = useState<ApiEPACategory[]>([]);
  const [program, setProgram] = useState<ApiProgram | null>(null);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ApiEPACategory | null>(null);
  
  // Form state
  const [formData, setFormData] = useState<CategoryFormData>({
    title: '',
    program: '',
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
      const categoriesResponse = await apiClient.getEPACategories(user.program);
      setCategories(categoriesResponse.results || []);
    } catch (error) {
      console.error('Error loading categories:', error);
      Alert.alert('Error', 'Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCategory = () => {
    setFormData({
      title: '',
      program: user?.program || '',
    });
    setEditingCategory(null);
    setShowCreateModal(true);
  };

  const handleEditCategory = (category: ApiEPACategory) => {
    setFormData({
      title: category.title,
      program: category.program,
    });
    setEditingCategory(category);
    setShowCreateModal(true);
  };

  const handleSaveCategory = async () => {
    if (!formData.title.trim()) {
      if (Platform.OS === 'web') {
        window.alert('Please enter a category title');
      } else {
        Alert.alert('Error', 'Please enter a category title');
      }
      return;
    }

    try {
      if (editingCategory) {
        // Update existing category
        await apiClient.updateEPACategory(editingCategory.id, formData);
      } else {
        // Create new category
        await apiClient.createEPACategory(formData);
      }

      setShowCreateModal(false);
      await loadData(); // Reload data
      
      if (Platform.OS === 'web') {
        window.alert(editingCategory ? 'Category updated successfully' : 'Category created successfully');
      } else {
        Alert.alert('Success', editingCategory ? 'Category updated successfully' : 'Category created successfully');
      }
    } catch (error) {
      console.error('Error saving category:', error);
      if (Platform.OS === 'web') {
        window.alert('Failed to save category');
      } else {
        Alert.alert('Error', 'Failed to save category');
      }
    }
  };

  const handleDeleteCategory = async (category: ApiEPACategory) => {
    const message = `Are you sure you want to delete "${category.title}"? This cannot be undone.`;
    
    const confirmDelete = Platform.OS === 'web' 
      ? window.confirm(message)
      : await new Promise<boolean>((resolve) => {
          Alert.alert(
            'Confirm Delete',
            message,
            [
              { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
              { text: 'Delete', style: 'destructive', onPress: () => resolve(true) },
            ]
          );
        });

    if (!confirmDelete) return;

    try {
      await apiClient.deleteEPACategory(category.id);
      await loadData(); // Reload data
      
      if (Platform.OS === 'web') {
        window.alert('Category deleted successfully');
      } else {
        Alert.alert('Success', 'Category deleted successfully');
      }
    } catch (error) {
      console.error('Error deleting category:', error);
      if (Platform.OS === 'web') {
        window.alert('Failed to delete category. It may be in use by EPAs.');
      } else {
        Alert.alert('Error', 'Failed to delete category. It may be in use by EPAs.');
      }
    }
  };

  const closeModal = () => {
    setShowCreateModal(false);
    setEditingCategory(null);
    setFormData({
      title: '',
      program: user?.program || '',
    });
  };

  if (!program) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading program data...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <Card style={styles.headerCard}>
          <CardHeader>
            <View style={styles.headerTitle}>
              <Tag size={24} color="#3B82F6" />
              <Text style={styles.headerTitleText}>Category Management</Text>
            </View>
            <Text style={styles.headerSubtitle}>
              Manage EPA categories for {program.name}
            </Text>
          </CardHeader>
          
          <CardContent>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{categories.length}</Text>
                <Text style={styles.statLabel}>Total Categories</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>
                  {categories.reduce((sum, cat) => sum + (cat.epas_count || 0), 0)}
                </Text>
                <Text style={styles.statLabel}>Associated EPAs</Text>
              </View>
            </View>
            
            <Button
              title="Add Category"
              onPress={handleCreateCategory}
              style={styles.addButton}
              icon="plus"
            />
          </CardContent>
        </Card>

        {/* Categories List */}
        <Card style={styles.categoriesCard}>
          <CardHeader>
            <CardTitle>Categories</CardTitle>
          </CardHeader>
          
          <CardContent>
            {loading ? (
              <Text style={styles.loadingText}>Loading categories...</Text>
            ) : categories.length === 0 ? (
              <View style={styles.emptyState}>
                <Tag size={48} color="#9CA3AF" />
                <Text style={styles.emptyText}>No categories found</Text>
                <Text style={styles.emptySubtext}>
                  Create your first EPA category to get started
                </Text>
                <Button
                  title="Add Category"
                  onPress={handleCreateCategory}
                  style={styles.emptyButton}
                />
              </View>
            ) : (
              <View style={styles.categoriesList}>
                {categories.map((category) => (
                  <View key={category.id} style={styles.categoryItem}>
                    <View style={styles.categoryInfo}>
                      <Text style={styles.categoryTitle}>{category.title}</Text>
                      <Text style={styles.categoryMeta}>
                        {category.epas_count || 0} EPA{(category.epas_count || 0) !== 1 ? 's' : ''}
                      </Text>
                    </View>
                    
                    <View style={styles.categoryActions}>
                      <Pressable
                        style={styles.actionButton}
                        onPress={() => handleEditCategory(category)}
                      >
                        <PencilSimple size={18} color="#3B82F6" />
                      </Pressable>
                      
                      <Pressable
                        style={[styles.actionButton, styles.deleteButton]}
                        onPress={() => handleDeleteCategory(category)}
                      >
                        <Trash size={18} color="#EF4444" />
                      </Pressable>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </CardContent>
        </Card>
      </ScrollView>

      {/* Create/Edit Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        transparent={true}
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingCategory ? 'Edit Category' : 'Create Category'}
              </Text>
              <Pressable onPress={closeModal} style={styles.modalCloseButton}>
                <X size={24} color="#6B7280" />
              </Pressable>
            </View>
            
            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Category Title *</Text>
                <Input
                  value={formData.title}
                  onChangeText={(text) => setFormData({ ...formData, title: text })}
                  placeholder="e.g., Clinical Skills, Diagnostic Procedures"
                  style={styles.formInput}
                />
              </View>
            </ScrollView>
            
            <View style={styles.modalFooter}>
              <Button
                title="Cancel"
                onPress={closeModal}
                style={[styles.modalButton, styles.cancelButton]}
              />
              <Button
                title={editingCategory ? 'Update Category' : 'Create Category'}
                onPress={handleSaveCategory}
                style={[styles.modalButton, styles.saveButton]}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    padding: 16,
  },
  headerCard: {
    marginBottom: 16,
  },
  headerTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitleText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 4,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#3B82F6',
  },
  statLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  addButton: {
    backgroundColor: '#3B82F6',
    marginTop: 16,
  },
  categoriesCard: {
    marginBottom: 16,
  },
  categoriesList: {
    gap: 12,
  },
  categoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  categoryInfo: {
    flex: 1,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  categoryMeta: {
    fontSize: 14,
    color: '#6B7280',
  },
  categoryActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  deleteButton: {
    backgroundColor: '#FEF2F2',
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  emptyButton: {
    backgroundColor: '#3B82F6',
  },
  loadingText: {
    textAlign: 'center',
    color: '#6B7280',
    fontSize: 16,
    padding: 20,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: isTablet ? '60%' : '90%',
    maxWidth: 500,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalBody: {
    padding: 20,
  },
  formGroup: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  formInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  modalButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  cancelButton: {
    backgroundColor: '#6B7280',
  },
  saveButton: {
    backgroundColor: '#3B82F6',
  },
});
