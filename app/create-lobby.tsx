import { View, Text, StyleSheet, StatusBar, TouchableOpacity, TextInput, ActivityIndicator, Alert } from 'react-native';
import { Colors } from '@/constants/Colors';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { router } from 'expo-router';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { createLobby, generateQuestions } from '@/lib/lobby';
import { useTheme } from '@/contexts/ThemeContext';

const TOPICS = [
  { id: 'computer_science', name: 'Computer Science', icon: 'cpu.fill' },
  { id: 'machine_learning', name: 'Machine Learning', icon: 'brain.head.profile' },
  { id: 'computer_engineering', name: 'Computer Engineering', icon: 'gear.badge' },
  { id: 'cybersecurity', name: 'Cybersecurity', icon: 'lock.shield.fill' },
];

const TIME_LIMITS = ['5s', '10s', '15s', '25s', '35s'];

const DIFFICULTY_LEVELS = [
  { id: 'mild', name: 'Mild', color: '#7CB342', icon: 'flame.fill' },
  { id: 'spicy', name: 'Spicy', color: '#FB8C00', icon: 'flame.fill' },
  { id: 'extra_spicy', name: 'Extra Spicy', color: '#E53935', icon: 'flame.fill' },
];

export default function CreateLobbyScreen() {
  const { currentScheme } = useTheme();
  const colors = Colors[currentScheme];
  const { user } = useAuth();

  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [selectedTimeLimit, setSelectedTimeLimit] = useState('15s');
  const [numQuestions, setNumQuestions] = useState('10');
  const [selectedDifficulty, setSelectedDifficulty] = useState('mild');
  const [buttonPressed, setButtonPressed] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const toggleTopic = (topicId: string) => {
    if (selectedTopics.includes(topicId)) {
      setSelectedTopics(selectedTopics.filter(id => id !== topicId));
    } else {
      setSelectedTopics([...selectedTopics, topicId]);
    }
  };

  const handleCreateLobby = async () => {
    // Validate inputs
    const numQuestionsInt = parseInt(numQuestions);
    if (selectedTopics.length === 0) {
      Alert.alert('Invalid Input', 'Please select at least one topic');
      return;
    }
    if (!numQuestions || numQuestionsInt < 5 || numQuestionsInt > 30) {
      Alert.alert('Invalid Input', 'Please enter a valid number of questions (5-30)');
      return;
    }

    if (!user) {
      Alert.alert('Error', 'You must be logged in to create a lobby');
      return;
    }

    setIsCreating(true);

    try {
      // Parse time limit (remove 's' and convert to number)
      const timeLimitSeconds = parseInt(selectedTimeLimit.replace('s', ''));

      // Create lobby
      const { lobby, pin } = await createLobby({
        topics: selectedTopics,
        timeLimit: timeLimitSeconds,
        numQuestions: numQuestionsInt,
        difficulty: selectedDifficulty as 'mild' | 'spicy' | 'extra_spicy',
        hostId: user.id,
        hostUsername: user.user_metadata?.username || 'Anonymous',
        hostAvatar: user.user_metadata?.avatar || '',
      });

      // Add host as a player
      const { joinLobby } = await import('@/lib/lobby');
      await joinLobby(
        pin,
        user.id,
        user.user_metadata?.username || 'Anonymous',
        user.user_metadata?.avatar || ''
      );

      // Start generating questions in the background
      generateQuestions(lobby.id, selectedTopics, selectedDifficulty, numQuestionsInt)
        .catch(err => {
          console.error('Error generating questions:', err);
        });

      // Navigate to waiting room
      router.replace({
        pathname: '/lobby-waiting',
        params: {
          lobbyId: lobby.id,
          pin: pin,
          isHost: 'true',
        },
      });
    } catch (error: any) {
      console.error('Error creating lobby:', error);
      Alert.alert('Error', error.message || 'Failed to create lobby. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={currentScheme === 'dark' ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <IconSymbol size={24} name="chevron.left" color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Create Lobby</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.content}>
        {/* Topics Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.iconBadge, { backgroundColor: `${colors.primary}15` }]}>
              <IconSymbol size={16} name="book.fill" color={colors.primary} />
            </View>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Topics</Text>
          </View>
          <View style={styles.topicsGrid}>
            {TOPICS.map((topic) => {
              const isSelected = selectedTopics.includes(topic.id);
              return (
                <TouchableOpacity
                  key={topic.id}
                  style={[
                    styles.topicCard,
                    {
                      backgroundColor: isSelected
                        ? colors.primary
                        : (currentScheme === 'dark' ? '#2A2A2A' : '#F5F5F5'),
                      borderWidth: 2,
                      borderColor: isSelected ? colors.primary : 'transparent',
                    },
                  ]}
                  onPress={() => toggleTopic(topic.id)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.topicIconContainer, { backgroundColor: isSelected ? 'rgba(255,255,255,0.2)' : `${colors.primary}15` }]}>
                    <IconSymbol 
                      size={18} 
                      name={topic.icon as any} 
                      color={isSelected ? '#FFFFFF' : colors.primary} 
                    />
                  </View>
                  <Text
                    style={[
                      styles.topicName,
                      {
                        color: isSelected ? '#FFFFFF' : colors.text,
                        fontWeight: isSelected ? '700' : '600',
                      },
                    ]}
                  >
                    {topic.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Time Limit Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.iconBadge, { backgroundColor: `${colors.primary}15` }]}>
              <IconSymbol size={16} name="clock.fill" color={colors.primary} />
            </View>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Time Limit Per Question</Text>
          </View>
          <View style={styles.optionsRow}>
            {TIME_LIMITS.map((time) => {
              const isSelected = selectedTimeLimit === time;
              return (
                <TouchableOpacity
                  key={time}
                  style={[
                    styles.optionButton,
                    {
                      backgroundColor: isSelected
                        ? colors.primary
                        : (currentScheme === 'dark' ? '#2A2A2A' : '#F5F5F5'),
                      borderWidth: 2,
                      borderColor: isSelected ? colors.primary : 'transparent',
                    },
                  ]}
                  onPress={() => setSelectedTimeLimit(time)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.optionText,
                      {
                        color: isSelected ? '#FFFFFF' : colors.text,
                        fontWeight: isSelected ? '700' : '600',
                      },
                    ]}
                  >
                    {time}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Questions and Difficulty Row */}
        <View style={styles.rowSection}>
          {/* Number of Questions */}
          <View style={styles.halfSection}>
            <View style={styles.sectionHeader}>
              <View style={[styles.iconBadge, { backgroundColor: `${colors.primary}15` }]}>
                <IconSymbol size={16} name="number.square.fill" color={colors.primary} />
              </View>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Questions</Text>
            </View>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: currentScheme === 'dark' ? '#2A2A2A' : '#F5F5F5',
                  color: colors.text,
                  borderColor: colors.inputBorder,
                },
              ]}
              value={numQuestions}
              onChangeText={setNumQuestions}
              keyboardType="number-pad"
              maxLength={2}
              placeholder="10"
              placeholderTextColor={colors.textSecondary}
            />
          </View>

          {/* Difficulty Level */}
          <View style={styles.halfSection}>
            <View style={styles.sectionHeader}>
              <View style={[styles.iconBadge, { backgroundColor: `${colors.primary}15` }]}>
                <IconSymbol size={16} name="gauge.high" color={colors.primary} />
              </View>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Difficulty</Text>
            </View>
            <View style={styles.difficultyContainer}>
              {DIFFICULTY_LEVELS.map((level) => {
                const isSelected = selectedDifficulty === level.id;
                return (
                  <TouchableOpacity
                    key={level.id}
                    style={[
                      styles.difficultyButton,
                      {
                        backgroundColor: isSelected ? level.color : (currentScheme === 'dark' ? '#2A2A2A' : '#F5F5F5'),
                        borderWidth: 2,
                        borderColor: isSelected ? level.color : 'transparent',
                      },
                    ]}
                    onPress={() => setSelectedDifficulty(level.id)}
                    activeOpacity={0.7}
                  >
                    <IconSymbol 
                      size={12} 
                      name={level.icon as any} 
                      color={isSelected ? '#FFFFFF' : level.color} 
                    />
                    <Text
                      style={[
                        styles.difficultyText,
                        {
                          color: isSelected ? '#FFFFFF' : colors.text,
                          fontWeight: isSelected ? '700' : '600',
                        },
                      ]}
                    >
                      {level.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      </View>

      {/* Create Lobby Button */}
      <View style={[styles.buttonContainer, { backgroundColor: colors.background }]}>
        <TouchableOpacity
          style={[
            styles.createButton, 
            { backgroundColor: colors.primary, shadowColor: colors.primary },
            buttonPressed && styles.createButtonPressed,
            isCreating && styles.createButtonDisabled
          ]}
          onPressIn={() => !isCreating && setButtonPressed(true)}
          onPressOut={() => setButtonPressed(false)}
          onPress={handleCreateLobby}
          activeOpacity={1}
          disabled={isCreating}
        >
          {isCreating ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color="#FFFFFF" size="small" />
              <Text style={styles.createButtonText}>Creating...</Text>
            </View>
          ) : (
            <Text style={styles.createButtonText}>Create Lobby</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
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
    paddingBottom: 100,
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  iconBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  topicsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  topicCard: {
    width: '48%',
    padding: 12,
    borderRadius: 14,
    alignItems: 'center',
    gap: 6,
  },
  topicIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topicName: {
    fontSize: 12,
    textAlign: 'center',
  },
  optionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  optionText: {
    fontSize: 14,
  },
  rowSection: {
    flexDirection: 'row',
    gap: 14,
  },
  halfSection: {
    flex: 1,
  },
  input: {
    padding: 14,
    borderRadius: 12,
    fontSize: 20,
    fontWeight: '700',
    borderWidth: 2,
    textAlign: 'center',
  },
  difficultyContainer: {
    gap: 8,
  },
  difficultyButton: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  difficultyText: {
    fontSize: 12,
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    paddingBottom: 40,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  createButton: {
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
  createButtonPressed: {
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    elevation: 2,
    transform: [{ translateY: 4 }],
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  createButtonDisabled: {
    opacity: 0.6,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
});

