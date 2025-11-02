import { View, Text, StyleSheet, TouchableOpacity, TextInput, Image, useColorScheme, Animated } from 'react-native';
import { useState, useRef } from 'react';
import { router } from 'expo-router';
import { Colors } from '@/constants/Colors';

export default function SignIn() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [buttonPressed, setButtonPressed] = useState(false);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const isFormValid = email.length > 0 && password.length > 0;

  const handleSignIn = () => {
    if (!isFormValid) return;
    
    // Fade out animation
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      router.replace('/(tabs)');
    });
  };

  return (
    <Animated.View style={[styles.container, { backgroundColor: colors.background, opacity: fadeAnim }]}>
      {/* Back Button */}
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Text style={[styles.backIcon, { color: colors.backIcon }]}>‹</Text>
      </TouchableOpacity>

      <View style={styles.content}>
        {/* Title */}
        <Text style={[styles.title, { color: colors.text }]}>Sign in</Text>

        {/* Social Login Buttons */}
        <View style={styles.socialButtonsContainer}>
          <TouchableOpacity style={[styles.socialButton, { backgroundColor: colors.socialButtonBg, borderColor: colors.inputBorder }]}>
            <Image 
              source={require('@/assets/images/apple-icon.png')} 
              style={styles.socialIcon}
              resizeMode="contain"
            />
          </TouchableOpacity>
          
          <TouchableOpacity style={[styles.socialButton, { backgroundColor: colors.socialButtonBg, borderColor: colors.inputBorder }]}>
            <Image 
              source={require('@/assets/images/google-icon.png')} 
              style={styles.socialIcon}
              resizeMode="contain"
            />
          </TouchableOpacity>
        </View>

        {/* OR Divider */}
        <View style={styles.dividerContainer}>
          <View style={[styles.dividerLine, { backgroundColor: colors.divider }]} />
          <Text style={[styles.dividerText, { color: colors.inputPlaceholder }]}>OR</Text>
          <View style={[styles.dividerLine, { backgroundColor: colors.divider }]} />
        </View>

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

        {/* Sign In Button */}
        <TouchableOpacity
          style={[
            styles.signInButton,
            { 
              backgroundColor: isFormValid ? colors.primary : colors.disabledButton,
              shadowColor: isFormValid ? colors.primaryShadow : 'transparent',
            },
            buttonPressed && isFormValid && styles.signInButtonPressed
          ]}
          onPressIn={() => setButtonPressed(true)}
          onPressOut={() => setButtonPressed(false)}
          onPress={handleSignIn}
          activeOpacity={1}
        >
          <Text style={[styles.signInButtonText, { color: isFormValid ? colors.buttonText : colors.disabledButtonText }]}>
            Sign in
          </Text>
        </TouchableOpacity>

        {/* Forgot Password */}
        <TouchableOpacity style={styles.forgotPasswordButton}>
          <Text style={[styles.forgotPasswordText, { color: colors.text }]}>Forgot password?</Text>
        </TouchableOpacity>
      </View>

      {/* Bottom Sign Up Link */}
      <View style={styles.bottomContainer}>
        <Text style={[styles.bottomText, { color: colors.textSecondary }]}>No account yet? </Text>
        <TouchableOpacity onPress={() => router.push('/sign-up')}>
          <Text style={[styles.bottomLink, { color: colors.text }]}>Sign up</Text>
        </TouchableOpacity>
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
    marginBottom: 10,
  },
  backIcon: {
    fontSize: 32,
    fontWeight: '300',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 30,
  },
  socialButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 30,
  },
  socialButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 25,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  socialIcon: {
    width: 24,
    height: 24,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 14,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    fontSize: 16,
    marginBottom: 12,
  },
  signInButton: {
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
  signInButtonPressed: {
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    elevation: 2,
    transform: [{ translateY: 4 }],
  },
  signInButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  forgotPasswordButton: {
    alignItems: 'center',
    marginTop: 20,
  },
  forgotPasswordText: {
    fontSize: 16,
    fontWeight: '500',
  },
  bottomContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingBottom: 40,
    alignItems: 'center',
  },
  bottomText: {
    fontSize: 16,
  },
  bottomLink: {
    fontSize: 16,
    fontWeight: '600',
  },
});
