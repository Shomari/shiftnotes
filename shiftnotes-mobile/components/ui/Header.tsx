/**
 * Header component with responsive design
 * Shows hamburger menu on mobile, clean header on desktop
 */

import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';

interface HeaderProps {
  title: string;
  onMenuPress?: () => void;
  onLogout?: () => void;
  userInfo?: {
    name: string;
    role: string;
  };
  showMenuButton?: boolean;
  leftAction?: {
    icon: React.ComponentType<any>;
    onPress: () => void;
  };
}

export function Header({ title, onMenuPress, onLogout, userInfo, showMenuButton = true, leftAction }: HeaderProps) {
  return (
    <View style={styles.header}>
      <View style={styles.leftSection}>
        {leftAction ? (
          <Pressable onPress={leftAction.onPress} style={styles.menuButton}>
            <leftAction.icon size={24} color="#374151" />
          </Pressable>
        ) : showMenuButton && onMenuPress && (
          <Pressable onPress={onMenuPress} style={styles.menuButton}>
            <View style={styles.hamburger}>
              <View style={styles.line} />
              <View style={styles.line} />
              <View style={styles.line} />
            </View>
          </Pressable>
        )}
        
        <View style={[styles.titleSection, !showMenuButton && styles.titleSectionNoMenu]}>
          <Text style={styles.appName}>EPAnotes</Text>
          <Text style={styles.subtitle}>Competency Tracking System</Text>
        </View>
      </View>

      {userInfo && (
        <View style={styles.rightSection}>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{userInfo.name}</Text>
            <Text style={styles.userRole}>{userInfo.role}</Text>
          </View>
          {onLogout && (
            <Pressable onPress={onLogout} style={styles.logoutButton}>
              <Text style={styles.logoutText}>Sign Out</Text>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    minHeight: 56,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuButton: {
    padding: 8,
    marginRight: 12,
  },
  hamburger: {
    width: 24,
    height: 18,
    justifyContent: 'space-between',
  },
  line: {
    width: 24,
    height: 2,
    backgroundColor: '#374151',
    borderRadius: 1,
  },
  titleSection: {
    flex: 1,
  },
  titleSectionNoMenu: {
    marginLeft: 0,
  },
  appName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    lineHeight: 20,
  },
  subtitle: {
    fontSize: 11,
    color: '#6b7280',
    lineHeight: 14,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  userInfo: {
    alignItems: 'flex-end',
    maxWidth: 120,
  },
  userName: {
    fontSize: 12,
    fontWeight: '500',
    color: '#1f2937',
    lineHeight: 16,
  },
  userRole: {
    fontSize: 10,
    color: '#6b7280',
    textTransform: 'capitalize',
    lineHeight: 12,
  },
  logoutButton: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    backgroundColor: '#f3f4f6',
  },
  logoutText: {
    fontSize: 10,
    color: '#374151',
    fontWeight: '500',
  },
});
