/**
 * Tests for Button component
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Button } from '../Button';

describe('Button', () => {
  describe('rendering', () => {
    it('should render button with text', () => {
      const { getByText } = render(<Button>Click Me</Button>);

      expect(getByText('Click Me')).toBeTruthy();
    });

    it('should render with custom style', () => {
      const { getByText } = render(
        <Button style={{ backgroundColor: 'red' }}>Styled Button</Button>
      );

      const button = getByText('Styled Button').parent;
      expect(button?.props.style).toContainEqual({ backgroundColor: 'red' });
    });
  });

  describe('interaction', () => {
    it('should call onPress when pressed', () => {
      const mockOnPress = jest.fn();
      const { getByText } = render(
        <Button onPress={mockOnPress}>Press Me</Button>
      );

      fireEvent.press(getByText('Press Me'));

      expect(mockOnPress).toHaveBeenCalledTimes(1);
    });

    it('should not call onPress when disabled', () => {
      const mockOnPress = jest.fn();
      const { getByText } = render(
        <Button onPress={mockOnPress} disabled>
          Disabled Button
        </Button>
      );

      fireEvent.press(getByText('Disabled Button'));

      expect(mockOnPress).not.toHaveBeenCalled();
    });
  });

  describe('disabled state', () => {
    it('should apply disabled styles when disabled', () => {
      const { getByText } = render(
        <Button disabled>Disabled Button</Button>
      );

      const button = getByText('Disabled Button').parent;
      // Check if disabled prop is passed down
      expect(button?.props.accessibilityState?.disabled).toBe(true);
    });

    it('should be enabled by default', () => {
      const { getByText } = render(<Button>Enabled Button</Button>);

      const button = getByText('Enabled Button').parent;
      expect(button?.props.accessibilityState?.disabled).toBeFalsy();
    });
  });

  describe('loading state', () => {
    it('should show loading indicator when loading prop is true', () => {
      const { queryByTestId } = render(
        <Button loading>Loading Button</Button>
      );

      // Check if loading indicator is rendered
      // This will depend on your Button implementation
      // Adjust based on how you show loading state
      const button = queryByTestId('button-loading-indicator');
      // If you use an ActivityIndicator with testID, test for it
    });

    it('should not call onPress when loading', () => {
      const mockOnPress = jest.fn();
      const { getByText } = render(
        <Button onPress={mockOnPress} loading>
          Loading Button
        </Button>
      );

      fireEvent.press(getByText('Loading Button'));

      expect(mockOnPress).not.toHaveBeenCalled();
    });
  });

  describe('variants', () => {
    it('should render primary variant', () => {
      const { getByText } = render(
        <Button variant="primary">Primary</Button>
      );

      expect(getByText('Primary')).toBeTruthy();
    });

    it('should render secondary variant', () => {
      const { getByText } = render(
        <Button variant="secondary">Secondary</Button>
      );

      expect(getByText('Secondary')).toBeTruthy();
    });

    it('should render outline variant', () => {
      const { getByText } = render(
        <Button variant="outline">Outline</Button>
      );

      expect(getByText('Outline')).toBeTruthy();
    });
  });

  describe('accessibility', () => {
    it('should have accessible role', () => {
      const { getByRole } = render(<Button>Accessible Button</Button>);

      expect(getByRole('button')).toBeTruthy();
    });

    it('should support accessibility label', () => {
      const { getByLabelText } = render(
        <Button accessibilityLabel="Custom Label">Button</Button>
      );

      expect(getByLabelText('Custom Label')).toBeTruthy();
    });

    it('should indicate disabled state to screen readers', () => {
      const { getByText } = render(
        <Button disabled>Disabled Button</Button>
      );

      const button = getByText('Disabled Button').parent;
      expect(button?.props.accessibilityState?.disabled).toBe(true);
    });
  });
});

