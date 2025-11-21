import { Text as DefaultText, type TextProps } from 'react-native';

/**
 * Fixed Text Component
 * 
 * A custom Text component that:
 * - Disables font scaling (ignores device text size settings)
 * - Ensures consistent UI across all devices
 * - Maintains fixed, predictable text sizes
 * 
 * Use this instead of the default Text component to prevent
 * accessibility text size settings from breaking your UI.
 */
export function FixedText({ 
  allowFontScaling = false, 
  ...props 
}: TextProps) {
  return <DefaultText allowFontScaling={allowFontScaling} {...props} />;
}

// Export as default for easy replacement
export default FixedText;




