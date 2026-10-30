import React, { useState } from "react";
import { apiRequest } from "../services/api";
import type { Question, QuestionCategory } from "../types";
import { X, CheckCircle2, Save, Sparkles, Layers, Target } from "lucide-react";
import { CustomSelect } from "./CustomSelect";

interface EditQuestionModalProps {
  question: Question;
  onClose: () => void;
  onSuccess: () => void;
}

export const EditQuestionModal: React.FC<EditQuestionModalProps> = ({
  question,
  onClose,
  onSuccess,
}) => {
  const [title, setTitle] = useState(question.title);
  const [content, setContent] = useState(question.content);
  const [points, setPoints] = useState<number>(question.points || 10);
  const [targetRole, setTargetRole] = useState<"ALL" | "Software Developer" | "Data Analyst" | "Network Engineer">(
    (question.targetRole as any) || "ALL"
  );
  const [round, setRound] = useState<"ROUND_1_APTITUDE_VERBAL_WRITTEN" | "ROUND_2_CODING">(
    question.round || "ROUND_1_APTITUDE_VERBAL_WRITTEN"
  );
  const [category, setCategory] = useState<QuestionCategory>(question.category || "APTITUDE");

  // For MCQs
  const initialOptions = Array.isArray(question.options) && question.options.length > 0
    ? [...question.options, ...Array(Math.max(0, 4 - question.options.length)).fill("")]
    : ["", "", "", ""];
  const [options, setOptions] = useState<string[]>(initialOptions);
  const [correctAnswer, setCorrectAnswer] = useState<string>(question.correctAnswer || "");

  // For Coding / SQL
  const [codeLanguageTab, setCodeLanguageTab] = useState<"python" | "sql" | "javascript">(
    question.category === "SQL" ? "sql" : "python"
  );
  const [starterCodeJs, setStarterCodeJs] = useState(
    question.starterCode?.javascript || "function solution(input) {\n  // Write code here\n  \n}"
  );
  const [starterCodePy, setStarterCodePy] = useState(
    question.starterCode?.python || "def solution(input):\n    # Write Python code here\n    pass"
  );
  const [starterCodeSql, setStarterCodeSql] = useState(
    question.starterCode?.sql || "-- Write your SQL query here\nSELECT *\nFROM table_name;\n"
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const isMcq = (round === "ROUND_1_APTITUDE_VERBAL_WRITTEN" && category !== "WRITTEN_PROMPT") ||
    (Array.isArray(question.options) && question.options.length > 0);
  const isCodeOrQuery = round === "ROUND_2_CODING" || category === "SQL" || category === "PYTHON" || category === "CODING";

  const handleOptionChange = (idx: number, val: string) => {
    const updated = [...options];
    updated[idx] = val;
    setOptions(updated);
  };

  const handleAddOption = () => {
    if (options.length < 6) {
      setOptions([...options, ""]);
    }
  };

  const handleRemoveOption = (idx: number) => {
    if (options.length <= 2) return;
    const removedVal = options[idx];
    const updated = options.filter((_, i) => i !== idx);
    setOptions(updated);
    if (correctAnswer === removedVal) {
      setCorrectAnswer(updated[0] || "");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!title.trim() || !content.trim()) {
      setError("Title and Question Content are required.");
      return;
    }

    if (points === undefined || isNaN(Number(points)) || Number(points) < 1) {
      setError("Please specify a valid positive point score.");
      return;
    }

    if (isMcq) {
      const nonEmptyOptions = options.filter((o) => o.trim() !== "");
      if (nonEmptyOptions.length < 2) {
        setError("Please provide at least 2 non-empty options for multiple choice questions.");
        return;
      }
      if (!correctAnswer || !options.includes(correctAnswer)) {
        setError("Please select the correct answer by clicking on the radio button beside it.");
        return;
      }
    }

    setIsSubmitting(true);
    setError("");

    try {
      const payload: Record<string, unknown> = {
        title: title.trim(),
        content: content.trim(),
        category,
        round,
        points: Number(points),
        targetRole,
      };

      if (isMcq) {
        payload.options = options.filter((o) => o.trim() !== "");
        payload.correctAnswer = correctAnswer;
      } else {
        payload.options = null;
        payload.correctAnswer = null;
      }

      if (isCodeOrQuery) {
        payload.starterCode = {
          python: starterCodePy,
          sql: starterCodeSql,
          javascript: starterCodeJs,
        };
      }

      await apiRequest(`/admin/questions/${question.id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });

      onSuccess();
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update question.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const trackOptions = [
    {
      value: "ALL",
      label: "All Roles (Common Track)",
      description: "General questions shared across tracks",
    },
    {
      value: "Software Developer",
      label: "Software Developer Track",
      description: "Algorithms, Problem Solving & Software Engineering",
    },
    {
      value: "Data Analyst",
      label: "Data Analyst Track (Python & SQL)",
      description: "Python Data Analysis, Pandas & SQL Relational Queries",
    },
    {
      value: "Network Engineer",
      label: "Network Engineer Track",
      description: "Networking Automation & Security",
    },
  ];

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-[#eff5ff] text-[#16499c] border border-[#16499c]/20">
              <Sparkles className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Edit Question & Marks
              </h3>
              <p className="text-xs text-slate-500">
                Update prompt content, points weightage, role track, and answer criteria
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 font-medium">
              {error}
            </div>
          )}

          {/* Quick Edit Points and Round Banner */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100">
            <div>
              <label className="block text-slate-800 font-extrabold mb-1">
                Question Marks / Points <span className="text-indigo-600 font-black">*</span>
              </label>
              <div className="relative flex items-center">
                <input
                  type="number"
                  min="1"
                  max="500"
                  value={points}
                  onChange={(e) => setPoints(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl border-2 border-indigo-200 focus:border-indigo-600 bg-white font-black text-indigo-950 text-sm focus:outline-none"
                  required
                />
                <span className="absolute right-3.5 text-xs font-bold text-indigo-500 uppercase">
                  Pts
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Points awarded upon correct evaluation
              </p>
            </div>

            <div>
              <label className="block text-slate-800 font-extrabold mb-1">
                Assessment Round
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setRound("ROUND_1_APTITUDE_VERBAL_WRITTEN")}
                  className={`py-2 px-2.5 rounded-xl text-center font-bold transition-all cursor-pointer ${
                    round === "ROUND_1_APTITUDE_VERBAL_WRITTEN"
                      ? "bg-slate-900 text-white shadow-sm"
                      : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  Round 1 (Aptitude)
                </button>
                <button
                  type="button"
                  onClick={() => setRound("ROUND_2_CODING")}
                  className={`py-2 px-2.5 rounded-xl text-center font-bold transition-all cursor-pointer ${
                    round === "ROUND_2_CODING"
                      ? "bg-slate-900 text-white shadow-sm"
                      : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  Round 2 (Technical)
                </button>
              </div>
            </div>
          </div>

          {/* Role and Category */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-700 font-bold mb-1 flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-[#16499c]" />
                Target Track / Role
              </label>
              <CustomSelect
                value={targetRole}
                onChange={(val) => setTargetRole(val as any)}
                options={trackOptions}
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-indigo-500" />
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as QuestionCategory)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-semibold text-slate-800 focus:outline-none focus:border-[#16499c]"
              >
                <option value="APTITUDE">APTITUDE (Quantitative / Logical)</option>
                <option value="VERBAL">VERBAL (English Language & Comprehension)</option>
                <option value="WRITTEN_PROMPT">WRITTEN PROMPT (Technical Essay)</option>
                <option value="CODING">CODING (Software Developer DSA)</option>
                <option value="SQL">SQL (Database Query)</option>
                <option value="PYTHON">PYTHON (Data Analytics Scripting)</option>
                <option value="NETWORKING">NETWORKING (Network Engineering)</option>
              </select>
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-slate-700 font-bold mb-1">
              Question Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Advanced SQL: Department High-Earners Analytics"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-[#16499c] font-semibold text-slate-900"
              required
            />
          </div>

          {/* Content Description */}
          <div>
            <label className="block text-slate-700 font-bold mb-1">
              Question Content & Instructions <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={4}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Provide complete problem formulation, schema details, or multiple choice context..."
              className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-[#16499c] font-medium text-slate-900 leading-relaxed font-sans"
              required
            />
          </div>

          {/* MCQ Options Editor */}
          {isMcq && (
            <div className="space-y-3 pt-3 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <label className="block text-slate-800 font-bold">
                  Multiple Choice Options & Correct Answer
                </label>
                <button
                  type="button"
                  onClick={handleAddOption}
                  className="text-indigo-600 hover:text-indigo-700 font-bold text-[11px] cursor-pointer"
                >
                  + Add Option
                </button>
              </div>
              <p className="text-[11px] text-slate-500">
                Click the radio button beside an option to mark it as the <strong className="text-emerald-700 font-semibold">correct answer</strong>.
              </p>

              <div className="space-y-2">
                {options.map((opt, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setCorrectAnswer(opt)}
                      className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 border transition-all cursor-pointer ${
                        correctAnswer === opt && opt.trim() !== ""
                          ? "bg-emerald-500 border-emerald-600 text-white shadow-xs"
                          : "border-slate-300 hover:border-slate-400 bg-white"
                      }`}
                      title="Set as correct answer"
                    >
                      {correctAnswer === opt && opt.trim() !== "" && (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <span className="w-5 text-slate-400 font-bold">
                      {String.fromCharCode(65 + idx)}.
                    </span>
                    <input
                      type="text"
                      value={opt}
                      onChange={(e) => {
                        const val = e.target.value;
                        handleOptionChange(idx, val);
                        if (correctAnswer === opt) setCorrectAnswer(val);
                      }}
                      placeholder={`Option ${String.fromCharCode(65 + idx)}`}
                      className={`flex-1 px-3 py-1.5 rounded-xl border font-medium focus:outline-none ${
                        correctAnswer === opt && opt.trim() !== ""
                          ? "border-emerald-300 bg-emerald-50/30 text-emerald-950 font-semibold"
                          : "border-slate-200 bg-white text-slate-800"
                      }`}
                    />
                    {options.length > 2 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveOption(idx)}
                        className="p-1 text-slate-300 hover:text-rose-500 rounded cursor-pointer"
                        title="Remove option"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Starter Code Editor for Coding / SQL */}
          {isCodeOrQuery && (
            <div className="space-y-2 pt-3 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <label className="block text-slate-800 font-bold">
                  Starter Template Code
                </label>
                <div className="flex items-center gap-1">
                  {(["python", "sql", "javascript"] as const).map((lang) => (
                    <button
                      key={lang}
                      type="button"
                      onClick={() => setCodeLanguageTab(lang)}
                      className={`px-2 py-0.5 rounded-lg font-mono text-[10px] font-bold uppercase transition-colors cursor-pointer ${
                        codeLanguageTab === lang
                          ? "bg-slate-900 text-white"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {lang}
                    </button>
                  ))}
                </div>
              </div>

              {codeLanguageTab === "python" && (
                <textarea
                  rows={4}
                  value={starterCodePy}
                  onChange={(e) => setStarterCodePy(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-mono text-xs bg-slate-900 text-sky-300 focus:outline-none"
                />
              )}
              {codeLanguageTab === "sql" && (
                <textarea
                  rows={4}
                  value={starterCodeSql}
                  onChange={(e) => setStarterCodeSql(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-mono text-xs bg-slate-900 text-amber-300 focus:outline-none"
                />
              )}
              {codeLanguageTab === "javascript" && (
                <textarea
                  rows={4}
                  value={starterCodeJs}
                  onChange={(e) => setStarterCodeJs(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-mono text-xs bg-slate-900 text-emerald-300 focus:outline-none"
                />
              )}
            </div>
          )}

          {/* Actions */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold cursor-pointer transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#16499c] hover:bg-[#123c80] text-white font-bold text-xs shadow-md shadow-[#16499c]/20 cursor-pointer transition-all transform hover:-translate-y-0.5 active:translate-y-0"
            >
              <Save className="w-4 h-4" />
              {isSubmitting ? "Saving Updates..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
