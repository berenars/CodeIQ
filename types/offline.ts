// Types for offline quiz mode

export interface UserProgress {
  id: string;
  user_id: string;
  topic_id: string;
  category: string;
  current_level: number;
  questions_completed: number;
  total_correct: number;
  total_incorrect: number;
  last_played_at: string;
  created_at: string;
  updated_at: string;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string | null;
  requirement_type: 'level' | 'questions' | 'streak' | 'perfect_score';
  requirement_value: number;
  requirement_topic: string | null;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  points: number;
  created_at: string;
}

export interface UserAchievement {
  id: string;
  user_id: string;
  achievement_id: string;
  earned_at: string;
  achievement?: Achievement; // Joined data
}

export interface OfflineSession {
  id: string;
  user_id: string;
  topic_id: string;
  category: string;
  level: number;
  questions_answered: number;
  correct_answers: number;
  started_at: string;
  completed_at: string | null;
  score: number;
}

export interface OfflineQuestion {
  question_text: string;
  correct_answer: string;
  wrong_answers: string[];
}

export interface TopicInfo {
  id: string;
  title: string;
  icon: string;
  color: string;
  description: string;
  category: string;
}

export interface OfflineGameState {
  sessionId: string;
  topicId: string;
  category: string;
  level: number;
  questions: OfflineQuestion[];
  currentQuestionIndex: number;
  score: number;
  correctAnswers: number;
  answers: boolean[]; // true = correct, false = incorrect
}

// Topic IDs mapping
export const TOPIC_IDS = {
  // Computer Science
  cs_algorithms: 'cs_algorithms',
  cs_theory: 'cs_theory',
  cs_programming: 'cs_programming',
  cs_trivia: 'cs_trivia',
  
  // Machine Learning
  ml_core: 'ml_core',
  ml_algorithms: 'ml_algorithms',
  ml_applied: 'ml_applied',
  ml_history: 'ml_history',
  
  // Computer Engineering
  ce_logic: 'ce_logic',
  ce_architecture: 'ce_architecture',
  ce_embedded: 'ce_embedded',
  ce_hardware: 'ce_hardware',
  
  // Cybersecurity
  sec_network: 'sec_network',
  sec_hacking: 'sec_hacking',
  sec_crypto: 'sec_crypto',
  sec_awareness: 'sec_awareness',
} as const;

export type TopicId = typeof TOPIC_IDS[keyof typeof TOPIC_IDS];

// Category IDs
export const CATEGORY_IDS = {
  computer_science: 'computer_science',
  machine_learning: 'machine_learning',
  computer_engineering: 'computer_engineering',
  cybersecurity: 'cybersecurity',
} as const;

export type CategoryId = typeof CATEGORY_IDS[keyof typeof CATEGORY_IDS];


