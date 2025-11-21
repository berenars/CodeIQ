import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated, ActivityIndicator } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { useTheme } from '@/contexts/ThemeContext';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { 
  updateProgress, 
  completeOfflineSession,
  checkAndAwardAchievements,
  type Achievement
} from '@/lib/offline';

export default function OfflineResultsScreen() {
  const {
    sessionId,
    topicId,
    category,
    topicTitle,
    topicColor,
    level,
    score,
    correctAnswers,
    totalQuestions,
  } = useLocalSearchParams<{
    sessionId: string;
    topicId: string;
    category: string;
    topicTitle: string;
    topicColor: string;
    level: string;
    score: string;
    correctAnswers: string;
    totalQuestions: string;
  }>();

  const { currentScheme } = useTheme();
  const colors = Colors[currentScheme];

  const [isProcessing, setIsProcessing] = useState(true);
  const [newAchievements, setNewAchievements] = useState<Achievement[]>([]);
  const [nextLevel, setNextLevel] = useState(parseInt(level) + 1);

  const scaleAnim = useRef(new Animated.Value(0)).current;
  const achievementAnims = useRef<Animated.Value[]>([]).current;
  const confettiAnims = useRef<Animated.Value[]>([]).current;

  const numCorrect = parseInt(correctAnswers);
  const numTotal = parseInt(totalQuestions);
  const finalScore = parseInt(score);
  const accuracy = Math.round((numCorrect / numTotal) * 100);
  const passed = numCorrect >= 6; // Need 6/8 to pass

  useEffect(() => {
    processResults();
  }, []);

  useEffect(() => {
    // Scale animation for score
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 8,
      tension: 40,
      useNativeDriver: true,
    }).start();

    // Confetti animation
    if (accuracy >= 75) {
      startConfetti();
    }
  }, [isProcessing]);

  const processResults = async () => {
    try {
      // Complete the session
      await completeOfflineSession(sessionId, numCorrect, numTotal, finalScore);

      // Update progress only if passed
      if (passed) {
        await updateProgress(topicId, numCorrect, numTotal);
        
        // Check for new achievements
        const achievements = await checkAndAwardAchievements(
          topicId,
          category,
          parseInt(level),
          numCorrect,
          numTotal
        );

        setNewAchievements(achievements);

        // Setup achievement animations
        achievements.forEach(() => {
          achievementAnims.push(new Animated.Value(0));
        });

        // Animate achievements in sequence
        if (achievements.length > 0) {
          setTimeout(() => {
            animateAchievements();
          }, 500);
        }
      } else {
        setNewAchievements([]);
      }

      setIsProcessing(false);
    } catch (error) {
      console.error('Error processing results:', error);
      setIsProcessing(false);
    }
  };

  const animateAchievements = () => {
    const animations = achievementAnims.map((anim, index) =>
      Animated.sequence([
        Animated.delay(index * 300),
        Animated.spring(anim, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
      ])
    );

    Animated.parallel(animations).start();
  };

  const startConfetti = () => {
    // Create 20 confetti pieces
    const confettiCount = 20;
    for (let i = 0; i < confettiCount; i++) {
      confettiAnims.push(new Animated.Value(0));
    }

    // Animate each confetti piece
    confettiAnims.forEach((anim, index) => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(index * 100),
          Animated.timing(anim, {
            toValue: 1,
            duration: 2000 + Math.random() * 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    });
  };

  const handleContinue = () => {
    router.replace({
      pathname: '/offline-game',
      params: {
        topicId,
        category,
        topicTitle,
        topicColor,
      },
    });
  };

  const handleGoHome = () => {
    router.replace('/(tabs)');
  };

  const getGradeInfo = () => {
    if (accuracy >= 90) return { grade: 'S', color: '#FFD700', icon: 'crown.fill' };
    if (accuracy >= 75) return { grade: 'A', color: '#10B981', icon: 'star.fill' };
    if (accuracy >= 60) return { grade: 'B', color: '#3B82F6', icon: 'checkmark.circle.fill' };
    if (accuracy >= 50) return { grade: 'C', color: '#F59E0B', icon: 'hand.thumbsup.fill' };
    return { grade: 'D', color: '#EF4444', icon: 'exclamationmark.circle.fill' };
  };

  const gradeInfo = getGradeInfo();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Confetti */}
      {accuracy >= 75 && confettiAnims.map((anim, index) => {
        const colors = ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8'];
        const randomColor = colors[index % colors.length];
        const randomLeft = `${(index * 5) % 100}%`;

        return (
          <Animated.View
            key={index}
            style={[
              styles.confetti,
              {
                backgroundColor: randomColor,
                left: randomLeft,
                transform: [
                  {
                    translateY: anim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-20, 800],
                    }),
                  },
                  {
                    rotate: anim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0deg', `${360 * (index % 2 === 0 ? 1 : -1)}deg`],
                    }),
                  },
                ],
                opacity: anim.interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange: [1, 1, 0],
                }),
              },
            ]}
          />
        );
      })}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {passed ? `Level ${level} Complete! 🎉` : `Level ${level} - Try Again`}
          </Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            {passed ? `${topicTitle} • You passed!` : `${topicTitle} • Need 6/8 to pass`}
          </Text>
        </View>

        {/* Grade Badge */}
        <Animated.View
          style={[
            styles.gradeBadge,
            {
              backgroundColor: gradeInfo.color + '20',
              borderColor: gradeInfo.color,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <IconSymbol size={48} name={gradeInfo.icon as any} color={gradeInfo.color} />
          <Text style={[styles.gradeText, { color: gradeInfo.color }]}>{gradeInfo.grade}</Text>
          <Text style={[styles.accuracyText, { color: colors.text }]}>{accuracy}% Accuracy</Text>
        </Animated.View>

        {/* Stats */}
        <View style={[styles.statsContainer, { backgroundColor: colors.card }]}>
          <View style={styles.statItem}>
            <IconSymbol size={32} name="checkmark.circle.fill" color="#10B981" />
            <Text style={[styles.statValue, { color: colors.text }]}>{numCorrect}/{numTotal}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Correct</Text>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.statItem}>
            <IconSymbol size={32} name="star.fill" color="#FFD700" />
            <Text style={[styles.statValue, { color: colors.text }]}>{finalScore}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Score</Text>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.statItem}>
            <IconSymbol size={32} name={passed ? "flag.checkered" : "arrow.clockwise"} color={topicColor} />
            <Text style={[styles.statValue, { color: colors.text }]}>Level {passed ? nextLevel : level}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{passed ? 'Next' : 'Retry'}</Text>
          </View>
        </View>

        {/* New Achievements */}
        {newAchievements.length > 0 && (
          <View style={styles.achievementsSection}>
            <Text style={[styles.achievementsTitle, { color: colors.text }]}>🎉 New Achievements!</Text>
            {newAchievements.map((achievement, index) => {
              const tierColors = {
                bronze: '#CD7F32',
                silver: '#C0C0C0',
                gold: '#FFD700',
                platinum: '#E5E4E2',
              };

              return (
                <Animated.View
                  key={achievement.id}
                  style={[
                    styles.achievementCard,
                    {
                      backgroundColor: colors.card,
                      borderColor: tierColors[achievement.tier],
                      opacity: achievementAnims[index] || 0,
                      transform: [
                        {
                          scale: achievementAnims[index]?.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0.8, 1],
                          }) || 0.8,
                        },
                      ],
                    },
                  ]}
                >
                  <View style={[styles.achievementIconContainer, { backgroundColor: tierColors[achievement.tier] + '20' }]}>
                    <IconSymbol size={32} name={achievement.icon as any} color={tierColors[achievement.tier]} />
                  </View>
                  <View style={styles.achievementInfo}>
                    <Text style={[styles.achievementName, { color: colors.text }]}>{achievement.name}</Text>
                    <Text style={[styles.achievementDescription, { color: colors.textSecondary }]}>
                      {achievement.description}
                    </Text>
                    <Text style={[styles.achievementPoints, { color: tierColors[achievement.tier] }]}>
                      +{achievement.points} points
                    </Text>
                  </View>
                </Animated.View>
              );
            })}
          </View>
        )}

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: topicColor }]}
            onPress={handleContinue}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Text style={styles.primaryButtonText}>
                  {passed ? 'Next Level' : 'Retry Level'}
                </Text>
                <IconSymbol size={20} name={passed ? "arrow.right" : "arrow.clockwise"} color="#FFFFFF" />
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.secondaryButton, { borderColor: colors.inputBorder }]}
            onPress={handleGoHome}
          >
            <Text style={[styles.secondaryButtonText, { color: colors.text }]}>Back to Home</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 60,
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  confetti: {
    position: 'absolute',
    width: 10,
    height: 10,
    top: 0,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
  },
  gradeBadge: {
    alignSelf: 'center',
    alignItems: 'center',
    padding: 32,
    borderRadius: 24,
    borderWidth: 3,
    marginBottom: 32,
    minWidth: 200,
  },
  gradeText: {
    fontSize: 72,
    fontWeight: '700',
    marginTop: 8,
  },
  accuracyText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 24,
    borderRadius: 16,
    marginBottom: 24,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },
  statDivider: {
    width: 1,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 14,
  },
  achievementsSection: {
    marginBottom: 24,
  },
  achievementsTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
  },
  achievementCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 16,
    borderWidth: 2,
    marginBottom: 12,
    gap: 16,
  },
  achievementIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  achievementInfo: {
    flex: 1,
    gap: 4,
  },
  achievementName: {
    fontSize: 16,
    fontWeight: '700',
  },
  achievementDescription: {
    fontSize: 14,
  },
  achievementPoints: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },
  actions: {
    gap: 12,
  },
  primaryButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 16,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  secondaryButton: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 2,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

