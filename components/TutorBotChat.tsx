"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  sendTutorBotMessage,
  clearTutorBotHistory,
  type TutorBotMessageData,
} from "@/actions/tutorbot";
import { RobotIcon, SendIcon, SparklesIcon, SearchIcon } from "@/components/icons";

const FREE_DAILY_LIMIT = 5;
const GEMINI_MODEL = "gemini-3.6-flash";

const STUDENT_QUICK_PROMPTS = [
  { label: "🧪 HSC Physics — Newton's Laws", text: "Explain Newton's 3 laws of motion with examples for HSC Physics." },
  { label: "📐 SSC Math — Trigonometry", text: "Explain the basic trigonometric ratios (sin, cos, tan) with a right triangle diagram for SSC Math." },
  { label: "🧬 O-Level Biology — Cell Division", text: "Explain the differences between mitosis and meiosis for O-Level Biology." },
  { label: "📝 Admission Prep Tips", text: "Give me a study strategy for university admission exams in Bangladesh." },
  { label: "📖 A-Level Chemistry — Organic", text: "Explain the naming conventions for organic compounds in A-Level Chemistry." },
  { label: "💡 Study Tips", text: "Give me 5 effective study techniques for exam preparation." },
];

const TUTOR_QUICK_PROMPTS = [
  { label: "📝 HSC Physics Lesson Plan", text: "Draft a detailed 45-minute lesson plan for HSC Physics on Newton's Laws of Motion with learning objectives and discussion points." },
  { label: "🧪 SSC Chemistry Quiz Generator", text: "Generate 5 multiple-choice questions on SSC Chemistry (Acids & Bases) with an answer key and step-by-step explanations." },
  { label: "📐 Math Concept Simplification", text: "How can I explain complex calculus differentiation step-by-step to a student struggling with basic algebra?" },
  { label: "📑 Practice Worksheet with Keys", text: "Create 3 challenging word problems on Trigonometry for SSC Math along with full step-by-step solutions for tutoring." },
  { label: "🎯 Online Class Engagement Tips", text: "What are 5 effective interactive techniques to keep students engaged during 1-on-1 online tutoring sessions?" },
  { label: "📚 Admission Test Prep Outline", text: "Outline an 8-week revision schedule and strategy for university admission test candidates in Bangladesh." },
];

// ---------------------------------------------------------------------------
// Markdown-lite renderer (bold, code, headers, bullet points)
// ---------------------------------------------------------------------------

function renderMarkdown(text: string) {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];

  lines.forEach((line, i) => {
    let content: React.ReactNode = line;

    // Headings
    if (line.startsWith("### ")) {
      elements.push(
        <h4 key={i} className="mt-3 mb-1 text-sm font-bold text-slate-800">
          {line.slice(4)}
        </h4>
      );
      return;
    }
    if (line.startsWith("## ")) {
      elements.push(
        <h3 key={i} className="mt-3 mb-1 text-base font-bold text-slate-800">
          {line.slice(3)}
        </h3>
      );
      return;
    }
    if (line.startsWith("# ")) {
      elements.push(
        <h2 key={i} className="mt-3 mb-1 text-lg font-bold text-slate-900">
          {line.slice(2)}
        </h2>
      );
      return;
    }

    // Code blocks (inline)
    content = processInlineFormatting(line);

    // Bullet points
    if (line.match(/^[\s]*[-*]\s/)) {
      elements.push(
        <li key={i} className="ml-4 list-disc text-sm leading-relaxed">
          {content}
        </li>
      );
      return;
    }

    // Numbered list
    if (line.match(/^[\s]*\d+\.\s/)) {
      elements.push(
        <li key={i} className="ml-4 list-decimal text-sm leading-relaxed">
          {content}
        </li>
      );
      return;
    }

    // Empty lines
    if (line.trim() === "") {
      elements.push(<br key={i} />);
      return;
    }

    // Normal paragraph
    elements.push(
      <p key={i} className="text-sm leading-relaxed">
        {content}
      </p>
    );
  });

  return <div className="space-y-0.5">{elements}</div>;
}

function processInlineFormatting(text: string): React.ReactNode {
  // Process bold (**text**) and inline code (`code`)
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    // Check for bold
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
    // Check for inline code
    const codeMatch = remaining.match(/`([^`]+)`/);

    // Find the earliest match
    let earliest: { type: "bold" | "code"; index: number; match: RegExpMatchArray } | null = null;
    if (boldMatch && boldMatch.index !== undefined) {
      earliest = { type: "bold", index: boldMatch.index, match: boldMatch };
    }
    if (codeMatch && codeMatch.index !== undefined) {
      if (!earliest || codeMatch.index < earliest.index) {
        earliest = { type: "code", index: codeMatch.index, match: codeMatch };
      }
    }

    if (!earliest) {
      parts.push(remaining);
      break;
    }

    // Add text before the match
    if (earliest.index > 0) {
      parts.push(remaining.slice(0, earliest.index));
    }

    if (earliest.type === "bold") {
      parts.push(
        <strong key={key++} className="font-semibold">
          {earliest.match[1]}
        </strong>
      );
      remaining = remaining.slice(earliest.index + earliest.match[0].length);
    } else {
      parts.push(
        <code
          key={key++}
          className="rounded bg-slate-200/60 px-1.5 py-0.5 font-mono text-xs text-brand-700"
        >
          {earliest.match[1]}
        </code>
      );
      remaining = remaining.slice(earliest.index + earliest.match[0].length);
    }
  }

  return parts.length === 1 ? parts[0] : <>{parts}</>;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TutorBotChat({
  initialMessages,
  initialRemaining,
  isPremium,
  dailyLimit,
  userRole = "student",
}: {
  initialMessages: TutorBotMessageData[];
  initialRemaining: number;
  isPremium: boolean;
  dailyLimit: number;
  userRole?: "student" | "tutor";
}) {
  const [messages, setMessages] = useState<TutorBotMessageData[]>(initialMessages);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [remaining, setRemaining] = useState(initialRemaining);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const isTutor = userRole === "tutor";
  const quickPrompts = isTutor ? TUTOR_QUICK_PROMPTS : STUDENT_QUICK_PROMPTS;

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 120)}px`;
    }
  }, [input]);

  async function handleSend(text?: string) {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;

    setError(null);
    setInput("");
    setLoading(true);

    // Optimistic user message
    const tempUserMsg: TutorBotMessageData = {
      id: `temp-${Date.now()}`,
      role: "user",
      text: msg,
      suggestTutor: false,
      createdAt: new Date(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    try {
      const result = await sendTutorBotMessage(msg);

      if (!result.ok) {
        // Remove optimistic message on error
        setMessages((prev) => prev.filter((m) => m.id !== tempUserMsg.id));
        setError(result.error ?? "Something went wrong.");
        if (result.limitReached) {
          setRemaining(0);
        }
        return;
      }

      // Replace optimistic with real + add assistant reply
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== tempUserMsg.id),
        result.userMsg!,
        result.reply!,
      ]);
      if (result.remaining !== undefined) {
        setRemaining(result.remaining);
      }
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== tempUserMsg.id));
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  async function handleClear() {
    if (!confirm("Clear all TutorBot chat history?")) return;
    await clearTutorBotHistory();
    setMessages([]);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  const limitReached = !isPremium && remaining <= 0;

  return (
    <div className="flex h-[calc(100vh-10rem)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div
        className={`relative flex items-center justify-between border-b border-slate-100 px-5 py-4 ${
          isTutor
            ? "bg-gradient-to-r from-teal-800 via-emerald-700 to-indigo-800"
            : "bg-gradient-to-r from-brand-600 via-brand-500 to-indigo-500"
        }`}
      >
        {/* Animated background dots */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute -left-6 bottom-0 h-20 w-20 rounded-full bg-white/5 blur-xl" />
        </div>

        <div className="relative flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
            <RobotIcon className="h-6 w-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-white">
                {isTutor ? "TutorBot AI — Teaching Assistant" : "TutorBot AI"}
              </h1>
              {isTutor && (
                <span className="hidden sm:inline-flex items-center gap-1 rounded-full border border-emerald-300/30 bg-emerald-400/20 px-2.5 py-0.5 text-xs font-semibold text-emerald-100 backdrop-blur-sm">
                  🎓 Educator Studio
                </span>
              )}
            </div>
            <p className="text-xs text-white/70">
              {isTutor
                ? "AI Teaching, Lesson Planning & Exam Prep Assistant"
                : "Your 24/7 study assistant"}
            </p>
          </div>
        </div>

        <div className="relative flex items-center gap-3">
          {/* Usage badge */}
          {isPremium ? (
            <span className="flex items-center gap-1.5 rounded-full bg-amber-400/20 px-3 py-1.5 text-xs font-semibold text-amber-100 backdrop-blur-sm">
              <SparklesIcon className="h-3.5 w-3.5" />
              Premium — Unlimited
            </span>
          ) : (
            <span
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold backdrop-blur-sm ${
                remaining <= 1
                  ? "bg-red-400/20 text-red-100"
                  : "bg-white/15 text-white/90"
              }`}
            >
              {remaining} / {dailyLimit} questions today
            </span>
          )}

          {/* Clear button */}
          {messages.length > 0 && (
            <button
              onClick={handleClear}
              className="rounded-lg bg-white/10 p-2 text-white/80 transition hover:bg-white/20 hover:text-white"
              title="Clear chat history"
            >
              <svg
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* ── Messages Area ──────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto bg-gradient-to-b from-slate-50 to-white px-4 py-5">
        {messages.length === 0 && !loading ? (
          /* ── Empty State ──────────────────────────────────────── */
          <div className="flex h-full flex-col items-center justify-center px-4">
            <div
              className={`mb-6 flex h-20 w-20 items-center justify-center rounded-2xl shadow-inner ${
                isTutor
                  ? "bg-gradient-to-br from-teal-100 to-emerald-100 text-teal-700"
                  : "bg-gradient-to-br from-brand-100 to-indigo-100 text-brand-600"
              }`}
            >
              <RobotIcon className="h-10 w-10" />
            </div>
            <h2 className="mb-2 text-xl font-bold text-slate-800">
              {isTutor
                ? "Welcome, Educator! I'm TutorBot AI 🎓"
                : "Hi there! I'm TutorBot 👋"}
            </h2>
            <p className="mb-8 max-w-md text-center text-sm text-slate-500">
              {isTutor
                ? "Your dedicated AI Teaching Assistant. Generate lesson plans, design quizzes & practice papers, simplify complex concepts for students, or get teaching strategies."
                : "Ask me anything about SSC, HSC, O-Level, A-Level, or Admission prep. I'll guide you step-by-step!"}
            </p>

            {/* Quick-start chips */}
            <div className="grid w-full max-w-xl grid-cols-1 gap-2 sm:grid-cols-2">
              {quickPrompts.map((prompt) => (
                <button
                  key={prompt.label}
                  onClick={() => handleSend(prompt.text)}
                  disabled={limitReached}
                  className={`group flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-left text-sm font-medium text-slate-700 shadow-sm transition hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50 ${
                    isTutor
                      ? "hover:border-teal-300 hover:bg-teal-50/50"
                      : "hover:border-brand-300 hover:bg-brand-50"
                  }`}
                >
                  <span className="truncate">{prompt.label}</span>
                  <svg
                    className={`ml-auto h-4 w-4 shrink-0 text-slate-300 transition ${
                      isTutor ? "group-hover:text-teal-600" : "group-hover:text-brand-500"
                    }`}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* ── Message Feed ──────────────────────────────────────── */
          <div className="mx-auto max-w-3xl space-y-4">
            {messages.map((msg) => (
              <div key={msg.id}>
                {msg.role === "user" ? (
                  /* User bubble */
                  <div className="flex justify-end">
                    <div
                      className={`max-w-[80%] rounded-2xl rounded-br-md px-4 py-3 text-sm text-white shadow-md ${
                        isTutor ? "bg-teal-700" : "bg-brand-600"
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                ) : (
                  /* Assistant bubble */
                  <div className="flex gap-3">
                    <div
                      className={`mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                        isTutor
                          ? "bg-gradient-to-br from-teal-100 to-emerald-100 text-teal-700"
                          : "bg-gradient-to-br from-brand-100 to-indigo-100 text-brand-600"
                      }`}
                    >
                      <RobotIcon className="h-4 w-4" />
                    </div>
                    <div className="max-w-[85%] space-y-2">
                      <div className="rounded-2xl rounded-tl-md border border-slate-100 bg-white px-4 py-3 text-slate-700 shadow-sm">
                        {renderMarkdown(msg.text)}
                      </div>
                      {/* Tutor suggestion CTA (Only for students) */}
                      {!isTutor && msg.suggestTutor && (
                        <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 px-4 py-3 shadow-sm">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100">
                            <SearchIcon className="h-5 w-5 text-amber-600" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-amber-800">
                              Need deeper help?
                            </p>
                            <p className="text-xs text-amber-600">
                              A live tutor on Tutor-Connect can guide you through this topic in detail.
                            </p>
                          </div>
                          <Link
                            href="/dashboard/tutors"
                            className="btn shrink-0 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-amber-600"
                          >
                            Find a Tutor
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Loading indicator */}
            {loading && (
              <div className="flex gap-3">
                <div
                  className={`mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                    isTutor
                      ? "bg-gradient-to-br from-teal-100 to-emerald-100 text-teal-700"
                      : "bg-gradient-to-br from-brand-100 to-indigo-100 text-brand-600"
                  }`}
                >
                  <RobotIcon className="h-4 w-4 animate-pulse" />
                </div>
                <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-md border border-slate-100 bg-white px-4 py-3 shadow-sm">
                  <span
                    className={`h-2 w-2 animate-bounce rounded-full ${
                      isTutor ? "bg-teal-500" : "bg-brand-400"
                    }`}
                    style={{ animationDelay: "0ms" }}
                  />
                  <span
                    className={`h-2 w-2 animate-bounce rounded-full ${
                      isTutor ? "bg-teal-500" : "bg-brand-400"
                    }`}
                    style={{ animationDelay: "150ms" }}
                  />
                  <span
                    className={`h-2 w-2 animate-bounce rounded-full ${
                      isTutor ? "bg-teal-500" : "bg-brand-400"
                    }`}
                    style={{ animationDelay: "300ms" }}
                  />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* ── Error Banner ───────────────────────────────────────────── */}
      {error && (
        <div className="border-t border-red-100 bg-red-50 px-4 py-2.5">
          <p className="text-center text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* ── Upgrade Banner (Free users at or near limit) ───────── */}
      {!isPremium && remaining <= 1 && (
        <div className="border-t border-amber-100 bg-gradient-to-r from-amber-50 to-orange-50 px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <SparklesIcon className="h-5 w-5 text-amber-500" />
              <p className="text-sm font-medium text-amber-800">
                {remaining === 0
                  ? "You've reached your daily limit."
                  : "1 question remaining today."}
                {" "}Upgrade to Premium for unlimited TutorBot access!
              </p>
            </div>
            {/* Placeholder upgrade button — wire to your payment flow */}
            <button className="btn shrink-0 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:from-amber-600 hover:to-orange-600">
              Upgrade Now
            </button>
          </div>
        </div>
      )}

      {/* ── Input Area ─────────────────────────────────────────────── */}
      <div className="border-t border-slate-100 bg-white p-4">
        <div className="mx-auto flex max-w-3xl items-end gap-3">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading || limitReached}
            rows={1}
            placeholder={
              limitReached
                ? "Daily limit reached — upgrade to Premium ✨"
                : isTutor
                ? "Ask TutorBot for lesson plans, quiz items, teaching strategies…"
                : "Ask TutorBot anything…"
            }
            className={`max-h-[120px] min-h-[44px] flex-1 resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:bg-white focus:ring-2 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 ${
              isTutor
                ? "focus:border-teal-500 focus:ring-teal-100"
                : "focus:border-brand-400 focus:ring-brand-100"
            }`}
          />
          <button
            onClick={() => handleSend()}
            disabled={loading || !input.trim() || limitReached}
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white shadow-md transition disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none ${
              isTutor ? "bg-teal-700 hover:bg-teal-800" : "bg-brand-600 hover:bg-brand-700"
            }`}
          >
            <SendIcon className="h-5 w-5" />
          </button>
        </div>
        <p className="mt-2 text-center text-[11px] text-slate-400">
          {isTutor
            ? "TutorBot AI assists with educational materials. Always verify curriculum alignment with standard national textbooks."
            : "TutorBot can make mistakes. For critical answers, verify with your textbook or a live tutor."}
        </p>
      </div>
    </div>
  );
}
