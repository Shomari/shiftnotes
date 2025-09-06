/**
 * Select component using Tamagui's Select
 * Clean, professional dropdown with great UX
 */

import React from 'react';
import { Select as TamaguiSelect } from '@tamagui/select';
import { Adapt } from '@tamagui/adapt';
import { Sheet } from '@tamagui/sheet';
import { ChevronDown, ChevronUp, Check } from '@tamagui/lucide-icons';
import { Stack } from '@tamagui/core';

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
}

export function Select({
  value,
  onValueChange,
  placeholder,
  options,
  disabled = false,
}: SelectProps) {
  const handleValueChange = (newValue: string) => {
    console.log('Select value changed:', newValue);
    onValueChange(newValue);
  };

  return (
    <TamaguiSelect value={value} onValueChange={handleValueChange} disablePreventBodyScroll>
      <TamaguiSelect.Trigger
        width="100%"
        iconAfter={ChevronDown}
        borderWidth={1}
        borderColor="$gray7"
        borderRadius="$2"
        backgroundColor="$background"
        paddingHorizontal="$3"
        paddingVertical="$2.5"
        height={44}
        disabled={disabled}
        onPress={() => console.log('Select trigger pressed')}
        pressStyle={{
          backgroundColor: "$gray2",
          borderColor: "$gray8",
        }}
        focusStyle={{
          borderColor: "$blue8",
          backgroundColor: "$background",
        }}
      >
        <TamaguiSelect.Value placeholder={placeholder} color={value ? "$color" : "$gray10"} />
      </TamaguiSelect.Trigger>

      <Adapt when="sm" platform="touch">
        <Sheet modal dismissOnSnapToBottom snapPoints={[85]}>
          <Sheet.Frame padding="$4">
            <Sheet.ScrollView>
              <Adapt.Contents />
            </Sheet.ScrollView>
          </Sheet.Frame>
          <Sheet.Overlay 
            animation="lazy" 
            enterStyle={{ opacity: 0 }} 
            exitStyle={{ opacity: 0 }}
            backgroundColor="rgba(0,0,0,0.5)"
          />
        </Sheet>
      </Adapt>

      <TamaguiSelect.Content zIndex={200000}>
        <TamaguiSelect.ScrollUpButton
          alignItems="center"
          justifyContent="center"
          position="relative"
          width="100%"
          height="$3"
        >
          <Stack zIndex={10}>
            <ChevronUp size={20} />
          </Stack>
        </TamaguiSelect.ScrollUpButton>

        <TamaguiSelect.Viewport minHeight={200}>
          <TamaguiSelect.Group>
            {placeholder && (
              <TamaguiSelect.Item index={0} value="">
                <TamaguiSelect.ItemText color="$gray10">{placeholder}</TamaguiSelect.ItemText>
                <TamaguiSelect.ItemIndicator marginLeft="auto">
                  <Check size={16} />
                </TamaguiSelect.ItemIndicator>
              </TamaguiSelect.Item>
            )}
            
            {options.map((option, index) => (
              <TamaguiSelect.Item 
                key={option.value} 
                index={index + (placeholder ? 1 : 0)} 
                value={option.value}
              >
                <Stack flex={1}>
                  <TamaguiSelect.ItemText fontWeight="600" fontSize="$4">
                    {option.label}
                  </TamaguiSelect.ItemText>
                  {option.subtitle && (
                    <TamaguiSelect.ItemText fontSize="$3" color="$gray10" marginTop="$1">
                      {option.subtitle}
                    </TamaguiSelect.ItemText>
                  )}
                </Stack>
                <TamaguiSelect.ItemIndicator marginLeft="auto">
                  <Check size={16} />
                </TamaguiSelect.ItemIndicator>
              </TamaguiSelect.Item>
            ))}
          </TamaguiSelect.Group>
        </TamaguiSelect.Viewport>

        <TamaguiSelect.ScrollDownButton
          alignItems="center"
          justifyContent="center"
          position="relative"
          width="100%"
          height="$3"
        >
          <Stack zIndex={10}>
            <ChevronDown size={20} />
          </Stack>
        </TamaguiSelect.ScrollDownButton>
      </TamaguiSelect.Content>
    </TamaguiSelect>
  );
}
