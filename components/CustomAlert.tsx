import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, Platform, useColorScheme } from 'react-native';
import { Colors } from '@/constants/Colors';

interface CustomAlertProps {
  visible: boolean;
  title: string;
  message: string;
  buttons: Array<{
    text: string;
    onPress?: () => void;
    style?: 'default' | 'cancel' | 'destructive';
  }>;
  onDismiss?: () => void;
}

export function CustomAlert({ visible, title, message, buttons, onDismiss }: CustomAlertProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <View style={styles.overlay}>
        <View style={[styles.alertBox, { backgroundColor: colors.background }]}>
          {/* Title */}
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          
          {/* Message */}
          <Text style={[styles.message, { color: colors.textSecondary }]}>{message}</Text>
          
          {/* Buttons */}
          <View style={styles.buttonContainer}>
            {buttons.map((button, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.button,
                  index !== buttons.length - 1 && styles.buttonBorder,
                  { borderColor: colors.inputBorder }
                ]}
                onPress={() => {
                  button.onPress?.();
                  onDismiss?.();
                }}
              >
                <Text
                  style={[
                    styles.buttonText,
                    button.style === 'cancel' && { color: colors.textSecondary, fontWeight: '600' },
                    button.style === 'destructive' && { color: '#FF3B30', fontWeight: '600' },
                    button.style === 'default' && { color: colors.primary, fontWeight: '600' },
                  ]}
                >
                  {button.text}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}

// Cross-platform Alert wrapper
export const showAlert = (
  title: string,
  message: string,
  buttons: Array<{
    text: string;
    onPress?: () => void;
    style?: 'default' | 'cancel' | 'destructive';
  }>,
  callback: (alertState: { visible: boolean }) => void
) => {
  if (Platform.OS === 'ios') {
    // Use native alert on iOS
    const Alert = require('react-native').Alert;
    Alert.alert(title, message, buttons);
  } else {
    // Use custom alert on Android and Web
    callback({ visible: true });
  }
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  alertBox: {
    width: '100%',
    maxWidth: 320,
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 24,
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonBorder: {
    borderRightWidth: 0,
  },
  buttonText: {
    fontSize: 16,
  },
});








