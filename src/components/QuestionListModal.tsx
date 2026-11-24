import React, { useEffect, useState } from "react";
import { apiRequest } from "../services/api";
import type { Assessment, Question } from "../types";
import {
  X,
  Trash2,
  Plus,
  CheckCircle2,
  Edit2,
  Sparkles,
  Search,
  Layers,
  RefreshCw,
} from "lucide-react";
import { EditQuestionModal } from "./EditQuestionModal";

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
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [isStandardizing, setIsStandardizing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  type FilterType =
    | "ALL"
    | "DATA_ANALYST"
    | "SOFTWARE_DEV"
    | "NETWORK_ENGINEER"
    | "CLOUD_ENGINEER"
    | "AI_ENGINEER"
    | "DIGITAL_MARKETING"
    | "ROUND_1";
  const [activeFilter, setActiveFilter] = useState<FilterType>("ALL");
  const [daSubFilter, setDaSubFilter] = useState<"ALL" | "PYTHON" | "SQL">("ALL");

  const loadQuestions = async () => {
    try {
      const data = await apiRequest<{ questions: Question[] }>(
        `/admin/assessments/${assessment.id}/questions`
      );
      setQuestions(data.questions || []);
    } catch (err) {
      console.error("Failed to load questions:", err);
    }
  };

  useEffect(() => {
    let isMounted = true;
    async function fetchQuestions() {
      try {
        const data = await apiRequest<{ questions: Question[] }>(
          `/admin/assessments/${assessment.id}/questions`
        );
        if (isMounted) {
          setQuestions(data.questions || []);
        }
      } catch (err) {
        console.error("Failed to load questions:", err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }
    fetchQuestions();
    return () => {
      isMounted = false;
    };
  }, [assessment.id]);

  const handleDelete = async (questionId: string) => {
    if (!confirm("Are you sure you want to delete this question?")) return;
    setDeletingId(questionId);
    try {
      await apiRequest(`/admin/questions/${questionId}`, {
        method: "DELETE",
      });
      await loadQuestions();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to delete question";
      alert(message);
    } finally {
      setDeletingId(null);
    }
  };

  const handleStandardizeMarks = async () => {
    if (
      !confirm(
        "Standardize all questions to the 70-Mark Structure?\n\n" +
          "• Total Marks: 70 Marks\n" +
          "• Round 1: 20 Questions (1 Pt each = 20 Pts, Cutoff: 12)\n" +
          "• Round 2 Software Dev: 5 Coding Questions (10 Pts each = 50 Pts)\n" +
          "• Round 2 Data Analyst: 3 Python + 2 SQL (10 Pts each = 50 Pts)\n" +
          "• Round 2 Network Engineer: 5 Questions (10 Pts each = 50 Pts)\n" +
          "• Round 2 Cloud Engineer: 5 Questions (10 Pts each = 50 Pts)\n" +
          "• Round 2 AI Engineer: 5 Questions (10 Pts each = 50 Pts)\n" +
          "• Round 2 Digital Marketing: 5 Questions (10 Pts each = 50 Pts)\n\n" +
          "Proceed with auto-standardization?"
      )
    ) {
      return;
    }

    setIsStandardizing(true);
    setStatusMessage(null);
    try {
      const res = await apiRequest<{ message: string }>(
        `/admin/assessments/${assessment.id}/standardize-marks`,
        { method: "POST" }
      );
      setStatusMessage({
        type: "success",
        text: res.message || "Assessment marks successfully standardized to 70 Marks!",
      });
      await loadQuestions();
    } catch (err: any) {
      setStatusMessage({
        type: "error",
        text: err.message || "Failed to standardize assessment marks.",
      });
    } finally {
      setIsStandardizing(false);
    }
  };

  const handleDeduplicate = async () => {
    setIsStandardizing(true);
    setStatusMessage(null);
    try {
      const res = await apiRequest<{ message: string; deletedCount: number }>(
        `/admin/assessments/${assessment.id}/deduplicate`,
        { method: "POST" }
      );
      setStatusMessage({
        type: "success",
        text: res.message || "Deduplication complete!",
      });
      await loadQuestions();
    } catch (err: any) {
      setStatusMessage({
        type: "error",
        text: err.message || "Failed to remove duplicates.",
      });
    } finally {
      setIsStandardizing(false);
    }
  };

  // Groupings by track
  const r1Questions = questions.filter((q) => q.round === "ROUND_1_APTITUDE_VERBAL_WRITTEN");
  const r2Questions = questions.filter((q) => q.round === "ROUND_2_CODING");

  // Data Analyst: targetRole === "Data Analyst" or (in R2 category is SQL or PYTHON and targetRole is not NE/Dev)
  const daQuestions = r2Questions.filter((q) => {
    if (q.targetRole === "Data Analyst") return true;
    if (q.targetRole === "Network Engineer" || q.targetRole === "Software Developer") return false;
    return q.category === "SQL" || q.category === "PYTHON";
  });
  const daPythonQuestions = daQuestions.filter((q) => q.category === "PYTHON");
  const daSqlQuestions = daQuestions.filter((q) => q.category === "SQL");

  // Software Developer: targetRole === "Software Developer" or (in R2 category is CODING and targetRole != NE/DA)
  const devQuestions = r2Questions.filter((q) => {
    if (q.targetRole === "Software Developer") return true;
    if (q.targetRole === "Data Analyst" || q.targetRole === "Network Engineer") return false;
    return q.category === "CODING";
  });

  // Network Engineer: targetRole === "Network Engineer" or category === "NETWORKING"
  const neQuestions = r2Questions.filter((q) => {
    return q.targetRole === "Network Engineer" || q.category === "NETWORKING";
  });

  // Cloud Engineer: targetRole === "Cloud Engineer" or category === "CLOUD"
  const cloudQuestions = r2Questions.filter((q) => {
    return q.targetRole === "Cloud Engineer" || q.category === "CLOUD";
  });

  // AI Engineer: targetRole === "AI Engineer" or category === "AI"
  const aiQuestions = r2Questions.filter((q) => {
    return q.targetRole === "AI Engineer" || q.category === "AI";
  });

  // Digital Marketing: targetRole === "Digital Marketing" or category === "DIGITAL_MARKETING"
  const dmQuestions = r2Questions.filter((q) => {
    return q.targetRole === "Digital Marketing" || q.category === "DIGITAL_MARKETING";
  });

  // Filtered list based on activeFilter, daSubFilter, and searchQuery
  const filteredQuestions = questions.filter((q) => {
    // Search query filter
    if (searchQuery.trim()) {
      const qText = `${q.title} ${q.content} ${q.category} ${q.targetRole || ""}`.toLowerCase();
      if (!qText.includes(searchQuery.toLowerCase().trim())) return false;
    }

    if (activeFilter === "ALL") return true;

    if (activeFilter === "DATA_ANALYST") {
      const isDA = daQuestions.some((item) => item.id === q.id);
      if (!isDA) return false;
      if (daSubFilter === "PYTHON") return q.category === "PYTHON";
      if (daSubFilter === "SQL") return q.category === "SQL";
      return true;
    }

    if (activeFilter === "SOFTWARE_DEV") {
      return devQuestions.some((item) => item.id === q.id);
    }

    if (activeFilter === "NETWORK_ENGINEER") {
      return neQuestions.some((item) => item.id === q.id);
    }

    if (activeFilter === "CLOUD_ENGINEER") {
      return cloudQuestions.some((item) => item.id === q.id);
    }

    if (activeFilter === "AI_ENGINEER") {
      return aiQuestions.some((item) => item.id === q.id);
    }

    if (activeFilter === "DIGITAL_MARKETING") {
      return dmQuestions.some((item) => item.id === q.id);
    }

    if (activeFilter === "ROUND_1") {
      return q.round === "ROUND_1_APTITUDE_VERBAL_WRITTEN";
    }

    return true;
  });

  const renderRoleBadge = (role?: string | null) => {
    if (role === "Data Analyst") {
      return (
        <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-bold text-[10px] border border-blue-200">
          Data Analyst Track
        </span>
      );
    }
    if (role === "Software Developer") {
      return (
        <span className="px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 font-bold text-[10px] border border-violet-200">
          Software Developer Track
        </span>
      );
    }
    if (role === "Network Engineer") {
      return (
        <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[10px] border border-emerald-200">
          Network Engineer Track
        </span>
      );
    }
    if (role === "Cloud Engineer") {
      return (
        <span className="px-2 py-0.5 rounded-full bg-cyan-50 text-cyan-700 font-bold text-[10px] border border-cyan-200">
          Cloud Engineer Track
        </span>
      );
    }
    if (role === "AI Engineer") {
      return (
        <span className="px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 font-bold text-[10px] border border-purple-200">
          AI Engineer Track
        </span>
      );
    }
    if (role === "Digital Marketing") {
      return (
        <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 font-bold text-[10px] border border-rose-200">
          Digital Marketing Track
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium text-[10px] border border-slate-200">
        Common (Round 1)
      </span>
    );
  };

  const renderCategoryBadge = (cat: string) => {
    if (cat === "SQL") {
      return (
        <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 font-bold text-[10px] border border-amber-200">
          SQL
        </span>
      );
    }
    if (cat === "PYTHON") {
      return (
        <span className="px-2 py-0.5 rounded-md bg-sky-100 text-sky-800 font-bold text-[10px] border border-sky-200">
          PYTHON
        </span>
      );
    }
    if (cat === "CODING") {
      return (
        <span className="px-2 py-0.5 rounded-md bg-violet-100 text-violet-800 font-bold text-[10px] border border-violet-200">
          CODING
        </span>
      );
    }
    if (cat === "NETWORKING") {
      return (
        <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold text-[10px] border border-emerald-200">
          NETWORKING
        </span>
      );
    }
    if (cat === "CLOUD") {
      return (
        <span className="px-2 py-0.5 rounded-md bg-cyan-100 text-cyan-800 font-bold text-[10px] border border-cyan-200">
          CLOUD
        </span>
      );
    }
    if (cat === "AI") {
      return (
        <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 font-bold text-[10px] border border-purple-200">
          AI / ML
        </span>
      );
    }
    if (cat === "DIGITAL_MARKETING") {
      return (
        <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 font-bold text-[10px] border border-rose-200">
          MARKETING
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded-md bg-slate-200 text-slate-700 font-semibold text-[10px]">
        {cat}
      </span>
    );
  };

  const renderCard = (q: Question, idx: number, badgeColor: string) => (
    <div
      key={q.id}
      className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs space-y-2 relative group hover:border-[#16499c]/40 transition-all"
    >
      <div className="flex justify-between items-start gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={`w-6 h-6 rounded-lg ${badgeColor} text-white flex items-center justify-center font-bold text-[11px] shadow-xs`}
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

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => setEditingQuestion(q)}
            className="flex items-center gap-1 font-bold text-indigo-700 text-xs bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
            title="Click to edit points weightage"
          >
            <span>{q.points} Pts</span>
            <Edit2 className="w-2.5 h-2.5 text-indigo-500" />
          </button>
          <button
            onClick={() => setEditingQuestion(q)}
            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors"
            title="Edit Question Details"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => handleDelete(q.id)}
            disabled={deletingId === q.id}
            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors"
            title="Delete Question"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <p className="text-slate-600 text-[11px] whitespace-pre-wrap leading-relaxed">{q.content}</p>

      {/* Options preview for MCQs */}
      {Array.isArray(q.options) && q.options.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-100">
          {q.options.map((opt, optIdx) => (
            <div
              key={optIdx}
              className={`p-2 rounded-lg text-[11px] flex items-center gap-1.5 ${
                opt === q.correctAnswer
                  ? "bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold"
                  : "bg-slate-50 text-slate-600 border border-slate-200/60"
              }`}
            >
              <span className="w-4 font-bold text-slate-400">
                {String.fromCharCode(65 + optIdx)}.
              </span>
              <span className="truncate">{opt}</span>
              {opt === q.correctAnswer && (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 ml-auto shrink-0" />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Starter code preview */}
      {q.starterCode && typeof q.starterCode === "object" && (
        <div className="pt-2 border-t border-slate-100 text-[10px] text-slate-500 font-mono flex items-center gap-2">
          <span className="font-semibold text-slate-400">Starter Code:</span>
          {Object.keys(q.starterCode).map((lang) => (
            <span
              key={lang}
              className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 uppercase font-semibold border border-slate-200"
            >
              {lang}
            </span>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden max-h-[92vh] flex flex-col">
        {/* Top Gradient Brand Strip */}
        <div className="h-1.5 bg-gradient-to-r from-[#16499c] via-[#2563eb] to-[#38bdf8]" />

        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-xl bg-[#eff5ff] text-[#16499c]">
                <Layers className="w-4 h-4" />
              </span>
              <h3 className="text-base font-extrabold text-slate-900">
                Questions: {assessment.title}
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Total {questions.length} Questions ({r1Questions.length} in Round 1 • {r2Questions.length} in Round 2)
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDeduplicate}
              disabled={isStandardizing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-bold text-xs transition-colors cursor-pointer shadow-xs disabled:opacity-60"
              title="Detect and remove duplicate questions"
            >
              <Trash2 className="w-3.5 h-3.5 text-amber-600" />
              <span>Clean Duplicates</span>
            </button>
            <button
              onClick={handleStandardizeMarks}
              disabled={isStandardizing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold text-xs transition-colors cursor-pointer shadow-xs disabled:opacity-60"
              title="Auto-configure total 70 Marks (20 R1 + 50 R2)"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isStandardizing ? "animate-spin" : ""}`} />
              <span>Standardize 70 Pts</span>
            </button>
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

      
        {/* Status Alert if standardized */}
        {statusMessage && (
          <div
            className={`px-6 py-2.5 text-xs font-semibold flex items-center justify-between border-b ${
              statusMessage.type === "success"
                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                : "bg-rose-50 text-rose-800 border-rose-200"
            }`}
          >
            <span>{statusMessage.text}</span>
            <button
              onClick={() => setStatusMessage(null)}
              className="text-slate-400 hover:text-slate-700 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* DOMAIN & TRACK FILTER BAR */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          {/* Main Track Filter Tabs */}
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: "ALL", label: `All Questions (${questions.length})` },
              {
                id: "DATA_ANALYST",
                label: `📊 Data Analyst (${daQuestions.length})`,
                desc: "3 Python + 2 SQL (50 Pts)",
              },
              {
                id: "SOFTWARE_DEV",
                label: `💻 Software Dev (${devQuestions.length})`,
                desc: "5 Coding (50 Pts)",
              },
              {
                id: "NETWORK_ENGINEER",
                label: `🌐 Network Engineer (${neQuestions.length})`,
                desc: "5 Questions (50 Pts)",
              },
              {
                id: "CLOUD_ENGINEER",
                label: `☁️ Cloud Engineer (${cloudQuestions.length})`,
                desc: "5 Questions (50 Pts)",
              },
              {
                id: "AI_ENGINEER",
                label: `🤖 AI Engineer (${aiQuestions.length})`,
                desc: "5 Questions (50 Pts)",
              },
              {
                id: "DIGITAL_MARKETING",
                label: `📈 Digital Marketing (${dmQuestions.length})`,
                desc: "5 Questions (50 Pts)",
              },
              {
                id: "ROUND_1",
                label: `🧠 Round 1 (${r1Questions.length})`,
                desc: "20 Questions (20 Pts)",
              },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveFilter(tab.id as FilterType);
                  if (tab.id === "DATA_ANALYST") setDaSubFilter("ALL");
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center gap-1.5 ${
                  activeFilter === tab.id
                    ? "bg-[#16499c] text-white shadow-sm shadow-[#16499c]/25"
                    : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
                }`}
              >
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Quick Search Input */}
          <div className="relative min-w-[200px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title or topic..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-[#16499c]"
            />
          </div>
        </div>

        {/* DATA ANALYST SUB-FILTER PILLS (Shown when Data Analyst tab is selected) */}
        {activeFilter === "DATA_ANALYST" && (
          <div className="px-6 py-2 bg-blue-50/60 border-b border-blue-100 flex items-center gap-2 text-xs">
            <span className="font-bold text-blue-900 text-[11px]">Filter Data Analyst:</span>
            <button
              onClick={() => setDaSubFilter("ALL")}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                daSubFilter === "ALL"
                  ? "bg-blue-600 text-white"
                  : "bg-white text-blue-800 border border-blue-200 hover:bg-blue-100/50"
              }`}
            >
              All Analyst Questions ({daQuestions.length})
            </button>
            <button
              onClick={() => setDaSubFilter("PYTHON")}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                daSubFilter === "PYTHON"
                  ? "bg-sky-600 text-white"
                  : "bg-white text-sky-800 border border-sky-200 hover:bg-sky-50"
              }`}
            >
              🐍 Python Scripting ({daPythonQuestions.length} Questions • 10 Pts each)
            </button>
            <button
              onClick={() => setDaSubFilter("SQL")}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                daSubFilter === "SQL"
                  ? "bg-amber-600 text-white"
                  : "bg-white text-amber-800 border border-amber-200 hover:bg-amber-50"
              }`}
            >
              🗄️ SQL Queries ({daSqlQuestions.length} Questions • 10 Pts each)
            </button>
          </div>
        )}

        {/* Questions Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs bg-slate-50/50">
          {isLoading ? (
            <div className="py-16 text-center text-slate-400 flex flex-col items-center gap-2">
              <RefreshCw className="w-6 h-6 animate-spin text-[#16499c]" />
              <span>Loading questions...</span>
            </div>
          ) : filteredQuestions.length === 0 ? (
            <div className="py-16 text-center text-slate-400 space-y-3 bg-white rounded-2xl border border-slate-200">
              <p className="font-semibold text-slate-600">No questions found for the selected filter or search.</p>
              <button
                onClick={onOpenAddQuestion}
                className="px-4 py-2 rounded-xl bg-[#eff5ff] text-[#16499c] font-semibold border border-[#16499c]/30 cursor-pointer hover:bg-[#16499c] hover:text-white transition-colors"
              >
                + Add a Question
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* SECTION: DATA ANALYST TRACK */}
              {(activeFilter === "ALL" || activeFilter === "DATA_ANALYST") && daQuestions.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-blue-200 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-900 font-extrabold text-[11px] uppercase border border-blue-200 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                        📊 Data Analyst Track ({daQuestions.length} Questions • 50 Pts Total)
                      </span>
                      <span className="text-[11px] font-semibold text-blue-600">
                        {daPythonQuestions.length} Python (30 Pts) + {daSqlQuestions.length} SQL (20 Pts)
                      </span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {filteredQuestions
                      .filter((q) => daQuestions.some((item) => item.id === q.id))
                      .map((q, idx) =>
                        renderCard(
                          q,
                          idx,
                          q.category === "SQL" ? "bg-amber-600" : "bg-sky-600"
                        )
                      )}
                  </div>
                </div>
              )}

              {/* SECTION: SOFTWARE DEVELOPER TRACK */}
              {(activeFilter === "ALL" || activeFilter === "SOFTWARE_DEV") && devQuestions.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-violet-200 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 rounded-full bg-violet-100 text-violet-900 font-extrabold text-[11px] uppercase border border-violet-200 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-violet-600" />
                        💻 Software Developer Track ({devQuestions.length} Questions • 50 Pts Total)
                      </span>
                      <span className="text-[11px] font-semibold text-violet-600">
                        5 Algorithmic Problems • 10 Pts Each
                      </span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {filteredQuestions
                      .filter((q) => devQuestions.some((item) => item.id === q.id))
                      .map((q, idx) => renderCard(q, idx, "bg-violet-600"))}
                  </div>
                </div>
              )}

              {/* SECTION: NETWORK ENGINEER TRACK */}
              {(activeFilter === "ALL" || activeFilter === "NETWORK_ENGINEER") && neQuestions.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-emerald-200 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 font-extrabold text-[11px] uppercase border border-emerald-200 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                        🌐 Network Engineer Track ({neQuestions.length} Questions • 50 Pts Total)
                      </span>
                      <span className="text-[11px] font-semibold text-emerald-600">
                        5 Network Automation & Theory Questions • 10 Pts Each
                      </span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {filteredQuestions
                      .filter((q) => neQuestions.some((item) => item.id === q.id))
                      .map((q, idx) => renderCard(q, idx, "bg-emerald-600"))}
                  </div>
                </div>
              )}

              {/* SECTION: CLOUD ENGINEER TRACK */}
              {(activeFilter === "ALL" || activeFilter === "CLOUD_ENGINEER") && cloudQuestions.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-cyan-200 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 rounded-full bg-cyan-100 text-cyan-900 font-extrabold text-[11px] uppercase border border-cyan-200 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-cyan-600" />
                        ☁️ Cloud Engineer Track ({cloudQuestions.length} Questions • 50 Pts Total)
                      </span>
                      <span className="text-[11px] font-semibold text-cyan-600">
                        5 Cloud Automation, K8s & Security Questions • 10 Pts Each
                      </span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {filteredQuestions
                      .filter((q) => cloudQuestions.some((item) => item.id === q.id))
                      .map((q, idx) => renderCard(q, idx, "bg-cyan-600"))}
                  </div>
                </div>
              )}

              {/* SECTION: AI ENGINEER TRACK */}
              {(activeFilter === "ALL" || activeFilter === "AI_ENGINEER") && aiQuestions.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-purple-200 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 rounded-full bg-purple-100 text-purple-900 font-extrabold text-[11px] uppercase border border-purple-200 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                        🤖 AI Engineer Track ({aiQuestions.length} Questions • 50 Pts Total)
                      </span>
                      <span className="text-[11px] font-semibold text-purple-600">
                        5 RAG, Vector Search, LLM & ML Questions • 10 Pts Each
                      </span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {filteredQuestions
                      .filter((q) => aiQuestions.some((item) => item.id === q.id))
                      .map((q, idx) => renderCard(q, idx, "bg-purple-600"))}
                  </div>
                </div>
              )}

              {/* SECTION: DIGITAL MARKETING TRACK */}
              {(activeFilter === "ALL" || activeFilter === "DIGITAL_MARKETING") && dmQuestions.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-rose-200 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 rounded-full bg-rose-100 text-rose-900 font-extrabold text-[11px] uppercase border border-rose-200 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-rose-600" />
                        📈 Digital Marketing Track ({dmQuestions.length} Questions • 50 Pts Total)
                      </span>
                      <span className="text-[11px] font-semibold text-rose-600">
                        5 Performance Marketing, SEO & Attribution Questions • 10 Pts Each
                      </span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {filteredQuestions
                      .filter((q) => dmQuestions.some((item) => item.id === q.id))
                      .map((q, idx) => renderCard(q, idx, "bg-rose-600"))}
                  </div>
                </div>
              )}

              {/* SECTION: ROUND 1 COGNITIVE APTITUDE & VERBAL */}
              {(activeFilter === "ALL" || activeFilter === "ROUND_1") && r1Questions.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 rounded-full bg-slate-200 text-slate-800 font-extrabold text-[11px] uppercase border border-slate-300 flex items-center gap-1.5">
                        🧠 Round 1: Aptitude & Verbal ({r1Questions.length} Questions • 20 Pts Total)
                      </span>
                      <span className="text-[11px] font-semibold text-slate-500">
                        1 Pt Each • Minimum Cutoff: 12 Pts
                      </span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {filteredQuestions
                      .filter((q) => r1Questions.some((item) => item.id === q.id))
                      .map((q, idx) => renderCard(q, idx, "bg-slate-700"))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* EDIT QUESTION & POINTS MODAL */}
      {editingQuestion && (
        <EditQuestionModal
          question={editingQuestion}
          onClose={() => setEditingQuestion(null)}
          onSuccess={async () => {
            await loadQuestions();
          }}
        />
      )}
    </div>
  );
};
