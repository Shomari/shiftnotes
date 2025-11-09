/**
 * ExportButton Component
 * 
 * Button for exporting assessment data to CSV
 * Features:
 * - Loading state during export
 * - Error handling with user feedback
 * - File download trigger
 * - Disabled state support
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { apiClient } from '../../lib/api';

interface ExportButtonProps {
  startDate?: string;  // YYYY-MM-DD format (optional for competency grid)
  endDate?: string;    // YYYY-MM-DD format (optional for competency grid)
  cohortId?: string;
  traineeId?: string;
  onExportStart?: () => void;
  onExportComplete?: () => void;
  onExportError?: (error: Error) => void;
  disabled?: boolean;
  label?: string;
  exportType?: 'assessments' | 'competency-grid';  // Type of export
}

export const ExportButton: React.FC<ExportButtonProps> = ({
  startDate,
  endDate,
  cohortId,
  traineeId,
  onExportStart,
  onExportComplete,
  onExportError,
  disabled = false,
  label = 'Export CSV',
  exportType = 'assessments',
}) => {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    // Prevent double clicks
    if (isExporting || disabled) return;

    try {
      setIsExporting(true);
      onExportStart?.();

      // Call appropriate API method based on export type
      let blob: Blob;
      if (exportType === 'competency-grid') {
        blob = await apiClient.exportCompetencyGrid({
          start_date: startDate,
          end_date: endDate,
          cohort_id: cohortId,
        });
      } else {
        // Default: assessments export (requires dates)
        if (!startDate || !endDate) {
          throw new Error('Start date and end date are required for assessment export');
        }
        blob = await apiClient.exportAssessments({
          start_date: startDate,
          end_date: endDate,
          cohort_id: cohortId,
          trainee_id: traineeId,
        });
      }

      // Create filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const prefix = exportType === 'competency-grid' ? 'competency_grid_export' : 'assessments_export';
      const filename = `${prefix}_${timestamp}.csv`;

      // Download file (web-specific)
      if (typeof window !== 'undefined' && window.document) {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }

      Alert.alert('Success', 'Assessment data exported successfully!');
      onExportComplete?.();
    } catch (error) {
      console.error('Export failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Export failed. Please try again.';
      
      // Show user-friendly error messages
      let displayMessage = errorMessage;
      if (errorMessage.includes('permission')) {
        displayMessage = "You don't have permission to export data.";
      } else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
        displayMessage = 'Failed to export. Check your connection.';
      } else if (errorMessage.includes('program')) {
        displayMessage = 'No program assigned. Please contact support.';
      }

      Alert.alert('Export Failed', displayMessage);
      onExportError?.(error instanceof Error ? error : new Error(errorMessage));
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.button,
        (disabled || isExporting) && styles.buttonDisabled,
      ]}
      onPress={handleExport}
      disabled={disabled || isExporting}
      activeOpacity={0.7}
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || isExporting }}
    >
      {isExporting ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#374151" />
          <Text style={styles.buttonText}>Exporting...</Text>
        </View>
      ) : (
        <View style={styles.contentContainer}>
          <MaterialIcons name="file-download" size={18} color="#374151" />
          <Text style={styles.buttonText}>{label}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#d1d5db',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    borderColor: '#e5e7eb',
    opacity: 0.5,
  },
  buttonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  icon: {
    fontSize: 16,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  contentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});

export default ExportButton;

