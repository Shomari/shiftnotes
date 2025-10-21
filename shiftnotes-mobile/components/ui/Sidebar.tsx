/**
 * Responsive Sidebar navigation component
 * Shows as permanent sidebar on desktop/tablet, modal on mobile
 */

import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, Modal, TouchableWithoutFeedback, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiClient } from '../../lib/api';

const { width } = Dimensions.get('window');
const MOBILE_BREAKPOINT = 768; // iPad width and below is considered mobile

interface NavigationItem {
  id: string;
  title: string;
  icon: string;
  active?: boolean;
  showNotification?: boolean;
  notificationCount?: number;
}

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (itemId: string) => void;
  currentRoute: string;
  userRole?: string;
  isPermanent?: boolean; // For desktop layout
  programName?: string; // Program name to display
}

const getNavigationItems = (userRole?: string): NavigationItem[] => {

  // Coordinator and System Coordinator - administrative access
  if (userRole === 'admin' || userRole === 'system-admin') {
    return [
      {
        id: 'overview',
        title: 'Overview',
        icon: '📊',
      },
      {
        id: 'user-management',
        title: 'User Management',
        icon: '👥',
      },
      {
        id: 'cohort-management',
        title: 'Cohort Management',
        icon: '🎓',
      },
      // {
      //   id: 'category-management',
      //   title: 'Category Management',
      //   icon: '🏷️',
      // },
      {
        id: 'competency-grid',
        title: 'Competency Grid',
        icon: '📃',
      },
      {
        id: 'site-management',
        title: 'Site Management',
        icon: '🏥',
      },
    ];
  }

        // Leadership - analytics, strategic oversight, EPA and competency management
        if (userRole === 'leadership') {
          return [
            {
              id: 'overview',
              title: 'Overview',
              icon: '📊',
            },
            {
              id: 'mailbox',
              title: 'Mailbox',
              icon: '📬',
              showNotification: true,
            },
            {
              id: 'all-assessments',
              title: 'All Assessments',
              icon: '📋',
            },
            {
              id: 'faculty-dashboard',
              title: 'Faculty Dashboard',
              icon: '👨‍⚕️',
            },
            {
              id: 'program-performance',
              title: 'Program Performance',
              icon: '📈',
            },
            {
              id: 'trainee-performance',
              title: 'Trainee Performance',
              icon: '🎓',
            },
            {
              id: 'epa-management',
              title: 'EPA Management',
              icon: '📝',
            },
            {
              id: 'competency-management',
              title: 'Competency Management',
              icon: '🎯',
            },
            {
              id: 'competency-grid',
              title: 'Competency Grid',
              icon: '📃',
            },
          ];
        }

  // Trainee - very limited access
  if (userRole === 'trainee') {
    return [
      {
        id: 'overview',
        title: 'Overview',
        icon: '📊',
      },
      {
        id: 'my-assessments',
        title: 'My Assessments',
        icon: '📋',
      },
      {
        id: 'competency-progress',
        title: 'Competency Progress',
        icon: '📈',
      },
    ];
  }
  
  // Faculty and Leadership - can create assessments and view their own
  const baseItems: NavigationItem[] = [
    {
      id: 'overview',
      title: 'Overview',
      icon: '📊',
    },
    {
      id: 'new-assessment',
      title: 'New Assessment',
      icon: '➕',
    },
    {
      id: 'my-assessments',
      title: 'My Assessments',
      icon: '📋',
    },
  ];

  return baseItems;
};

export function Sidebar({ isOpen, onClose, onNavigate, currentRoute, userRole, isPermanent = false, programName }: SidebarProps) {
  const [mailboxCount, setMailboxCount] = useState<number>(0);
  const insets = useSafeAreaInsets();
  
  // Load mailbox count for leadership users
  useEffect(() => {
    const loadMailboxCount = async () => {
      if (userRole === 'leadership' || userRole === 'admin' || userRole === 'system-admin') {
        try {
          const data = await apiClient.getMailboxCount();
          setMailboxCount(data.unread_count);
        } catch (error) {
          console.log('Failed to load mailbox count:', error);
        }
      }
    };

    loadMailboxCount();
    
    // Refresh count every 30 seconds
    const interval = setInterval(loadMailboxCount, 30000);
    return () => clearInterval(interval);
  }, [userRole]);

  const navigationItems = getNavigationItems(userRole).map(item => {
    if (item.id === 'mailbox' && item.showNotification) {
      return { ...item, notificationCount: mailboxCount };
    }
    return item;
  });
  
  const isMobile = width <= MOBILE_BREAKPOINT;
  
  // Determine if sidebar should be permanent (desktop) or modal (mobile)
  const shouldShowPermanent = isPermanent && !isMobile;
  
  const SidebarContent = () => (
    <View style={[styles.sidebar, shouldShowPermanent && styles.sidebarPermanent]}>
      {/* Sidebar Header */}
      <View style={[styles.sidebarHeader, { paddingTop: insets.top + 20 }]}>
        <Text style={styles.sidebarTitle}>{programName || 'Navigation'}</Text>
        {!shouldShowPermanent && (
          <Pressable onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeText}>✕</Text>
          </Pressable>
        )}
      </View>

      {/* Navigation Items */}
      <View style={styles.navigationList}>
        {navigationItems.map((item) => {
          const isActive = currentRoute === item.id;
          return (
            <Pressable
              key={item.id}
              style={[
                styles.navigationItem,
                isActive && styles.navigationItemActive,
              ]}
              onPress={() => {
                onNavigate(item.id);
                if (!shouldShowPermanent) {
                  onClose();
                }
              }}
            >
              <View style={styles.navigationIconContainer}>
                <Text style={styles.navigationIcon}>{item.icon}</Text>
                {item.showNotification && item.notificationCount && item.notificationCount > 0 && (
                  <View style={styles.notificationBadge}>
                    <Text style={styles.notificationText}>
                      {item.notificationCount > 99 ? '99+' : item.notificationCount}
                    </Text>
                  </View>
                )}
              </View>
              <Text
                style={[
                  styles.navigationText,
                  isActive && styles.navigationTextActive,
                ]}
              >
                {item.title}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Support Section */}
      <View style={styles.supportSection}>
        <Pressable
          style={[
            styles.supportItem,
            currentRoute === 'support-request' && styles.supportItemActive,
          ]}
          onPress={() => {
            onNavigate('support-request');
            if (!shouldShowPermanent) {
              onClose();
            }
          }}
        >
          <View style={styles.supportIconContainer}>
            <Text style={styles.supportIcon}>💬</Text>
          </View>
          <Text style={styles.supportText}>Support</Text>
        </Pressable>
      </View>

      {/* Footer */}
      <View style={styles.sidebarFooter}>
        <Text style={styles.footerText}>EPAnotes v1.0</Text>
      </View>
    </View>
  );

  // For permanent sidebar (desktop), render directly
  if (shouldShowPermanent) {
    return <SidebarContent />;
  }

  // For mobile, render as modal
  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <SidebarContent />
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    flexDirection: 'row',
  },
  sidebar: {
    width: 280,
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: {
      width: 2,
      height: 0,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 8,
  },
  sidebarPermanent: {
    position: 'relative',
    shadowOpacity: 0.15,
    borderRightWidth: 1,
    borderRightColor: '#e5e7eb',
    elevation: 2,
  },
  sidebarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
  },
  sidebarTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    textAlign: 'center',
    flex: 1,
  },
  closeButton: {
    padding: 4,
  },
  closeText: {
    fontSize: 18,
    color: '#6b7280',
  },
  navigationList: {
    flex: 1,
    paddingTop: 8,
  },
  navigationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  navigationItemActive: {
    backgroundColor: '#eff6ff',
    borderRightWidth: 3,
    borderRightColor: '#3b82f6',
  },
  navigationIconContainer: {
    position: 'relative',
    marginRight: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navigationIcon: {
    fontSize: 20,
    textAlign: 'center',
  },
  notificationBadge: {
    position: 'absolute',
    top: -4,
    right: -6,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  notificationText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#ffffff',
    lineHeight: 12,
  },
  navigationText: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '500',
  },
  navigationTextActive: {
    color: '#3b82f6',
    fontWeight: '600',
  },
  sidebarFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
  },
  footerText: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
  
  // Support section styles
  supportSection: {
    paddingHorizontal: 12,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    marginTop: 'auto', // Push to bottom
  },
  supportItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: 'transparent',
  },
  supportItemActive: {
    backgroundColor: '#e0f2fe',
  },
  supportIconContainer: {
    width: 24,
    height: 24,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  supportIcon: {
    fontSize: 18,
  },
  supportText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#0891b2', // Light teal color - friendly and professional
    flex: 1,
  },
});
