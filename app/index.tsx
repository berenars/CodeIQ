import { View, Text, StyleSheet, TouchableOpacity, Animated, useColorScheme, ActivityIndicator, Image } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { router } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/contexts/AuthContext';

export default function Index() {
  const [buttonPressed, setButtonPressed] = useState(false);
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { user, loading } = useAuth();
  const hasRedirectedRef = useRef(false);

  // Redirect to tabs if user is already logged in (only once on mount)
  useEffect(() => {
    if (!loading && user && !hasRedirectedRef.current) {
      hasRedirectedRef.current = true;
      router.replace('/(tabs)');
    }
  }, [user, loading]);

  // Show loading screen while checking authentication
  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // Don't render the welcome screen if user is logged in (will redirect)
  if (user) {
    return null;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Logo section */}
      <View style={styles.heroSection}>
        <Image
          source={require('@/assets/images/logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>

      {/* Tagline */}
      <View style={styles.taglineContainer}>
        <Text style={[styles.tagline, { color: colors.textSecondary }]}>
        Turn learning into a game. Compete, solve problems, and level up your computer science skills in just a few minutes a day.
        </Text>
      </View>

      {/* Bottom buttons section */}
      <View style={styles.bottomSection}>
        <TouchableOpacity 
          style={[
            styles.continueButton,
            { backgroundColor: colors.primary, shadowColor: colors.primaryShadow },
            buttonPressed && styles.continueButtonPressed
          ]}
          onPressIn={() => setButtonPressed(true)}
          onPressOut={() => setButtonPressed(false)}
          onPress={() => router.push('/onboarding')}
          activeOpacity={1}
        >
          <Text style={[styles.continueButtonText, { color: colors.buttonText }]}>Continue</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.signInButton}
          onPress={() => router.push('/sign-in')}
        >
          <Text style={[styles.signInText, { color: colors.text }]}>Sign in</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
  },
  heroSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
  },
  logo: {
    width: 550,
    height: 550,
    maxWidth: '100%',
  },
  taglineContainer: {
    paddingHorizontal: 40,
    marginBottom: 40,
  },
  tagline: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  bottomSection: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 16,
  },
  continueButton: {
    paddingVertical: 18,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.6,
    shadowRadius: 0,
    elevation: 6,
  },
  continueButtonPressed: {
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    elevation: 2,
    transform: [{ translateY: 4 }],
  },
  continueButtonText: {
    fontSize: 18,
    fontWeight: '600',
  },
  signInButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  signInText: {
    fontSize: 16,
    fontWeight: '500',
  },
});

