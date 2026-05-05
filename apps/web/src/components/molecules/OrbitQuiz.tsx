"use client";

import { useState } from "react";
import type { OrbitProfile, OrbitPersona } from "@/stores/orbit.store";
import { orbitApi } from "@/lib/orbit-api";
import type { QuizQuestion, QuizSession } from "@/lib/orbit-api";

type QuizState = "idle" | "active" | "result";

interface OrbitQuizProps {
  slug: string;
  theme: OrbitProfile["theme"];
}

export default function OrbitQuiz({ slug, theme }: OrbitQuizProps) {
  const [quizState, setQuizState] = useState<QuizState>("idle");
  const [session, setSession] = useState<QuizSession | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<QuizQuestion | null>(
    null,
  );
  const [resultPersona, setResultPersona] = useState<OrbitPersona | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const accentColor = theme.accent_color || theme.primary_color || "#7c3aed";

  const handleStart = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const quizSession = await orbitApi.startQuiz(slug);
      setSession(quizSession);
      setCurrentQuestion(quizSession.question);
      setQuizState("active");
    } catch {
      setError("Failed to start the quiz. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnswer = async (answer: "a" | "b") => {
    if (!session || !currentQuestion) return;
    setIsLoading(true);
    setError(null);
    try {
      const result = await orbitApi.answerQuiz(slug, {
        session_id: session.session_id,
        question_id: currentQuestion.id,
        answer,
      });

      if (result.is_complete) {
        setResultPersona(result.persona);
        setQuizState("result");
      } else if (result.next_question) {
        setCurrentQuestion(result.next_question);
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleShare = () => {
    if (!resultPersona) return;
    const text = `I got "${resultPersona.emoji} ${resultPersona.display_name}" on ${window.location.href}`;
    if (navigator.share) {
      navigator.share({ text, url: window.location.href }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text).catch(() => {});
    }
  };

  const handleReset = () => {
    setQuizState("idle");
    setSession(null);
    setCurrentQuestion(null);
    setResultPersona(null);
    setError(null);
  };

  return (
    <div className="w-full max-w-md mx-auto px-6">
      <div
        className="rounded-2xl p-6 space-y-4"
        style={{
          backgroundColor: `${accentColor}11`,
          border: `1px solid ${accentColor}33`,
        }}
      >
        {/* Idle state */}
        {quizState === "idle" && (
          <div className="text-center space-y-4">
            <div className="text-4xl">🔮</div>
            <h3 className="text-xl font-bold text-white">Find Your Type</h3>
            <p className="text-white/60 text-sm">
              Answer a few questions to discover which persona resonates with
              you.
            </p>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button
              type="button"
              onClick={handleStart}
              disabled={isLoading}
              className="w-full rounded-xl py-3 font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: accentColor }}
            >
              {isLoading ? "Starting..." : "Take the Quiz"}
            </button>
          </div>
        )}

        {/* Active quiz state */}
        {quizState === "active" && currentQuestion && (
          <div className="space-y-5">
            <p className="text-white font-medium text-center leading-snug">
              {currentQuestion.question_text}
            </p>
            {error && (
              <p className="text-red-400 text-sm text-center">{error}</p>
            )}
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => handleAnswer("a")}
                disabled={isLoading}
                className="w-full rounded-xl px-4 py-3 text-left text-sm text-white transition-all hover:opacity-90 disabled:opacity-50"
                style={{
                  backgroundColor: `${accentColor}22`,
                  border: `1px solid ${accentColor}44`,
                }}
              >
                {currentQuestion.option_a}
              </button>
              <button
                type="button"
                onClick={() => handleAnswer("b")}
                disabled={isLoading}
                className="w-full rounded-xl px-4 py-3 text-left text-sm text-white transition-all hover:opacity-90 disabled:opacity-50"
                style={{
                  backgroundColor: `${accentColor}22`,
                  border: `1px solid ${accentColor}44`,
                }}
              >
                {currentQuestion.option_b}
              </button>
            </div>
            {isLoading && (
              <p className="text-center text-white/40 text-xs">Loading...</p>
            )}
          </div>
        )}

        {/* Result state */}
        {quizState === "result" && resultPersona && (
          <div className="text-center space-y-4">
            <div className="text-5xl">{resultPersona.emoji}</div>
            <div>
              <h3 className="text-xl font-bold text-white">
                {resultPersona.display_name}
              </h3>
              <p className="text-white/60 text-sm mt-1">
                {resultPersona.description}
              </p>
            </div>
            {resultPersona.traits.length > 0 && (
              <div className="flex flex-wrap justify-center gap-2">
                {resultPersona.traits.map((trait) => (
                  <span
                    key={trait}
                    className="rounded-full px-3 py-1 text-xs font-medium text-white/80"
                    style={{ backgroundColor: `${accentColor}33` }}
                  >
                    {trait}
                  </span>
                ))}
              </div>
            )}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={handleShare}
                className="flex-1 rounded-xl py-2.5 font-semibold text-white text-sm transition-all hover:opacity-90"
                style={{ backgroundColor: accentColor }}
              >
                Share Result
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="flex-1 rounded-xl py-2.5 font-medium text-white/60 text-sm transition-all hover:text-white"
                style={{
                  backgroundColor: `${accentColor}11`,
                  border: `1px solid ${accentColor}33`,
                }}
              >
                Retake
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
