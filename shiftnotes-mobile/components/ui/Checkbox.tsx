/**
 * Checkbox component for React Native
 * Simple, accessible checkbox with custom styling
 */

import React from 'react';
import { Pressable, View, StyleSheet } from 'react-native';
import { Check } from 'phosphor-react-native';

interface CheckboxProps {
  checked: boolean;
  onPress: () => void;
  disabled?: boolean;
  size?: number;
  color?: string;
  checkedColor?: string;
  uncheckedColor?: string;
}

export function Checkbox({
  checked,
  onPress,
  disabled = false,
  size = 20,
  color = '#3b82f6',
  checkedColor = '#3b82f6',
  uncheckedColor = '#d1d5db',
}: CheckboxProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.checkbox,
        {
          width: size,
          height: size,
          borderColor: checked ? checkedColor : uncheckedColor,
          backgroundColor: checked ? checkedColor : 'transparent',
        },
        disabled && styles.disabled,
      ]}
    >
      {checked && (
        <Check
          size={size * 0.6}
          color="#ffffff"
          weight="bold"
        />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  checkbox: {
    borderWidth: 2,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabled: {
    opacity: 0.5,
  },
});
