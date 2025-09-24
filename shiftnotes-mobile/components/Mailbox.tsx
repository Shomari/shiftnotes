import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Card, CardHeader, CardTitle, CardContent } from './ui/Card';
import { Button } from './ui/Button';
import { apiClient } from '../lib/api';

interface Assessment {
  id: string;
  trainee_name: string;
  evaluator_name: string;
  shift_date: string;
  private_comments: string;
  is_read_by_current_user: boolean;
  created_at: string;
  assessment_epas: Array<{
    epa_code: string;
    epa_title: string;
    entrustment_level: number;
  }>;
}

interface MailboxData {
  results: Assessment[];
  count: number;
  unread_count?: number;
  read_count?: number;
  next?: string;
  previous?: string;
}

interface MailboxProps {
  onViewAssessment?: (assessmentId: string) => void;
}

export function Mailbox({ onViewAssessment }: MailboxProps = {}) {
  const [unreadData, setUnreadData] = useState<MailboxData | null>(null);
  const [readData, setReadData] = useState<MailboxData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'unread' | 'read'>('unread');
  
  // Pagination state for both tabs
  const [unreadPage, setUnreadPage] = useState(1);
  const [readPage, setReadPage] = useState(1);
  const pageSize = 10; // Smaller page size for mailbox
  
  // Ref for scroll view to control scroll position
  const scrollViewRef = useRef<ScrollView>(null);

  const loadMailboxData = async () => {
    try {
      // Load current tab data with pagination
      if (activeTab === 'unread') {
        const unreadResponse = await apiClient.getMailboxAssessments(unreadPage, pageSize);
        setUnreadData(unreadResponse);
      } else {
        const readResponse = await apiClient.getReadMailboxAssessments(readPage, pageSize);
        setReadData(readResponse);
      }
    } catch (error) {
      console.error('Failed to load mailbox data:', error);
      Alert.alert('Error', 'Failed to load mailbox data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadBothTabsInitial = async () => {
    try {
      // Load first page of both tabs to get initial data and counts
      const [unreadResponse, readResponse] = await Promise.all([
        apiClient.getMailboxAssessments(1, pageSize),
        apiClient.getReadMailboxAssessments(1, pageSize)
      ]);
      
      setUnreadData(unreadResponse);
      setReadData(readResponse);
    } catch (error) {
      console.error('Failed to load initial mailbox data:', error);
      Alert.alert('Error', 'Failed to load mailbox data');
    }
  };

  const handleMarkAsRead = async (assessmentId: string) => {
    try {
      await apiClient.markAssessmentAsRead(assessmentId);
      
      // Reload both unread and read data
      await loadMailboxData();

      Alert.alert('Success', 'Assessment marked as read');
    } catch (error) {
      console.error('Failed to mark assessment as read:', error);
      Alert.alert('Error', 'Failed to mark assessment as read');
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadMailboxData();
  };


  useEffect(() => {
    loadMailboxData();
  }, [activeTab, unreadPage, readPage]);

  // Scroll to top when tab changes
  useEffect(() => {
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollTo({ y: 0, animated: true });
    }
  }, [activeTab]);

  useEffect(() => {
    // Load initial data for both tabs when component mounts
    loadBothTabsInitial();
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  // Pagination functions
  const getCurrentPage = () => activeTab === 'unread' ? unreadPage : readPage;
  const setCurrentPage = (page: number) => {
    if (activeTab === 'unread') {
      setUnreadPage(page);
    } else {
      setReadPage(page);
    }
  };

  const getCurrentData = () => activeTab === 'unread' ? unreadData : readData;
  
  const goToPreviousPage = () => {
    const currentPage = getCurrentPage();
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const goToNextPage = () => {
    const currentData = getCurrentData();
    if (currentData?.next) {
      setCurrentPage(getCurrentPage() + 1);
    }
  };

  const getEntrustmentLabel = (epa: any) => {
    // Use the EPA-specific entrustment level description from the backend
    // This comes from the SubCompetency milestone level descriptions
    return epa.entrustment_level_description || `Level ${epa.entrustment_level} - Unknown description`;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading mailbox...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>📬 Leadership Mailbox</Text>
        <Text style={styles.subtitle}>
          Assessments with private comments
        </Text>
        
        {/* Tab Navigation */}
        <View style={styles.tabContainer}>
          <Button
            title={`Unread (${unreadData?.unread_count || 0})`}
            onPress={() => {
              setActiveTab('unread');
              setUnreadPage(1); // Reset to first page when switching tabs
            }}
            variant={activeTab === 'unread' ? 'default' : 'outline'}
            size="sm"
            style={styles.tabButton}
          />
          <Button
            title={`Read (${readData?.read_count || 0})`}
            onPress={() => {
              setActiveTab('read');
              setReadPage(1); // Reset to first page when switching tabs
            }}
            variant={activeTab === 'read' ? 'default' : 'outline'}
            size="sm"
            style={styles.tabButton}
          />
        </View>
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {(() => {
          const currentData = activeTab === 'unread' ? unreadData : readData;
          const isEmpty = !currentData?.results.length;
          
          if (isEmpty) {
            return (
              <Card style={styles.emptyCard}>
                <CardContent>
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyIcon}>📭</Text>
                    <Text style={styles.emptyTitle}>
                      {activeTab === 'unread' ? 'No Unread Messages' : 'No Read Messages'}
                    </Text>
                    <Text style={styles.emptySubtitle}>
                      {activeTab === 'unread' 
                        ? 'All assessments with private comments have been reviewed'
                        : 'No assessments have been marked as read yet'
                      }
                    </Text>
                  </View>
                </CardContent>
              </Card>
            );
          }
          
          return currentData?.results.map((assessment) => (
            <Card key={assessment.id} style={styles.assessmentCard}>
              <CardHeader>
                <View style={styles.cardHeader}>
                  <View style={styles.headerLeft}>
                    <CardTitle>
                      Assessment: {assessment.trainee_name}
                    </CardTitle>
                    <Text style={styles.evaluatorText}>
                      By {assessment.evaluator_name} • {formatDate(assessment.shift_date)}
                    </Text>
                  </View>
                  <View style={styles.headerRight}>
                    <View style={styles.unreadIndicator} />
                  </View>
                </View>
              </CardHeader>
              
              <CardContent>
                {/* EPA Information */}
                {assessment.assessment_epas.length > 0 && (
                  <View style={styles.epaSection}>
                    <Text style={styles.sectionLabel}>EPA Assessed:</Text>
                    {assessment.assessment_epas.map((epa, index) => (
                      <View key={index} style={styles.epaItem}>
                        <Text style={styles.epaCode}>
                          {epa.epa_code.replace(/EPA(\d+)/, 'EPA $1')} - {epa.epa_title}
                        </Text>
                        <Text style={styles.entrustmentLevel}>
                          {getEntrustmentLabel(epa)}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Private Comments */}
                <View style={styles.commentsSection}>
                  <Text style={styles.sectionLabel}>Private Comments:</Text>
                  <View style={styles.commentsBox}>
                    <Text style={styles.commentsText}>
                      {assessment.private_comments}
                    </Text>
                  </View>
                </View>

                {/* Action Buttons */}
                <View style={styles.actionSection}>
                  <Button
                    title="View Assessment"
                    onPress={() => onViewAssessment?.(assessment.id)}
                    variant="outline"
                    size="sm"
                    style={styles.viewButton}
                  />
                  {activeTab === 'unread' && (
                    <Button
                      title="Mark as Read"
                      onPress={() => handleMarkAsRead(assessment.id)}
                      size="sm"
                      style={styles.markReadButton}
                    />
                  )}
                </View>
              </CardContent>
            </Card>
          ));
        })()}

        {/* Pagination Controls */}
        {(() => {
          const currentData = activeTab === 'unread' ? unreadData : readData;
          const currentPage = getCurrentPage();
          const totalCount = currentData?.count || 0;
          const totalPages = Math.ceil(totalCount / pageSize);
          const startResult = ((currentPage - 1) * pageSize) + 1;
          const endResult = Math.min(currentPage * pageSize, totalCount);
          
          console.log('Pagination debug:', { activeTab, totalCount, totalPages, currentPage, hasNext: !!currentData?.next });
          
          if (totalCount > 0) { // Show pagination info even for single page
            return (
              <View style={styles.paginationContainer}>
                {/* Pagination Info */}
                <View style={styles.paginationInfo}>
                  <Text style={styles.paginationText}>
                    Showing {startResult}-{endResult} of {totalCount} {activeTab} assessments
                  </Text>
                </View>
                
                {/* Pagination Controls - only show if multiple pages */}
                {totalPages > 1 && (
                  <View style={styles.paginationControls}>
                    <Button
                      title="← Previous"
                      onPress={goToPreviousPage}
                      variant="outline"
                      size="sm"
                      disabled={currentPage <= 1}
                      style={currentPage <= 1 ? {...styles.paginationButton, ...styles.disabledButton} : styles.paginationButton}
                    />
                    
                    <View style={styles.pageInfo}>
                      <Text style={styles.pageText}>
                        Page {currentPage} of {totalPages}
                      </Text>
                    </View>
                    
                    <Button
                      title="Next →"
                      onPress={goToNextPage}
                      variant="outline"
                      size="sm"
                      disabled={!currentData?.next}
                      style={!currentData?.next ? {...styles.paginationButton, ...styles.disabledButton} : styles.paginationButton}
                    />
                  </View>
                )}
              </View>
            );
          }
          return null;
        })()}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
  },
  header: {
    padding: 20,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
  },
  tabContainer: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 8,
  },
  tabButton: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  emptyCard: {
    marginTop: 40,
  },
  emptyState: {
    alignItems: 'center',
    padding: 32,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  assessmentCard: {
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    marginLeft: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  evaluatorText: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  unreadIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ef4444',
  },
  epaSection: {
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  epaItem: {
    backgroundColor: '#f3f4f6',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  epaCode: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  epaTitle: {
    fontSize: 14,
    color: '#374151',
    marginTop: 2,
  },
  entrustmentLevel: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 4,
  },
  commentsSection: {
    marginBottom: 20,
  },
  commentsBox: {
    backgroundColor: '#fef3c7',
    borderWidth: 1,
    borderColor: '#f59e0b',
    borderRadius: 8,
    padding: 12,
  },
  commentsText: {
    fontSize: 14,
    color: '#92400e',
    lineHeight: 20,
  },
  actionSection: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  viewButton: {
    minWidth: 120,
  },
  markReadButton: {
    paddingHorizontal: 20,
    minWidth: 120,
  },
  
  // Pagination styles
  paginationContainer: {
    padding: 16,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  paginationInfo: {
    alignItems: 'center',
    marginBottom: 12,
  },
  paginationText: {
    fontSize: 14,
    color: '#64748b',
  },
  paginationControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  paginationButton: {
    minWidth: 100,
  },
  disabledButton: {
    opacity: 0.5,
  },
  pageInfo: {
    flex: 1,
    alignItems: 'center',
  },
  pageText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
});
