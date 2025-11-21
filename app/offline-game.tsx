import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Animated } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { useTheme } from '@/contexts/ThemeContext';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { 
  initializeProgress, 
  createOfflineSession, 
  generateOfflineQuestions,
  type OfflineQuestion 
} from '@/lib/offline';

export default function OfflineGameScreen() {
  const { topicId, category, topicTitle, topicColor } = useLocalSearchParams<{
    topicId: string;
    category: string;
    topicTitle: string;
    topicColor: string;
  }>();

  const { currentScheme } = useTheme();
  const colors = Colors[currentScheme];

  const [isLoading, setIsLoading] = useState(true);
  const [questions, setQuestions] = useState<OfflineQuestion[]>([]);
  const [currentLevel, setCurrentLevel] = useState(1);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [sessionId, setSessionId] = useState<string>('');
  const [score, setScore] = useState(0);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(15);
  const [answers, setAnswers] = useState<{ correct: boolean; answer: string }[]>([]);

  const isMounted = useRef(true);
  const hasNavigated = useRef(false);
  const animRef = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    isMounted.current = true;
    startGame();

    return () => {
      isMounted.current = false;
    };
  }, []);

  // Timer effect
  useEffect(() => {
    if (!isLoading && !isAnswerSubmitted && timeLeft > 0) {
      const timer = setTimeout(() => {
        if (isMounted.current) {
          setTimeLeft(timeLeft - 1);
        }
      }, 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && !isAnswerSubmitted) {
      handleTimeUp();
    }
  }, [timeLeft, isLoading, isAnswerSubmitted]);

  // Question transition animation
  useEffect(() => {
    if (!isLoading) {
      Animated.timing(animRef, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [currentQuestionIndex, isLoading]);

  const startGame = async () => {
    try {
      setIsLoading(true);

      // Initialize or get user progress
      const progress = await initializeProgress(topicId, category);
      setCurrentLevel(progress.current_level);

      // Create session
      const newSessionId = await createOfflineSession(topicId, category, progress.current_level);
      setSessionId(newSessionId);

      // Generate questions
      const generatedQuestions = await generateOfflineQuestions(
        topicId,
        category,
        progress.current_level
      );
      
      if (isMounted.current) {
        setQuestions(generatedQuestions);
        setIsLoading(false);
        // Trigger animation for first question
        setTimeout(() => {
          Animated.timing(animRef, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }).start();
        }, 100);
      }
    } catch (error) {
      console.error('Error starting offline game:', error);
      if (isMounted.current) {
        setIsLoading(false);
      }
      // TODO: Show error message
    }
  };

  const handleTimeUp = () => {
    if (!isAnswerSubmitted) {
      setIsAnswerSubmitted(true);
      setAnswers([...answers, { correct: false, answer: 'timeout' }]);
      
      setTimeout(() => {
        moveToNext();
      }, 800);
    }
  };

  const handleAnswerSelect = (answer: string) => {
    if (isAnswerSubmitted) return;

    setSelectedAnswer(answer);
    setIsAnswerSubmitted(true);

    const currentQuestion = questions[currentQuestionIndex];
    const isCorrect = answer === currentQuestion.correct_answer;

    if (isCorrect) {
      const points = Math.max(100 + (timeLeft * 10), 100);
      setScore(score + points);
      setCorrectAnswers(correctAnswers + 1);
      setAnswers([...answers, { correct: true, answer }]);
    } else {
      setAnswers([...answers, { correct: false, answer }]);
    }

    setTimeout(() => {
      moveToNext();
    }, 800);
  };

  const moveToNext = () => {
    if (hasNavigated.current || !isMounted.current) return;

    if (currentQuestionIndex < questions.length - 1) {
      // Next question
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setSelectedAnswer(null);
      setIsAnswerSubmitted(false);
      setTimeLeft(15);
      animRef.setValue(0);
    } else {
      // Game complete
      hasNavigated.current = true;
      router.replace({
        pathname: '/offline-results',
        params: {
          sessionId,
          topicId,
          category,
          topicTitle,
          topicColor,
          level: currentLevel.toString(),
          score: score.toString(),
          correctAnswers: correctAnswers.toString(),
          totalQuestions: questions.length.toString(),
        },
      });
    }
  };

  const getAnswerColor = (answer: string) => {
    if (!isAnswerSubmitted) {
      return selectedAnswer === answer ? topicColor : colors.inputBackground;
    }

    const currentQuestion = questions[currentQuestionIndex];
    if (answer === currentQuestion.correct_answer) {
      return '#10B981'; // Green for correct
    } else if (selectedAnswer === answer) {
      return '#EF4444'; // Red for wrong selection
    }
    return colors.inputBackground;
  };

  const getAnswerBorderColor = (answer: string) => {
    if (!isAnswerSubmitted) {
      return selectedAnswer === answer ? topicColor : colors.inputBorder;
    }

    const currentQuestion = questions[currentQuestionIndex];
    if (answer === currentQuestion.correct_answer) {
      return '#10B981';
    } else if (selectedAnswer === answer) {
      return '#EF4444';
    }
    return colors.inputBorder;
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={topicColor} />
          <Text style={[styles.loadingText, { color: colors.text }]}>
            Generating Level {currentLevel} Questions...
          </Text>
          <Text style={[styles.loadingSubtext, { color: colors.textSecondary }]}>
            {topicTitle}
          </Text>
        </View>
      </View>
    );
  }

  if (questions.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.errorContainer}>
          <IconSymbol size={64} name="exclamationmark.triangle.fill" color={colors.textSecondary} />
          <Text style={[styles.errorText, { color: colors.text }]}>
            Failed to load questions
          </Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: topicColor }]}
            onPress={startGame}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const allAnswers = [currentQuestion.correct_answer, ...currentQuestion.wrong_answers].sort();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card }]}>
        <View style={styles.headerTop}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              if (!hasNavigated.current) {
                hasNavigated.current = true;
                router.back();
              }
            }}
          >
            <IconSymbol size={24} name="chevron.left" color={colors.text} />
          </TouchableOpacity>
          <View style={styles.levelBadge}>
            <IconSymbol size={16} name="flag.fill" color={topicColor} />
            <Text style={[styles.levelText, { color: colors.text }]}>Level {currentLevel}</Text>
          </View>
          <View style={styles.scoreContainer}>
            <IconSymbol size={16} name="star.fill" color="#FFD700" />
            <Text style={[styles.scoreText, { color: colors.text }]}>{score}</Text>
          </View>
        </View>

        <View style={styles.progressBarContainer}>
          <View style={[styles.progressBar, { backgroundColor: colors.inputBackground }]}>
            <View
              style={[
                styles.progressFill,
                {
                  backgroundColor: topicColor,
                  width: `${((currentQuestionIndex + 1) / questions.length) * 100}%`,
                },
              ]}
            />
          </View>
          <Text style={[styles.progressText, { color: colors.textSecondary }]}>
            {currentQuestionIndex + 1}/{questions.length}
          </Text>
        </View>
      </View>

      {/* Timer */}
      <View style={styles.timerContainer}>
        <View
          style={[
            styles.timer,
            {
              backgroundColor: timeLeft <= 5 ? '#EF4444' : topicColor,
            },
          ]}
        >
          <IconSymbol size={20} name="clock.fill" color="#FFFFFF" />
          <Text style={styles.timerText}>{timeLeft}s</Text>
        </View>
      </View>

      {/* Question */}
      <Animated.View
        style={[
          styles.questionContainer,
          {
            opacity: animRef,
            transform: [
              {
                translateY: animRef.interpolate({
                  inputRange: [0, 1],
                  outputRange: [20, 0],
                }),
              },
            ],
          },
        ]}
      >
        <Text style={[styles.questionText, { color: colors.text }]}>
          {currentQuestion.question_text}
        </Text>
      </Animated.View>

      {/* Answers */}
      <View style={styles.answersContainer}>
        {allAnswers.map((answer, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.answerButton,
              {
                backgroundColor: getAnswerColor(answer),
                borderColor: getAnswerBorderColor(answer),
              },
            ]}
            onPress={() => handleAnswerSelect(answer)}
            disabled={isAnswerSubmitted}
          >
            <View style={styles.answerContent}>
              <View style={[styles.answerLetter, { borderColor: colors.inputBorder }]}>
                <Text style={[styles.answerLetterText, { color: colors.text }]}>
                  {String.fromCharCode(65 + index)}
                </Text>
              </View>
              <Text
                style={[
                  styles.answerText,
                  {
                    color: isAnswerSubmitted && (answer === currentQuestion.correct_answer || selectedAnswer === answer)
                      ? '#FFFFFF'
                      : colors.text,
                  },
                ]}
              >
                {answer}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
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
    gap: 16,
  },
  loadingText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  loadingSubtext: {
    fontSize: 14,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 32,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  levelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  levelText: {
    fontSize: 16,
    fontWeight: '700',
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  scoreText: {
    fontSize: 18,
    fontWeight: '700',
  },
  progressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  progressBar: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
    minWidth: 45,
  },
  timerContainer: {
    alignItems: 'center',
    marginTop: 24,
  },
  timer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  timerText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  questionContainer: {
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 24,
  },
  questionText: {
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 32,
    textAlign: 'center',
  },
  answersContainer: {
    flex: 1,
    paddingHorizontal: 20,
    gap: 12,
  },
  answerButton: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 2,
  },
  answerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  answerLetter: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  answerLetterText: {
    fontSize: 16,
    fontWeight: '700',
  },
  answerText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
  },
});

