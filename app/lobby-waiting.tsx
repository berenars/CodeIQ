import { View, Text, StyleSheet, StatusBar, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { Colors } from '@/constants/Colors';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { router, useLocalSearchParams } from 'expo-router';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getLobbyPlayers, subscribeLobbyChanges, subscribePlayersChanges, startGame } from '@/lib/lobby';
import { Lobby, Player } from '@/types/lobby';
import { supabase } from '@/lib/supabase';
import { SvgAvatar } from '@/components/SvgAvatar';
import { useTheme } from '@/contexts/ThemeContext';

export default function LobbyWaitingScreen() {
  const { currentScheme } = useTheme();
  const colors = Colors[currentScheme];
  const { user } = useAuth();
  const params = useLocalSearchParams<{ lobbyId: string; pin: string; isHost: string }>();

  const [lobby, setLobby] = useState<Lobby | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [isStarting, setIsStarting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasNavigated, setHasNavigated] = useState(false);
  const isMounted = useRef(true);

  const isHost = params.isHost === 'true';

  useEffect(() => {
    isMounted.current = true;
    loadLobbyData();
    
    // Subscribe to lobby changes
    const lobbySubscription = subscribeLobbyChanges(params.lobbyId, (updatedLobby) => {
      if (!isMounted.current) return;
      setLobby(updatedLobby);
      
      // If game has started, navigate to game screen (once only)
      if (updatedLobby.status === 'playing' && !hasNavigated && isMounted.current) {
        setHasNavigated(true);
        router.replace({
          pathname: '/game-play',
          params: {
            lobbyId: params.lobbyId,
            isHost: params.isHost,
          },
        });
      }
    });

    // Subscribe to players changes
    const playersSubscription = subscribePlayersChanges(params.lobbyId, (updatedPlayers) => {
      if (!isMounted.current) return;
      setPlayers(updatedPlayers);
    });

    // Polling as backup - refresh data every second
    const refreshInterval = setInterval(async () => {
      if (!isMounted.current) return;
      
      try {
        // Refresh lobby data
        const { data: lobbyData } = await supabase
          .from('lobbies')
          .select('*')
          .eq('id', params.lobbyId)
          .single();

        if (lobbyData && isMounted.current) {
          setLobby(lobbyData as Lobby);
          
          // If game has started, navigate (once only)
          if (lobbyData.status === 'playing' && !hasNavigated && isMounted.current) {
            setHasNavigated(true);
            clearInterval(refreshInterval);
            lobbySubscription.unsubscribe();
            playersSubscription.unsubscribe();
            
            router.replace({
              pathname: '/game-play',
              params: {
                lobbyId: params.lobbyId,
                isHost: params.isHost,
              },
            });
            return; // Exit early after navigation
          }
        }

        // Refresh players
        if (isMounted.current) {
          const playersData = await getLobbyPlayers(params.lobbyId);
          setPlayers(playersData);
        }
      } catch (error) {
        console.error('Error refreshing lobby data:', error);
      }
    }, 1000); // Refresh every 1 second

    return () => {
      isMounted.current = false;
      lobbySubscription.unsubscribe();
      playersSubscription.unsubscribe();
      clearInterval(refreshInterval);
    };
  }, [params.lobbyId]);

  const loadLobbyData = async () => {
    try {
      // Load lobby
      const { data: lobbyData, error: lobbyError } = await supabase
        .from('lobbies')
        .select('*')
        .eq('id', params.lobbyId)
        .single();

      if (lobbyError) throw lobbyError;
      setLobby(lobbyData as Lobby);

      // Load players
      const playersData = await getLobbyPlayers(params.lobbyId);
      setPlayers(playersData);
    } catch (error) {
      console.error('Error loading lobby:', error);
      Alert.alert('Error', 'Failed to load lobby data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartGame = async () => {
    if (!lobby || isStarting || hasNavigated) return;

    if (players.length < 2) {
      Alert.alert('Need More Players', 'You need at least 2 players to start the game.');
      return;
    }

    // Warn if questions are still generating but allow starting
    if (lobby.status === 'generating') {
      Alert.alert(
        'Questions Still Generating',
        'Questions are still being generated. The game will start as soon as they are ready. Continue?',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Wait for Questions', 
            onPress: () => {
              // Just wait, do nothing
            }
          }
        ]
      );
      return;
    }

    if (lobby.status !== 'ready') {
      Alert.alert('Not Ready', 'The lobby is not ready to start yet.');
      return;
    }

    setIsStarting(true);
    setHasNavigated(true);

    try {
      await startGame(params.lobbyId);
      // Navigation will happen via subscription/polling
    } catch (error) {
      console.error('Error starting game:', error);
      Alert.alert('Error', 'Failed to start game. Please try again.');
      setIsStarting(false);
      setHasNavigated(false);
    }
  };

  const getStatusIcon = () => {
    if (!lobby) return 'hourglass';
    
    switch (lobby.status) {
      case 'generating':
        return 'wand.and.stars';
      case 'ready':
        return 'checkmark.circle.fill';
      case 'waiting':
        return 'hourglass';
      default:
        return 'hourglass';
    }
  };

  const getStatusText = () => {
    if (!lobby) return 'Loading...';
    
    switch (lobby.status) {
      case 'generating':
        return 'Generating questions with AI...';
      case 'ready':
        return isHost ? 'Ready to start!' : 'Waiting for host to start...';
      case 'waiting':
        return 'Preparing lobby...';
      default:
        return 'Loading...';
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.text }]}>Loading lobby...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={currentScheme === 'dark' ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <IconSymbol size={24} name="chevron.left" color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Lobby</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* PIN Display */}
        <View style={[styles.pinCard, { backgroundColor: colors.primary }]}>
          <Text style={styles.pinLabel}>Game PIN</Text>
          <Text style={styles.pinText}>{params.pin}</Text>
          <Text style={styles.pinSubtitle}>Share this PIN with players</Text>
        </View>

        {/* Status */}
        <View style={[styles.statusCard, { backgroundColor: currentScheme === 'dark' ? '#2A2A2A' : '#F5F5F5' }]}>
          <View style={styles.statusContent}>
            <IconSymbol 
              size={20} 
              name={getStatusIcon() as any} 
              color={lobby?.status === 'ready' ? colors.primary : colors.textSecondary} 
            />
            <Text style={[styles.statusText, { color: colors.text }]}>{getStatusText()}</Text>
          </View>
          {lobby?.status === 'generating' && (
            <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: 8 }} />
          )}
        </View>

        {/* Players Section */}
        <View style={styles.playersSection}>
          <View style={styles.playersSectionHeader}>
            <IconSymbol size={20} name="person.3.fill" color={colors.text} />
            <Text style={[styles.playersSectionTitle, { color: colors.text }]}>
              Players ({players.length})
            </Text>
          </View>

          <View style={styles.playersGrid}>
            {players.map((player) => (
              <View
                key={player.id}
                style={styles.playerCard}
              >
                <View style={styles.playerAvatarContainer}>
                  <SvgAvatar svgString={player.avatar} size={64} />
                  {player.user_id === lobby?.host_id && (
                    <View style={[styles.hostBadge, { backgroundColor: colors.primary }]}>
                      <Text style={styles.hostBadgeText}>Host</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.playerName, { color: colors.text }]} numberOfLines={1}>
                  {player.username}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Game Info */}
        {lobby && (
          <View style={[styles.infoCard, { backgroundColor: currentScheme === 'dark' ? '#2A2A2A' : '#F5F5F5' }]}>
            <View style={styles.infoRow}>
              <IconSymbol size={16} name="timer" color={colors.textSecondary} />
              <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                {lobby.time_limit}s per question
              </Text>
            </View>
            <View style={styles.infoRow}>
              <IconSymbol size={16} name="number.square.fill" color={colors.textSecondary} />
              <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                {lobby.num_questions} questions
              </Text>
            </View>
            <View style={styles.infoRow}>
              <IconSymbol size={16} name="flame.fill" color={colors.textSecondary} />
              <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                {lobby.difficulty.replace('_', ' ')} difficulty
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Start Button (Host Only) */}
      {isHost && (
        <View style={[styles.buttonContainer, { backgroundColor: colors.background }]}>
        <TouchableOpacity
          style={[
            styles.startButton,
            { backgroundColor: colors.primary },
            (isStarting || lobby?.status === 'waiting' || players.length < 2) && styles.startButtonDisabled,
          ]}
          onPress={handleStartGame}
          disabled={isStarting || lobby?.status === 'waiting' || players.length < 2}
          activeOpacity={0.8}
        >
            {isStarting ? (
              <View style={styles.loadingButtonContainer}>
                <ActivityIndicator color="#FFFFFF" size="small" />
                <Text style={styles.startButtonText}>Starting...</Text>
              </View>
            ) : (
              <Text style={styles.startButtonText}>Start Game</Text>
            )}
          </TouchableOpacity>
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
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 120,
  },
  pinCard: {
    padding: 24,
    borderRadius: 20,
    alignItems: 'center',
    marginBottom: 20,
  },
  pinLabel: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    opacity: 0.8,
    marginBottom: 8,
  },
  pinText: {
    color: '#FFFFFF',
    fontSize: 56,
    fontWeight: '700',
    letterSpacing: 8,
  },
  pinSubtitle: {
    color: '#FFFFFF',
    fontSize: 13,
    opacity: 0.7,
    marginTop: 4,
  },
  statusCard: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 24,
  },
  statusContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
  },
  playersSection: {
    marginBottom: 24,
  },
  playersSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  playersSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  playersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  playerCard: {
    width: '48%',
    padding: 12,
    borderRadius: 16,
    alignItems: 'center',
    gap: 8,
  },
  playerAvatarContainer: {
    position: 'relative',
    width: 64,
    height: 64,
  },
  playerName: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  hostBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  hostBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
  },
  infoCard: {
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    fontSize: 14,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    paddingBottom: 40,
  },
  startButton: {
    paddingVertical: 18,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startButtonDisabled: {
    opacity: 0.5,
  },
  startButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '600',
  },
  loadingButtonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
});

