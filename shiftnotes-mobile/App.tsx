/**
 * Main App component for ShiftNotes Mobile
 * Includes sidebar navigation and header with Django API integration
 */

import React, { useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SafeAreaView, StatusBar, StyleSheet, View, Text, Dimensions } from 'react-native';
import { TamaguiProvider } from '@tamagui/core';
import { PortalProvider } from '@tamagui/portal';
import config from './tamagui.config';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { NewAssessmentForm } from './components/assessments/NewAssessmentForm';
import { Overview } from './components/Overview';
import { MyAssessments } from './components/MyAssessments';
import { AssessmentDetail } from './components/AssessmentDetail';
import { UserManagement } from './components/admin/UserManagement';
import AddUser from './components/admin/AddUser';
import EditUser from './components/admin/EditUser';
import { EPAManagement } from './components/admin/EPAManagement';
import { CompetencyManagement } from './components/admin/CompetencyManagement';
import { CompetencyGrid } from './components/admin/CompetencyGrid';
import ProgramPerformanceDashboard from './components/analytics/ProgramPerformanceDashboard';
import { SiteManagement } from './components/admin/SiteManagement';
import { LoginScreen } from './components/LoginScreen';
import { ForgotPasswordScreen } from './components/auth/ForgotPasswordScreen';
import { ResetPasswordScreen } from './components/auth/ResetPasswordScreen';
import { Header } from './components/ui/Header';
import { Sidebar } from './components/ui/Sidebar';

function AppContent() {
  const { user, isLoading, isAuthenticated, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentRoute, setCurrentRoute] = useState('overview');
  const [authScreen, setAuthScreen] = useState<'login' | 'forgot-password' | 'reset-password'>('login');
  const [resetParams, setResetParams] = useState<{ uidb64: string; token: string } | null>(null);
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  
  const { width } = Dimensions.get('window');
  const MOBILE_BREAKPOINT = 768;
  const isMobile = width <= MOBILE_BREAKPOINT;
  const showPermanentSidebar = !isMobile && isAuthenticated;

  const handleMenuPress = () => {
    setSidebarOpen(true);
  };

  const handleSidebarClose = () => {
    setSidebarOpen(false);
  };

  const handleNavigate = (routeId: string) => {
    setCurrentRoute(routeId);
    // Only close sidebar on mobile
    if (isMobile) {
      setSidebarOpen(false);
    }
  };

  const handleNewAssessment = () => {
    setCurrentRoute('new-assessment');
  };

  const handleViewAssessment = (assessmentId: string) => {
    setSelectedAssessmentId(assessmentId);
    setCurrentRoute('assessment-detail');
  };

  const handleAddUser = () => {
    setCurrentRoute('add-user');
  };

  const handleEditUser = (userId: string) => {
    setSelectedUserId(userId);
    setCurrentRoute('edit-user');
  };

  const handleBackFromAssessment = () => {
    setSelectedAssessmentId(null);
    setCurrentRoute('my-assessments');
  };

  const handleLogout = async () => {
    try {
      await logout();
      setSidebarOpen(false);
      setCurrentRoute('overview');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  // Show loading screen while checking authentication
  if (isLoading) {
    return (
      <View style={[styles.container, styles.placeholderContent]}>
        <Text style={styles.placeholderText}>Loading...</Text>
      </View>
    );
  }

  const getPageTitle = () => {
    switch (currentRoute) {
      case 'overview':
        return 'Overview';
      case 'new-assessment':
        return 'New Assessment';
      case 'my-assessments':
        return 'My Assessments';
      case 'user-management':
        return 'User Management';
      case 'add-user':
        return 'Add New User';
      case 'edit-user':
        return 'Edit User';
      case 'epa-management':
        return 'EPA Management';
      case 'competency-management':
        return 'Competency Management';
      case 'competency-grid':
        return 'Competency Grid';
      case 'program-performance':
        return 'Program Performance';
      case 'site-management':
        return 'Site Management';
      default:
        return 'AptiTools';
    }
  };

  const renderContent = () => {
    const userInfo = user ? { name: user.name, role: user.role } : undefined;
    
    switch (currentRoute) {
      case 'overview':
        return <Overview onNewAssessment={handleNewAssessment} userInfo={userInfo} user={user} />;
      case 'new-assessment':
        return <NewAssessmentForm onNavigate={handleNavigate} />;
      case 'my-assessments':
        return <MyAssessments onViewAssessment={handleViewAssessment} />;
      case 'assessment-detail':
        return selectedAssessmentId ? (
          <AssessmentDetail 
            assessmentId={selectedAssessmentId} 
            onBack={handleBackFromAssessment} 
          />
        ) : (
          <MyAssessments onViewAssessment={handleViewAssessment} />
        );
      case 'user-management':
        return <UserManagement onAddUser={handleAddUser} onEditUser={handleEditUser} />;
      case 'add-user':
        return <AddUser onBack={() => setCurrentRoute('user-management')} />;
      case 'edit-user':
        return selectedUserId ? <EditUser userId={selectedUserId} onBack={() => setCurrentRoute('user-management')} /> : <UserManagement onAddUser={handleAddUser} onEditUser={handleEditUser} />;
      case 'epa-management':
        return <EPAManagement />;
      case 'competency-management':
        return <CompetencyManagement />;
      case 'competency-grid':
        return <CompetencyGrid user={user} />;
      case 'program-performance':
        return <ProgramPerformanceDashboard user={user} />;
      case 'site-management':
        return <SiteManagement />;
      default:
        return <Overview onNewAssessment={handleNewAssessment} userInfo={userInfo} user={user} />;
    }
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
        
        {!isAuthenticated ? (
          authScreen === 'login' ? (
            <LoginScreen 
              onNavigateToForgotPassword={() => setAuthScreen('forgot-password')}
            />
          ) : authScreen === 'forgot-password' ? (
            <ForgotPasswordScreen 
              onBack={() => setAuthScreen('login')}
            />
          ) : authScreen === 'reset-password' && resetParams ? (
            <ResetPasswordScreen 
              uidb64={resetParams.uidb64}
              token={resetParams.token}
              onSuccess={() => {
                setAuthScreen('login');
                setResetParams(null);
              }}
              onBack={() => {
                setAuthScreen('login');
                setResetParams(null);
              }}
            />
          ) : (
            <LoginScreen />
          )
        ) : (
          <View style={styles.appLayout}>
            {/* Permanent Sidebar on Desktop */}
            {showPermanentSidebar && (
              <Sidebar
                isOpen={true}
                onClose={handleSidebarClose}
                onNavigate={handleNavigate}
                currentRoute={currentRoute}
                userRole={user?.role}
                isPermanent={true}
              />
            )}
            
            {/* Main Content Area */}
            <View style={[styles.mainContent, showPermanentSidebar && styles.mainContentWithSidebar]}>
              {/* Header with hamburger menu (only on mobile) */}
              <Header
                title={getPageTitle()}
                onMenuPress={handleMenuPress}
                onLogout={handleLogout}
                userInfo={user ? { name: user.name, role: user.role } : undefined}
                showMenuButton={isMobile}
              />

              {/* Content */}
              <View style={styles.content}>
                {renderContent()}
              </View>
            </View>

            {/* Mobile Sidebar Modal */}
            {isMobile && (
              <Sidebar
                isOpen={sidebarOpen}
                onClose={handleSidebarClose}
                onNavigate={handleNavigate}
                currentRoute={currentRoute}
                userRole={user?.role}
                isPermanent={false}
              />
            )}
          </View>
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

export default function App() {
  return (
    <TamaguiProvider config={config}>
      <PortalProvider shouldAddRootHost>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </PortalProvider>
    </TamaguiProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  appLayout: {
    flex: 1,
    flexDirection: 'row',
  },
  mainContent: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  mainContentWithSidebar: {
    flex: 1,
  },
  content: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  placeholderContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  placeholderText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  placeholderSubtext: {
    fontSize: 16,
    color: '#6b7280',
  },
});