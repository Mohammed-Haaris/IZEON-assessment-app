import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { apiRequest } from "../services/api";
import type { Question, AssessmentAttempt } from "../types";
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Send,
} from "lucide-react";
import { CameraGuard } from "../components/CameraGuard";
import { CameraTile } from "../components/CameraTile";

export const AssessmentRound1: React.FC = () => {
  const [searchParams] = useSearchParams();
  const attemptId = searchParams.get("attemptId");
  const navigate = useNavigate();

  const [questions, setQuestions] = useState<Question[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [mcqAnswers, setMcqAnswers] = useState<Record<string, string>>({});
  const [writtenEssay, setWrittenEssay] = useState<string>("");
  const [timeLeft, setTimeLeft] = useState<number>(25 * 60); // 25 mins in seconds
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [round1Result, setRound1Result] = useState<{ score: number } | null>(null);

  useEffect(() => {
    async function loadQuestions() {
      try {
        const data = await apiRequest<{
          attempt: AssessmentAttempt;
          round1Questions: Question[];
          durationR1: number;
        }>("/assessment/start", {
          method: "POST",
          body: JSON.stringify({ assessmentId: "" }), // will fetch active attempt questions
        });

        if (data.attempt.status === "COMPLETED" || data.attempt.status === "DISQUALIFIED") {
          alert("You have already completed this assessment. Retakes or resuming are not permitted.");
          navigate("/dashboard");
          return;
        }

        if (data.attempt.currentRound === "ROUND_2_CODING") {
          navigate(`/assessment/round2?attemptId=${data.attempt.id}`);
          return;
        }

        setQuestions(data.round1Questions);
        setTimeLeft((data.durationR1 || 25) * 60);
      } catch (err: any) {
        console.error("Failed to load questions:", err);
        alert(err.message || "Cannot access assessment. Returning to dashboard.");
        navigate("/dashboard");
      } finally {
        setIsLoading(false);
      }
    }

    loadQuestions();
  }, [attemptId]);

  // Timer countdown
  useEffect(() => {
    if (round1Result || isSubmitting) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [round1Result, isSubmitting]);

  const handleSelectOption = (questionId: string, option: string) => {
    setMcqAnswers((prev) => ({ ...prev, [questionId]: option }));
  };

  const handleSubmit = async () => {
    if (isSubmitting || !attemptId) return;
    setIsSubmitting(true);

    try {
      const res = await apiRequest<{ round1Score: number }>("/assessment/submit-round1", {
        method: "POST",
        body: JSON.stringify({
          attemptId,
          mcqAnswers,
          writtenEssay,
        }),
      });

      setRound1Result({ score: res.round1Score });
    } catch (err: any) {
      alert(err.message || "Failed to submit Round 1");
      setIsSubmitting(false);
    }
  };

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const countWords = (text: string) => {
    const trimmed = text.trim();
    return trimmed ? trimmed.split(/\s+/).length : 0;
  };

  if (isLoading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center text-xs text-slate-400">
        Loading Round 1 questions...
      </div>
    );
  }

  // Round 1 Complete Result Transition Screen
  if (round1Result) {
    return (
      <div className="max-w-xl mx-auto my-12 p-8 bg-white rounded-3xl border border-slate-200 shadow-xl text-center space-y-6">
        <div className="w-20 h-20 rounded-3xl bg-[#eff5ff] border border-[#16499c]/30 text-[#16499c] flex items-center justify-center mx-auto shadow-inner">
          <CheckCircle2 className="w-10 h-10" />
        </div>
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">
            Round 1 Completed!
          </h2>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Cognitive & English Grammar Assessment Submitted Successfully
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-[#eff5ff] border border-[#16499c]/30 shadow-sm">
          <span className="text-[11px] text-[#16499c] uppercase tracking-widest font-extrabold">
            Verified Round 1 Score
          </span>
          <p className="text-4xl font-black text-[#16499c] mt-1">
            {round1Result.score} Points
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 text-left text-xs text-slate-800 space-y-2.5">
          <p className="font-bold flex items-center gap-2 text-slate-900">
            <AlertCircle className="w-4 h-4 text-[#16499c] shrink-0" />
            Mandatory Preparation for Round 2 (Coding Laboratory):
          </p>
          <ul className="list-disc pl-5 space-y-1 text-slate-600 text-[11px]">
            <li>Live camera stream must stay granted and unblocked throughout the session.</li>
            <li>Browser must remain in fullscreen mode without exiting.</li>
            <li>
              <strong>Anti-Cheating Policy:</strong> Navigating away from the browser tab twice will
              trigger an immediate proctor lockout.
            </li>
          </ul>
        </div>

        <button
          onClick={() => navigate(`/assessment/round2?attemptId=${attemptId}`)}
          className="w-full flex items-center justify-center gap-2 py-4 px-6 rounded-xl bg-[#16499c] hover:bg-[#123c80] text-white font-extrabold text-sm shadow-lg shadow-[#16499c]/25 cursor-pointer transition-all transform hover:-translate-y-0.5 active:translate-y-0"
        >
          Proceed to Round 2 (Coding & SQL Test)
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  const currentQ = questions[activeIdx];

  return (
    <CameraGuard roundName="Round 1: Aptitude & Grammar">
      {(cameraStream) => (
        <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
          {/* Top Header Bar */}
          <div className="flex items-center justify-between bg-white px-6 py-4 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <span className="px-3 py-1 rounded-full bg-[#eff5ff] border border-[#16499c]/30 text-[11px] font-extrabold text-[#16499c] uppercase tracking-wide">
            Round 1 of 2
          </span>
          <h2 className="text-base font-extrabold text-slate-900 mt-1">
            Aptitude, Verbal & Domain Assessment
          </h2>
        </div>

        <div className="flex items-center gap-4">
          {/* Countdown timer */}
          <div
            className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-mono font-bold shadow-xs ${
              timeLeft < 300
                ? "bg-rose-50 border-rose-300 text-rose-600 animate-pulse"
                : "bg-slate-50 border-slate-200 text-slate-800"
            }`}
          >
            <Clock className="w-4 h-4 text-[#16499c]" />
            {formatTime(timeLeft)}
          </div>

          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#16499c] hover:bg-[#123c80] text-white font-bold text-xs transition-all shadow-md shadow-[#16499c]/20 cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            Submit Round 1
          </button>
        </div>
      </div>

      {/* Domain Sections Quick Navigation Bar */}
      {(() => {
        const sections = [
          {
            id: "APTITUDE_VERBAL",
            label: "🧠 Aptitude & Verbal",
            match: (q: Question) => q.category === "APTITUDE" || q.category === "VERBAL",
          },
          {
            id: "WRITTEN",
            label: "✍️ Written Essay",
            match: (q: Question) => q.category === "WRITTEN_PROMPT",
          },
        ].filter((s) => questions.some(s.match));

        return (
          <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center gap-2.5">
            <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider ml-2 mr-1">
              Sections:
            </span>
            {sections.map((sec) => {
              const firstIdx = questions.findIndex(sec.match);
              const isCurrentSection = currentQ && sec.match(currentQ);
              const totalInSec = questions.filter(sec.match).length;
              const answeredInSec = questions
                .filter(sec.match)
                .filter((q) =>
                  q.category === "WRITTEN_PROMPT"
                    ? Boolean(writtenEssay.trim())
                    : Boolean(mcqAnswers[q.id])
                ).length;

              return (
                <button
                  key={sec.id}
                  onClick={() => {
                    if (firstIdx !== -1) setActiveIdx(firstIdx);
                  }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all ${
                    isCurrentSection
                      ? "bg-[#16499c] text-white shadow-sm ring-2 ring-[#16499c]/30"
                      : "bg-white hover:bg-slate-50 text-slate-700 border border-slate-200"
                  }`}
                >
                  <span>{sec.label}</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                      isCurrentSection
                        ? "bg-white/25 text-white"
                        : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {answeredInSec}/{totalInSec}
                  </span>
                </button>
              );
            })}
          </div>
        );
      })()}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Column: Question Content */}
        <div className="lg:col-span-3 bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
          {currentQ && (
            <>
              {/* Question metadata badge */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2.5">
                  <span className="w-8 h-8 rounded-xl bg-[#eff5ff] border border-[#16499c]/30 text-[#16499c] font-extrabold text-sm flex items-center justify-center shadow-xs">
                    {activeIdx + 1}
                  </span>
                  <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-600">
                    Section: {currentQ.category.replace("_", " ")}
                  </span>
                </div>
                <span className="px-3.5 py-1.5 rounded-full bg-[#eff5ff] border border-[#16499c]/30 text-xs sm:text-sm font-extrabold text-[#16499c]">
                  {currentQ.points} Points
                </span>
              </div>

              {/* Title & Description */}
              <div className="space-y-3">
                <h3 className="text-xl font-bold text-slate-900">{currentQ.title}</h3>
                <div className="text-sm sm:text-base text-slate-800 leading-relaxed whitespace-pre-line bg-slate-50 p-6 rounded-2xl border border-slate-200 font-normal">
                  {currentQ.content}
                </div>
              </div>

              {/* Interaction: MCQs vs Written Essay */}
              {currentQ.category === "WRITTEN_PROMPT" ? (
                <div className="space-y-3 pt-2">
                  <div className="flex justify-between items-center text-sm text-slate-700">
                    <span className="font-bold text-slate-900">Compose your analytical response:</span>
                    <span className="font-mono text-xs sm:text-sm">
                      Word Count:{" "}
                      <strong
                        className={
                          countWords(writtenEssay) >= 100 ? "text-[#16499c] font-bold" : "text-amber-700 font-bold"
                        }
                      >
                        {countWords(writtenEssay)}
                      </strong>{" "}
                      (Min: 100)
                    </span>
                  </div>

                  <textarea
                    rows={8}
                    value={writtenEssay}
                    onChange={(e) => setWrittenEssay(e.target.value)}
                    placeholder="Type your response here... It will be evaluated for grammar, clarity, spelling, and sentence construction."
                    className="w-full text-sm p-4 rounded-2xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#16499c]/20 focus:border-[#16499c] font-sans leading-relaxed text-slate-900 transition-all placeholder:text-slate-400"
                  />
                </div>
              ) : (
                /* MCQs Options */
                <div className="space-y-3 pt-2">
                  <p className="text-sm font-bold text-slate-900">Select the correct option:</p>
                  <div className="space-y-3">
                    {Array.isArray(currentQ.options) &&
                      currentQ.options.map((option, idx) => {
                        const isSelected = mcqAnswers[currentQ.id] === option;
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => handleSelectOption(currentQ.id, option)}
                            className={`w-full text-left p-4 sm:p-4.5 rounded-xl border text-sm font-medium transition-all flex items-center gap-3.5 cursor-pointer transform hover:-translate-y-0.5 active:translate-y-0 ${
                              isSelected
                                ? "bg-[#eff5ff] border-[#16499c] text-slate-900 shadow-sm ring-2 ring-[#16499c]/20"
                                : "bg-white border-slate-300 text-slate-800 hover:bg-[#eff5ff]/50 hover:border-[#16499c]/40"
                            }`}
                          >
                            <span
                              className={`w-7 h-7 rounded-full border flex items-center justify-center text-xs font-bold shrink-0 ${
                                isSelected
                                  ? "border-[#16499c] bg-[#16499c] text-white shadow-sm"
                                  : "border-slate-300 bg-slate-100 text-slate-700"
                              }`}
                            >
                              {String.fromCharCode(65 + idx)}
                            </span>
                            <span className="flex-1 leading-normal">{option}</span>
                          </button>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* Prev / Next controls */}
              <div className="flex items-center justify-between pt-6 border-t border-slate-100">
                <button
                  type="button"
                  disabled={activeIdx === 0}
                  onClick={() => setActiveIdx((prev) => prev - 1)}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-300 bg-white disabled:opacity-40 text-sm font-bold text-slate-700 hover:bg-slate-50 cursor-pointer transition-all shadow-xs"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Previous
                </button>

                <button
                  type="button"
                  disabled={activeIdx === questions.length - 1}
                  onClick={() => setActiveIdx((prev) => prev + 1)}
                  className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-[#16499c] hover:bg-[#123c80] disabled:opacity-40 text-white text-xs font-bold shadow-md shadow-[#16499c]/20 cursor-pointer transition-all transform hover:-translate-y-0.5 active:translate-y-0"
                >
                  Next Question
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </>
          )}
        </div>

        {/* Right Column: Proctor Camera + Question Palette */}
        <div className="space-y-4">
          {/* Live Proctor Camera Feed */}
          <CameraTile stream={cameraStream} className="w-full h-36 shadow-sm" />

          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
              Question Navigator
            </h4>

            {/* Grouped by Section */}
            {(() => {
              const groups = [
                {
                  title: "🧠 Aptitude & Verbal",
                  filter: (q: Question) => q.category === "APTITUDE" || q.category === "VERBAL",
                },
                {
                  title: "✍️ Written Prompt",
                  filter: (q: Question) => q.category === "WRITTEN_PROMPT",
                },
              ].filter((g) => questions.some(g.filter));

              return (
                <div className="space-y-4">
                  {groups.map((grp) => {
                    const groupQuestions = questions
                      .map((q, originalIdx) => ({ q, originalIdx }))
                      .filter(({ q }) => grp.filter(q));

                    return (
                      <div key={grp.title} className="space-y-2">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                          {grp.title}
                        </span>
                        <div className="grid grid-cols-4 gap-2">
                          {groupQuestions.map(({ q, originalIdx }) => {
                            const isAnswered =
                              q.category === "WRITTEN_PROMPT"
                                ? Boolean(writtenEssay.trim())
                                : Boolean(mcqAnswers[q.id]);
                            const isActive = activeIdx === originalIdx;

                            return (
                              <button
                                key={q.id}
                                onClick={() => setActiveIdx(originalIdx)}
                                className={`h-10 rounded-xl font-extrabold text-xs transition-all cursor-pointer flex items-center justify-center ${
                                  isActive
                                    ? "bg-[#16499c] text-white shadow-sm ring-2 ring-[#16499c]"
                                    : isAnswered
                                    ? "bg-[#eff5ff] text-[#16499c] border border-[#16499c]/30"
                                    : "bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100"
                                }`}
                              >
                                {originalIdx + 1}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}

            <div className="pt-4 border-t border-slate-100 text-[11px] text-slate-600 space-y-2 font-medium">
              <div className="flex items-center gap-2.5">
                <span className="w-3 h-3 rounded-full bg-[#eff5ff]0" />
                <span>Answered</span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="w-3 h-3 rounded-full bg-slate-200 border border-slate-300" />
                <span>Unanswered</span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="w-3 h-3 rounded-full bg-[#16499c]" />
                <span>Current Question</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
      )}
    </CameraGuard>
  );
};
