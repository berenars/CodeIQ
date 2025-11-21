# Update Edge Function for New Topics & Improved Prompts

## Changes Made:

### 1. ✅ Updated Topics in App
The 4 topics have been changed to:
- **Computer Science** (was: Core CS & Theory)
- **Machine Learning** (was: ML)
- **Computer Engineering** (was: Systems & Networking)
- **Cybersecurity** (was: Algorithms)

### 2. ⚠️ Update Your Supabase Edge Function

## 📋 Complete Updated Code

Copy and paste this FULL code into your Supabase Edge Function:

**File: `supabase/functions/generate-questions/index.ts`**

```typescript
// supabase/functions/generate-questions/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }

  try {
    const { mode, lobbyId, topicId, topics, difficulty, numQuestions, level, sessionId } = await req.json();

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabase = createClient(supabaseUrl, supabaseKey);

    // DeepSeek API configuration
    const deepseekApiKey = Deno.env.get('DEEPSEEK_API_KEY');

    // Map difficulty levels
    const difficultyMap = {
      'mild': 'easy - average user should get a few right',
      'spicy': 'moderate - for people familiar with the field',
      'extra_spicy': 'hard and advanced - expert level'
    };

    // Add randomness to prevent duplicate questions
    const timestamp = Date.now();
    const randomSeed = Math.floor(Math.random() * 10000);
    const uniqueSession = sessionId || `${timestamp}-${randomSeed}`;
    const varietyPrompts = [
      'Mix theory and practical applications.',
      'Include modern tools and recent developments.',
      'Cover different subtopics within the field.',
      'Balance fundamentals with advanced concepts.',
      'Focus on real-world problem-solving.'
    ];
    const randomVariety = varietyPrompts[Math.floor(Math.random() * varietyPrompts.length)];

    // Create prompt for DeepSeek (optimized for speed and variety)
    const prompt = `Generate ${numQuestions} COMPLETELY UNIQUE quiz questions. Topics: ${topics.join(', ')}. Difficulty: ${difficultyMap[difficulty]}.

IMPORTANT: Generate DIFFERENT questions from any previous requests. Session: ${uniqueSession}

RULES:
- Keep questions concise (under 100 characters)
- Avoid basic "What does X stand for?" questions
- ${randomVariety}
- Each needs 1 correct + 3 plausible wrong answers
- Vary question styles and avoid repetition
- Generate fresh, unique questions every time

Format (JSON only, no extra text):
[{"question":"text","correct_answer":"answer","wrong_answers":["a","b","c"]}]`;

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
            content: 'You are a tech quiz generator. Generate COMPLETELY UNIQUE questions every time, never repeat questions from previous sessions. Respond with valid JSON only, no markdown. Keep questions concise and high-quality.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 1.0,
        max_tokens: 2500
      })
    });

    if (!response.ok) {
      throw new Error(`DeepSeek API error: ${response.statusText}`);
    }

    const data = await response.json();
    let questionsText = data.choices[0].message.content.trim();

    // Remove markdown code blocks if present
    questionsText = questionsText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    const questions = JSON.parse(questionsText);

    // Mode-specific handling
    if (mode === 'offline') {
      // Offline mode: just return questions without saving to database
      return new Response(JSON.stringify({
        success: true,
        questions: questions,
        questionsCount: questions.length
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    } else {
      // Online mode: save to database for multiplayer lobby
      const questionsToInsert = questions.map((q, index) => ({
        lobby_id: lobbyId,
        question_index: index,
        question_text: q.question,
        correct_answer: q.correct_answer,
        wrong_answers: q.wrong_answers
      }));

      const { error: insertError } = await supabase.from('questions').insert(questionsToInsert);

      if (insertError) {
        throw new Error(`Failed to insert questions: ${insertError.message}`);
      }

      // Update lobby status to 'ready'
      await supabase.from('lobbies').update({
        status: 'ready'
      }).eq('id', lobbyId);

      return new Response(JSON.stringify({
        success: true,
        questionsCount: questions.length
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 400,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});
```

## 🚀 Deployment Steps:

1. **Go to Supabase Dashboard** → Edge Functions → `generate-questions`
2. **Replace ALL the code** with the code above
3. **Click "Deploy"** or **Save**
4. **Verify** the deployment was successful

## What These Changes Do:

### Dual Mode Support:
- **Online Mode**: Generates questions for multiplayer lobbies and saves to database ✅
- **Offline Mode**: Generates questions for single-player practice and returns them directly ✅

### Improved Difficulty Levels:
- **Mild**: Easy questions that average users can get a few right ✅
- **Spicy**: Moderate difficulty for people familiar with the field ✅
- **Extra Spicy**: Hard and advanced expert-level questions ✅

### Optimizations:
- ✅ Supports both online (multiplayer) and offline (single-player) modes
- ✅ Keeps questions concise (under 100 characters)
- ✅ Maintains variety to avoid duplicate questions
- ✅ Uses random session IDs and variety prompts
- ✅ Reduced max_tokens from 3000 → 2500 for faster generation
- ✅ More efficient system message
- ✅ Still maintains high-quality, unique questions

### New Topics Are Now:
1. **Computer Science** - Programming languages, algorithms, data structures, software engineering
2. **Machine Learning** - Neural networks, deep learning, AI models, training
3. **Computer Engineering** - Hardware, systems, architecture, embedded systems
4. **Cybersecurity** - Security, encryption, vulnerabilities, network security

---

## Testing After Update:

1. Create a new lobby with different topic combinations
2. Try all 3 difficulty levels
3. Verify questions are:
   - Concise and not too long
   - High quality and varied
   - Appropriate for the difficulty level
   - Not repeating from previous games

---

**Note**: The full Edge Function code is available in `LOBBY_SYSTEM_SETUP.md` if you need to review the complete implementation.

