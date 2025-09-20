import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  Dimensions,
} from 'react-native';

interface HelpButtonProps {
  onPress: () => void;
}

const { width } = Dimensions.get('window');
const isTablet = width >= 768;

export function HelpButton({ onPress }: HelpButtonProps) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.helpButton,
        pressed && styles.helpButtonPressed,
      ]}
      onPress={onPress}
      accessibilityLabel="Get Help"
      accessibilityHint="Open support request form"
    >
      <View style={styles.helpButtonContent}>
        <Text style={styles.helpButtonIcon}>?</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  helpButton: {
    position: 'absolute',
    bottom: isTablet ? 32 : 24,
    right: isTablet ? 32 : 16,
    backgroundColor: '#3b82f6',
    borderRadius: isTablet ? 28 : 24,
    paddingHorizontal: isTablet ? 16 : 12,
    paddingVertical: isTablet ? 12 : 10,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.27,
    shadowRadius: 4.65,
    zIndex: 1000,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: isTablet ? 80 : 48,
    minHeight: isTablet ? 56 : 48,
    justifyContent: 'center',
  },
  helpButtonPressed: {
    backgroundColor: '#2563eb',
    transform: [{ scale: 0.95 }],
  },
  helpButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  helpButtonIcon: {
    fontSize: isTablet ? 20 : 18,
    color: '#ffffff',
    textAlign: 'center',
  },
  helpButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    marginLeft: 6,
  },
});
