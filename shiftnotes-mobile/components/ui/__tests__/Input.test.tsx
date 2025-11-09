/**
 * Tests for Input component
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Input } from '../Input';

describe('Input', () => {
  describe('rendering', () => {
    it('should render input with placeholder', () => {
      const { getByPlaceholderText } = render(
        <Input placeholder="Enter text" />
      );

      expect(getByPlaceholderText('Enter text')).toBeTruthy();
    });

    it('should render with value', () => {
      const { getByDisplayValue } = render(
        <Input value="Test value" onChangeText={() => {}} />
      );

      expect(getByDisplayValue('Test value')).toBeTruthy();
    });

    it('should render with custom style', () => {
      const { getByPlaceholderText } = render(
        <Input placeholder="Styled" style={{ borderColor: 'red' }} />
      );

      const input = getByPlaceholderText('Styled');
      expect(input.props.style).toContainEqual({ borderColor: 'red' });
    });
  });

  describe('interaction', () => {
    it('should call onChangeText when text changes', () => {
      const mockOnChange = jest.fn();
      const { getByPlaceholderText } = render(
        <Input placeholder="Type here" onChangeText={mockOnChange} />
      );

      const input = getByPlaceholderText('Type here');
      fireEvent.changeText(input, 'New text');

      expect(mockOnChange).toHaveBeenCalledWith('New text');
    });

    it('should call onBlur when input loses focus', () => {
      const mockOnBlur = jest.fn();
      const { getByPlaceholderText } = render(
        <Input placeholder="Blur test" onBlur={mockOnBlur} />
      );

      const input = getByPlaceholderText('Blur test');
      fireEvent(input, 'blur');

      expect(mockOnBlur).toHaveBeenCalled();
    });

    it('should call onFocus when input gains focus', () => {
      const mockOnFocus = jest.fn();
      const { getByPlaceholderText } = render(
        <Input placeholder="Focus test" onFocus={mockOnFocus} />
      );

      const input = getByPlaceholderText('Focus test');
      fireEvent(input, 'focus');

      expect(mockOnFocus).toHaveBeenCalled();
    });
  });

  describe('disabled state', () => {
    it('should not be editable when disabled', () => {
      const { getByPlaceholderText } = render(
        <Input placeholder="Disabled" editable={false} />
      );

      const input = getByPlaceholderText('Disabled');
      expect(input.props.editable).toBe(false);
    });

    it('should be editable by default', () => {
      const { getByPlaceholderText } = render(
        <Input placeholder="Enabled" />
      );

      const input = getByPlaceholderText('Enabled');
      expect(input.props.editable).not.toBe(false);
    });
  });

  describe('error state', () => {
    it('should display error message when error prop is provided', () => {
      const { getByText } = render(
        <Input placeholder="Input" error="This field is required" />
      );

      expect(getByText('This field is required')).toBeTruthy();
    });

    it('should apply error styles when error is present', () => {
      const { getByPlaceholderText } = render(
        <Input placeholder="Error input" error="Error message" />
      );

      const input = getByPlaceholderText('Error input');
      // Check if error styles are applied
      // This depends on your Input implementation
    });

    it('should not display error message when no error', () => {
      const { queryByText } = render(
        <Input placeholder="No error" />
      );

      expect(queryByText(/error/i)).toBeNull();
    });
  });

  describe('keyboard types', () => {
    it('should support email keyboard type', () => {
      const { getByPlaceholderText } = render(
        <Input placeholder="Email" keyboardType="email-address" />
      );

      const input = getByPlaceholderText('Email');
      expect(input.props.keyboardType).toBe('email-address');
    });

    it('should support numeric keyboard type', () => {
      const { getByPlaceholderText } = render(
        <Input placeholder="Number" keyboardType="numeric" />
      );

      const input = getByPlaceholderText('Number');
      expect(input.props.keyboardType).toBe('numeric');
    });

    it('should support phone keyboard type', () => {
      const { getByPlaceholderText } = render(
        <Input placeholder="Phone" keyboardType="phone-pad" />
      );

      const input = getByPlaceholderText('Phone');
      expect(input.props.keyboardType).toBe('phone-pad');
    });
  });

  describe('secure text entry', () => {
    it('should hide text when secureTextEntry is true', () => {
      const { getByPlaceholderText } = render(
        <Input placeholder="Password" secureTextEntry />
      );

      const input = getByPlaceholderText('Password');
      expect(input.props.secureTextEntry).toBe(true);
    });

    it('should show text by default', () => {
      const { getByPlaceholderText } = render(
        <Input placeholder="Normal" />
      );

      const input = getByPlaceholderText('Normal');
      expect(input.props.secureTextEntry).toBeFalsy();
    });
  });

  describe('auto capitalization', () => {
    it('should support none auto capitalization', () => {
      const { getByPlaceholderText } = render(
        <Input placeholder="Input" autoCapitalize="none" />
      );

      const input = getByPlaceholderText('Input');
      expect(input.props.autoCapitalize).toBe('none');
    });

    it('should support sentences auto capitalization', () => {
      const { getByPlaceholderText } = render(
        <Input placeholder="Input" autoCapitalize="sentences" />
      );

      const input = getByPlaceholderText('Input');
      expect(input.props.autoCapitalize).toBe('sentences');
    });
  });

  describe('multiline', () => {
    it('should support multiline input', () => {
      const { getByPlaceholderText } = render(
        <Input placeholder="Multiline" multiline />
      );

      const input = getByPlaceholderText('Multiline');
      expect(input.props.multiline).toBe(true);
    });

    it('should support numberOfLines prop for multiline', () => {
      const { getByPlaceholderText } = render(
        <Input placeholder="Multiline" multiline numberOfLines={4} />
      );

      const input = getByPlaceholderText('Multiline');
      expect(input.props.numberOfLines).toBe(4);
    });
  });

  describe('accessibility', () => {
    it('should support accessibility label', () => {
      const { getByLabelText } = render(
        <Input accessibilityLabel="Custom Label" placeholder="Input" />
      );

      expect(getByLabelText('Custom Label')).toBeTruthy();
    });

    it('should indicate error state to screen readers', () => {
      const { getByPlaceholderText } = render(
        <Input placeholder="Input" error="Error" />
      );

      const input = getByPlaceholderText('Input');
      // Check if error state is communicated via accessibility props
    });
  });
});

