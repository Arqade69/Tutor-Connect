"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { GoogleGenAI } from "@google/genai";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const FREE_DAILY_LIMIT = 5;
const GEMINI_MODEL = "gemini-3.6-flash";

const STUDENT_SYSTEM_PROMPT = `You are TutorBot, a friendly and encouraging AI study assistant built into the Tutor-Connect platform — an EdTech platform connecting students with tutors in Bangladesh.

## Your Role
- Help students with questions related to SSC, HSC, O-Level, A-Level, and university admission preparation curricula.
- Provide clear, step-by-step explanations of concepts.
- Help solve math, physics, chemistry, biology, English, Bangla, ICT, accounting, economics, and other academic problems.
- Offer study tips, exam strategies, and time-management advice.
- Be patient, warm, and supportive — like a great tutor would be.

## Response Guidelines
- Address ONLY the user's latest question. Do NOT repeat, summarize, re-answer, or combine responses for previous questions from the chat history.
- Use structured formatting: numbered steps, bullet points, and clear headings.
- For math/science problems, show each step of the solution process.
- Keep language simple and accessible for secondary and higher-secondary students.
- When relevant, mention which curriculum (SSC/HSC/O-Level/A-Level) your answer applies to.
- Use Markdown formatting for better readability (bold, headers, code blocks for formulas, etc.).

## When to Recommend a Human Tutor
If a student's question involves any of the following, include EXACTLY this marker on its own line at the END of your response: [SUGGEST_TUTOR]
- Very complex, multi-part problems that require extended back-and-forth discussion
- Topics the student seems to be repeatedly struggling with (based on context)
- Hands-on lab work, practical experiments, or viva preparation
- Personalized study plans for long-term exam preparation
- Emotional support or motivation beyond academic help

When you include [SUGGEST_TUTOR], also add a brief, friendly note explaining that a live tutor on Tutor-Connect could help them dive deeper into this topic.

## Boundaries
- Only answer academic and study-related questions.
- If a student asks something completely off-topic (not related to studying), politely redirect them to focus on their studies.
- Never provide harmful, misleading, or inappropriate content.
- Do not pretend to be a human. You are TutorBot, an AI assistant.`;

const TUTOR_SYSTEM_PROMPT = `You are TutorBot AI, an intelligent AI Teaching Assistant built into the Tutor-Connect platform for tutors and educators in Bangladesh.

## Your Role
- Assist tutors and educators with lesson planning, curriculum breakdown (SSC, HSC, O-Level, A-Level, University Admission), quiz and exam paper generation, homework problem creation with solution keys, and pedagogical strategies.
- Help tutors simplify complex academic concepts for their students.
- Provide teaching methodologies, student engagement techniques, and structured curriculum outlines.
- Be professional, creative, efficient, and academically rigorous — acting as a peer-level teaching assistant for professional tutors.

## Response Guidelines
- Address ONLY the user's latest question or instruction. Do NOT repeat, summarize, re-answer, or combine responses for previous questions from the chat history. Produce ONE focused response for the current question only.
- Use structured formatting: clear headers, bullet points, numbered lists, tables, and code blocks for formulas/code.
- Provide step-by-step solution guides, marking schemes, and explanations tailored for teaching.
- Address the user as an educator/tutor.
- Use Markdown formatting for optimal readability.

## Critical Instructions regarding Recommendations
- DO NOT recommend finding a tutor or suggest "Find a Tutor". The user IS ALREADY A TUTOR. NEVER output the [SUGGEST_TUTOR] tag or suggest hiring a tutor under any circumstances.
- For extremely complex or advanced academic topics, offer deeper pedagogical insights, alternative teaching methods, advanced reference material suggestions, or collaborative problem-solving steps.

## Boundaries
- Focus on academic tutoring, teaching assistance, curriculum development, and educational strategy.
- Maintain professional, supportive, and inspiring communication suitable for educators.
- Do not pretend to be a human. You are TutorBot AI, the teacher's AI assistant.`;

// ---------------------------------------------------------------------------
// Educational Fallback Engine (for offline / when GEMINI_API_KEY is not set)
// ---------------------------------------------------------------------------

function generateEducationalFallback(text: string, role: string): string {
  const query = text.toLowerCase();
  const rawText = text.trim();

  // Helper to extract a topic snippet or subject from the prompt
  const topicMatch = rawText.match(/(?:about|on|for|explain|how to|what is|create|generate|help with)\s+([^?.!]+)/i);
  const topicName = topicMatch ? topicMatch[1].trim() : rawText;

  if (role === "tutor") {
    if (query.includes("lesson plan") || query.includes("newton") || query.includes("physics")) {
      return `### 📋 HSC Physics: Newton's Laws of Motion — 45-Min Lesson Plan

**Target Audience:** HSC Class 11/12 (National Curriculum & English Medium)  
**Topic:** Newton's Laws of Motion & Momentum Conservation  
**Duration:** 45 Minutes

---

#### 1. Learning Objectives (5 Mins)
- State and explain Newton's 1st, 2nd, and 3rd laws of motion in vector notation.
- Apply \`F = dp/dt = ma\` to solve dynamic equilibrium and tension problems.
- Relate impulsive force to real-world collision problems.

#### 2. Concept Hook & Real-Life Demo (8 Mins)
- **Question:** *Why does a cricketer pull their hands back while catching a fast ball?*
- Connect impulse \`J = F · Δt = Δp\` to explain force reduction during extended time.

#### 3. Core Explanation & Board Work (15 Mins)
- **1st Law:** Inertia of rest vs motion, frame of reference (Inertial vs Non-inertial).
- **2nd Law:** \`F_net = m · a\`. Emphasize resolving force components along \`X\` and \`Y\` axes.
- **3rd Law:** Action-Reaction pairs act on *different* bodies (e.g., rocket propulsion, horse-cart problem).

#### 4. Interactive Problem Solving (12 Mins)
- **Sample Board Problem:** A 2 kg body moves with velocity \`v = (3i + 4j) m/s\`. A constant force \`F = (6i - 2j) N\` acts on it for 4s. Find its final velocity and kinetic energy.
- **Solution Steps:**
  1. \`a = F / m = (3i - j) m/s²\`
  2. \`v_f = v_i + a · t = (3i + 4j) + (12i - 4j) = 15i m/s\`
  3. \`|v_f| = 15 m/s\` → \`KE = 1/2 · m · v_f² = 1/2 · 2 · 225 = 225 J\`.

#### 5. Homework & Wrap-Up (5 Mins)
- Assign 3 board exam creative questions (CQ) on elevator apparent weight and connected pulleys.`;
    }

    if (query.includes("quiz") || query.includes("acid") || query.includes("chemistry")) {
      return `### 🧪 SSC Chemistry: Acids & Bases Quiz (With Marking Key)

Here is a 5-question multiple choice & conceptual assessment for your SSC tutoring batch:

1. **Which of the following is a weak organic acid?**
   - A) $H_2SO_4$
   - B) $HNO_3$
   - C) $CH_3COOH$ *(Correct)*
   - D) $HCl$  
   *Explanation:* Acetic acid partially ionizes in aqueous solution, making it a weak acid.

2. **What is the pH of a neutral aqueous solution at 25°C?**
   - A) 0
   - B) 7 *(Correct)*
   - C) 14
   - D) 1  
   *Explanation:* At 25°C, $[H^+] = [OH^-] = 10^{-7} M$, so $pH = -\log(10^{-7}) = 7$.

3. **What gas is liberated when dilute hydrochloric acid reacts with zinc granules?**
   - A) Oxygen (O2)
   - B) Hydrogen (H2) *(Correct)*
   - C) Chlorine (Cl2)
   - D) Carbon Dioxide (CO2)  
   *Explanation:* Zn + 2HCl → ZnCl2 + H2 ↑.

4. **Which indicator turns pink in an alkaline solution?**
   - A) Phenolphthalein *(Correct)*
   - B) Methyl Orange
   - C) Litmus
   - D) Universal Indicator  
   *Explanation:* Phenolphthalein remains colorless in acid and turns magenta/pink in alkali (pH > 8.3).

5. **Antacid tablets contain which base to neutralize stomach acidity?**
   - A) NaOH
   - B) Mg(OH)2 or Al(OH)3 *(Correct)*
   - C) KOH
   - D) CaCO3 only  
   *Explanation:* Mild, non-corrosive insoluble bases like Magnesium Hydroxide (Milk of Magnesia) are safe for consumption.`;
    }

    if (query.includes("engagement") || query.includes("online") || query.includes("technique")) {
      return `### 🎯 5 Interactive Techniques for 1-on-1 Online Tutoring

1. **The "Reverse Teacher" Method:**
   - After explaining a concept, ask the student to teach it back to you using the digital whiteboard. This instantly reveals misconceptions.

2. **Micro-Quizzing (Every 10-15 Mins):**
   - Never lecture for more than 10 minutes uninterrupted. Insert a 1-minute quick diagnostic question or rapid-fire poll.

3. **Interactive Problem Solving on Shared Canvas:**
   - Color code your steps: Tutor writes in blue, student completes the algebra step in green.

4. **Real-Life Bangladeshi Context Hooks:**
   - Relate physics/math examples to Padma Bridge load capacity, cricket trajectories (Mirpur stadium), or solar panels in rural areas.

5. **Positive Reinforcement & Error Analysis:**
   - Celebrate correct reasoning even if arithmetic has a minor error. Maintain an "Error Log" document that the student reviews before exams.`;
    }

    if (query.includes("worksheet") || query.includes("practice") || query.includes("problem")) {
      return `### 📑 Custom Educator Practice Worksheet: ${topicName}

Here is a structured 3-part practice module designed for your students:

#### Part A: Fundamental Concept Check
1. Define the core principles of **${topicName}** and state the relevant formulas or definitions.
2. What are the common misconceptions students face when solving questions on this topic?

#### Part B: Creative Application Questions (CQ)
- **Question 1:** Explain how the principles of **${topicName}** apply in real-world scenarios or standard board exam problems.
- **Question 2:** Work through a multi-step problem, showing clear steps and final unit verification.

#### Part C: Solution & Marking Scheme
- **Step 1:** Award 1 mark for correct identification of given data and formula selection.
- **Step 2:** Award 2 marks for algebraic substitution and correct intermediate calculation.
- **Step 3:** Award 1 mark for the final answer with correct units.`;
    }

    // Dynamic Fallback for any other prompt asked by a Tutor
    return `### 🎓 TutorBot Educator Assistant: Guidance on "${rawText.slice(0, 60)}${rawText.length > 60 ? "..." : ""}"

Here is an educational outline and pedagogical strategy for your request:

#### 1. Core Teaching Approach
- **Conceptual Hook:** Start by asking a diagnostic question about **${topicName}** to assess prior knowledge.
- **Structured Explanation:** Break down complex components into 3 digestible sub-concepts.
- **Visual & Analytical Tools:** Use diagrams, graphs, or step-by-step formulas to reinforce understanding.

#### 2. Curriculum & Exam Alignment
- Ensure alignment with NCTB (SSC/HSC) or Cambridge/Edexcel (O/A Level) syllabus guidelines.
- Emphasize key terms and definitions frequently targeted by exam evaluators.

#### 3. Recommended Student Activity
- Assign a short 5-minute problem solving exercise at the end of your session to evaluate retention.

*Tip: For live AI responses, add a valid Gemini API key (\`AIza...\`) from Google AI Studio in your \`.env\` file.*`;
  }

  // Student Fallbacks
  if (query.includes("newton") || query.includes("law") || query.includes("physics")) {
    return `### 🌌 Newton's Three Laws of Motion (HSC & SSC Physics)

Newton's laws form the foundation of classical mechanics:

#### 1. Newton's First Law (Law of Inertia)
> **Statement:** An object remains at rest or in uniform motion along a straight line unless acted upon by an unbalanced external force.
- **Key Formula:** If \`F_net = 0\`, then \`a = 0\` and \`v = constant\`.
- **Example:** When a moving bus brakes suddenly, passengers jerk forward due to inertia of motion.

#### 2. Newton's Second Law (Law of Force & Momentum)
> **Statement:** The rate of change of momentum of a body is directly proportional to the applied net force and takes place in the direction of the force.
- **Key Formula:** \`F = (dp)/(dt) = m · a\` (when mass is constant)
- **Unit:** Newton (\`N\`), where \`1 N = 1 kg·m/s²\`.

#### 3. Newton's Third Law (Action & Reaction)
> **Statement:** For every action, there is an equal and opposite reaction.
- **Key Formula:** \`F_AB = - F_BA\`
- **Note:** Action and reaction act on **two different objects**, which is why they never cancel each other out!

---
Would you like to practice a numerical problem on Newton's laws or momentum conservation?`;
  }

  if (query.includes("trigonometry") || query.includes("sin") || query.includes("math")) {
    return `### 📐 Basic Trigonometric Ratios (SSC & O-Level Math)

In a right-angled triangle with acute angle **θ**:
- **Hypotenuse (H):** The longest side opposite to the 90° right angle.
- **Perpendicular / Opposite (P):** The side opposite to angle θ.
- **Base / Adjacent (B):** The side adjacent to angle θ.

#### Core Trigonometric Formulas
1. **sin(θ) = Perpendicular / Hypotenuse = P / H**
2. **cos(θ) = Base / Hypotenuse = B / H**
3. **tan(θ) = Perpendicular / Base = P / B = sin(θ) / cos(θ)**

#### Reciprocal Ratios
- **csc(θ) = 1 / sin(θ) = H / P**
- **sec(θ) = 1 / cos(θ) = H / B**
- **cot(θ) = 1 / tan(θ) = B / P**

#### Fundamental Pythagorean Identities
- **sin²(θ) + cos²(θ) = 1**
- **1 + tan²(θ) = sec²(θ)**
- **1 + cot²(θ) = csc²(θ)**`;
  }

  if (query.includes("biology") || query.includes("mitosis") || query.includes("meiosis")) {
    return `### 🧬 Mitosis vs Meiosis (O-Level & HSC Biology)

Here is a quick summary of cell division:

| Feature | Mitosis | Meiosis |
| :--- | :--- | :--- |
| **Location** | Somatic (body) cells | Germ (reproductive) cells |
| **Divisions** | 1 nuclear division | 2 successive divisions |
| **Daughter Cells** | 2 identical diploid (2n) cells | 4 genetically diverse haploid (n) cells |
| **Chromosome Count** | Remains unchanged (2n → 2n) | Halved (2n → n) |
| **Purpose** | Growth, tissue repair, asexual reproduction | Gamete formation (sperm & egg) |
| **Crossing Over** | Does not occur | Occurs during Prophase I |

[SUGGEST_TUTOR]
Need more in-depth practice with diagrams and past paper questions? A specialized Biology tutor can help you master cell biology!`;
  }

  // Dynamic Fallback for any other prompt asked by a Student
  return `### 💡 TutorBot Study Assistant: "${rawText.slice(0, 60)}${rawText.length > 60 ? "..." : ""}"

Here is a breakdown to help you with **${topicName}**:

#### 1. Key Concept Summary
- Break down **${topicName}** into fundamental definitions and underlying logic.
- Pay attention to standard formulas, units, and definitions in your NCTB or Cambridge textbook.

#### 2. Step-by-Step Study Guide
- **Step 1:** Read the core chapter theory and highlight key terminology.
- **Step 2:** Work through solved textbook examples step-by-step.
- **Step 3:** Practice previous year board exam or past paper questions.

[SUGGEST_TUTOR]
If you find this topic challenging or want personalized 1-on-1 guidance, you can connect with a live tutor on Tutor-Connect!`;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getGeminiApiKey(): string {
  const envKey =
    process.env.GEMINI_API_KEY ||
    process.env.GEMINI_APIKEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.GOOGLE_GENAI_API_KEY;

  if (envKey) return envKey.trim();

  try {
    const fs = require("node:fs");
    const path = require("node:path");
    const envPath = path.join(process.cwd(), ".env");
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, "utf-8");
      const match = envContent.match(/(?:GEMINI_API_KEY|GOOGLE_API_KEY|GOOGLE_GENAI_API_KEY)=["']?([^"'\r\n]+)["']?/);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
  } catch {
    // Ignore error
  }

  return "";
}

// Google AI Studio / Gemini API keys typically start with "AIza" or "AQ."
// and contain URL-safe characters with no whitespace.
function isValidGeminiKeyFormat(key: string): boolean {
  const trimmed = key.trim();
  return trimmed.length >= 15 && !/\s/.test(trimmed);
}

function isSameDay(d1: Date, d2: Date): boolean {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

// ---------------------------------------------------------------------------
// Server Actions
// ---------------------------------------------------------------------------

export type TutorBotMessageData = {
  id: string;
  role: string;
  text: string;
  suggestTutor: boolean;
  createdAt: Date;
};

export type SendResult = {
  ok: boolean;
  error?: string;
  reply?: TutorBotMessageData;
  userMsg?: TutorBotMessageData;
  remaining?: number;
  limitReached?: boolean;
};

/**
 * Send a message to TutorBot and get an AI-generated response.
 * Uses Google GenAI with gemini-2.5-flash and provides robust fallback.
 * Enforces free-tier daily usage limits.
 */
export async function sendTutorBotMessage(
  messageText: string
): Promise<SendResult> {
  try {
    const user = await getCurrentUser();
    if (!user) return { ok: false, error: "Please sign in to use TutorBot." };
    if (user.status === "suspended")
      return { ok: false, error: "Your account has been suspended." };
    if (user.role !== "student" && user.role !== "tutor")
      return { ok: false, error: "TutorBot AI is only available for students and tutors." };

    const text = messageText?.trim();
    if (!text) return { ok: false, error: "Message cannot be empty." };
    if (text.length > 2000)
      return { ok: false, error: "Message is too long (max 2000 characters)." };

    // ---- Rate-limit check for free users --------------------------------
    const now = new Date();
    let dailyCount = user.aiDailyCount;
    const lastReset = user.aiLastReset;

    if (!user.isPremium) {
      // Reset counter if it's a new day
      if (!isSameDay(now, lastReset)) {
        await prisma.user.update({
          where: { id: user.id },
          data: { aiDailyCount: 0, aiLastReset: now },
        });
        dailyCount = 0;
      }

      if (dailyCount >= FREE_DAILY_LIMIT) {
        return {
          ok: false,
          limitReached: true,
          remaining: 0,
          error: `You've used all ${FREE_DAILY_LIMIT} free questions for today. Upgrade to Premium for unlimited access!`,
        };
      }
    }

    // ---- Fetch recent conversation history for multi-turn context -------
    const pastMessages = await prisma.tutorBotMessage.findMany({
      where: { userId: user.id, role: { in: ["user", "assistant"] } },
      orderBy: { createdAt: "desc" },
      take: 6,
    });
    pastMessages.reverse();

    // ---- Generate AI Response (Live Gemini or Educational Fallback) -------
    const apiKey = getGeminiApiKey();
    let aiText = "";

    if (!apiKey) {
      console.warn(
        "[TutorBot] No Gemini API key found in env (GEMINI_API_KEY / GEMINI_APIKEY / GOOGLE_API_KEY / GOOGLE_GENAI_API_KEY). Using offline fallback."
      );
    } else if (!isValidGeminiKeyFormat(apiKey)) {
      // A key is present but doesn't match Google AI Studio's format, so a live
      // API call would just fail auth on every request. Skip the network round
      // trip entirely and fail fast with an actionable log instead of a vague
      // error from the SDK.
      console.warn(
        `[TutorBot] GEMINI key is set but doesn't look like a valid Gemini API key ` +
        `(expected a valid non-empty API key string). Got a value starting with "${apiKey.slice(0, 6)}...". ` +
        `Get a key from https://aistudio.google.com/apikey and set it as GEMINI_API_KEY in .env. ` +
        `Using offline fallback for now.`
      );
    } else {
      try {
        const ai = new GoogleGenAI({ apiKey });
        const systemPrompt =
          user.role === "tutor" ? TUTOR_SYSTEM_PROMPT : STUDENT_SYSTEM_PROMPT;

        // Sanitize history turns to strictly alternate user -> model -> user -> model
        const historyContents: { role: string; parts: { text: string }[] }[] = [];
        for (const m of pastMessages) {
          const role = m.role === "assistant" ? "model" : "user";
          const lastRole =
            historyContents.length > 0
              ? historyContents[historyContents.length - 1].role
              : null;
          if (role !== lastRole) {
            historyContents.push({ role, parts: [{ text: m.text }] });
          }
        }
        if (historyContents.length > 0 && historyContents[0].role !== "user") {
          historyContents.shift();
        }
        if (
          historyContents.length > 0 &&
          historyContents[historyContents.length - 1].role !== "model"
        ) {
          historyContents.pop();
        }

        const contents = [
          ...historyContents,
          {
            role: "user",
            parts: [{ text }],
          },
        ];

        const response = await ai.models.generateContent({
          model: GEMINI_MODEL,
          contents,
          config: {
            systemInstruction: systemPrompt,
          },
        });

        aiText = response.text?.trim() ?? "";
      } catch (geminiError: any) {
        console.warn(`[TutorBot] Gemini API call failed for model ${GEMINI_MODEL}:`, geminiError?.message || geminiError);
        const errMsg = String(geminiError?.message || geminiError);
        if (errMsg.includes("429") || errMsg.includes("RESOURCE_EXHAUSTED") || errMsg.includes("Quota exceeded")) {
          return {
            ok: false,
            error: "Gemini 3.6 Flash daily API quota limit reached (20 requests/day free tier limit on Google AI Studio). Please try again later or check your API key quota.",
          };
        }
      }
    }

    if (!aiText) {
      aiText = generateEducationalFallback(text, user.role);
    }

    // ---- Detect tutor suggestion marker ---------------------------------
    const suggestTutor =
      user.role === "tutor" ? false : aiText.includes("[SUGGEST_TUTOR]");
    const cleanedText = aiText.replace(/\[SUGGEST_TUTOR\]/g, "").trim();

    // ---- Persist messages -----------------------------------------------
    const txOps = [
      prisma.tutorBotMessage.create({
        data: { userId: user.id, role: "user", text },
      }),
      prisma.tutorBotMessage.create({
        data: {
          userId: user.id,
          role: "assistant",
          text: cleanedText,
          suggestTutor,
        },
      }),
    ];

    // Increment daily count for free users
    if (!user.isPremium) {
      txOps.push(
        prisma.user.update({
          where: { id: user.id },
          data: { aiDailyCount: dailyCount + 1 },
        }) as any
      );
    }

    const results = await prisma.$transaction(txOps);
    const userMsg = results[0] as any;
    const assistantMsg = results[1] as any;

    const remaining = user.isPremium
      ? Infinity
      : FREE_DAILY_LIMIT - (dailyCount + 1);

    return {
      ok: true,
      userMsg: {
        id: userMsg.id,
        role: userMsg.role,
        text: userMsg.text,
        suggestTutor: userMsg.suggestTutor,
        createdAt: userMsg.createdAt,
      },
      reply: {
        id: assistantMsg.id,
        role: assistantMsg.role,
        text: assistantMsg.text,
        suggestTutor: assistantMsg.suggestTutor,
        createdAt: assistantMsg.createdAt,
      },
      remaining: remaining < 0 ? 0 : remaining,
    };
  } catch (err) {
    console.error("[TutorBot] Error:", err);
    return {
      ok: false,
      error: "Something went wrong. Please try again later.",
    };
  }
}


/**
 * Retrieve chat history for the current user (last 50 messages).
 */
export async function getTutorBotHistory(): Promise<{
  messages: TutorBotMessageData[];
  remaining: number;
  isPremium: boolean;
  dailyLimit: number;
}> {
  const user = await getCurrentUser();
  if (!user || (user.role !== "student" && user.role !== "tutor")) {
    return { messages: [], remaining: 0, isPremium: false, dailyLimit: FREE_DAILY_LIMIT };
  }

  const messages = await prisma.tutorBotMessage.findMany({
    where: {
      userId: user.id,
      role: { in: ["user", "assistant"] }, // Exclude system_interaction_id records
    },
    orderBy: { createdAt: "asc" },
    take: 50,
    select: {
      id: true,
      role: true,
      text: true,
      suggestTutor: true,
      createdAt: true,
    },
  });

  // Calculate remaining daily messages
  const now = new Date();
  let dailyCount = user.aiDailyCount;
  if (!isSameDay(now, user.aiLastReset)) {
    dailyCount = 0;
  }

  const remaining = user.isPremium
    ? Infinity
    : Math.max(0, FREE_DAILY_LIMIT - dailyCount);

  return {
    messages,
    remaining,
    isPremium: user.isPremium,
    dailyLimit: FREE_DAILY_LIMIT,
  };
}

/**
 * Clear all TutorBot chat history for the current user.
 */
export async function clearTutorBotHistory(): Promise<{ ok: boolean; error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Please sign in." };
  if (user.role !== "student" && user.role !== "tutor") {
    return { ok: false, error: "TutorBot AI is only available for students and tutors." };
  }

  await prisma.tutorBotMessage.deleteMany({
    where: { userId: user.id },
  });

  return { ok: true };
}
