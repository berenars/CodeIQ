# 🎮 Kahoot-Style Lobby System Setup Guide

## 📊 Supabase Database Schema

You need to create the following tables in your Supabase dashboard:

### 1. **lobbies** Table

```sql
CREATE TABLE lobbies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pin VARCHAR(5) UNIQUE NOT NULL,
  host_id UUID NOT NULL REFERENCES auth.users(id),
  host_username TEXT NOT NULL,
  host_avatar TEXT NOT NULL,
  topics TEXT[] NOT NULL,
  time_limit INTEGER NOT NULL, -- in seconds
  num_questions INTEGER NOT NULL,
  difficulty TEXT NOT NULL, -- 'mild', 'spicy', 'extra_spicy'
  status TEXT NOT NULL DEFAULT 'waiting', -- 'waiting', 'generating', 'ready', 'playing', 'finished'
  current_question_index INTEGER DEFAULT 0,
  question_started_at TIMESTAMP WITH TIME ZONE, -- Server time when current question started
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  started_at TIMESTAMP WITH TIME ZONE,
  ended_at TIMESTAMP WITH TIME ZONE
);

-- Index for fast PIN lookups
CREATE INDEX idx_lobbies_pin ON lobbies(pin);
CREATE INDEX idx_lobbies_status ON lobbies(status);

-- Enable Row Level Security
ALTER TABLE lobbies ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone authenticated can read lobbies
CREATE POLICY "Anyone can read lobbies"
  ON lobbies FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Only host can insert their lobby
CREATE POLICY "Users can create lobbies"
  ON lobbies FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = host_id);

-- Policy: Only host can update their lobby
CREATE POLICY "Host can update their lobby"
  ON lobbies FOR UPDATE
  TO authenticated
  USING (auth.uid() = host_id);
```

### 2. **questions** Table

```sql
CREATE TABLE questions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lobby_id UUID NOT NULL REFERENCES lobbies(id) ON DELETE CASCADE,
  question_index INTEGER NOT NULL,
  question_text TEXT NOT NULL,
  correct_answer TEXT NOT NULL,
  wrong_answers TEXT[] NOT NULL, -- Array of 3 wrong answers
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(lobby_id, question_index)
);

-- Index for fast lookups
CREATE INDEX idx_questions_lobby ON questions(lobby_id);

-- Enable Row Level Security
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone authenticated can read questions
CREATE POLICY "Anyone can read questions"
  ON questions FOR SELECT
  TO authenticated
  USING (true);

-- Policy: System/host can insert questions
CREATE POLICY "Allow question insertion"
  ON questions FOR INSERT
  TO authenticated
  WITH CHECK (true);
```

### 3. **players** Table

```sql
CREATE TABLE players (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lobby_id UUID NOT NULL REFERENCES lobbies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  username TEXT NOT NULL,
  avatar TEXT NOT NULL,
  total_score INTEGER DEFAULT 0,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(lobby_id, user_id)
);

-- Index for fast lookups
CREATE INDEX idx_players_lobby ON players(lobby_id);
CREATE INDEX idx_players_user ON players(user_id);

-- Enable Row Level Security
ALTER TABLE players ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read players
CREATE POLICY "Anyone can read players"
  ON players FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Users can join lobbies
CREATE POLICY "Users can join lobbies"
  ON players FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policy: System can update scores
CREATE POLICY "Allow score updates"
  ON players FOR UPDATE
  TO authenticated
  USING (true);
```

### 5. **Helper Function for Incrementing Scores**

```sql
-- Function to increment player score atomically
CREATE OR REPLACE FUNCTION increment_player_score(player_id UUID, points_to_add INTEGER)
RETURNS void AS $$
BEGIN
  UPDATE players
  SET total_score = total_score + points_to_add
  WHERE id = player_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 4. **answers** Table

```sql
CREATE TABLE answers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lobby_id UUID NOT NULL REFERENCES lobbies(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  selected_answer TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL,
  time_taken INTEGER NOT NULL, -- milliseconds
  points_earned INTEGER NOT NULL,
  answered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(question_id, player_id)
);

-- Index for fast lookups
CREATE INDEX idx_answers_lobby ON answers(lobby_id);
CREATE INDEX idx_answers_question ON answers(question_id);
CREATE INDEX idx_answers_player ON answers(player_id);

-- Enable Row Level Security
ALTER TABLE answers ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read answers
CREATE POLICY "Anyone can read answers"
  ON answers FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Users can submit their answers
CREATE POLICY "Users can submit answers"
  ON answers FOR INSERT
  TO authenticated
  WITH CHECK (true);
```

---

## 🔧 Supabase Edge Function for DeepSeek AI

### Create Edge Function:

In your Supabase dashboard, go to **Edge Functions** and create a new function called `generate-questions`:

```typescript
// supabase/functions/generate-questions/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { lobbyId, topics, difficulty, numQuestions } = await req.json()

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // DeepSeek API configuration
    const deepseekApiKey = Deno.env.get('DEEPSEEK_API_KEY')!
    
    // Map difficulty levels
    const difficultyMap = {
      'mild': 'easy - average user should get a few right',
      'spicy': 'moderate - for people familiar with the field',
      'extra_spicy': 'hard and advanced - expert level'
    }

    // Add randomness to prevent duplicate questions
    const timestamp = Date.now()
    const randomSeed = Math.floor(Math.random() * 10000)
    const varietyPrompts = [
      'Mix theory and practical applications.',
      'Include modern tools and recent developments.',
      'Cover different subtopics within the field.',
      'Balance fundamentals with advanced concepts.',
      'Focus on real-world problem-solving.'
    ]
    const randomVariety = varietyPrompts[Math.floor(Math.random() * varietyPrompts.length)]

    // Create prompt for DeepSeek (optimized for speed and variety)
    const prompt = `Generate ${numQuestions} unique quiz questions. Topics: ${topics.join(', ')}. Difficulty: ${difficultyMap[difficulty]}.

RULES:
- Keep questions concise (under 100 characters)
- Avoid basic "What does X stand for?" questions
- ${randomVariety}
- Each needs 1 correct + 3 plausible wrong answers
- Vary question styles (ID: ${timestamp}-${randomSeed})

Format (JSON only, no extra text):
[{"question":"text","correct_answer":"answer","wrong_answers":["a","b","c"]}]`

    // Call DeepSeek API
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${deepseekApiKey}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: 'You are a tech quiz generator. Respond with valid JSON only, no markdown. Keep questions concise and high-quality.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.9,
        max_tokens: 2500
      })
    })

    if (!response.ok) {
      throw new Error(`DeepSeek API error: ${response.statusText}`)
    }

    const data = await response.json()
    let questionsText = data.choices[0].message.content.trim()
    
    // Remove markdown code blocks if present
    questionsText = questionsText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    
    const questions = JSON.parse(questionsText)

    // Insert questions into database
    const questionsToInsert = questions.map((q: any, index: number) => ({
      lobby_id: lobbyId,
      question_index: index,
      question_text: q.question,
      correct_answer: q.correct_answer,
      wrong_answers: q.wrong_answers
    }))

    const { error: insertError } = await supabase
      .from('questions')
      .insert(questionsToInsert)

    if (insertError) {
      throw new Error(`Failed to insert questions: ${insertError.message}`)
    }

    // Update lobby status to 'ready'
    await supabase
      .from('lobbies')
      .update({ status: 'ready' })
      .eq('id', lobbyId)

    return new Response(
      JSON.stringify({ success: true, questionsCount: questions.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
```

### Set Environment Variables:

In your Supabase dashboard, go to **Edge Functions > Settings** and add:

```
DEEPSEEK_API_KEY=sk-12ac3ada444b4e97a6a4fa5198c96ca7
```

Get your DeepSeek API key from: https://platform.deepseek.com/

---

## 🎯 Setup Checklist

- [ ] Create all 4 tables (lobbies, questions, players, answers)
- [ ] Run all SQL commands including indexes and RLS policies
- [ ] Create the `generate-questions` Edge Function
- [ ] Add DEEPSEEK_API_KEY to Edge Function environment variables
- [ ] Test Edge Function deployment
- [ ] Verify tables are accessible via RLS policies

---

## 📝 Notes

### Scoring System:
- **Correct answer**: Base points = 1000
- **Speed bonus**: (time_limit - time_taken) / time_limit * 500
- **Maximum points per question**: 1500
- **Wrong answer**: 0 points

### PIN Generation:
- 5-digit random number (10000-99999)
- Unique across all active lobbies
- Easy to type and share

### Game Flow:
1. Host creates lobby → Generates PIN
2. Lobby status: `waiting`
3. Immediately trigger AI question generation → Status: `generating`
4. Questions ready → Status: `ready`
5. Players join via PIN
6. Host starts game → Status: `playing`
7. Display questions one by one
8. Show leaderboard after each question
9. Final podium after last question → Status: `finished`

---

## 🚀 Ready to Build!

After setting up the database and Edge Function, the app will handle:
- Real-time player joining
- Live question display
- Instant score updates
- Animated leaderboards
- Beautiful podium finish

Let's build the frontend now! 🎨

