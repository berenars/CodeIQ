// Types for the Kahoot-style lobby system

export interface Lobby {
  id: string;
  pin: string;
  host_id: string;
  host_username: string;
  host_avatar: string;
  topics: string[];
  time_limit: number; // in seconds
  num_questions: number;
  difficulty: 'mild' | 'spicy' | 'extra_spicy';
  status: 'waiting' | 'generating' | 'ready' | 'playing' | 'finished';
  current_question_index: number;
  question_started_at?: string; // Server timestamp when current question started
  created_at: string;
  started_at?: string;
  ended_at?: string;
}

export interface Question {
  id: string;
  lobby_id: string;
  question_index: number;
  question_text: string;
  correct_answer: string;
  wrong_answers: string[]; // Array of 3 wrong answers
  created_at: string;
}

export interface Player {
  id: string;
  lobby_id: string;
  user_id: string;
  username: string;
  avatar: string;
  total_score: number;
  joined_at: string;
}

export interface Answer {
  id: string;
  lobby_id: string;
  question_id: string;
  player_id: string;
  selected_answer: string;
  is_correct: boolean;
  time_taken: number; // milliseconds
  points_earned: number;
  answered_at: string;
}

export interface QuestionWithAnswers extends Question {
  all_answers: string[]; // Shuffled array of all 4 answers
}

export interface PlayerScore extends Player {
  rank?: number;
  last_answer_points?: number;
}

