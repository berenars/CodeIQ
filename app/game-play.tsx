import { View, Text, StyleSheet, StatusBar, TouchableOpacity, Animated, Alert, ActivityIndicator } from 'react-native';
import { Colors } from '@/constants/Colors';
import { router, useLocalSearchParams } from 'expo-router';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getLobbyQuestions, subscribeLobbyChanges, submitAnswer, nextQuestion, endGame, getLobbyPlayers } from '@/lib/lobby';
import { Lobby, Question, Player, QuestionWithAnswers } from '@/types/lobby';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/contexts/ThemeContext';

const ANSWER_COLORS = ['#E91E63', '#2196F3', '#FF9800', '#4CAF50'];

export default function GamePlayScreen() {
  const { currentScheme } = useTheme();
  const colors = Colors[currentScheme];
  const { user } = useAuth();
  const params = useLocalSearchParams<{ lobbyId: string; isHost: string }>();

  const [lobby, setLobby] = useState<Lobby | null>(null);
  const [questions, setQuestions] = useState<QuestionWithAnswers[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<QuestionWithAnswers | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [answerStartTime, setAnswerStartTime] = useState(0);
  const [waitingForPlayers, setWaitingForPlayers] = useState(false);
  const [isMovingToLeaderboard, setIsMovingToLeaderboard] = useState(false);
  const hasSubmittedAnswer = useRef(false);
  const hasNavigatedToLeaderboard = useRef(false);
  const hasNavigatedToPodium = useRef(false);
  const isMounted = useRef(true);

  const isHost = params.isHost === 'true';
  const timerProgress = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    isMounted.current = true;
    loadGameData();

    // Subscribe to lobby changes
    const subscription = subscribeLobbyChanges(params.lobbyId, (updatedLobby) => {
      if (!isMounted.current) return;
      setLobby(updatedLobby);
      
      // Check if we should move to next question or end game
      if (updatedLobby.status === 'finished' && !hasNavigatedToPodium.current && isMounted.current) {
        hasNavigatedToPodium.current = true;
        router.replace({
          pathname: '/game-podium',
          params: { lobbyId: params.lobbyId },
        });
      }
    });

    // Polling for non-host players - refresh lobby every second
    const refreshInterval = setInterval(async () => {
      if (!isMounted.current) return;
      
      try {
        const { data: lobbyData } = await supabase
          .from('lobbies')
          .select('*')
          .eq('id', params.lobbyId)
          .single();

        if (lobbyData && isMounted.current) {
          setLobby(lobbyData as Lobby);
          
          if (lobbyData.status === 'finished' && !hasNavigatedToPodium.current && isMounted.current) {
            hasNavigatedToPodium.current = true;
            router.replace({
              pathname: '/game-podium',
              params: { lobbyId: params.lobbyId },
            });
          }
        }
      } catch (error) {
        console.error('Error refreshing game data:', error);
      }
    }, 1000);

    return () => {
      isMounted.current = false;
      subscription.unsubscribe();
      clearInterval(refreshInterval);
    };
  }, [params.lobbyId]);

  // Subscribe to answers for instant notification when players answer
  useEffect(() => {
    if (!currentQuestion || !isMounted.current) return;

    const answersSubscription = supabase
      .channel(`answers-${currentQuestion.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'answers',
          filter: `question_id=eq.${currentQuestion.id}`
        },
        async () => {
          // New answer came in, immediately check if all players answered
          if (!hasNavigatedToLeaderboard.current && !isMovingToLeaderboard && isMounted.current) {
            // Immediate check with minimal retry (real-time should handle it)
            checkAndMoveToLeaderboard(3); // Only 3 quick retries since we got real-time notification
          }
        }
      )
      .subscribe();

    return () => {
      answersSubscription.unsubscribe();
    };
  }, [currentQuestion?.id]);

  // Timer effect - runs consistently using server time
  useEffect(() => {
    if (!lobby || !currentQuestion || !lobby.question_started_at || hasAnswered || isMovingToLeaderboard) return;

    const questionStartTime = new Date(lobby.question_started_at).getTime();
    const duration = lobby.time_limit * 1000;

    // Calculate initial elapsed time based on server timestamp
    const initialElapsed = Date.now() - questionStartTime;
    const initialRemaining = Math.max(0, duration - initialElapsed);

    // Animate progress bar for remaining time only
    if (initialRemaining > 0) {
      Animated.timing(timerProgress, {
        toValue: 0,
        duration: initialRemaining,
        useNativeDriver: false,
      }).start();
    } else {
      // Time already up
      timerProgress.setValue(0);
      if (!hasAnswered && !isMovingToLeaderboard) {
        handleTimeUp();
      }
      return;
    }

    // Use requestAnimationFrame for smoother, more accurate timer
    let animationFrameId: number;
    
    const updateTimer = () => {
      // Stop timer if already answered or moving
      if (hasAnswered || isMovingToLeaderboard) {
        if (animationFrameId) {
          cancelAnimationFrame(animationFrameId);
        }
        return;
      }

      // Calculate elapsed time based on server timestamp
      const elapsed = Date.now() - questionStartTime;
      const remaining = Math.max(0, duration - elapsed);
      setTimeLeft(Math.ceil(remaining / 1000));

      if (remaining <= 0) {
        if (!hasAnswered && !isMovingToLeaderboard) {
          handleTimeUp();
        }
      } else {
        animationFrameId = requestAnimationFrame(updateTimer);
      }
    };

    animationFrameId = requestAnimationFrame(updateTimer);

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      timerProgress.stopAnimation();
    };
  }, [currentQuestion?.id, lobby?.question_started_at, hasAnswered, isMovingToLeaderboard]);

  // Watch for lobby question index changes
  useEffect(() => {
    if (!lobby || questions.length === 0) return;

    const questionIndex = lobby.current_question_index;
    
    if (questionIndex >= questions.length) {
      // Game over
      return;
    }

    const question = questions[questionIndex];
    setCurrentQuestion(question);
    setSelectedAnswer(null);
    setHasAnswered(false);
    setTimeLeft(lobby.time_limit);
    // Use server timestamp for answer start time
    setAnswerStartTime(lobby.question_started_at ? new Date(lobby.question_started_at).getTime() : Date.now());
    setIsMovingToLeaderboard(false);
    setWaitingForPlayers(false);
    hasSubmittedAnswer.current = false;
    hasNavigatedToLeaderboard.current = false; // Reset navigation guard for new question
    timerProgress.setValue(1);
  }, [lobby?.current_question_index, lobby?.question_started_at, questions]);

  const loadGameData = async () => {
    try {
      // Load lobby
      const { data: lobbyData, error: lobbyError } = await supabase
        .from('lobbies')
        .select('*')
        .eq('id', params.lobbyId)
        .single();

      if (lobbyError) throw lobbyError;
      setLobby(lobbyData as Lobby);

      // Load questions
      const questionsData = await getLobbyQuestions(params.lobbyId);
      
      // Shuffle answers for each question
      const questionsWithShuffledAnswers: QuestionWithAnswers[] = questionsData.map(q => {
        const allAnswers = [q.correct_answer, ...q.wrong_answers];
        const shuffled = allAnswers.sort(() => Math.random() - 0.5);
        return { ...q, all_answers: shuffled };
      });
      
      setQuestions(questionsWithShuffledAnswers);

      // Load current player data
      const players = await getLobbyPlayers(params.lobbyId);
      const player = players.find(p => p.user_id === user?.id);
      setCurrentPlayer(player || null);

      // Set initial question
      if (questionsWithShuffledAnswers.length > 0) {
        const initialQuestion = questionsWithShuffledAnswers[lobbyData.current_question_index || 0];
        setCurrentQuestion(initialQuestion);
        setTimeLeft(lobbyData.time_limit);
        setAnswerStartTime(Date.now());
      }
    } catch (error) {
      console.error('Error loading game:', error);
      Alert.alert('Error', 'Failed to load game data');
    }
  };

  const handleTimeUp = async () => {
    // Prevent duplicate calls
    if (hasAnswered || hasSubmittedAnswer.current) return;
    
    hasSubmittedAnswer.current = true;
    setHasAnswered(true);
    
    // Auto-submit with no answer (0 points)
    if (currentPlayer && currentQuestion) {
      try {
        // Check if already submitted to avoid duplicate key error
        const { data: existingAnswer } = await supabase
          .from('answers')
          .select('id')
          .eq('question_id', currentQuestion.id)
          .eq('player_id', currentPlayer.id)
          .single();

        if (!existingAnswer) {
          await submitAnswer({
            lobbyId: params.lobbyId,
            questionId: currentQuestion.id,
            playerId: currentPlayer.id,
            selectedAnswer: '',
            correctAnswer: currentQuestion.correct_answer,
            timeTaken: lobby!.time_limit * 1000,
            timeLimit: lobby!.time_limit,
          });
        }
        
        // Time's up! Move to leaderboard immediately - don't wait for other players
        setTimeout(() => {
          setWaitingForPlayers(false);
          moveToLeaderboard();
        }, 300);
      } catch (error: any) {
        // Ignore duplicate key errors (already submitted)
        if (error?.code !== '23505') {
          console.error('Error submitting timeout:', error);
        }
        // Move forward regardless
        setTimeout(() => {
          setWaitingForPlayers(false);
          moveToLeaderboard();
        }, 300);
      }
    } else {
      // No player or question, just move immediately
      setTimeout(() => {
        moveToLeaderboard();
      }, 300);
    }
  };

  const handleAnswerSelect = async (answer: string) => {
    // Prevent duplicate submissions
    if (hasAnswered || isSubmitting || hasSubmittedAnswer.current) return;

    hasSubmittedAnswer.current = true;
    setSelectedAnswer(answer);
    setHasAnswered(true);
    setIsSubmitting(true);

    const timeTaken = Date.now() - answerStartTime;

    try {
      if (!currentPlayer || !currentQuestion) return;

      const result = await submitAnswer({
        lobbyId: params.lobbyId,
        questionId: currentQuestion.id,
        playerId: currentPlayer.id,
        selectedAnswer: answer,
        correctAnswer: currentQuestion.correct_answer,
        timeTaken,
        timeLimit: lobby!.time_limit,
      });

      // Update current player's score locally
      if (result.points > 0 && currentPlayer) {
        const updatedPlayer = {
          ...currentPlayer,
          total_score: currentPlayer.total_score + result.points
        };
        setCurrentPlayer(updatedPlayer);
      }

      // Show feedback briefly then check if all players answered
      setTimeout(() => {
        checkAndMoveToLeaderboard(15); // Only 15 retries = 1.5 seconds max wait
      }, 800);
    } catch (error) {
      console.error('Error submitting answer:', error);
      Alert.alert('Error', 'Failed to submit answer');
      hasSubmittedAnswer.current = false;
      setHasAnswered(false);
      setIsSubmitting(false);
    }
  };

  const checkAndMoveToLeaderboard = async (maxRetries = 30) => {
    // Prevent duplicate navigation
    if (isMovingToLeaderboard || !currentQuestion) return;

    try {
      // Get total number of players in this lobby
      const { data: players, error: playersError } = await supabase
        .from('players')
        .select('id')
        .eq('lobby_id', params.lobbyId);

      if (playersError) throw playersError;

      // Get number of answers for this question
      const { data: answers, error: answersError } = await supabase
        .from('answers')
        .select('id')
        .eq('question_id', currentQuestion.id);

      if (answersError) throw answersError;

      const totalPlayers = players?.length || 0;
      const totalAnswers = answers?.length || 0;

      // Only move to leaderboard if all players have answered
      if (totalAnswers >= totalPlayers) {
        setWaitingForPlayers(false);
        moveToLeaderboard();
      } else if (maxRetries <= 0) {
        // Max retries reached, force move to leaderboard
        console.log('Timeout waiting for all players, moving to leaderboard anyway');
        setWaitingForPlayers(false);
        moveToLeaderboard();
      } else {
        // Show waiting indicator
        setWaitingForPlayers(true);
        // Wait and check again (poll every 100ms for faster response)
        setTimeout(() => {
          checkAndMoveToLeaderboard(maxRetries - 1);
        }, 100);
      }
    } catch (error) {
      console.error('Error checking answers:', error);
      // If there's an error, just move to leaderboard anyway
      setWaitingForPlayers(false);
      moveToLeaderboard();
    }
  };

  const moveToLeaderboard = () => {
    // Prevent duplicate navigation using both state and ref
    if (isMovingToLeaderboard || hasNavigatedToLeaderboard.current) return;
    
    hasNavigatedToLeaderboard.current = true;
    setIsMovingToLeaderboard(true);
    
    router.replace({
      pathname: '/game-leaderboard',
      params: {
        lobbyId: params.lobbyId,
        questionIndex: lobby!.current_question_index.toString(),
        isHost: params.isHost,
      },
    });
  };

  const getAnswerStyle = (answer: string) => {
    if (!hasAnswered) return {};
    
    if (answer === currentQuestion?.correct_answer) {
      return styles.correctAnswer;
    }
    
    if (answer === selectedAnswer && answer !== currentQuestion?.correct_answer) {
      return styles.wrongAnswer;
    }
    
    return styles.fadedAnswer;
  };

  if (!currentQuestion || !lobby) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: colors.text }]}>Loading question...</Text>
        </View>
      </View>
    );
  }

  const progress = timeLeft / lobby.time_limit;
  const progressColor = progress > 0.5 ? '#4CAF50' : progress > 0.25 ? '#FF9800' : '#E53935';

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <View style={styles.questionCounter}>
          <Text style={styles.questionCounterText}>
            Question {lobby.current_question_index + 1} of {lobby.num_questions}
          </Text>
        </View>

        {/* Timer */}
        <View style={styles.timerContainer}>
          <Text style={styles.timerText}>{timeLeft}s</Text>
        </View>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressBarContainer}>
        <Animated.View
          style={[
            styles.progressBar,
            {
              width: timerProgress.interpolate({
                inputRange: [0, 1],
                outputRange: ['0%', '100%'],
              }),
              backgroundColor: progressColor,
            },
          ]}
        />
      </View>

      {/* Question */}
      <View style={styles.questionContainer}>
        <Text style={[styles.questionText, { color: colors.text }]}>
          {currentQuestion.question_text}
        </Text>
      </View>

      {/* Answers */}
      <View style={styles.answersContainer}>
        {currentQuestion.all_answers.map((answer, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.answerButton,
              { backgroundColor: ANSWER_COLORS[index] },
              getAnswerStyle(answer),
            ]}
            onPress={() => handleAnswerSelect(answer)}
            disabled={hasAnswered}
            activeOpacity={0.8}
          >
            <View style={styles.answerIconContainer}>
              <Text style={styles.answerIcon}>
                {['A', 'B', 'C', 'D'][index]}
              </Text>
            </View>
            <Text style={styles.answerText} numberOfLines={2}>
              {answer}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Waiting for players indicator */}
      {waitingForPlayers && (
        <View style={styles.waitingOverlay}>
          <View style={[styles.waitingCard, { backgroundColor: colors.background }]}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.waitingText, { color: colors.text }]}>
              Waiting for other players...
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  questionCounter: {
    flex: 1,
  },
  questionCounterText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  timerContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
  },
  progressBarContainer: {
    height: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  progressBar: {
    height: '100%',
  },
  questionContainer: {
    padding: 24,
    paddingTop: 32,
    paddingBottom: 24,
  },
  questionText: {
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 32,
    textAlign: 'center',
  },
  answersContainer: {
    flex: 1,
    padding: 16,
    gap: 12,
  },
  answerButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 16,
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  answerIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  answerIcon: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
  answerText: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  correctAnswer: {
    borderWidth: 4,
    borderColor: '#FFFFFF',
    transform: [{ scale: 1.02 }],
  },
  wrongAnswer: {
    opacity: 0.5,
  },
  fadedAnswer: {
    opacity: 0.6,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '600',
  },
  waitingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  waitingCard: {
    padding: 32,
    borderRadius: 20,
    alignItems: 'center',
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  waitingText: {
    fontSize: 18,
    fontWeight: '600',
  },
});

