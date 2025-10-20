/**
 * Select component with platform-specific implementations
 * Uses Material-UI for web and custom component for mobile
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  Dimensions,
  Platform,
} from 'react-native';

// Web-only Material-UI imports
let FormControl: any = null;
let InputLabel: any = null;
let MuiSelect: any = null;
let MenuItem: any = null;
let Typography: any = null;

if (Platform.OS === 'web') {
  try {
    const mui = require('@mui/material');
    FormControl = mui.FormControl;
    InputLabel = mui.InputLabel;
    MuiSelect = mui.Select;
    MenuItem = mui.MenuItem;
    Typography = mui.Typography;
  } catch (e) {
    console.warn('Failed to load Material-UI:', e);
  }
}

const { width } = Dimensions.get('window');

interface SelectOption {
  label: string;
  value: string;
  subtitle?: string;
}

interface SelectProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder: string;
  options: SelectOption[];
  disabled?: boolean;
  style?: any;
}

export function Select({
  value,
  onValueChange,
  placeholder,
  options,
  disabled = false,
  style,
}: SelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<Pressable>(null);
  const dropdownRef = useRef<View>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (Platform.OS === 'web' && isOpen) {
      const handleClickOutside = (event: any) => {
        // Check if click is outside the dropdown
        if (dropdownRef.current && !dropdownRef.current.contains?.(event.target)) {
          setIsOpen(false);
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isOpen]);

  // Reset dropdown state when options change (navigation)
  useEffect(() => {
    setIsOpen(false);
  }, [options.length]);

  const handleValueChange = (newValue: string) => {
    onValueChange(newValue);
    setIsOpen(false);
  };

  const handleTriggerPress = () => {
    if (disabled) return;
    setIsOpen(!isOpen);
  };

  const selectedOption = options.find(option => option.value === value);
  const displayText = selectedOption ? selectedOption.label : placeholder;

  // For web, use Material-UI Select for the best UX
  if (Platform.OS === 'web' && FormControl && MuiSelect && MenuItem) {
    return (
      <FormControl fullWidth variant="outlined" size="small" style={style}>
        <MuiSelect
          value={value}
          onChange={(e: any) => onValueChange(e.target.value)}
          disabled={disabled}
          displayEmpty
          MenuProps={{
            PaperProps: {
              sx: {
                maxHeight: 400,
                marginTop: '4px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                '& .MuiList-root': {
                  padding: '8px 0',
                },
              }
            },
            anchorOrigin: {
              vertical: 'bottom',
              horizontal: 'left',
            },
            transformOrigin: {
              vertical: 'top',
              horizontal: 'left',
            },
          }}
          sx={{
            minHeight: '44px',
            backgroundColor: disabled ? '#f3f4f6' : '#ffffff',
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: '#d1d5db',
              borderRadius: '8px',
            },
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: '#9ca3af',
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: '#3b82f6',
              borderWidth: '1px',
            },
            '& .MuiSelect-select': {
              padding: '12px',
              fontSize: '16px',
              color: value ? '#374151' : '#9ca3af',
              minHeight: 'unset',
            },
            '& .MuiSelect-icon': {
              color: '#6b7280',
            },
          }}
        >
          <MenuItem value="" disabled>
            <em style={{ color: '#9ca3af', fontStyle: 'italic' }}>{placeholder}</em>
          </MenuItem>
          {options.map((option) => (
            <MenuItem 
              key={option.value} 
              value={option.value}
              sx={{
                padding: '12px 16px',
                whiteSpace: 'normal',
                minHeight: '48px',
                display: 'block',
                '&:hover': {
                  backgroundColor: '#f3f4f6',
                },
                '&.Mui-selected': {
                  backgroundColor: '#eff6ff',
                  '&:hover': {
                    backgroundColor: '#dbeafe',
                  },
                },
              }}
            >
              <Typography
                sx={{
                  fontSize: '16px',
                  fontWeight: '500',
                  color: '#374151',
                  whiteSpace: 'normal',
                  wordBreak: 'break-word',
                  lineHeight: 1.5,
                }}
              >
                {option.label}
              </Typography>
              {option.subtitle && (
                <Typography
                  sx={{
                    fontSize: '14px',
                    color: '#6b7280',
                    marginTop: '4px',
                    whiteSpace: 'normal',
                    wordBreak: 'break-word',
                    lineHeight: 1.4,
                  }}
                >
                  {option.subtitle}
                </Typography>
              )}
            </MenuItem>
          ))}
        </MuiSelect>
      </FormControl>
    );
  }

  // For mobile, use custom dropdown with better positioning
  return (
    <View style={[styles.container, style]}>
      <Pressable
        ref={triggerRef}
        style={[
          styles.trigger,
          disabled && styles.triggerDisabled,
          isOpen && styles.triggerActive,
        ]}
        onPress={handleTriggerPress}
        disabled={disabled}
      >
        <Text 
          style={[
            styles.triggerText,
            !selectedOption && styles.placeholderText,
          ]}
          numberOfLines={1}
        >
          {displayText}
        </Text>
        <Text style={[styles.chevron, isOpen && styles.chevronOpen]}>▼</Text>
      </Pressable>

      {isOpen && (
        <View style={styles.dropdown} ref={dropdownRef}>
          <ScrollView style={styles.dropdownScroll} showsVerticalScrollIndicator={false}>
            {options.map((option) => (
              <Pressable
                key={option.value}
                style={[
                  styles.option,
                  option.value === value && styles.selectedOption,
                ]}
                onPress={() => handleValueChange(option.value)}
              >
                <View style={styles.optionContent}>
                  <Text 
                    style={[
                      styles.optionText,
                      option.value === value && styles.selectedOptionText,
                    ]}
                  >
                    {option.label}
                  </Text>
                  {option.subtitle && (
                    <Text style={styles.optionSubtitle}>{option.subtitle}</Text>
                  )}
                </View>
                {option.value === value && (
                  <Text style={styles.checkmark}>✓</Text>
                )}
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  
  // Mobile-only styles (web uses native HTML select)
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    backgroundColor: '#ffffff',
    minHeight: 44,
  },
  triggerDisabled: {
    backgroundColor: '#f3f4f6',
    borderColor: '#e5e7eb',
  },
  triggerActive: {
    borderColor: '#3b82f6',
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  triggerText: {
    fontSize: 16,
    color: '#374151',
    flex: 1,
  },
  placeholderText: {
    color: '#9ca3af',
  },
  chevron: {
    fontSize: 12,
    color: '#6b7280',
    marginLeft: 8,
  },
  chevronOpen: {
    transform: [{ rotate: '180deg' }],
  },
  
  dropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#3b82f6',
    borderTopWidth: 0,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    maxHeight: 300,
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  dropdownScroll: {
    maxHeight: 300,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    minHeight: 56,
  },
  selectedOption: {
    backgroundColor: '#eff6ff',
  },
  optionContent: {
    flex: 1,
    paddingRight: 8,
  },
  optionText: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '500',
    flexWrap: 'wrap',
    lineHeight: 22,
  },
  selectedOptionText: {
    color: '#3b82f6',
    fontWeight: '600',
  },
  optionSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
    lineHeight: 20,
    flexWrap: 'wrap',
  },
  checkmark: {
    fontSize: 16,
    color: '#3b82f6',
    fontWeight: 'bold',
    marginLeft: 8,
    marginTop: 2,
  },
});
