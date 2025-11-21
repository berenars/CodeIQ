import { View, Text, StyleSheet, TouchableOpacity, TextInput, useColorScheme, Animated, Alert, ActivityIndicator, Platform } from 'react-native';
import { useState, useRef } from 'react';
import { router } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { signUp } from '@/lib/auth';
import { CustomAlert } from '@/components/CustomAlert';

export default function SignUp() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [buttonPressed, setButtonPressed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [alertConfig, setAlertConfig] = useState<{ 
    visible: boolean; 
    title: string; 
    message: string;
    onConfirm?: () => void;
  }>({
    visible: false,
    title: '',
    message: '',
  });
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const isFormValid = email.length > 0 && password.length > 0 && username.length > 0;

  const showCustomAlert = (title: string, message: string, onConfirm?: () => void) => {
    if (Platform.OS === 'ios') {
      if (onConfirm) {
        Alert.alert(title, message, [{ text: 'OK', onPress: onConfirm }]);
      } else {
        Alert.alert(title, message);
      }
    } else {
      setAlertConfig({ visible: true, title, message, onConfirm });
    }
  };

  const handleSignUp = async () => {
    if (!isFormValid || loading) return;
    
    // Validate password length
    if (password.length < 6) {
      showCustomAlert('Invalid Password', 'Password must be at least 6 characters long.');
      return;
    }
    
    setLoading(true);
    
    try {
      const { user, error } = await signUp(email, password, username);
      
      if (error) {
        showCustomAlert('Sign Up Error', error.message || 'Failed to create account. Please try again.');
        setLoading(false);
        return;
      }
      
      if (user) {
        // Check if email confirmation is required
        if (user.identities && user.identities.length === 0) {
          showCustomAlert(
            'Confirm Your Email',
            'Please check your email and click the confirmation link to activate your account.',
            () => router.push('/sign-in')
          );
          setLoading(false);
        } else {
          // Fade out animation and navigate
          Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }).start(() => {
            router.replace('/(tabs)');
            setLoading(false);
          });
        }
      }
    } catch (err) {
      showCustomAlert('Error', 'An unexpected error occurred. Please try again.');
      setLoading(false);
    }
  };

  return (
    <Animated.View style={[styles.container, { backgroundColor: colors.background, opacity: fadeAnim }]}>
      {/* Custom Alert for Android/Web */}
      <CustomAlert
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        buttons={[
          {
            text: 'OK',
            style: 'default',
            onPress: () => {
              setAlertConfig({ ...alertConfig, visible: false });
              alertConfig.onConfirm?.();
            },
          },
        ]}
        onDismiss={() => setAlertConfig({ ...alertConfig, visible: false })}
      />

      {/* Back Button */}
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Text style={[styles.backIcon, { color: colors.backIcon }]}>‹</Text>
      </TouchableOpacity>

      <View style={styles.content}>
        {/* Email Input */}
        <TextInput
          style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
          placeholder="Email"
          placeholderTextColor={colors.inputPlaceholder}
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />

        {/* Password Input */}
        <TextInput
          style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
          placeholder="Password"
          placeholderTextColor={colors.inputPlaceholder}
          secureTextEntry
          autoCapitalize="none"
          value={password}
          onChangeText={setPassword}
        />

        {/* User Name Input */}
        <TextInput
          style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
          placeholder="User Name"
          placeholderTextColor={colors.inputPlaceholder}
          autoCapitalize="words"
          value={username}
          onChangeText={setUsername}
        />

        {/* Sign Up Button */}
        <TouchableOpacity
          style={[
            styles.signUpButton,
            { 
              backgroundColor: (isFormValid && !loading) ? colors.primary : colors.disabledButton,
              shadowColor: (isFormValid && !loading) ? colors.primaryShadow : 'transparent',
            },
            buttonPressed && isFormValid && !loading && styles.signUpButtonPressed
          ]}
          onPressIn={() => setButtonPressed(true)}
          onPressOut={() => setButtonPressed(false)}
          onPress={handleSignUp}
          activeOpacity={1}
          disabled={loading || !isFormValid}
        >
          {loading ? (
            <ActivityIndicator color={colors.buttonText} />
          ) : (
            <Text style={[styles.signUpButtonText, { color: (isFormValid && !loading) ? colors.buttonText : colors.disabledButtonText }]}>
              Sign up
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Bottom Section */}
      <View style={styles.bottomContainer}>
        {/* Existing User Link */}
        <View style={styles.existingUserContainer}>
          <Text style={[styles.bottomText, { color: colors.textSecondary }]}>Existing user? </Text>
          <TouchableOpacity onPress={() => router.push('/sign-in')}>
            <Text style={[styles.bottomLink, { color: colors.text }]}>Sign in</Text>
          </TouchableOpacity>
        </View>

        {/* Terms and Privacy */}
        <Text style={[styles.termsText, { color: colors.inputPlaceholder }]}>
          By tapping 'Sign up', I agree to CodeIQ's{'\n'}
          <Text style={[styles.termsLink, { color: colors.text }]}>Terms</Text> and <Text style={[styles.termsLink, { color: colors.text }]}>Privacy Policy</Text>
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
  },
  backButton: {
    paddingLeft: 20,
    paddingVertical: 10,
    marginBottom: 20,
  },
  backIcon: {
    fontSize: 32,
    fontWeight: '300',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    fontSize: 16,
    marginBottom: 12,
  },
  signUpButton: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 12,
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.6,
    shadowRadius: 0,
    elevation: 6,
  },
  signUpButtonPressed: {
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    elevation: 2,
    transform: [{ translateY: 4 }],
  },
  signUpButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  bottomContainer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    alignItems: 'center',
    gap: 16,
  },
  existingUserContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bottomText: {
    fontSize: 16,
  },
  bottomLink: {
    fontSize: 16,
    fontWeight: '600',
  },
  termsText: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
  },
  termsLink: {
    fontWeight: '600',
  },
});
