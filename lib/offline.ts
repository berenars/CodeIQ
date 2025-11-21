import { supabase } from './supabase';
import type { UserProgress, OfflineSession, Achievement, UserAchievement, OfflineQuestion, TopicId, CategoryId } from '@/types/offline';

// Topic prompts for question generation
const TOPIC_PROMPTS: Record<string, string> = {
  cs_algorithms: 'Data structures, algorithms, Big O notation, sorting algorithms, searching algorithms, recursion, dynamic programming, graph algorithms',
  cs_theory: 'Operating systems, databases, compilers, computer architecture theory, DBMS concepts, ACID properties, virtual memory, process scheduling',
  cs_programming: 'Code snippet interpretation, debugging problems, syntax questions, programming logic, output prediction, error identification',
  cs_trivia: 'Computer science history, famous computer scientists, programming language origins, computing milestones, tech company founders',
  
  ml_core: 'Machine learning fundamentals, overfitting, underfitting, training concepts, gradient descent, supervised vs unsupervised learning, model evaluation',
  ml_algorithms: 'Specific ML algorithms (neural networks, decision trees, SVM, random forests), mathematical foundations, activation functions, optimization',
  ml_applied: 'Real-world ML applications, model selection for specific tasks, transfer learning, computer vision, NLP applications',
  ml_history: 'AI and ML history, deep learning frameworks (TensorFlow, PyTorch), pioneers in AI, breakthrough papers and models',
  
  ce_logic: 'Boolean algebra, logic gates, digital circuits, circuit design, Karnaugh maps, combinational and sequential circuits',
  ce_architecture: 'CPU architecture, memory hierarchy, cache, buses, pipelining, ALU, instruction sets, von Neumann architecture',
  ce_embedded: 'Microcontrollers, sensors, communication protocols (I2C, SPI, UART), interrupts, real-time systems, IoT concepts',
  ce_hardware: 'Hardware history, microprocessor evolution, chip manufacturers, famous hardware innovations, semiconductor technology',
  
  sec_network: 'Network security, TCP/IP, firewalls, encryption basics, TLS/SSL, network protocols, ports, VPNs',
  sec_hacking: 'Attack types, penetration testing, SQL injection, XSS, CSRF, man-in-the-middle attacks, social engineering',
  sec_crypto: 'Encryption algorithms, hashing, symmetric vs asymmetric encryption, AES, RSA, digital signatures, PKI',
  sec_awareness: 'Real-world security events, famous hackers, security breaches, cybersecurity best practices, compliance standards',
};

/**
 * Get user progress for a specific topic
 */
export async function getUserProgress(topicId: string): Promise<UserProgress | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('user_progress')
    .select('*')
    .eq('user_id', user.id)
    .eq('topic_id', topicId)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching user progress:', error);
    return null;
  }

  return data;
}

/**
 * Get all user progress
 */
export async function getAllUserProgress(): Promise<UserProgress[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('user_progress')
    .select('*')
    .eq('user_id', user.id)
    .order('last_played_at', { ascending: false });

  if (error) {
    console.error('Error fetching all user progress:', error);
    return [];
  }

  return data || [];
}

/**
 * Initialize or get user progress for a topic
 */
export async function initializeProgress(topicId: string, category: string): Promise<UserProgress> {
  const existing = await getUserProgress(topicId);
  if (existing) return existing;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('user_progress')
    .insert({
      user_id: user.id,
      topic_id: topicId,
      category,
      current_level: 1,
      questions_completed: 0,
      total_correct: 0,
      total_incorrect: 0,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update user progress after completing a level
 */
export async function updateProgress(
  topicId: string,
  correctAnswers: number,
  totalQuestions: number
): Promise<UserProgress> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const progress = await getUserProgress(topicId);
  if (!progress) throw new Error('Progress not found');

  const incorrectAnswers = totalQuestions - correctAnswers;
  const newLevel = progress.current_level + 1;

  const { data, error } = await supabase
    .from('user_progress')
    .update({
      current_level: newLevel,
      questions_completed: progress.questions_completed + totalQuestions,
      total_correct: progress.total_correct + correctAnswers,
      total_incorrect: progress.total_incorrect + incorrectAnswers,
      last_played_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', progress.id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Create a new offline session
 */
export async function createOfflineSession(
  topicId: string,
  category: string,
  level: number
): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('offline_sessions')
    .insert({
      user_id: user.id,
      topic_id: topicId,
      category,
      level,
      questions_answered: 0,
      correct_answers: 0,
      score: 0,
    })
    .select()
    .single();

  if (error) throw error;
  return data.id;
}

/**
 * Complete an offline session
 */
export async function completeOfflineSession(
  sessionId: string,
  correctAnswers: number,
  totalQuestions: number,
  score: number
): Promise<void> {
  const { error } = await supabase
    .from('offline_sessions')
    .update({
      questions_answered: totalQuestions,
      correct_answers: correctAnswers,
      completed_at: new Date().toISOString(),
      score,
    })
    .eq('id', sessionId);

  if (error) throw error;
}

/**
 * Generate questions for offline mode using Edge Function
 */
export async function generateOfflineQuestions(
  topicId: string,
  category: string,
  level: number
): Promise<OfflineQuestion[]> {
  const topicPrompt = TOPIC_PROMPTS[topicId] || 'General computer science topics';
  
  // Difficulty increases with level
  let difficulty = 'mild';
  if (level >= 10 && level < 25) difficulty = 'spicy';
  else if (level >= 25) difficulty = 'extra_spicy';

  // Add unique identifier to ensure different questions each time
  const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(7)}`;

  const { data, error } = await supabase.functions.invoke('generate-questions', {
    body: {
      mode: 'offline',
      topicId,
      topics: [topicPrompt],
      difficulty,
      numQuestions: 8,
      level,
      sessionId: uniqueId, // Add unique session ID
    },
  });

  if (error) throw error;
  if (!data || !data.questions) throw new Error('Failed to generate questions');

  // Transform the questions to match our interface
  return data.questions.map((q: any) => ({
    question_text: q.question,
    correct_answer: q.correct_answer,
    wrong_answers: q.wrong_answers,
  }));
}

/**
 * Get all achievements
 */
export async function getAllAchievements(): Promise<Achievement[]> {
  const { data, error } = await supabase
    .from('achievements')
    .select('*')
    .order('points', { ascending: true });

  if (error) {
    console.error('Error fetching achievements:', error);
    return [];
  }

  return data || [];
}

/**
 * Get user's earned achievements
 */
export async function getUserAchievements(): Promise<UserAchievement[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('user_achievements')
    .select(`
      *,
      achievement:achievements(*)
    `)
    .eq('user_id', user.id)
    .order('earned_at', { ascending: false });

  if (error) {
    console.error('Error fetching user achievements:', error);
    return [];
  }

  return data || [];
}

/**
 * Check and award achievements based on progress
 */
export async function checkAndAwardAchievements(
  topicId: string,
  category: string,
  level: number,
  correctAnswers: number,
  totalQuestions: number
): Promise<Achievement[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const newAchievements: Achievement[] = [];

  // Get all achievements and user's earned achievements
  const [allAchievements, userAchievements] = await Promise.all([
    getAllAchievements(),
    getUserAchievements(),
  ]);

  const earnedIds = new Set(userAchievements.map(ua => ua.achievement_id));
  const progress = await getUserProgress(topicId);
  const allProgress = await getAllUserProgress();

  // Check perfect score
  const isPerfectScore = correctAnswers === totalQuestions;

  for (const achievement of allAchievements) {
    // Skip if already earned
    if (earnedIds.has(achievement.id)) continue;

    let shouldAward = false;

    switch (achievement.requirement_type) {
      case 'level':
        if (achievement.requirement_topic === 'any') {
          // Check if reached level in any topic
          const maxLevel = Math.max(...allProgress.map(p => p.current_level), level);
          shouldAward = maxLevel >= achievement.requirement_value;
        } else if (achievement.category === category || achievement.requirement_topic === topicId) {
          shouldAward = level >= achievement.requirement_value;
        }
        break;

      case 'questions':
        const totalQuestionsAnswered = allProgress.reduce((sum, p) => sum + p.questions_completed, 0);
        shouldAward = totalQuestionsAnswered >= achievement.requirement_value;
        break;

      case 'perfect_score':
        // For now, we'll just check if this level was perfect
        // In a real implementation, you'd track perfect score count
        if (isPerfectScore) {
          shouldAward = true; // Simplified for first perfect score
        }
        break;
    }

    if (shouldAward) {
      // Award the achievement
      const { error } = await supabase
        .from('user_achievements')
        .insert({
          user_id: user.id,
          achievement_id: achievement.id,
        });

      if (!error) {
        newAchievements.push(achievement);
      }
    }
  }

  return newAchievements;
}

/**
 * Get featured achievement for profile display
 */
export async function getFeaturedAchievement(): Promise<UserAchievement | null> {
  const userAchievements = await getUserAchievements();
  if (userAchievements.length === 0) return null;

  // Return highest tier achievement
  const tierOrder = { platinum: 4, gold: 3, silver: 2, bronze: 1 };
  userAchievements.sort((a, b) => {
    const tierA = tierOrder[a.achievement?.tier || 'bronze'] || 0;
    const tierB = tierOrder[b.achievement?.tier || 'bronze'] || 0;
    return tierB - tierA;
  });

  return userAchievements[0];
}

/**
 * Subscribe to user progress changes
 */
export function subscribeToProgress(userId: string, callback: (progress: UserProgress) => void) {
  return supabase
    .channel('user_progress_changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'user_progress',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        callback(payload.new as UserProgress);
      }
    )
    .subscribe();
}

/**
 * Subscribe to user achievement changes
 */
export function subscribeToAchievements(userId: string, callback: (achievement: UserAchievement) => void) {
  return supabase
    .channel('user_achievements_changes')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'user_achievements',
        filter: `user_id=eq.${userId}`,
      },
      async (payload) => {
        // Fetch full achievement data
        const { data } = await supabase
          .from('user_achievements')
          .select(`
            *,
            achievement:achievements(*)
          `)
          .eq('id', payload.new.id)
          .single();
        
        if (data) callback(data as UserAchievement);
      }
    )
    .subscribe();
}

