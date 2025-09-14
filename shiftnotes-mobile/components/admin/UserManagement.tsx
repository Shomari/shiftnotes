/**
 * User Management component for Admin users
 * Provides CRUD operations for users and cohorts
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
  Keyboard,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { User } from '../../lib/types';
import { apiClient, ApiUser, ApiCohort } from '../../lib/api';
import config from '../../env.config';
import { format } from 'date-fns';
import { 
  MagnifyingGlass, 
  Plus, 
  PencilSimple, 
  Trash, 
  Eye, 
  Users,
  GraduationCap,
  X,
  Calendar,
  Export
} from 'phosphor-react-native';

const { width } = Dimensions.get('window');
const isTablet = width >= 768;

// Sample data matching the web screenshots
const sampleCohorts = [
  { id: '1', name: 'PGY-1 2024', year: 2024, startDate: '2024-06-30', trainees: 2 },
  { id: '2', name: 'PGY-2 2023', year: 2023, startDate: '2023-06-30', trainees: 1 },
  { id: '3', name: 'PGY-3 2022', year: 2022, startDate: '2022-06-30', trainees: 0 },
];

const sampleUsers: User[] = [
  {
    id: '1',
    name: 'Jane Doe',
    email: 'jane.resident@hospital.edu',
    role: 'trainee',
    cohortId: '1',
    createdAt: '2025-08-29',
    isActive: true,
  },
  {
    id: '2',
    name: 'Michael Johnson',
    email: 'mike.resident@hospital.edu',
    role: 'trainee',
    cohortId: '1',
    createdAt: '2025-08-29',
    isActive: true,
  },
  {
    id: '3',
    name: 'Sarah Wilson',
    email: 'sarah.resident@hospital.edu',
    role: 'trainee',
    cohortId: '2',
    createdAt: '2025-08-29',
    isActive: true,
  },
  {
    id: '4',
    name: 'Dr. Sarah Chen',
    email: 'faculty@shiftnotes.com',
    role: 'faculty',
    createdAt: '2025-08-29',
    isActive: true,
  },
];

interface UserFormData {
  name: string;
  email: string;
  role: string;
  cohortId: string;
  startDate: Date;
  password: string;
  department: string;
}

interface CohortFormData {
  name: string;
  year: string;
  startDate: string;
}

export function UserManagement() {
  const [activeTab, setActiveTab] = useState<'users' | 'cohorts'>('users');
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [cohortFilter, setCohortFilter] = useState('');
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [showCreateCohortModal, setShowCreateCohortModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editingCohort, setEditingCohort] = useState<any>(null);
  
  // API data state
  const [users, setUsers] = useState<ApiUser[]>(sampleUsers);
  const [cohorts, setCohorts] = useState<ApiCohort[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // User form state
  const [userForm, setUserForm] = useState<UserFormData>({
    name: '',
    email: '',
    role: 'trainee',
    cohortId: '',
    startDate: new Date(),
    password: '', // Will be removed from form but kept for API compatibility
    department: '',
  });

  // Cohort form state
  const [cohortForm, setCohortForm] = useState<CohortFormData>({
    name: '',
    year: '',
    startDate: '',
  });
  
  // Load data on component mount
  useEffect(() => {
    loadData();
  }, []);
  
  const loadData = async () => {
    setLoading(true);
    try {
      // Load users and cohorts from API
      const [usersResponse, cohortsResponse] = await Promise.all([
        apiClient.getUsers(),
        apiClient.getCohorts()
      ]);
      
      if (usersResponse.results) {
        // Map API users to ensure proper date handling
        const mappedUsers = usersResponse.results.map(user => ({
          ...user,
          createdAt: user.created_at || user.createdAt,
          cohortId: user.cohort || user.cohortId,
        }));
        setUsers(mappedUsers);
      }
      
      if (cohortsResponse.results) {
        setCohorts(cohortsResponse.results);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
      Alert.alert('Error', 'Failed to load users and cohorts');
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

  const filteredUsers = users.filter(user => {
    const matchesSearch = searchTerm === '' ||
      (user.name && user.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (user.email && user.email.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesRole = roleFilter === '' || user.role === roleFilter;
    const matchesCohort = cohortFilter === '' || user.cohortId === cohortFilter;

    return matchesSearch && matchesRole && matchesCohort;
  });

  const roleOptions = [
    { label: 'All Roles', value: '' },
    { label: 'Trainee', value: 'trainee' },
    { label: 'Faculty', value: 'faculty' },
    { label: 'Admin', value: 'admin' },
    { label: 'Leadership', value: 'leadership' },
  ];

  const cohortOptions = [
    { label: 'All Cohorts', value: '' },
    ...cohorts.map(cohort => ({
      label: cohort.name,
      value: cohort.id,
    })),
  ];

  const userRoleOptions = [
    { label: 'Trainee', value: 'trainee' },
    { label: 'Faculty', value: 'faculty' },
    { label: 'Admin', value: 'admin' },
    { label: 'Leadership', value: 'leadership' },
  ];

  const handleCreateUser = async () => {
    if (!userForm.name || !userForm.email) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }
    
    setLoading(true);
    try {
      const userData = {
        name: userForm.name,
        email: userForm.email,
        role: userForm.role as 'trainee' | 'faculty' | 'admin' | 'leadership' | 'system-admin',
        cohort: userForm.cohortId || undefined,
        start_date: userForm.startDate.toISOString().split('T')[0], // Format as YYYY-MM-DD
        password: 'temp_invitation_password', // Temporary password, user will set via email invitation
        department: userForm.department || '',
        specialties: [],
        is_active: false, // User inactive until they complete invitation flow
      };
      
      const newUser = await apiClient.createUser(userData);
      
      // Add to local state
      setUsers(prevUsers => [...prevUsers, newUser]);
      
      // Reset form and close modal
      setShowCreateUserModal(false);
      setEditingUser(null);
      setUserForm({ 
        name: '', 
        email: '', 
        role: 'trainee', 
        cohortId: '', 
        startDate: new Date(),
        password: '',
        department: '',
      });
      
      Alert.alert('Success', 'User created successfully! A welcome email has been sent with password setup instructions.');
    } catch (error) {
      console.error('Failed to create user:', error);
      Alert.alert('Error', 'Failed to create user. Please try again.');
    } finally {
      setLoading(false);
    }
  };


  const handleCreateCohort = () => {
    console.log('Creating cohort:', cohortForm);
    setShowCreateCohortModal(false);
    setCohortForm({ name: '', year: '', startDate: '' });
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setUserForm({
      name: user.name,
      email: user.email,
      role: user.role,
      cohortId: user.cohortId || '',
      startDate: '',
    });
    setShowCreateUserModal(true);
  };


  const renderUsersTab = () => (
    <View style={styles.tabContent}>
      {/* Filters */}
      <Card style={styles.filtersCard}>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <View style={styles.filterRow}>
            <View style={styles.filterField}>
              <Text style={styles.label}>Search Users</Text>
              <Input
                placeholder="Search by name or email"
                value={searchTerm}
                onChangeText={setSearchTerm}
                icon={<MagnifyingGlass size={16} color="#64748b" />}
              />
            </View>
            <View style={styles.filterField}>
              <Text style={styles.label}>Filter by Role</Text>
              <Select
                value={roleFilter}
                onValueChange={setRoleFilter}
                options={roleOptions}
                placeholder="All Roles"
              />
            </View>
          </View>
          <View style={styles.filterRow}>
            <View style={styles.filterField}>
              <Text style={styles.label}>Filter by Cohort</Text>
              <Select
                value={cohortFilter}
                onValueChange={setCohortFilter}
                options={cohortOptions}
                placeholder="All Cohorts"
              />
            </View>
            <View style={styles.filterField} />
          </View>
        </CardContent>
      </Card>

      {/* Users List */}
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleContainer}>
          <Users size={20} color="#374151" />
          <Text style={styles.sectionTitle}>Trainees ({filteredUsers.filter(u => u.role === 'trainee').length})</Text>
        </View>
        <Button
          title="Add User"
          onPress={() => setShowCreateUserModal(true)}
          icon={<Plus size={16} color="#ffffff" />}
          size="sm"
        />
      </View>

      {filteredUsers.filter(user => user.role === 'trainee').map(user => {
        const cohort = sampleCohorts.find(c => c.id === user.cohortId);
        return (
          <Card key={user.id} style={styles.userCard}>
            <CardHeader style={styles.userCardHeader}>
              <View style={styles.userInfo}>
                <Text style={styles.userName}>{user.name}</Text>
                <View style={styles.userBadges}>
                  <View style={[styles.badge, styles.roleTrainee]}>
                    <Text style={styles.badgeText}>trainee</Text>
                  </View>
                  <View style={[styles.badge, styles.statusActive]}>
                    <Text style={styles.badgeText}>Active</Text>
                  </View>
                </View>
              </View>
              <View style={styles.userActions}>
                <Pressable style={styles.actionButton} onPress={() => handleEditUser(user)}>
                  <PencilSimple size={16} color="#64748b" />
                  <Text style={styles.actionButtonText}>Edit</Text>
                </Pressable>
              </View>
            </CardHeader>
            <CardContent>
              <Text style={styles.userEmail}>{user.email}</Text>
              {cohort && <Text style={styles.userCohort}>Cohort: {cohort.name}</Text>}
              <Text style={styles.userCreated}>Created: {user.createdAt ? format(new Date(user.createdAt), 'M/d/yyyy') : 'N/A'}</Text>
            </CardContent>
          </Card>
        );
      })}
    </View>
  );

  const renderCohortsTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleContainer}>
          <Text style={styles.sectionTitle}>Cohorts ({sampleCohorts.length})</Text>
        </View>
        <Button
          title="Add Cohort"
          onPress={() => setShowCreateCohortModal(true)}
          icon={<Plus size={16} color="#ffffff" />}
          size="sm"
        />
      </View>

      {sampleCohorts.map(cohort => (
        <Card key={cohort.id} style={styles.cohortCard}>
          <CardHeader style={styles.cohortCardHeader}>
            <View style={styles.cohortInfo}>
              <Text style={styles.cohortName}>{cohort.name}</Text>
              <View style={[styles.badge, styles.statusActive]}>
                <Text style={styles.badgeText}>Active</Text>
              </View>
            </View>
            <View style={styles.cohortActions}>
              <Pressable style={styles.actionButton}>
                <Users size={16} color="#64748b" />
                <Text style={styles.actionButtonText}>Manage Trainees</Text>
              </Pressable>
              <Pressable style={styles.actionButton}>
                <PencilSimple size={16} color="#64748b" />
                <Text style={styles.actionButtonText}>Edit</Text>
              </Pressable>
              <Pressable style={styles.actionButton}>
                <Trash size={16} color="#dc2626" />
                <Text style={[styles.actionButtonText, { color: '#dc2626' }]}>Delete</Text>
              </Pressable>
            </View>
          </CardHeader>
          <CardContent>
            <Text style={styles.cohortDetails}>Start Date: {cohort.startDate ? format(new Date(cohort.startDate), 'M/d/yyyy') : 'N/A'}</Text>
            <Text style={styles.cohortDetails}>Trainees: {cohort.trainees}</Text>
          </CardContent>
        </Card>
      ))}
    </View>
  );

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.pageTitle}>User Management</Text>
            <Text style={styles.pageSubtitle}>Manage users, roles, and cohorts in the system</Text>
          </View>
          <Button
            title="Export"
            variant="outline"
            size="sm"
            icon={<Export size={16} color="#64748b" />}
            onPress={() => console.log('Export data')}
          />
        </View>

        {/* Tabs */}
        <View style={styles.tabContainer}>
          <Pressable
            style={[styles.tab, activeTab === 'users' && styles.activeTab]}
            onPress={() => setActiveTab('users')}
          >
            <Text style={[styles.tabText, activeTab === 'users' && styles.activeTabText]}>
              Users
            </Text>
          </Pressable>
          <Pressable
            style={[styles.tab, activeTab === 'cohorts' && styles.activeTab]}
            onPress={() => setActiveTab('cohorts')}
          >
            <Text style={[styles.tabText, activeTab === 'cohorts' && styles.activeTabText]}>
              Cohorts
            </Text>
          </Pressable>
        </View>

        {/* Tab Content */}
        {activeTab === 'users' ? renderUsersTab() : renderCohortsTab()}
      </ScrollView>

      {/* Create User Modal */}
      <Modal
        visible={showCreateUserModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCreateUserModal(false)}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalOverlay}
          >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
              <View style={styles.modalOverlay}>
                <TouchableWithoutFeedback onPress={() => {}}>
                  <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingUser ? 'Edit User' : 'Create New User'}
              </Text>
              <Pressable onPress={() => {
                setShowCreateUserModal(false);
                setEditingUser(null);
                setUserForm({ name: '', email: '', role: 'trainee', cohortId: '', startDate: new Date(), password: '', department: '' });
              }}>
                <X size={24} color="#6b7280" />
              </Pressable>
            </View>

            <View style={styles.modalBody}>
              <View style={styles.formField}>
                <Text style={styles.label}>Email *</Text>
                <Input
                  value={userForm.email}
                  onChangeText={(text) => setUserForm({ ...userForm, email: text })}
                  placeholder="user@hospital.edu"
                  keyboardType="email-address"
                />
              </View>

              <View style={styles.formField}>
                <Text style={styles.label}>Name *</Text>
                <Input
                  value={userForm.name}
                  onChangeText={(text) => setUserForm({ ...userForm, name: text })}
                  placeholder="John Doe"
                />
              </View>

              <View style={styles.formField}>
                <Text style={styles.label}>Role *</Text>
                <Select
                  value={userForm.role}
                  onValueChange={(value) => setUserForm({ ...userForm, role: value })}
                  options={userRoleOptions}
                  placeholder="Select role"
                />
              </View>

              <View style={styles.formField}>
                <Text style={styles.label}>Cohort</Text>
                <Select
                  value={userForm.cohortId}
                  onValueChange={(value) => setUserForm({ ...userForm, cohortId: value })}
                  options={[
                    { label: 'Select cohort (optional)', value: '' },
                    ...cohorts.map(cohort => ({
                      label: cohort.name,
                      value: cohort.id,
                    })),
                  ]}
                  placeholder="Select cohort (optional)"
                />
              </View>



              <View style={styles.formField}>
                <Text style={styles.label}>Department</Text>
                <Input
                  value={userForm.department}
                  onChangeText={(text) => setUserForm({ ...userForm, department: text })}
                  placeholder="e.g. Emergency Medicine"
                />
              </View>

              <View style={styles.formField}>
                <Text style={styles.label}>Start Date</Text>
                <Pressable 
                  style={styles.datePickerButton}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Calendar size={16} color="#64748b" />
                  <Text style={styles.datePickerText}>
                    {userForm.startDate instanceof Date ? format(userForm.startDate, 'MM/dd/yyyy') : 'Select date'}
                  </Text>
                </Pressable>
                
                {showDatePicker && (
                  <DateTimePicker
                    value={userForm.startDate instanceof Date ? userForm.startDate : new Date()}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={(event, selectedDate) => {
                      setShowDatePicker(Platform.OS === 'ios');
                      if (selectedDate) {
                        setUserForm({ ...userForm, startDate: selectedDate });
                      }
                    }}
                  />
                )}
              </View>
            </View>

            <View style={styles.modalFooter}>
              <Button
                title={editingUser ? 'Update User' : 'Create User'}
                onPress={handleCreateUser}
                disabled={!userForm.name || !userForm.email || loading}
              />
            </View>
                  </View>
                </TouchableWithoutFeedback>
              </View>
            </TouchableWithoutFeedback>
          </KeyboardAvoidingView>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Create Cohort Modal */}
      <Modal
        visible={showCreateCohortModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCreateCohortModal(false)}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalOverlay}
          >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
              <View style={styles.modalOverlay}>
                <TouchableWithoutFeedback onPress={() => {}}>
                  <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create New Cohort</Text>
              <Pressable onPress={() => setShowCreateCohortModal(false)}>
                <X size={24} color="#6b7280" />
              </Pressable>
            </View>

            <Text style={styles.modalSubtitle}>Add a new trainee cohort to the system.</Text>

            <View style={styles.modalBody}>
              <View style={styles.formField}>
                <Text style={styles.label}>Name</Text>
                <Input
                  value={cohortForm.name}
                  onChangeText={(text) => setCohortForm({ ...cohortForm, name: text })}
                  placeholder="PGY-1 2024"
                />
              </View>

              <View style={styles.formField}>
                <Text style={styles.label}>Year</Text>
                <Input
                  value={cohortForm.year}
                  onChangeText={(text) => setCohortForm({ ...cohortForm, year: text })}
                  placeholder="2025"
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.formField}>
                <Text style={styles.label}>Start Date</Text>
                <Input
                  value={cohortForm.startDate}
                  onChangeText={(text) => setCohortForm({ ...cohortForm, startDate: text })}
                  placeholder="mm/dd/yyyy"
                  icon={<Calendar size={16} color="#64748b" />}
                />
              </View>
            </View>

            <View style={styles.modalFooter}>
              <Button
                title="Create Cohort"
                onPress={handleCreateCohort}
                disabled={!cohortForm.name || !cohortForm.year}
              />
            </View>
                  </View>
                </TouchableWithoutFeedback>
              </View>
            </TouchableWithoutFeedback>
          </KeyboardAvoidingView>
        </TouchableWithoutFeedback>
      </Modal>
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
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 4,
  },
  pageSubtitle: {
    fontSize: 16,
    color: '#6b7280',
  },

  // Tabs
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 4,
    marginBottom: 24,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: '#e5e7eb',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  activeTabText: {
    color: '#1f2937',
  },

  // Content
  tabContent: {
    flex: 1,
  },
  
  // Filters
  filtersCard: {
    marginBottom: 24,
  },
  filterRow: {
    flexDirection: isTablet ? 'row' : 'column',
    gap: 16,
    marginBottom: isTablet ? 0 : 16,
  },
  filterField: {
    flex: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
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
    color: '#1f2937',
  },

  // User Cards
  userCard: {
    marginBottom: 16,
  },
  userCardHeader: {
    flexDirection: isTablet ? 'row' : 'column',
    justifyContent: 'space-between',
    alignItems: isTablet ? 'center' : 'flex-start',
    gap: 12,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  userBadges: {
    flexDirection: 'row',
    gap: 8,
  },
  userActions: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  actionButtonText: {
    fontSize: 12,
    color: '#64748b',
  },
  userEmail: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  userCohort: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  userCreated: {
    fontSize: 12,
    color: '#9ca3af',
  },

  // Cohort Cards
  cohortCard: {
    marginBottom: 16,
  },
  cohortCardHeader: {
    flexDirection: isTablet ? 'row' : 'column',
    justifyContent: 'space-between',
    alignItems: isTablet ? 'center' : 'flex-start',
    gap: 12,
  },
  cohortInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  cohortName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  cohortActions: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  cohortDetails: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },

  // Badges
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleTrainee: {
    backgroundColor: '#dbeafe',
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

  // Modal
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
    maxHeight: '80%',
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
    color: '#1f2937',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    paddingHorizontal: 20,
    paddingTop: 8,
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
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    backgroundColor: '#ffffff',
  },
  datePickerText: {
    fontSize: 16,
    color: '#374151',
    flex: 1,
  },
});
