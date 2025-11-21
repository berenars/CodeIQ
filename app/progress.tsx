import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, ActivityIndicator } from 'react-native';
import { useState, useEffect } from 'react';
import { Colors } from '@/constants/Colors';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { router } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { 
  getAllUserProgress, 
  getUserAchievements, 
  subscribeToProgress,
  subscribeToAchievements,
  type UserProgress,
  type UserAchievement
} from '@/lib/offline';
import { supabase } from '@/lib/supabase';

export default function ProgressScreen() {
  const { currentScheme } = useTheme();
  const colors = Colors[currentScheme];
  
  const [isLoading, setIsLoading] = useState(true);
  const [progress, setProgress] = useState<UserProgress[]>([]);
  const [achievements, setAchievements] = useState<UserAchievement[]>([]);
  const [totalPoints, setTotalPoints] = useState(0);

  useEffect(() => {
    loadData();
    setupSubscriptions();
  }, []);

  const loadData = async () => {
    try {
      const [progressData, achievementsData] = await Promise.all([
        getAllUserProgress(),
        getUserAchievements(),
      ]);

      setProgress(progressData);
      setAchievements(achievementsData);

      // Calculate total points from achievements
      const points = achievementsData.reduce((sum, ua) => {
        return sum + (ua.achievement?.points || 0);
      }, 0);
      setTotalPoints(points);

      setIsLoading(false);
    } catch (error) {
      console.error('Error loading progress:', error);
      setIsLoading(false);
    }
  };

  const setupSubscriptions = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Subscribe to progress changes
    const progressSub = subscribeToProgress(user.id, (newProgress) => {
      setProgress((prev) => {
        const index = prev.findIndex((p) => p.id === newProgress.id);
        if (index >= 0) {
          const updated = [...prev];
          updated[index] = newProgress;
          return updated;
        } else {
          return [...prev, newProgress];
        }
      });
    });

    // Subscribe to new achievements
    const achievementSub = subscribeToAchievements(user.id, (newAchievement) => {
      setAchievements((prev) => [...prev, newAchievement]);
      setTotalPoints((prev) => prev + (newAchievement.achievement?.points || 0));
    });

    return () => {
      progressSub.unsubscribe();
      achievementSub.unsubscribe();
    };
  };

  const getTotalQuestionsAnswered = () => {
    return progress.reduce((sum, p) => sum + p.questions_completed, 0);
  };

  const getTotalCorrectAnswers = () => {
    return progress.reduce((sum, p) => sum + p.total_correct, 0);
  };

  const getAccuracy = () => {
    const total = getTotalQuestionsAnswered();
    const correct = getTotalCorrectAnswers();
    if (total === 0) return 0;
    return Math.round((correct / total) * 100);
  };

  const getTopicIcon = (topicId: string) => {
    if (topicId.startsWith('cs_')) return 'cpu.fill';
    if (topicId.startsWith('ml_')) return 'brain.head.profile';
    if (topicId.startsWith('ce_')) return 'gear.badge';
    if (topicId.startsWith('sec_')) return 'lock.shield.fill';
    return 'book.fill';
  };

  const getTopicColor = (topicId: string) => {
    if (topicId.startsWith('cs_')) return '#3B82F6';
    if (topicId.startsWith('ml_')) return '#8B5CF6';
    if (topicId.startsWith('ce_')) return '#F59E0B';
    if (topicId.startsWith('sec_')) return '#EF4444';
    return '#6B7280';
  };

  const tierColors = {
    bronze: '#CD7F32',
    silver: '#C0C0C0',
    gold: '#FFD700',
    platinum: '#E5E4E2',
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar barStyle={currentScheme === 'dark' ? 'light-content' : 'dark-content'} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={currentScheme === 'dark' ? 'light-content' : 'dark-content'} />
      
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.inputBorder }]}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <IconSymbol size={24} name="chevron.left" color={colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Progress</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Stats Overview */}
        <View style={styles.statsContainer}>
          <View style={[styles.statCard, { backgroundColor: '#3B82F6' }]}>
            <IconSymbol size={32} name="star.fill" color="#FFFFFF" />
            <Text style={styles.statValue}>{totalPoints}</Text>
            <Text style={styles.statLabel}>Total Points</Text>
          </View>
          
          <View style={[styles.statCard, { backgroundColor: '#10B981' }]}>
            <IconSymbol size={32} name="checkmark.circle.fill" color="#FFFFFF" />
            <Text style={styles.statValue}>{getTotalQuestionsAnswered()}</Text>
            <Text style={styles.statLabel}>Questions</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: '#8B5CF6' }]}>
            <IconSymbol size={32} name="percent" color="#FFFFFF" />
            <Text style={styles.statValue}>{getAccuracy()}%</Text>
            <Text style={styles.statLabel}>Accuracy</Text>
          </View>
        </View>

        {/* Topic Progress */}
        {progress.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Your Progress</Text>
            
            {progress
              .sort((a, b) => b.current_level - a.current_level)
              .slice(0, 5)
              .map((item) => {
                const topicColor = getTopicColor(item.topic_id);
                const accuracy = item.questions_completed > 0 
                  ? Math.round((item.total_correct / item.questions_completed) * 100) 
                  : 0;

                return (
                  <View 
                    key={item.id} 
                    style={[styles.progressCard, { backgroundColor: colors.card, borderColor: colors.inputBorder }]}
                  >
                    <View style={[styles.progressIcon, { backgroundColor: topicColor + '20' }]}>
                      <IconSymbol size={28} name={getTopicIcon(item.topic_id) as any} color={topicColor} />
                    </View>
                    
                    <View style={styles.progressInfo}>
                      <Text style={[styles.progressTitle, { color: colors.text }]}>
                        {item.topic_id.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                      </Text>
                      <View style={styles.progressStats}>
                        <Text style={[styles.progressStat, { color: colors.textSecondary }]}>
                          Level {item.current_level}
                        </Text>
                        <Text style={[styles.progressStat, { color: colors.textSecondary }]}>•</Text>
                        <Text style={[styles.progressStat, { color: colors.textSecondary }]}>
                          {accuracy}% Accuracy
                        </Text>
                        <Text style={[styles.progressStat, { color: colors.textSecondary }]}>•</Text>
                        <Text style={[styles.progressStat, { color: colors.textSecondary }]}>
                          {item.questions_completed} Questions
                        </Text>
                      </View>
                    </View>

                    <View style={[styles.levelBadge, { backgroundColor: topicColor }]}>
                      <Text style={styles.levelBadgeText}>{item.current_level}</Text>
                    </View>
                  </View>
                );
              })}
          </View>
        )}

        {/* Achievements */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Achievements</Text>
            <Text style={[styles.sectionCount, { color: colors.textSecondary }]}>
              {achievements.length} unlocked
            </Text>
          </View>
          
          {achievements.length === 0 ? (
            <View style={[styles.activityCard, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder }]}>
              <View style={styles.emptyState}>
                <IconSymbol size={48} name="trophy.fill" color={colors.textSecondary} />
                <Text style={[styles.emptyTitle, { color: colors.text }]}>No Achievements Yet</Text>
                <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                  Complete topics to unlock achievements
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.achievementsGrid}>
              {achievements.map((ua) => {
                if (!ua.achievement) return null;
                const achievement = ua.achievement;
                const tierColor = tierColors[achievement.tier];

                return (
                  <View
                    key={ua.id}
                    style={[styles.achievementCard, { backgroundColor: colors.card, borderColor: tierColor }]}
                  >
                    <View style={[styles.achievementIconContainer, { backgroundColor: tierColor + '20' }]}>
                      <IconSymbol size={32} name={achievement.icon as any} color={tierColor} />
                    </View>
                    <Text style={[styles.achievementName, { color: colors.text }]}>{achievement.name}</Text>
                    <Text style={[styles.achievementPoints, { color: tierColor }]}>
                      +{achievement.points}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 32,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 4,
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  sectionCount: {
    fontSize: 14,
    fontWeight: '600',
  },
  progressCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
    gap: 12,
  },
  progressIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressInfo: {
    flex: 1,
    gap: 4,
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  progressStats: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  progressStat: {
    fontSize: 12,
  },
  levelBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  levelBadgeText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  activityCard: {
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 4,
  },
  achievementsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  achievementCard: {
    width: '48%',
    padding: 16,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: 'center',
    gap: 8,
  },
  achievementIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  achievementName: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  achievementPoints: {
    fontSize: 12,
    fontWeight: '600',
  },
});
