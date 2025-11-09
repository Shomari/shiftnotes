/**
 * Tests for ExportButton component
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { ExportButton } from '../ExportButton';
import { apiClient } from '../../../lib/api';

// Mock the API client
jest.mock('../../../lib/api', () => ({
  apiClient: {
    exportAssessments: jest.fn(),
  },
}));

// Mock Alert
jest.spyOn(Alert, 'alert');

// Mock window.URL and document for blob download
const mockCreateObjectURL = jest.fn(() => 'blob:mock-url');
const mockRevokeObjectURL = jest.fn();
const mockCreateElement = jest.fn(() => ({
  href: '',
  download: '',
  click: jest.fn(),
}));
const mockAppendChild = jest.fn();
const mockRemoveChild = jest.fn();

global.window = {
  ...global.window,
  URL: {
    createObjectURL: mockCreateObjectURL,
    revokeObjectURL: mockRevokeObjectURL,
  },
} as any;

global.document = {
  ...global.document,
  createElement: mockCreateElement,
  body: {
    appendChild: mockAppendChild,
    removeChild: mockRemoveChild,
  },
} as any;

describe('ExportButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly with default label', () => {
    const { getByText } = render(
      <ExportButton
        startDate="2024-01-01"
        endDate="2024-01-31"
      />
    );

    expect(getByText('Export CSV')).toBeTruthy();
  });

  it('renders with custom label', () => {
    const { getByText } = render(
      <ExportButton
        startDate="2024-01-01"
        endDate="2024-01-31"
        label="Download Data"
      />
    );

    expect(getByText('Download Data')).toBeTruthy();
  });

  it('shows loading state during export', async () => {
    const mockBlob = new Blob(['test'], { type: 'text/csv' });
    (apiClient.exportAssessments as jest.Mock).mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve(mockBlob), 100))
    );

    const { getByText, queryByText } = render(
      <ExportButton
        startDate="2024-01-01"
        endDate="2024-01-31"
      />
    );

    const button = getByText('Export CSV');
    fireEvent.press(button);

    // Should show loading text
    await waitFor(() => {
      expect(queryByText('Exporting...')).toBeTruthy();
    });

    // Wait for export to complete
    await waitFor(() => {
      expect(queryByText('Export CSV')).toBeTruthy();
    });
  });

  it('handles successful export', async () => {
    const mockBlob = new Blob(['test'], { type: 'text/csv' });
    (apiClient.exportAssessments as jest.Mock).mockResolvedValue(mockBlob);

    const onExportStart = jest.fn();
    const onExportComplete = jest.fn();

    const { getByText } = render(
      <ExportButton
        startDate="2024-01-01"
        endDate="2024-01-31"
        onExportStart={onExportStart}
        onExportComplete={onExportComplete}
      />
    );

    const button = getByText('Export CSV');
    fireEvent.press(button);

    await waitFor(() => {
      expect(onExportStart).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(apiClient.exportAssessments).toHaveBeenCalledWith({
        start_date: '2024-01-01',
        end_date: '2024-01-31',
        cohort_id: undefined,
        trainee_id: undefined,
      });
    });

    await waitFor(() => {
      expect(onExportComplete).toHaveBeenCalled();
      expect(Alert.alert).toHaveBeenCalledWith(
        'Success',
        'Assessment data exported successfully!'
      );
    });
  });

  it('handles export with filters', async () => {
    const mockBlob = new Blob(['test'], { type: 'text/csv' });
    (apiClient.exportAssessments as jest.Mock).mockResolvedValue(mockBlob);

    const { getByText } = render(
      <ExportButton
        startDate="2024-01-01"
        endDate="2024-01-31"
        cohortId="cohort-123"
        traineeId="trainee-456"
      />
    );

    const button = getByText('Export CSV');
    fireEvent.press(button);

    await waitFor(() => {
      expect(apiClient.exportAssessments).toHaveBeenCalledWith({
        start_date: '2024-01-01',
        end_date: '2024-01-31',
        cohort_id: 'cohort-123',
        trainee_id: 'trainee-456',
      });
    });
  });

  it('handles API errors', async () => {
    const error = new Error('Export failed');
    (apiClient.exportAssessments as jest.Mock).mockRejectedValue(error);

    const onExportError = jest.fn();

    const { getByText } = render(
      <ExportButton
        startDate="2024-01-01"
        endDate="2024-01-31"
        onExportError={onExportError}
      />
    );

    const button = getByText('Export CSV');
    fireEvent.press(button);

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Export Failed',
        expect.any(String)
      );
      expect(onExportError).toHaveBeenCalledWith(error);
    });
  });

  it('handles permission errors with user-friendly message', async () => {
    const error = new Error('permission denied');
    (apiClient.exportAssessments as jest.Mock).mockRejectedValue(error);

    const { getByText } = render(
      <ExportButton
        startDate="2024-01-01"
        endDate="2024-01-31"
      />
    );

    const button = getByText('Export CSV');
    fireEvent.press(button);

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Export Failed',
        "You don't have permission to export data."
      );
    });
  });

  it('disabled state prevents clicks', () => {
    const { getByText } = render(
      <ExportButton
        startDate="2024-01-01"
        endDate="2024-01-31"
        disabled={true}
      />
    );

    const button = getByText('Export CSV');
    fireEvent.press(button);

    // API should not be called
    expect(apiClient.exportAssessments).not.toHaveBeenCalled();
  });

  it('prevents double clicks during export', async () => {
    const mockBlob = new Blob(['test'], { type: 'text/csv' });
    (apiClient.exportAssessments as jest.Mock).mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve(mockBlob), 100))
    );

    const { getByText } = render(
      <ExportButton
        startDate="2024-01-01"
        endDate="2024-01-31"
      />
    );

    const button = getByText('Export CSV');
    
    // Press button twice quickly
    fireEvent.press(button);
    fireEvent.press(button);

    // Wait for export to complete
    await waitFor(() => {
      expect(getByText('Export CSV')).toBeTruthy();
    }, { timeout: 200 });

    // API should only be called once
    expect(apiClient.exportAssessments).toHaveBeenCalledTimes(1);
  });

  it('passes correct parameters to API', async () => {
    const mockBlob = new Blob(['test'], { type: 'text/csv' });
    (apiClient.exportAssessments as jest.Mock).mockResolvedValue(mockBlob);

    const { getByText } = render(
      <ExportButton
        startDate="2024-01-01"
        endDate="2024-12-31"
        cohortId="cohort-abc"
      />
    );

    const button = getByText('Export CSV');
    fireEvent.press(button);

    await waitFor(() => {
      expect(apiClient.exportAssessments).toHaveBeenCalledWith({
        start_date: '2024-01-01',
        end_date: '2024-12-31',
        cohort_id: 'cohort-abc',
        trainee_id: undefined,
      });
    });
  });

  it('has correct accessibility properties', () => {
    const { getByLabelText } = render(
      <ExportButton
        startDate="2024-01-01"
        endDate="2024-01-31"
        label="Export Assessments"
      />
    );

    const button = getByLabelText('Export Assessments');
    expect(button).toBeTruthy();
  });
});

