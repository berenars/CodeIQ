# Offline Mode Backend Setup

This document outlines the complete backend setup for the offline quiz mode with progress tracking and achievements system.

## Database Schema

### 1. **user_progress** Table
Tracks user progress for each topic across all categories.

```sql
CREATE TABLE user_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic_id TEXT NOT NULL,
  category TEXT NOT NULL,
  current_level INTEGER DEFAULT 1,
  questions_completed INTEGER DEFAULT 0,
  total_correct INTEGER DEFAULT 0,
  total_incorrect INTEGER DEFAULT 0,
  last_played_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, topic_id)
);

-- Create index for faster lookups
CREATE INDEX idx_user_progress_user_id ON user_progress(user_id);
CREATE INDEX idx_user_progress_topic_id ON user_progress(topic_id);

-- Enable RLS
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own progress"
  ON user_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own progress"
  ON user_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own progress"
  ON user_progress FOR UPDATE
  USING (auth.uid() = user_id);
```

### 2. **achievements** Table
Defines all available achievements in the system.

```sql
CREATE TABLE achievements (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  category TEXT,
  requirement_type TEXT NOT NULL, -- 'level', 'questions', 'streak', 'perfect_score'
  requirement_value INTEGER NOT NULL,
  requirement_topic TEXT, -- specific topic or 'any' for global achievements
  tier TEXT NOT NULL DEFAULT 'bronze', -- 'bronze', 'silver', 'gold', 'platinum'
  points INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;

-- Everyone can read achievements
CREATE POLICY "Anyone can view achievements"
  ON achievements FOR SELECT
  TO authenticated
  USING (true);

-- Insert default achievements
INSERT INTO achievements (id, name, description, icon, category, requirement_type, requirement_value, requirement_topic, tier, points) VALUES
  -- Level-based achievements
  ('first_steps', 'First Steps', 'Complete level 1 in any topic', 'flag.fill', NULL, 'level', 1, 'any', 'bronze', 10),
  ('getting_started', 'Getting Started', 'Reach level 5 in any topic', 'star.fill', NULL, 'level', 5, 'any', 'bronze', 25),
  ('dedicated_learner', 'Dedicated Learner', 'Reach level 10 in any topic', 'star.circle.fill', NULL, 'level', 10, 'any', 'silver', 50),
  ('knowledge_seeker', 'Knowledge Seeker', 'Reach level 25 in any topic', 'sparkles', NULL, 'level', 25, 'any', 'gold', 100),
  ('master_scholar', 'Master Scholar', 'Reach level 50 in any topic', 'crown.fill', NULL, 'level', 50, 'any', 'platinum', 250),
  
  -- Question-based achievements
  ('curious_mind', 'Curious Mind', 'Answer 100 questions', 'lightbulb.fill', NULL, 'questions', 100, 'any', 'bronze', 20),
  ('question_crusher', 'Question Crusher', 'Answer 500 questions', 'bolt.fill', NULL, 'questions', 500, 'any', 'silver', 75),
  ('trivia_titan', 'Trivia Titan', 'Answer 1000 questions', 'flame.fill', NULL, 'questions', 1000, 'any', 'gold', 150),
  
  -- Category-specific achievements
  ('cs_enthusiast', 'CS Enthusiast', 'Reach level 10 in Computer Science', 'cpu.fill', 'computer_science', 'level', 10, 'any', 'silver', 50),
  ('ml_explorer', 'ML Explorer', 'Reach level 10 in Machine Learning', 'brain.head.profile', 'machine_learning', 'level', 10, 'any', 'silver', 50),
  ('hardware_guru', 'Hardware Guru', 'Reach level 10 in Computer Engineering', 'gear.badge', 'computer_engineering', 'level', 10, 'any', 'silver', 50),
  ('security_expert', 'Security Expert', 'Reach level 10 in Cybersecurity', 'lock.shield.fill', 'cybersecurity', 'level', 10, 'any', 'silver', 50),
  
  -- Perfect score achievements
  ('perfectionist', 'Perfectionist', 'Get 8/8 correct in any level', 'checkmark.seal.fill', NULL, 'perfect_score', 1, 'any', 'bronze', 30),
  ('flawless_master', 'Flawless Master', 'Get perfect scores 10 times', 'rosette', NULL, 'perfect_score', 10, 'any', 'gold', 100);
```

### 3. **user_achievements** Table
Tracks which achievements each user has earned.

```sql
CREATE TABLE user_achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id TEXT NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
  earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, achievement_id)
);

-- Create index for faster lookups
CREATE INDEX idx_user_achievements_user_id ON user_achievements(user_id);

-- Enable RLS
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own achievements"
  ON user_achievements FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own achievements"
  ON user_achievements FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

### 4. **offline_sessions** Table
Tracks individual offline quiz sessions for analytics.

```sql
CREATE TABLE offline_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic_id TEXT NOT NULL,
  category TEXT NOT NULL,
  level INTEGER NOT NULL,
  questions_answered INTEGER DEFAULT 0,
  correct_answers INTEGER DEFAULT 0,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  score INTEGER DEFAULT 0
);

-- Create index
CREATE INDEX idx_offline_sessions_user_id ON offline_sessions(user_id);

-- Enable RLS
ALTER TABLE offline_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own sessions"
  ON offline_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sessions"
  ON offline_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions"
  ON offline_sessions FOR UPDATE
  USING (auth.uid() = user_id);
```

## Topic IDs

The system uses the following topic IDs:

### Computer Science
- `cs_algorithms` - Levels 1-50
- `cs_theory` - Levels 1-50
- `cs_programming` - Levels 1-50
- `cs_trivia` - Levels 1-50

### Machine Learning
- `ml_core` - Levels 1-50
- `ml_algorithms` - Levels 1-50
- `ml_applied` - Levels 1-50
- `ml_history` - Levels 1-50

### Computer Engineering
- `ce_logic` - Levels 1-50
- `ce_architecture` - Levels 1-50
- `ce_embedded` - Levels 1-50
- `ce_hardware` - Levels 1-50

### Cybersecurity
- `sec_network` - Levels 1-50
- `sec_hacking` - Levels 1-50
- `sec_crypto` - Levels 1-50
- `sec_awareness` - Levels 1-50

## Edge Function Update

The existing `generate-questions` Edge Function will be updated to support offline mode with topic-specific prompts.

### Topic-Specific Prompts

Each topic will have specialized prompts to ensure questions match the topic description:

- **cs_algorithms**: Data structures, algorithms, Big O notation, sorting, searching
- **cs_theory**: Operating systems, databases, compilers, computer theory
- **cs_programming**: Code interpretation, debugging, syntax questions
- **cs_trivia**: CS history, famous computer scientists, milestones
- **ml_core**: ML fundamentals, overfitting, training concepts
- **ml_algorithms**: Specific ML algorithms and mathematical foundations
- **ml_applied**: Real-world ML applications, model selection
- **ml_history**: AI/ML history, frameworks, pioneers
- **ce_logic**: Boolean algebra, logic gates, circuits
- **ce_architecture**: CPU architecture, memory, buses
- **ce_embedded**: Microcontrollers, sensors, protocols
- **ce_hardware**: Hardware history, chip manufacturers
- **sec_network**: Network security, ports, protocols
- **sec_hacking**: Attack types, penetration testing
- **sec_crypto**: Encryption, hashing, cryptographic concepts
- **sec_awareness**: Security events, famous hackers, best practices

## Real-time Subscriptions

Enable Realtime on all tables:
- `user_progress`
- `user_achievements`
- `offline_sessions`

Users should subscribe to changes in their own data for instant updates across devices.

## Summary

This setup provides:
1. **Progress Tracking**: Users' level and stats for each of 16 topics
2. **Achievements System**: 14+ achievements with different tiers
3. **Session History**: Complete history of all offline quiz sessions
4. **Real-time Sync**: All data syncs instantly across devices
5. **Scalability**: Can easily add more achievements and topics

