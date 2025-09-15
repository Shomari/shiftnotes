/**
 * Select component using React Native's built-in components
 * Reliable dropdown with proper state management
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  Modal,
  ScrollView,
  StyleSheet,
  Dimensions,
} from 'react-native';

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
  const triggerRef = useRef<View>(null);
  const componentId = useRef(Math.random().toString(36).substr(2, 9)).current;

  // Reset modal state when component unmounts or when critical props change
  useEffect(() => {
    return () => {
      // Cleanup when component unmounts
      setIsOpen(false);
    };
  }, []);

  // Reset modal state when options change (indicates navigation to new screen)
  useEffect(() => {
    console.log(`Select ${componentId}: Options changed, resetting state`);
    setIsOpen(false);
  }, [options.length, componentId]);

  const handleValueChange = (newValue: string) => {
    console.log(`Select ${componentId}: Value changed to:`, newValue);
    onValueChange(newValue);
    setIsOpen(false);
  };

  const handleTriggerPress = () => {
    if (disabled) return;
    console.log(`Select ${componentId}: Trigger pressed, current isOpen:`, isOpen);
    setIsOpen(true);
  };

  const handleModalClose = () => {
    console.log(`Select ${componentId}: Modal closing`);
    setIsOpen(false);
  };

  const selectedOption = options.find(option => option.value === value);
  const displayText = selectedOption ? selectedOption.label : placeholder;

  return (
    <>
      <Pressable
        ref={triggerRef}
        style={[
          styles.trigger,
          disabled && styles.triggerDisabled,
          isOpen && styles.triggerActive,
          style,
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
        <Text style={styles.chevron}>▼</Text>
      </Pressable>

      <Modal
        visible={isOpen}
        transparent
        animationType="fade"
        onRequestClose={handleModalClose}
      >
        <Pressable
          style={styles.overlay}
          onPress={handleModalClose}
        >
          <View style={styles.dropdown}>
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
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
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
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
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
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  dropdown: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    maxHeight: 300,
    width: Math.min(width - 40, 400),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  dropdownScroll: {
    maxHeight: 300,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  selectedOption: {
    backgroundColor: '#eff6ff',
  },
  optionContent: {
    flex: 1,
  },
  optionText: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '500',
  },
  selectedOptionText: {
    color: '#3b82f6',
    fontWeight: '600',
  },
  optionSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  checkmark: {
    fontSize: 16,
    color: '#3b82f6',
    fontWeight: 'bold',
    marginLeft: 8,
  },
});
