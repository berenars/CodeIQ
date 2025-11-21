// Lobby system utility functions

import { supabase } from './supabase';
import { Lobby, Player, Question, Answer } from '@/types/lobby';

/**
 * Generate a unique 5-digit PIN for a lobby
 */
export async function generateUniquePIN(): Promise<string> {
  let attempts = 0;
  const maxAttempts = 10;

  while (attempts < maxAttempts) {
    const pin = Math.floor(10000 + Math.random() * 90000).toString();
    
    // Check if PIN already exists
    const { data, error } = await supabase
      .from('lobbies')
      .select('pin')
      .eq('pin', pin)
      .single();

    if (error || !data) {
      // PIN is unique
      return pin;
    }

    attempts++;
  }

  throw new Error('Failed to generate unique PIN after multiple attempts');
}

/**
 * Create a new lobby
 */
export async function createLobby(params: {
  topics: string[];
  timeLimit: number;
  numQuestions: number;
  difficulty: 'mild' | 'spicy' | 'extra_spicy';
  hostId: string;
  hostUsername: string;
  hostAvatar: string;
}): Promise<{ lobby: Lobby; pin: string }> {
  try {
    const pin = await generateUniquePIN();

    const { data: lobby, error } = await supabase
      .from('lobbies')
      .insert({
        pin,
        host_id: params.hostId,
        host_username: params.hostUsername,
        host_avatar: params.hostAvatar,
        topics: params.topics,
        time_limit: params.timeLimit,
        num_questions: params.numQuestions,
        difficulty: params.difficulty,
        status: 'generating',
      })
      .select()
      .single();

    if (error) throw error;

    return { lobby: lobby as Lobby, pin };
  } catch (error) {
    console.error('Error creating lobby:', error);
    throw error;
  }
}

/**
 * Generate questions using DeepSeek AI
 */
export async function generateQuestions(lobbyId: string, topics: string[], difficulty: string, numQuestions: number): Promise<void> {
  try {
    const { data, error } = await supabase.functions.invoke('generate-questions', {
      body: {
        lobbyId,
        topics,
        difficulty,
        numQuestions,
      },
    });

    if (error) throw error;
    if (!data?.success) throw new Error('Question generation failed');
  } catch (error) {
    console.error('Error generating questions:', error);
    // Update lobby status to error
    await supabase
      .from('lobbies')
      .update({ status: 'waiting' })
      .eq('id', lobbyId);
    throw error;
  }
}

/**
 * Join a lobby with PIN
 */
export async function joinLobby(pin: string, userId: string, username: string, avatar: string): Promise<{ lobby: Lobby; player: Player }> {
  try {
    // Find lobby by PIN
    const { data: lobby, error: lobbyError } = await supabase
      .from('lobbies')
      .select('*')
      .eq('pin', pin)
      .single();

    if (lobbyError || !lobby) {
      throw new Error('Lobby not found. Please check the PIN and try again.');
    }

    // Check if lobby is still accepting players
    if (lobby.status === 'playing' || lobby.status === 'finished') {
      throw new Error('This game has already started or finished.');
    }

    // Check if player already joined
    const { data: existingPlayer } = await supabase
      .from('players')
      .select('*')
      .eq('lobby_id', lobby.id)
      .eq('user_id', userId)
      .single();

    if (existingPlayer) {
      return { lobby: lobby as Lobby, player: existingPlayer as Player };
    }

    // Add player to lobby
    const { data: player, error: playerError } = await supabase
      .from('players')
      .insert({
        lobby_id: lobby.id,
        user_id: userId,
        username,
        avatar,
        total_score: 0,
      })
      .select()
      .single();

    if (playerError) throw playerError;

    return { lobby: lobby as Lobby, player: player as Player };
  } catch (error) {
    console.error('Error joining lobby:', error);
    throw error;
  }
}

/**
 * Get all players in a lobby
 */
export async function getLobbyPlayers(lobbyId: string): Promise<Player[]> {
  const { data, error } = await supabase
    .from('players')
    .select('*')
    .eq('lobby_id', lobbyId)
    .order('joined_at', { ascending: true });

  if (error) throw error;
  return data as Player[];
}

/**
 * Get questions for a lobby
 */
export async function getLobbyQuestions(lobbyId: string): Promise<Question[]> {
  const { data, error } = await supabase
    .from('questions')
    .select('*')
    .eq('lobby_id', lobbyId)
    .order('question_index', { ascending: true });

  if (error) throw error;
  return data as Question[];
}

/**
 * Start the game
 */
export async function startGame(lobbyId: string): Promise<void> {
  const { error } = await supabase
    .from('lobbies')
    .update({ 
      status: 'playing',
      started_at: new Date().toISOString(),
      current_question_index: 0,
      question_started_at: new Date().toISOString(), // Set server time for first question
    })
    .eq('id', lobbyId);

  if (error) throw error;
}

/**
 * Submit an answer
 */
export async function submitAnswer(params: {
  lobbyId: string;
  questionId: string;
  playerId: string;
  selectedAnswer: string;
  correctAnswer: string;
  timeTaken: number; // milliseconds
  timeLimit: number; // seconds
}): Promise<{ points: number; isCorrect: boolean }> {
  const isCorrect = params.selectedAnswer === params.correctAnswer;
  
  // Calculate points
  let points = 0;
  if (isCorrect) {
    // Base points: 1000
    // Speed bonus: 0-500 based on how fast they answered
    const timeRatio = Math.max(0, 1 - (params.timeTaken / (params.timeLimit * 1000)));
    const speedBonus = Math.round(timeRatio * 500);
    points = 1000 + speedBonus;
  }

  // Insert answer
  const { error: answerError } = await supabase
    .from('answers')
    .insert({
      lobby_id: params.lobbyId,
      question_id: params.questionId,
      player_id: params.playerId,
      selected_answer: params.selectedAnswer,
      is_correct: isCorrect,
      time_taken: params.timeTaken,
      points_earned: points,
    });

  if (answerError) throw answerError;

  // Update player's total score
  if (points > 0) {
    const { error: updateError } = await supabase.rpc('increment_player_score', {
      player_id: params.playerId,
      points_to_add: points,
    });

    // If RPC doesn't exist, fall back to manual update
    if (updateError) {
      const { data: player } = await supabase
        .from('players')
        .select('total_score')
        .eq('id', params.playerId)
        .single();

      if (player) {
        await supabase
          .from('players')
          .update({ total_score: player.total_score + points })
          .eq('id', params.playerId);
      }
    }
  }

  return { points, isCorrect };
}

/**
 * Move to next question
 */
export async function nextQuestion(lobbyId: string, currentIndex: number): Promise<void> {
  const { error } = await supabase
    .from('lobbies')
    .update({ 
      current_question_index: currentIndex + 1,
      question_started_at: new Date().toISOString(), // Set server time for new question
    })
    .eq('id', lobbyId);

  if (error) throw error;
}

/**
 * End the game
 */
export async function endGame(lobbyId: string): Promise<void> {
  const { error } = await supabase
    .from('lobbies')
    .update({ 
      status: 'finished',
      ended_at: new Date().toISOString(),
    })
    .eq('id', lobbyId);

  if (error) throw error;
}

/**
 * Get leaderboard (sorted by score)
 */
export async function getLeaderboard(lobbyId: string): Promise<Player[]> {
  const { data, error } = await supabase
    .from('players')
    .select('*')
    .eq('lobby_id', lobbyId)
    .order('total_score', { ascending: false })
    .order('joined_at', { ascending: true }); // Tiebreaker: who joined first

  if (error) throw error;
  return data as Player[];
}

/**
 * Subscribe to lobby changes
 */
export function subscribeLobbyChanges(lobbyId: string, callback: (lobby: Lobby) => void) {
  return supabase
    .channel(`lobby:${lobbyId}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'lobbies',
      filter: `id=eq.${lobbyId}`,
    }, (payload) => {
      callback(payload.new as Lobby);
    })
    .subscribe();
}

/**
 * Subscribe to players changes
 */
export function subscribePlayersChanges(lobbyId: string, callback: (players: Player[]) => void) {
  return supabase
    .channel(`players:${lobbyId}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'players',
      filter: `lobby_id=eq.${lobbyId}`,
    }, async () => {
      // Fetch updated players list
      const players = await getLobbyPlayers(lobbyId);
      callback(players);
    })
    .subscribe();
}

