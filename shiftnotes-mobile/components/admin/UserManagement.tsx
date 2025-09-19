/**
 * User Management component for Coordinator users
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
  Users,
  Export
} from 'phosphor-react-native';


const { width } = Dimensions.get('window');
const isTablet = width >= 768;

interface UserManagementProps {
  onAddUser: () => void;
  onEditUser: (userId: string) => void;
}

// Sample data matching the web screenshots
const sampleCohorts = [
  { id: '1', name: 'PGY-1 2024', year: 2024, startDate: '2024-06-30', trainees: 2 },
  { id: '2', name: 'PGY-2 2023', year: 2023, startDate: '2023-06-30', trainees: 1 },
  { id: '3', name: 'PGY-3 2022', year: 2022, startDate: '2022-06-30', trainees: 0 },
];

const sampleUsers: ApiUser[] = [
  {
    id: '1',
    name: 'Jane Doe',
    email: 'jane.resident@hospital.edu',
    role: 'trainee',
    organization: 'org-1',
    program: 'prog-1',
    department: 'Emergency Medicine',
    specialties: [],
    cohort: '1',
    created_at: '2025-08-29',
  },
  {
    id: '2',
    name: 'Michael Johnson',
    email: 'mike.resident@hospital.edu',
    role: 'trainee',
    organization: 'org-1',
    program: 'prog-1',
    department: 'Emergency Medicine',
    specialties: [],
    cohort: '1',
    created_at: '2025-08-29',
  },
  {
    id: '3',
    name: 'Sarah Wilson',
    email: 'sarah.resident@hospital.edu',
    role: 'trainee',
    organization: 'org-1',
    program: 'prog-1',
    department: 'Emergency Medicine',
    specialties: [],
    cohort: '2',
    created_at: '2025-08-29',
  },
  {
    id: '4',
    name: 'Dr. Sarah Chen',
    email: 'faculty@shiftnotes.com',
    role: 'faculty',
    organization: 'org-1',
    program: 'prog-1',
    department: 'Emergency Medicine',
    specialties: ['Emergency Medicine'],
    created_at: '2025-08-29',
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


export function UserManagement({ onAddUser, onEditUser }: UserManagementProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [cohortFilter, setCohortFilter] = useState('');
  
  // API data state
  const [users, setUsers] = useState<ApiUser[]>(sampleUsers);
  const [cohorts, setCohorts] = useState<ApiCohort[]>([]);
  const [loading, setLoading] = useState(false);
  
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
        apiClient.getCohorts() // Get all cohorts without filtering by program
      ]);
      
      if (usersResponse.results) {
        // Use API users directly (no mapping needed with unified types)
        setUsers(usersResponse.results);
      }
      
      console.log('Cohorts API response:', cohortsResponse);
      if (cohortsResponse && Array.isArray(cohortsResponse)) {
        // getCohorts() already returns the array directly
        setCohorts(cohortsResponse);
      } else {
        console.warn('No cohorts found in API response');
        setCohorts([]);
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

  const filteredUsers = (users || []).filter(user => {
    if (!user) {
      console.warn('Found null/undefined user in users array');
      return false;
    }
    
    const matchesSearch = searchTerm === '' ||
      (user.name && user.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (user.email && user.email.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesRole = roleFilter === '' || user.role === roleFilter;
    const matchesCohort = cohortFilter === '' || user.cohort === cohortFilter;

    return matchesSearch && matchesRole && matchesCohort;
  });

  const roleOptions = [
    { label: 'All Roles', value: '' },
    { label: 'Trainee', value: 'trainee' },
    { label: 'Faculty', value: 'faculty' },
    { label: 'Coordinator', value: 'admin' },
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
    { label: 'Coordinator', value: 'admin' },
    { label: 'Leadership', value: 'leadership' },
  ];




  const handleEditUser = (user: ApiUser) => {
    console.log('handleEditUser called with user:', user);
    console.log('user.id:', user?.id);
    if (!user?.id) {
      console.error('User object is missing id:', user);
      return;
    }
    onEditUser(user.id);
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

      {/* Add User Button */}
      <View style={styles.addUserHeader}>
        <Button
          title="Add User"
          onPress={onAddUser}
          icon={<Plus size={16} color="#ffffff" />}
          size="sm"
        />
      </View>

      {/* Coordinators Section */}
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleContainer}>
          <Users size={20} color="#374151" />
          <Text style={styles.sectionTitle}>Coordinators ({filteredUsers.filter(u => u.role === 'admin').length})</Text>
        </View>
      </View>

      {filteredUsers?.filter(user => user?.role === 'admin')?.map(user => {
        return (
          <Card key={user.id} style={styles.userCard}>
            <CardHeader style={styles.userCardHeader}>
              <View style={styles.userInfo}>
                <Text style={styles.userName}>{user.name}</Text>
                <View style={styles.userBadges}>
                  <View style={[styles.badge, styles.roleAdmin]}>
                    <Text style={styles.badgeText}>coordinator</Text>
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
              <Text style={styles.userCreated}>Created: {user.created_at ? format(new Date(user.created_at), 'M/d/yyyy') : 'N/A'}</Text>
            </CardContent>
          </Card>
        );
      })}

      {/* Leadership Section */}
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleContainer}>
          <Users size={20} color="#374151" />
          <Text style={styles.sectionTitle}>Leadership ({filteredUsers.filter(u => u.role === 'leadership').length})</Text>
        </View>
      </View>

      {filteredUsers?.filter(user => user?.role === 'leadership')?.map(user => {
        return (
          <Card key={user.id} style={styles.userCard}>
            <CardHeader style={styles.userCardHeader}>
              <View style={styles.userInfo}>
                <Text style={styles.userName}>{user.name}</Text>
                <View style={styles.userBadges}>
                  <View style={[styles.badge, styles.roleLeadership]}>
                    <Text style={styles.badgeText}>leadership</Text>
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
              <Text style={styles.userCreated}>Created: {user.created_at ? format(new Date(user.created_at), 'M/d/yyyy') : 'N/A'}</Text>
            </CardContent>
          </Card>
        );
      })}

      {/* Faculty Section */}
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleContainer}>
          <Users size={20} color="#374151" />
          <Text style={styles.sectionTitle}>Faculty ({filteredUsers.filter(u => u.role === 'faculty').length})</Text>
        </View>
      </View>

      {filteredUsers?.filter(user => user?.role === 'faculty')?.map(user => {
        return (
          <Card key={user.id} style={styles.userCard}>
            <CardHeader style={styles.userCardHeader}>
              <View style={styles.userInfo}>
                <Text style={styles.userName}>{user.name}</Text>
                <View style={styles.userBadges}>
                  <View style={[styles.badge, styles.roleFaculty]}>
                    <Text style={styles.badgeText}>faculty</Text>
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
              <Text style={styles.userCreated}>Created: {user.created_at ? format(new Date(user.created_at), 'M/d/yyyy') : 'N/A'}</Text>
            </CardContent>
          </Card>
        );
      })}

      {/* Trainees Section */}
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleContainer}>
          <Users size={20} color="#374151" />
          <Text style={styles.sectionTitle}>Trainees ({filteredUsers.filter(u => u.role === 'trainee').length})</Text>
        </View>
      </View>

      {filteredUsers?.filter(user => user?.role === 'trainee')?.map(user => {
        const cohort = sampleCohorts?.find(c => c.id === user?.cohort);
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
              <Text style={styles.userCreated}>Created: {user.created_at ? format(new Date(user.created_at), 'M/d/yyyy') : 'N/A'}</Text>
            </CardContent>
          </Card>
        );
      })}
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

        {/* Users Content */}
        {renderUsersTab()}
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

  // Add User Header
  addUserHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 16,
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
  roleFaculty: {
    backgroundColor: '#fef3c7',
  },
  roleAdmin: {
    backgroundColor: '#f3e8ff',
  },
  roleLeadership: {
    backgroundColor: '#fce7f3',
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
  datePickerContainer: {
    position: 'relative',
    zIndex: 1000,
    isolation: 'isolate',
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
