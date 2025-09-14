/**
 * Responsive Sidebar navigation component
 * Shows as permanent sidebar on desktop/tablet, modal on mobile
 */

import React from 'react';
import { View, Text, Pressable, StyleSheet, Modal, TouchableWithoutFeedback, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');
const MOBILE_BREAKPOINT = 768; // iPad width and below is considered mobile

interface NavigationItem {
  id: string;
  title: string;
  icon: string;
  active?: boolean;
}

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (itemId: string) => void;
  currentRoute: string;
  userRole?: string;
  isPermanent?: boolean; // For desktop layout
}

const getNavigationItems = (userRole?: string): NavigationItem[] => {

  // Admin and System Admin - full access including overview
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
        id: 'epa-management',
        title: 'EPA Management',
        icon: '📋',
      },
      {
        id: 'competency-management',
        title: 'Competency Management',
        icon: '🎯',
      },
      {
        id: 'competency-grid',
        title: 'Competency Grid',
        icon: '📊',
      },
      {
        id: 'site-management',
        title: 'Site Management',
        icon: '🏥',
      },
    ];
  }

  // Leadership - analytics and strategic oversight
  if (userRole === 'leadership') {
    return [
      {
        id: 'overview',
        title: 'Overview',
        icon: '📊',
      },
      {
        id: 'program-performance',
        title: 'Program Performance',
        icon: '📈',
      },
      {
        id: 'competency-grid',
        title: 'Competency Grid',
        icon: '📊',
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

export function Sidebar({ isOpen, onClose, onNavigate, currentRoute, userRole, isPermanent = false }: SidebarProps) {
  const navigationItems = getNavigationItems(userRole);
  const isMobile = width <= MOBILE_BREAKPOINT;
  
  // Determine if sidebar should be permanent (desktop) or modal (mobile)
  const shouldShowPermanent = isPermanent && !isMobile;
  
  const SidebarContent = () => (
    <View style={[styles.sidebar, shouldShowPermanent && styles.sidebarPermanent]}>
      {/* Sidebar Header */}
      <View style={styles.sidebarHeader}>
        <Text style={styles.sidebarTitle}>Navigation</Text>
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
              <Text style={styles.navigationIcon}>{item.icon}</Text>
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

      {/* Footer */}
      <View style={styles.sidebarFooter}>
        <Text style={styles.footerText}>ShiftNotes v1.0</Text>
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
  navigationIcon: {
    fontSize: 20,
    marginRight: 12,
    width: 24,
    textAlign: 'center',
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
});
