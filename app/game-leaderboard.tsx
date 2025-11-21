import { View, Text, StyleSheet, StatusBar, TouchableOpacity, ScrollView, Animated } from 'react-native';
import { Colors } from '@/constants/Colors';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { router, useLocalSearchParams } from 'expo-router';
import { useState, useEffect, useRef } from 'react';
import { getLeaderboard, nextQuestion, endGame } from '@/lib/lobby';
import { Player } from '@/types/lobby';
import { supabase } from '@/lib/supabase';
import { SvgAvatar } from '@/components/SvgAvatar';
import { useTheme } from '@/contexts/ThemeContext';

export default function GameLeaderboardScreen() {
  const { currentScheme } = useTheme();
  const colors = Colors[currentScheme];
  const params = useLocalSearchParams<{ lobbyId: string; questionIndex: string; isHost: string }>();

  const [players, setPlayers] = useState<Player[]>([]);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [isMovingNext, setIsMovingNext] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const lastQuestionIndex = useRef(parseInt(params.questionIndex));
  const hasNavigated = useRef(false); // Ref-based guard to prevent duplicate navigation
  const intervalsRef = useRef<{ refresh?: NodeJS.Timeout; lobby?: NodeJS.Timeout }>({});
  const isMounted = useRef(true);
  const refreshCountRef = useRef(0);

  const isHost = params.isHost === 'true';
  const currentQuestionIndex = parseInt(params.questionIndex);
  const isLastQuestion = currentQuestionIndex >= totalQuestions - 1;

  useEffect(() => {
    isMounted.current = true;
    refreshCountRef.current = 0;
    
    // Load immediately
    loadLeaderboard();

    // Animate in
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();

    // Single interval for both lobby checking and leaderboard updates
    const checkInterval = setInterval(async () => {
      // Prevent multiple navigations using ref
      if (hasNavigated.current || !isMounted.current) {
        clearInterval(checkInterval);
        return;
      }

      try {
        // Check lobby status
        const { data: lobby } = await supabase
          .from('lobbies')
          .select('current_question_index, num_questions, status')
          .eq('id', params.lobbyId)
          .single();

        if (lobby && isMounted.current) {
          // Update total questions if needed
          if (totalQuestions === 0 && lobby.num_questions) {
            setTotalQuestions(lobby.num_questions);
          }

          // Check if question index changed (host moved to next question)
          if (lobby.current_question_index > lastQuestionIndex.current && !hasNavigated.current && isMounted.current) {
            hasNavigated.current = true;
            lastQuestionIndex.current = lobby.current_question_index;
            setIsMovingNext(true);
            
            // Clear interval immediately
            clearInterval(checkInterval);
            intervalsRef.current = {};
            
            router.replace({
              pathname: '/game-play',
              params: {
                lobbyId: params.lobbyId,
                isHost: params.isHost,
              },
            });
            return;
          } else if (lobby.status === 'finished' && !hasNavigated.current && isMounted.current) {
            // Move to podium
            hasNavigated.current = true;
            setIsMovingNext(true);
            
            // Clear interval immediately
            clearInterval(checkInterval);
            intervalsRef.current = {};
            
            router.replace({
              pathname: '/game-podium',
              params: { lobbyId: params.lobbyId },
            });
            return;
          }
        }

        // Only refresh leaderboard every 2 seconds (every 4th check at 500ms)
        refreshCountRef.current++;
        if (refreshCountRef.current % 4 === 0) {
          loadLeaderboard();
        }
      } catch (error) {
        console.error('Error checking lobby:', error);
      }
    }, 500); // Check every 500ms for responsive navigation

    intervalsRef.current.lobby = checkInterval;

    return () => {
      isMounted.current = false;
      clearInterval(checkInterval);
      intervalsRef.current = {};
    };
  }, []);

  const loadLeaderboard = async () => {
    if (!isMounted.current) return;
    
    try {
      const playersData = await getLeaderboard(params.lobbyId);
      
      // Always update if we have data or if the data changed
      if (isMounted.current) {
        if (playersData.length > 0) {
          setPlayers(playersData);
          setIsLoading(false);
        } else if (JSON.stringify(playersData) !== JSON.stringify(players)) {
          // Even if empty, update to show the empty state
          setPlayers(playersData);
        }
      }

      // Get total questions if not already set
      if (totalQuestions === 0 && isMounted.current) {
        const { data: lobby } = await supabase
          .from('lobbies')
          .select('num_questions')
          .eq('id', params.lobbyId)
          .single();

        if (lobby && isMounted.current) {
          setTotalQuestions(lobby.num_questions);
        }
      }
    } catch (error) {
      console.error('Error loading leaderboard:', error);
      setIsLoading(false);
    }
  };


  const handleContinue = async () => {
    if (hasNavigated.current || isMovingNext) return;
    
    hasNavigated.current = true;
    setIsMovingNext(true);

    // Clear interval immediately
    if (intervalsRef.current.lobby) clearInterval(intervalsRef.current.lobby);
    intervalsRef.current = {};

    try {
      if (isLastQuestion) {
        // End game
        if (isHost) {
          await endGame(params.lobbyId);
        }
        router.replace({
          pathname: '/game-podium',
          params: { lobbyId: params.lobbyId },
        });
      } else {
        // Move to next question
        if (isHost) {
          await nextQuestion(params.lobbyId, currentQuestionIndex);
        }
        router.replace({
          pathname: '/game-play',
          params: {
            lobbyId: params.lobbyId,
            isHost: params.isHost,
          },
        });
      }
    } catch (error) {
      console.error('Error moving to next:', error);
      hasNavigated.current = false;
      setIsMovingNext(false);
    }
  };

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1: return '#FFD700'; // Gold
      case 2: return '#C0C0C0'; // Silver
      case 3: return '#CD7F32'; // Bronze
      default: return colors.textSecondary;
    }
  };

  const getRankIcon = (rank: number) => {
    return `${rank}`;
  };

  return (
    <Animated.View style={[styles.container, { backgroundColor: colors.background, opacity: fadeAnim }]}>
      <StatusBar barStyle={currentScheme === 'dark' ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <View style={styles.headerContent}>
          <IconSymbol size={32} name="trophy.fill" color="#FFFFFF" />
          <Text style={styles.headerTitle}>Leaderboard</Text>
          <Text style={styles.headerSubtitle}>
            After Question {currentQuestionIndex + 1} of {totalQuestions}
          </Text>
        </View>
      </View>

      {/* Leaderboard */}
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {isLoading && players.length === 0 ? (
          <View style={styles.loadingContainer}>
            <Text style={[styles.loadingText, { color: colors.text }]}>Loading scores...</Text>
          </View>
        ) : players.length === 0 ? (
          <View style={styles.loadingContainer}>
            <Text style={[styles.loadingText, { color: colors.text }]}>No players found. Refreshing...</Text>
          </View>
        ) : (
          <View style={styles.leaderboardList}>
            {players.map((player, index) => {
            const rank = index + 1;
            const isTopThree = rank <= 3;

            return (
              <View
                key={player.id}
                style={[
                  styles.playerRow,
                  {
                    backgroundColor: isTopThree
                      ? `${getRankColor(rank)}15`
                      : (currentScheme === 'dark' ? '#2A2A2A' : '#F5F5F5'),
                    borderWidth: isTopThree ? 2 : 0,
                    borderColor: isTopThree ? getRankColor(rank) : 'transparent',
                  },
                ]}
              >
                {/* Rank */}
                <View style={[styles.rankBadge, isTopThree && { backgroundColor: getRankColor(rank) }]}>
                  <Text style={[styles.rankText, isTopThree && { color: '#FFFFFF' }]}>
                    {rank}
                  </Text>
                </View>

                {/* Avatar */}
                <View style={styles.playerAvatar}>
                  <SvgAvatar svgString={player.avatar} size={48} />
                </View>

                {/* Player Info */}
                <View style={styles.playerInfo}>
                  <Text style={[styles.playerName, { color: colors.text }]} numberOfLines={1}>
                    {player.username}
                  </Text>
                  <View style={styles.scoreContainer}>
                    <IconSymbol size={14} name="star.fill" color="#FFD700" />
                    <Text style={[styles.scoreText, { color: colors.textSecondary }]}>
                      {player.total_score} pts
                    </Text>
                  </View>
                </View>

                {/* Trend indicator */}
                {rank <= 3 && (
                  <View style={styles.trendContainer}>
                    <IconSymbol 
                      size={20} 
                      name="arrow.up.circle.fill" 
                      color={getRankColor(rank)} 
                    />
                  </View>
                )}
              </View>
            );
          })}
          </View>
        )}
      </ScrollView>

      {/* Continue Button (Host Only) */}
      {isHost && (
        <View style={[styles.buttonContainer, { backgroundColor: colors.background }]}>
          <TouchableOpacity
            style={[
              styles.continueButton,
              { backgroundColor: colors.primary },
              isMovingNext && styles.continueButtonDisabled,
            ]}
            onPress={handleContinue}
            disabled={isMovingNext}
            activeOpacity={0.8}
          >
            <Text style={styles.continueButtonText}>
              {isLastQuestion ? 'View Final Results' : 'Next Question'}
            </Text>
            <IconSymbol 
              size={20} 
              name={isLastQuestion ? 'trophy.fill' : 'arrow.right.circle.fill'} 
              color="#FFFFFF" 
            />
          </TouchableOpacity>
        </View>
      )}

      {/* Auto-continue indicator for non-hosts */}
      {!isHost && (
        <View style={[styles.autoIndicator, { backgroundColor: currentScheme === 'dark' ? '#2A2A2A' : '#F5F5F5' }]}>
          <Text style={[styles.autoIndicatorText, { color: colors.textSecondary }]}>
            {isLastQuestion ? 'Moving to final results...' : 'Next question starting soon...'}
          </Text>
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 32,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  headerContent: {
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '700',
  },
  headerSubtitle: {
    color: '#FFFFFF',
    fontSize: 14,
    opacity: 0.9,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 120,
  },
  leaderboardList: {
    gap: 12,
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    gap: 12,
  },
  rankBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  rankText: {
    fontSize: 18,
    fontWeight: '700',
  },
  playerAvatar: {
    width: 48,
    height: 48,
  },
  playerInfo: {
    flex: 1,
    gap: 4,
  },
  playerName: {
    fontSize: 16,
    fontWeight: '600',
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  scoreText: {
    fontSize: 14,
    fontWeight: '600',
  },
  trendContainer: {
    marginLeft: 8,
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    paddingBottom: 40,
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 18,
    borderRadius: 50,
  },
  continueButtonDisabled: {
    opacity: 0.5,
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  autoIndicator: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  autoIndicatorText: {
    fontSize: 14,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

