import { View, Text, StyleSheet, StatusBar, TouchableOpacity, Animated, Dimensions } from 'react-native';
import { Colors } from '@/constants/Colors';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { router, useLocalSearchParams } from 'expo-router';
import { useState, useEffect, useRef } from 'react';
import { getLeaderboard } from '@/lib/lobby';
import { Player } from '@/types/lobby';
import { SvgAvatar } from '@/components/SvgAvatar';
import { useTheme } from '@/contexts/ThemeContext';

const { width } = Dimensions.get('window');
const PODIUM_WIDTH = (width - 80) / 3;

export default function GamePodiumScreen() {
  const { currentScheme } = useTheme();
  const colors = Colors[currentScheme];
  const params = useLocalSearchParams<{ lobbyId: string }>();

  const [players, setPlayers] = useState<Player[]>([]);
  const isMounted = useRef(true);
  const hasStartedAnimations = useRef(false);
  const confettiAnimationsRef = useRef<any[]>([]);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const podiumAnims = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;

  // Generate random confetti properties with individual animation values
  const confettiPieces = useRef(
    [...Array(40)].map((_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 1500,
      duration: 2500 + Math.random() * 2000,
      rotation: Math.random() * 360,
      rotationEnd: Math.random() * 720 - 360,
      swingDistance: (Math.random() - 0.5) * 100,
      width: 6 + Math.random() * 8,
      height: 10 + Math.random() * 8,
      color: ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#C0C0C0', '#FF1493', '#00CED1'][i % 8],
      anim: new Animated.Value(0),
    }))
  ).current;

  useEffect(() => {
    isMounted.current = true;
    loadLeaderboard();
    
    // Refresh leaderboard periodically for real-time score updates
    // Removed to prevent podium from disappearing
    // const refreshInterval = setInterval(() => {
    //   if (!isMounted.current) return;
    //   loadLeaderboard();
    // }, 2000);

    return () => {
      isMounted.current = false;
      // Stop all confetti animations
      confettiAnimationsRef.current.forEach(anim => {
        if (anim && anim.stop) anim.stop();
      });
      confettiAnimationsRef.current = [];
      // clearInterval(refreshInterval);
    };
  }, []);

  useEffect(() => {
    if (players.length > 0 && !hasStartedAnimations.current) {
      hasStartedAnimations.current = true;
      startAnimations();
    }
  }, [players]);

  const loadLeaderboard = async () => {
    if (!isMounted.current) return;
    
    try {
      const playersData = await getLeaderboard(params.lobbyId);
      if (isMounted.current) {
        setPlayers(playersData);
      }
    } catch (error) {
      console.error('Error loading leaderboard:', error);
    }
  };

  const startAnimations = () => {
    // Fade in
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();

    // Animate each confetti piece independently with delays - INFINITE LOOP
    confettiPieces.forEach((piece, index) => {
      const animateConfetti = () => {
        if (!isMounted.current) return;
        
        const animation = Animated.sequence([
          Animated.delay(piece.delay),
          Animated.timing(piece.anim, {
            toValue: 1,
            duration: piece.duration,
            useNativeDriver: true,
          }),
        ]);
        
        confettiAnimationsRef.current[index] = animation;
        
        animation.start(({ finished }) => {
          if (finished && isMounted.current) {
            // Reset and repeat infinitely
            piece.anim.setValue(0);
            // Small delay before next loop
            setTimeout(() => {
              if (isMounted.current) {
                animateConfetti();
              }
            }, 100);
          }
        });
      };
      animateConfetti();
    });

    // Animate podiums (2nd, 1st, 3rd order for dramatic effect)
    Animated.stagger(300, [
      // 2nd place (left)
      Animated.spring(podiumAnims[1], {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      // 1st place (center)
      Animated.spring(podiumAnims[0], {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      // 3rd place (right)
      Animated.spring(podiumAnims[2], {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const getPodiumHeight = (rank: number) => {
    switch (rank) {
      case 1: return 180;
      case 2: return 140;
      case 3: return 100;
      default: return 80;
    }
  };

  const getPodiumColor = (rank: number) => {
    switch (rank) {
      case 1: return '#FFD700'; // Gold
      case 2: return '#C0C0C0'; // Silver
      case 3: return '#CD7F32'; // Bronze
      default: return colors.primary;
    }
  };

  const topThree = players.slice(0, 3);
  const restOfPlayers = players.slice(3);

  // Arrange podiums: 2nd, 1st, 3rd
  const podiumOrder = [topThree[1], topThree[0], topThree[2]].filter(Boolean);
  const podiumRanks = [2, 1, 3];

  return (
    <Animated.View style={[styles.container, { backgroundColor: colors.background, opacity: fadeAnim }]}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <IconSymbol size={48} name="trophy.fill" color="#FFFFFF" />
        <Text style={styles.headerTitle}>Game Over!</Text>
        <Text style={styles.headerSubtitle}>Final Results</Text>
      </View>

      {/* Confetti overlay */}
      <View style={styles.confettiContainer} pointerEvents="none">
        {confettiPieces.map((piece) => (
          <Animated.View
            key={piece.id}
            style={[
              styles.confetti,
              {
                left: `${piece.left}%`,
                width: piece.width,
                height: piece.height,
                backgroundColor: piece.color,
                borderRadius: 2,
                transform: [
                  {
                    translateY: piece.anim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-50, 700],
                    }),
                  },
                  {
                    translateX: piece.anim.interpolate({
                      inputRange: [0, 0.5, 1],
                      outputRange: [0, piece.swingDistance, piece.swingDistance * 0.5],
                    }),
                  },
                  {
                    rotate: piece.anim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [`${piece.rotation}deg`, `${piece.rotationEnd}deg`],
                    }),
                  },
                ],
                opacity: piece.anim.interpolate({
                  inputRange: [0, 0.1, 0.9, 1],
                  outputRange: [0, 1, 1, 0],
                }),
              },
            ]}
          />
        ))}
      </View>

      {/* Podium */}
      <View style={styles.podiumContainer}>
        <View style={styles.podiumRow}>
          {podiumOrder.map((player, index) => {
            if (!player) return null;
            
            const rank = podiumRanks[index];
            const podiumHeight = getPodiumHeight(rank);
            const podiumColor = getPodiumColor(rank);

            return (
              <Animated.View
                key={player.id}
                style={[
                  styles.podiumWrapper,
                  {
                    transform: [{
                      translateY: podiumAnims[index].interpolate({
                        inputRange: [0, 1],
                        outputRange: [300, 0],
                      }),
                    }],
                    opacity: podiumAnims[index],
                  },
                ]}
              >
                {/* Avatar */}
                <View style={[
                  styles.winnerAvatar, 
                  rank === 1 && styles.winnerAvatarFirst,
                  { borderColor: podiumColor }
                ]}>
                  <SvgAvatar svgString={player.avatar} size={rank === 1 ? 80 : 64} />
                  {rank === 1 && (
                    <View style={[styles.crownBadge, { backgroundColor: getPodiumColor(rank) }]}>
                      <IconSymbol size={16} name="crown.fill" color="#FFFFFF" />
                    </View>
                  )}
                </View>

                {/* Name */}
                <Text style={[styles.winnerName, { color: colors.text }]} numberOfLines={1}>
                  {player.username}
                </Text>

                {/* Score */}
                <View style={[styles.scoreBadge, { backgroundColor: podiumColor }]}>
                  <IconSymbol size={14} name="star.fill" color="#FFFFFF" />
                  <Text style={styles.scoreText}>{player.total_score}</Text>
                </View>

                {/* Podium */}
                <View
                  style={[
                    styles.podium,
                    {
                      height: podiumHeight,
                      backgroundColor: podiumColor,
                    },
                  ]}
                >
                  <View style={styles.podiumIconContainer}>
                    <IconSymbol 
                      size={rank === 1 ? 32 : 24} 
                      name={rank === 1 ? 'trophy.fill' : rank === 2 ? 'star.fill' : 'star.fill'} 
                      color="#FFFFFF" 
                    />
                  </View>
                  <Text style={styles.podiumNumber}>{rank}</Text>
                </View>
              </Animated.View>
            );
          })}
        </View>
      </View>

      {/* Rest of players */}
      {restOfPlayers.length > 0 && (
        <View style={[styles.restContainer, { backgroundColor: currentScheme === 'dark' ? '#1A1A1A' : '#F8F8F8' }]}>
          <Text style={[styles.restTitle, { color: colors.text }]}>Other Players</Text>
          <View style={styles.restList}>
            {restOfPlayers.map((player, index) => (
              <View
                key={player.id}
                style={[styles.restPlayerRow, { backgroundColor: currentScheme === 'dark' ? '#2A2A2A' : '#FFFFFF' }]}
              >
                <Text style={[styles.restRank, { color: colors.textSecondary }]}>
                  {index + 4}
                </Text>
                <View style={styles.restAvatar}>
                  <SvgAvatar svgString={player.avatar} size={32} />
                </View>
                <Text style={[styles.restName, { color: colors.text }]} numberOfLines={1}>
                  {player.username}
                </Text>
                <Text style={[styles.restScore, { color: colors.textSecondary }]}>
                  {player.total_score} pts
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Back Button */}
      <View style={[styles.buttonContainer, { backgroundColor: colors.background }]}>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: colors.primary }]}
          onPress={() => router.replace('/(tabs)')}
          activeOpacity={0.8}
        >
          <IconSymbol size={20} name="house.fill" color="#FFFFFF" />
          <Text style={styles.backButtonText}>Back to Home</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 24,
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '700',
  },
  headerSubtitle: {
    color: '#FFFFFF',
    fontSize: 16,
    opacity: 0.9,
  },
  confettiContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '100%',
  },
  confetti: {
    position: 'absolute',
    top: 0,
  },
  podiumContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  podiumRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    gap: 10,
  },
  podiumWrapper: {
    alignItems: 'center',
    flex: 1,
  },
  winnerAvatar: {
    width: 64,
    height: 64,
    marginBottom: 8,
    position: 'relative',
    borderWidth: 3,
    borderRadius: 12,
    overflow: 'hidden',
  },
  winnerAvatarFirst: {
    width: 80,
    height: 80,
    borderWidth: 4,
  },
  crownBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  winnerName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
    textAlign: 'center',
    width: '100%',
  },
  scoreBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 12,
  },
  scoreText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  podium: {
    width: '100%',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    gap: 8,
  },
  podiumIconContainer: {
    marginBottom: 4,
  },
  podiumNumber: {
    color: '#FFFFFF',
    fontSize: 48,
    fontWeight: '700',
  },
  restContainer: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginTop: 20,
  },
  restTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  restList: {
    gap: 8,
  },
  restPlayerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    gap: 12,
  },
  restRank: {
    fontSize: 16,
    fontWeight: '600',
    width: 24,
  },
  restAvatar: {
    width: 32,
    height: 32,
  },
  restName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  restScore: {
    fontSize: 14,
    fontWeight: '600',
  },
  buttonContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 16,
    borderRadius: 50,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

