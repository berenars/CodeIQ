import { View, Text, StyleSheet, StatusBar, TouchableOpacity, TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Colors } from '@/constants/Colors';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { router } from 'expo-router';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { joinLobby } from '@/lib/lobby';
import { useTheme } from '@/contexts/ThemeContext';

export default function JoinLobbyScreen() {
  const { currentScheme } = useTheme();
  const colors = Colors[currentScheme];
  const { user } = useAuth();

  const [pin, setPin] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [buttonPressed, setButtonPressed] = useState(false);

  const handleJoinLobby = async () => {
    if (!pin || pin.length !== 5) {
      Alert.alert('Invalid PIN', 'Please enter a 5-digit PIN');
      return;
    }

    if (!user) {
      Alert.alert('Error', 'You must be logged in to join a lobby');
      return;
    }

    setIsJoining(true);

    try {
      const { lobby } = await joinLobby(
        pin,
        user.id,
        user.user_metadata?.username || 'Anonymous',
        user.user_metadata?.avatar || ''
      );

      // Navigate to waiting room
      router.replace({
        pathname: '/lobby-waiting',
        params: {
          lobbyId: lobby.id,
          pin: pin,
          isHost: 'false',
        },
      });
    } catch (error: any) {
      console.error('Error joining lobby:', error);
      Alert.alert('Error', error.message || 'Failed to join lobby. Please check the PIN and try again.');
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      <StatusBar barStyle={currentScheme === 'dark' ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <IconSymbol size={24} name="chevron.left" color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Join Lobby</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.content}>
        {/* Icon */}
        <View style={[styles.iconContainer, { backgroundColor: `${colors.primary}15` }]}>
          <IconSymbol size={64} name="antenna.radiowaves.left.and.right" color={colors.primary} />
        </View>

        {/* Title */}
        <Text style={[styles.title, { color: colors.text }]}>Enter Game PIN</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Ask the host for the 5-digit PIN
        </Text>

        {/* PIN Input */}
        <View style={styles.pinInputContainer}>
          <TextInput
            style={[
              styles.pinInput,
              {
                backgroundColor: currentScheme === 'dark' ? '#2A2A2A' : '#F5F5F5',
                color: colors.text,
                borderColor: colors.primary,
              },
            ]}
            value={pin}
            onChangeText={(text) => setPin(text.replace(/[^0-9]/g, ''))}
            keyboardType="number-pad"
            maxLength={5}
            placeholder="00000"
            placeholderTextColor={colors.textSecondary}
            autoFocus
            textAlign="center"
          />
        </View>

        {/* Join Button */}
        <TouchableOpacity
          style={[
            styles.joinButton,
            { backgroundColor: colors.primary, shadowColor: colors.primary },
            buttonPressed && styles.joinButtonPressed,
            (isJoining || pin.length !== 5) && styles.joinButtonDisabled,
          ]}
          onPressIn={() => !isJoining && pin.length === 5 && setButtonPressed(true)}
          onPressOut={() => setButtonPressed(false)}
          onPress={handleJoinLobby}
          disabled={isJoining || pin.length !== 5}
          activeOpacity={1}
        >
          {isJoining ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color="#FFFFFF" size="small" />
              <Text style={styles.joinButtonText}>Joining...</Text>
            </View>
          ) : (
            <Text style={styles.joinButtonText}>Join Game</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  content: {
    flex: 1,
    padding: 20,
    paddingTop: 20,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    marginBottom: 20,
    textAlign: 'center',
  },
  pinInputContainer: {
    width: '100%',
    marginBottom: 16,
  },
  pinInput: {
    fontSize: 44,
    fontWeight: '700',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 20,
    letterSpacing: 12,
    borderWidth: 2,
  },
  joinButton: {
    width: '100%',
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
  joinButtonPressed: {
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    elevation: 2,
    transform: [{ translateY: 4 }],
  },
  joinButtonDisabled: {
    opacity: 0.5,
  },
  joinButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
});

