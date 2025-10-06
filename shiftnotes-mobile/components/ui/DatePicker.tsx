/**
 * DatePicker component with platform-specific implementations
 * Uses Material-UI DatePicker for web and TextInput for mobile
 */

import * as React from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Platform,
} from 'react-native';

// Material-UI imports for web only
let LocalizationProvider: any = null;
let DatePicker: any = null;
let AdapterDayjs: any = null;
let dayjs: any = null;

if (Platform.OS === 'web') {
  // Use the exact import pattern from Material-UI docs
  const { LocalizationProvider: LP } = require('@mui/x-date-pickers/LocalizationProvider');
  const { DatePicker: DP } = require('@mui/x-date-pickers/DatePicker');
  const { AdapterDayjs: AD } = require('@mui/x-date-pickers/AdapterDayjs');
  const dayjsLib = require('dayjs');
  
  LocalizationProvider = LP;
  DatePicker = DP;
  AdapterDayjs = AD;
  dayjs = dayjsLib.default || dayjsLib;
}

interface DatePickerProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  style?: any;
  maxDate?: Date;
  error?: string;
}

export function CustomDatePicker({
  label,
  value,
  onChange,
  placeholder = "Select date",
  disabled = false,
  style,
  maxDate,
  error,
}: DatePickerProps) {

  // For web, use Material-UI DatePicker with proper setup
  if (Platform.OS === 'web' && LocalizationProvider && DatePicker && AdapterDayjs && dayjs) {
    return (
      <View style={[styles.container, style]}>
        <Text style={styles.label}>{label}</Text>
        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <DatePicker
            label={placeholder}
            value={value ? dayjs(value) : null}
            onChange={(newValue: any) => {
              if (newValue && newValue.isValid()) {
                onChange(newValue.format('YYYY-MM-DD'));
              } else {
                onChange('');
              }
            }}
            disabled={disabled}
            maxDate={maxDate ? dayjs(maxDate) : undefined}
            slotProps={{
              textField: {
                size: 'small',
                fullWidth: true,
                error: !!error,
                helperText: error,
                sx: {
                  '& .MuiOutlinedInput-root': {
                    minHeight: '44px',
                    backgroundColor: disabled ? '#f3f4f6' : '#ffffff',
                    '& fieldset': {
                      borderColor: error ? '#ef4444' : '#d1d5db',
                      borderRadius: '8px',
                    },
                    '&:hover fieldset': {
                      borderColor: error ? '#ef4444' : '#9ca3af',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: error ? '#ef4444' : '#3b82f6',
                      borderWidth: '1px',
                    },
                  },
                  '& .MuiInputBase-input': {
                    padding: '12px',
                    fontSize: '16px',
                    color: '#374151',
                  },
                  '& .MuiInputLabel-root': {
                    color: error ? '#ef4444' : '#6b7280',
                    fontSize: '16px',
                    '&.Mui-focused': {
                      color: error ? '#ef4444' : '#3b82f6',
                    },
                  },
                  '& .MuiFormHelperText-root': {
                    color: '#ef4444',
                    marginLeft: 0,
                  },
                },
              },
            }}
          />
        </LocalizationProvider>
      </View>
    );
  }

  // For mobile or fallback, use TextInput
  return (
    <View style={[styles.container, style]}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.textInput, disabled && styles.textInputDisabled]}
        placeholder={placeholder}
        value={value}
        onChangeText={onChange}
        editable={!disabled}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 6,
    marginLeft: 2,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#ffffff',
    minHeight: 44,
    color: '#374151',
  },
  textInputDisabled: {
    backgroundColor: '#f3f4f6',
    borderColor: '#e5e7eb',
    color: '#9ca3af',
  },
});