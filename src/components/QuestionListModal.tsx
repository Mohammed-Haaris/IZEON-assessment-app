import React, { useEffect, useState } from "react";
import { apiRequest } from "../services/api";
import type { Assessment, Question } from "../types";
import { X, Trash2, Plus, CheckCircle2 } from "lucide-react";

interface QuestionListModalProps {
  assessment: Assessment;
  onClose: () => void;
  onOpenAddQuestion: () => void;
}

export const QuestionListModal: React.FC<QuestionListModalProps> = ({
  assessment,
  onClose,
  onOpenAddQuestion,
}) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  type FilterType = "ALL" | "PYTHON" | "SQL" | "Software Developer" | "APTITUDE_VERBAL";
  const [activeFilter, setActiveFilter] = useState<FilterType>("ALL");

  const loadQuestions = async () => {
    setIsLoading(true);
    try {
      const data = await apiRequest<{ questions: Question[] }>(
        `/admin/assessments/${assessment.id}/questions`
      );
      setQuestions(data.questions);
    } catch (err) {
      console.error("Failed to load questions:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadQuestions();
  }, [assessment.id]);

  const handleDelete = async (questionId: string) => {
    if (!confirm("Are you sure you want to delete this question?")) return;
    setDeletingId(questionId);
    try {
      await apiRequest(`/admin/questions/${questionId}`, {
        method: "DELETE",
      });
      loadQuestions();
    } catch (err: any) {
      alert(err.message || "Failed to delete question");
    } finally {
      setDeletingId(null);
    }
  };

  const filteredQuestions = questions.filter((q) => {
    if (activeFilter === "ALL") return true;
    if (activeFilter === "PYTHON") return q.category === "PYTHON";
    if (activeFilter === "SQL") return q.category === "SQL";
    if (activeFilter === "Software Developer") {
      return q.targetRole === "Software Developer" || (q.round === "ROUND_2_CODING" && q.category === "CODING");
    }
    if (activeFilter === "APTITUDE_VERBAL") {
      return q.category === "APTITUDE" || q.category === "VERBAL" || q.category === "WRITTEN_PROMPT";
    }
    return true;
  });

  const pythonQuestions = filteredQuestions.filter((q) => q.category === "PYTHON");
  const sqlQuestions = filteredQuestions.filter((q) => q.category === "SQL");
  const dsaQuestions = filteredQuestions.filter(
    (q) => q.category === "CODING" || q.targetRole === "Software Developer"
  );
  const generalQuestions = filteredQuestions.filter(
    (q) => q.category === "APTITUDE" || q.category === "VERBAL" || q.category === "WRITTEN_PROMPT"
  );

  const renderRoleBadge = (role?: string | null) => {
    if (role === "Data Analyst") {
      return (
        <span className="px-2 py-0.5 rounded-full bg-[#eff5ff] text-[#16499c] font-bold text-[10px] border border-[#16499c]/30">
          Data Analyst (Python & SQL)
        </span>
      );
    }
    if (role === "Software Developer") {
      return (
        <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 font-bold text-[10px] border border-indigo-200">
          Software Developer
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium text-[10px] border border-slate-200">
        All Candidates
      </span>
    );
  };

  const renderCategoryBadge = (cat: string) => {
    if (cat === "SQL") {
      return (
        <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 font-bold text-[10px]">
          SQL
        </span>
      );
    }
    if (cat === "PYTHON") {
      return (
        <span className="px-2 py-0.5 rounded-md bg-sky-100 text-sky-800 font-bold text-[10px]">
          PYTHON
        </span>
      );
    }
    if (cat === "CODING") {
      return (
        <span className="px-2 py-0.5 rounded-md bg-violet-100 text-violet-800 font-bold text-[10px]">
          CODING
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded-md bg-slate-200 text-slate-700 font-semibold text-[10px]">
        {cat}
      </span>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Questions: {assessment.title}
            </h3>
            <p className="text-xs text-slate-500">
              Total {questions.length} questions ({questions.filter((q) => q.round === "ROUND_1_APTITUDE_VERBAL_WRITTEN").length} in Round 1,{" "}
              {questions.filter((q) => q.round === "ROUND_2_CODING").length} in Round 2)
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onOpenAddQuestion}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#16499c] hover:bg-[#123c80] text-white font-semibold text-xs shadow-sm shadow-[#16499c]/20 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Question
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Domain & Track Filter Bar */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-slate-500">Domain Filter:</span>
          {(
            [
              { id: "ALL", label: "All Questions" },
              { id: "PYTHON", label: " Python Domain" },
              { id: "SQL", label: "SQL Domain" },
              { id: "Software Developer", label: " Software Dev (DSA)" },
              { id: "APTITUDE_VERBAL", label: " Aptitude & Verbal" },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveFilter(item.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-all ${activeFilter === item.id
                ? "bg-slate-900 text-white shadow-sm"
                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Question Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          {isLoading ? (
            <div className="py-12 text-center text-slate-400">Loading questions...</div>
          ) : filteredQuestions.length === 0 ? (
            <div className="py-12 text-center text-slate-400 space-y-3">
              <p>No questions found for the selected domain filter.</p>
              <button
                onClick={onOpenAddQuestion}
                className="px-4 py-2 rounded-xl bg-[#eff5ff] text-[#16499c] font-semibold border border-[#16499c]/30 cursor-pointer hover:bg-[#eff5ff] transition-colors"
              >
                + Add a Question
              </button>
            </div>
          ) : (
            <>
              {/* HELPER CARD RENDERER */}
              {(() => {
                const renderCard = (q: Question, idx: number, badgeColor: string) => (
                  <div
                    key={q.id}
                    className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 relative group"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`w-6 h-6 rounded-lg ${badgeColor} text-white flex items-center justify-center font-bold text-[11px]`}
                        >
                          {idx + 1}
                        </span>
                        <span className="font-bold text-slate-900 text-xs">{q.title}</span>
                        {renderCategoryBadge(q.category)}
                        {renderRoleBadge(q.targetRole)}
                        <span className="text-[10px] font-mono text-slate-400">
                          {q.round === "ROUND_1_APTITUDE_VERBAL_WRITTEN" ? "Round 1" : "Round 2"}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="font-bold text-indigo-600 text-xs">
                          {q.points} Pts
                        </span>
                        <button
                          onClick={() => handleDelete(q.id)}
                          disabled={deletingId === q.id}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
                          title="Delete Question"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <p className="text-slate-600 text-[11px] whitespace-pre-wrap">{q.content}</p>

                    {/* Options preview for MCQs */}
                    {Array.isArray(q.options) && (
                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/60">
                        {q.options.map((opt, optIdx) => (
                          <div
                            key={optIdx}
                            className={`p-2 rounded-lg text-[11px] flex items-center gap-1.5 ${opt === q.correctAnswer
                              ? "bg-[#eff5ff] text-[#16499c] border border-[#16499c]/30 font-semibold"
                              : "bg-white text-slate-600 border border-slate-200"
                              }`}
                          >
                            <span className="w-4 font-bold text-slate-400">
                              {String.fromCharCode(65 + optIdx)}.
                            </span>
                            <span className="truncate">{opt}</span>
                            {opt === q.correctAnswer && (
                              <CheckCircle2 className="w-3.5 h-3.5 text-[#16499c] ml-auto shrink-0" />
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Starter code preview */}
                    {q.starterCode && typeof q.starterCode === "object" && (
                      <div className="pt-2 border-t border-slate-200 text-[10px] text-slate-500 font-mono flex items-center gap-2">
                        <span>Starter Code:</span>
                        {Object.keys(q.starterCode).map((lang) => (
                          <span
                            key={lang}
                            className="px-2 py-0.5 rounded bg-slate-200/80 text-slate-700 uppercase font-semibold"
                          >
                            {lang}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );

                return (
                  <div className="space-y-6">
                    {/* SECTION: PYTHON DOMAIN */}
                    {pythonQuestions.length > 0 && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 border-b border-sky-200 pb-2">
                          <span className="px-2.5 py-0.5 rounded-full bg-sky-100 text-sky-800 font-bold text-[10px] uppercase border border-sky-200">
                            🐍 Python Domain ({pythonQuestions.length} Questions)
                          </span>
                          <span className="text-[11px] text-slate-400">
                            Dedicated Data Analyst Python Track
                          </span>
                        </div>
                        <div className="space-y-3">
                          {pythonQuestions.map((q, idx) => renderCard(q, idx, "bg-sky-600"))}
                        </div>
                      </div>
                    )}

                    {/* SECTION: SQL DOMAIN */}
                    {sqlQuestions.length > 0 && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 border-b border-amber-200 pb-2">
                          <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold text-[10px] uppercase border border-amber-200">
                            🗄️ SQL Domain ({sqlQuestions.length} Questions)
                          </span>
                          <span className="text-[11px] text-slate-400">
                            Relational Queries, Joins, Aggregation & HAVING
                          </span>
                        </div>
                        <div className="space-y-3">
                          {sqlQuestions.map((q, idx) => renderCard(q, idx, "bg-amber-600"))}
                        </div>
                      </div>
                    )}

                    {/* SECTION: SOFTWARE DEVELOPER CODING */}
                    {dsaQuestions.length > 0 && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 border-b border-indigo-200 pb-2">
                          <span className="px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 font-bold text-[10px] uppercase border border-indigo-200">
                            💻 Software Developer Coding ({dsaQuestions.length} Questions)
                          </span>
                          <span className="text-[11px] text-slate-400">
                            Data Structures, Algorithms & Problem Solving
                          </span>
                        </div>
                        <div className="space-y-3">
                          {dsaQuestions.map((q, idx) => renderCard(q, idx, "bg-indigo-600"))}
                        </div>
                      </div>
                    )}

                    {/* SECTION: GENERAL APTITUDE & VERBAL */}
                    {generalQuestions.length > 0 && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                          <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 font-bold text-[10px] uppercase border border-slate-200">
                            🧠 General Aptitude, Verbal & Written ({generalQuestions.length} Questions)
                          </span>
                          <span className="text-[11px] text-slate-400">
                            Cognitive foundation for all candidates
                          </span>
                        </div>
                        <div className="space-y-3">
                          {generalQuestions.map((q, idx) => renderCard(q, idx, "bg-slate-700"))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
