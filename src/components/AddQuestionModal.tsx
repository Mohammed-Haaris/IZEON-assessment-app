import React, { useState } from "react";
import { apiRequest } from "../services/api";
import type { Assessment, QuestionCategory } from "../types";
import { X, Plus, BookOpen, Layers, Target, CheckCircle2 } from "lucide-react";
import { CustomSelect } from "./CustomSelect";

interface AddQuestionModalProps {
  assessments: Assessment[];
  selectedAssessmentId?: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const AddQuestionModal: React.FC<AddQuestionModalProps> = ({
  assessments,
  selectedAssessmentId,
  onClose,
  onSuccess,
}) => {
  const [assessmentId, setAssessmentId] = useState<string>(
    selectedAssessmentId || (assessments[0]?.id ?? "")
  );
  const [targetRole, setTargetRole] = useState<"ALL" | "Software Developer" | "Data Analyst">("ALL");
  const [round, setRound] = useState<"ROUND_1_APTITUDE_VERBAL_WRITTEN" | "ROUND_2_CODING">(
    "ROUND_1_APTITUDE_VERBAL_WRITTEN"
  );
  const [category, setCategory] = useState<QuestionCategory>("APTITUDE");

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [points, setPoints] = useState<number>(10);

  // For MCQs (Aptitude, Verbal, Python & SQL MCQs)
  const [options, setOptions] = useState<string[]>(["", "", "", ""]);
  const [correctAnswer, setCorrectAnswer] = useState<string>("");

  // For Coding & Query questions
  const [codeLanguageTab, setCodeLanguageTab] = useState<"python" | "sql" | "javascript">("python");
  const [starterCodeJs, setStarterCodeJs] = useState(
    "function solution(input) {\n  // Write code here\n  \n}"
  );
  const [starterCodePy, setStarterCodePy] = useState(
    "def solution(input):\n    # Write Python code here\n    pass"
  );
  const [starterCodeSql, setStarterCodeSql] = useState(
    "-- Write your SQL query here\nSELECT *\nFROM table_name\nWHERE condition;\n"
  );
  const [sampleInput, setSampleInput] = useState("");
  const [sampleOutput, setSampleOutput] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const isMcq = round === "ROUND_1_APTITUDE_VERBAL_WRITTEN" && category !== "WRITTEN_PROMPT";
  const isCodeOrQuery = round === "ROUND_2_CODING";

  // Auto-switch category when round or role changes
  const handleRoundChange = (newRound: "ROUND_1_APTITUDE_VERBAL_WRITTEN" | "ROUND_2_CODING") => {
    setRound(newRound);
    if (newRound === "ROUND_2_CODING") {
      if (targetRole === "Data Analyst") {
        setCategory("SQL");
        setCodeLanguageTab("sql");
      } else {
        setCategory("CODING");
        setCodeLanguageTab("python");
      }
      setPoints(50);
    } else {
      setCategory(targetRole === "Data Analyst" ? "SQL" : "APTITUDE");
      setPoints(10);
    }
  };

  const handleRoleChange = (newRole: "ALL" | "Software Developer" | "Data Analyst") => {
    setTargetRole(newRole);
    if (newRole === "Data Analyst") {
      if (round === "ROUND_2_CODING") {
        setCategory("SQL");
        setCodeLanguageTab("sql");
      } else {
        setCategory("PYTHON");
      }
    }
  };

  const handleOptionChange = (idx: number, val: string) => {
    const updated = [...options];
    updated[idx] = val;
    setOptions(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assessmentId) {
      setError("Please select an assessment.");
      return;
    }
    if (!title.trim() || !content.trim()) {
      setError("Title and Question Content are required.");
      return;
    }

    if (isMcq) {
      const nonEmptyOptions = options.filter((o) => o.trim() !== "");
      if (nonEmptyOptions.length < 2) {
        setError("Please provide at least 2 options for multiple choice questions.");
        return;
      }
      if (!correctAnswer || !options.includes(correctAnswer)) {
        setError("Please choose the correct answer by clicking the radio button beside it.");
        return;
      }
    }

    setIsSubmitting(true);
    setError("");

    try {
      const payload: any = {
        title,
        content,
        category,
        round,
        points: Number(points) || 10,
        targetRole,
      };

      if (isMcq) {
        payload.options = options.filter((o) => o.trim() !== "");
        payload.correctAnswer = correctAnswer;
      }

      if (isCodeOrQuery) {
        payload.starterCode = {
          python: starterCodePy,
          sql: starterCodeSql,
          javascript: starterCodeJs,
        };
        if (sampleInput || sampleOutput) {
          payload.testCases = [
            {
              input: sampleInput,
              output: sampleOutput,
              isHidden: false,
            },
          ];
        }
      }

      await apiRequest(`/admin/assessments/${assessmentId}/questions`, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to add question.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Assessment options for custom dropdown
  const assessmentOptions = assessments.map((a) => ({
    value: a.id,
    label: a.title,
    badge: a.isActive ? "Active Exam" : "Inactive",
    description: `R1: ${a.durationR1}m • R2: ${a.durationR2}m`,
  }));

  // Track options for custom dropdown
  const trackOptions = [
    {
      value: "ALL",
      label: "All Roles (Common Track)",
      description: "General questions shared across software developer and data analyst tracks",
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
  ];

  // Round options for custom dropdown
  const roundOptions = [
    {
      value: "ROUND_1_APTITUDE_VERBAL_WRITTEN",
      label: "Round 1: Cognitive & Knowledge",
      description: "Aptitude, Verbal, Track MCQs and written essay prompt",
    },
    {
      value: "ROUND_2_CODING",
      label: "Round 2: Supervised Coding / Queries",
      description: "Live execution in Monaco Editor with webcam proctoring",
    },
  ];

  // Category options for custom dropdown
  const categoryOptions =
    round === "ROUND_1_APTITUDE_VERBAL_WRITTEN"
      ? [
          { value: "APTITUDE", label: "Aptitude (Quantitative / Logical MCQ)" },
          { value: "VERBAL", label: "Verbal Reasoning & Grammar MCQ" },
          { value: "PYTHON", label: "Python Data Analysis MCQ (Analyst Track)" },
          { value: "SQL", label: "SQL Query & Relations MCQ (Analyst Track)" },
          { value: "WRITTEN_PROMPT", label: "Written Grammar & Essay Prompt" },
        ]
      : [
          { value: "CODING", label: "Coding Problem (Software Dev Track)" },
          { value: "SQL", label: "SQL Query Problem (Data Analyst Track)" },
          { value: "PYTHON", label: "Python Scripting Problem (Data Analyst Track)" },
        ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200/80 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Top Light Green Brand Line */}
        <div className="h-1.5 bg-gradient-to-r from-[#16499c] via-[#2563eb] to-[#123c80]" />

        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#eff5ff] border border-[#16499c]/30 flex items-center justify-center text-[#16499c] shadow-xs">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">Add Question to Assessment</h3>
              <p className="text-xs text-slate-500">
                New questions will be immediately available to students in active test sessions
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1 text-xs">
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 font-medium">
              {error}
            </div>
          )}

          {/* Assessment Selection - Custom Crafted Dropdown */}
          <div>
            <label className="block font-bold text-slate-800 mb-1.5 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-[#16499c]" />
              Target Assessment
            </label>
            <CustomSelect
              value={assessmentId}
              onChange={setAssessmentId}
              options={assessmentOptions}
              placeholder="Select an examination..."
            />
          </div>

          {/* Target Track & Round Selection - Custom Crafted Dropdowns */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div>
              <label className="block font-bold text-slate-800 mb-1.5 flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-[#16499c]" />
                Target Track
              </label>
              <CustomSelect
                value={targetRole}
                onChange={(val) => handleRoleChange(val as any)}
                options={trackOptions}
              />
            </div>

            <div>
              <label className="block font-bold text-slate-800 mb-1.5 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-[#16499c]" />
                Assessment Round
              </label>
              <CustomSelect
                value={round}
                onChange={(val) => handleRoundChange(val as any)}
                options={roundOptions}
              />
            </div>

            {/* Category Selector - Custom Crafted Dropdown */}
            <div>
              <label className="block font-bold text-slate-800 mb-1.5 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#16499c]" />
                Category Type
              </label>
              <CustomSelect
                value={category}
                onChange={(val) => setCategory(val as any)}
                options={categoryOptions}
              />
            </div>
          </div>

          {/* Question Title & Points */}
          <div className="grid grid-cols-4 gap-3">
            <div className="col-span-3">
              <label className="block font-bold text-slate-800 mb-1.5">Question Title</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., SQL: Department Salary Aggregations or Python: Data Filtering"
                className="w-full p-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#16499c]/20 focus:border-[#16499c] font-medium"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-800 mb-1.5">Points</label>
              <input
                type="number"
                min="1"
                max="100"
                required
                value={points}
                onChange={(e) => setPoints(Number(e.target.value))}
                className="w-full p-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#16499c]/20 focus:border-[#16499c] font-medium"
              />
            </div>
          </div>

          {/* Question Content / Prompt */}
          <div>
            <label className="block font-bold text-slate-800 mb-1.5">
              Question Description / Problem Statement
            </label>
            <textarea
              rows={4}
              required
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Enter the complete question, scenario, or SQL/Python problem specifications..."
              className="w-full p-3 rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#16499c]/20 focus:border-[#16499c] leading-relaxed font-sans font-medium"
            />
          </div>

          {/* MCQ Options (If MCQ) */}
          {isMcq && (
            <div className="p-4 bg-slate-50/80 border border-slate-200/80 rounded-2xl space-y-3">
              <div className="flex justify-between items-center">
                <span className="font-bold text-slate-800">Multiple Choice Options</span>
                <span className="text-[11px] text-slate-500 font-medium">
                  Select the radio button next to the correct answer
                </span>
              </div>

              {options.map((opt, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="correctAnswerRadio"
                    checked={Boolean(correctAnswer && correctAnswer === opt && opt.trim() !== "")}
                    onChange={() => opt.trim() && setCorrectAnswer(opt)}
                    className="w-4 h-4 text-[#16499c] accent-[#16499c] focus:ring-[#16499c]"
                  />
                  <span className="w-5 text-center font-bold text-slate-500">
                    {String.fromCharCode(65 + idx)}.
                  </span>
                  <input
                    type="text"
                    value={opt}
                    onChange={(e) => {
                      handleOptionChange(idx, e.target.value);
                      if (correctAnswer === opt) {
                        setCorrectAnswer(e.target.value);
                      }
                    }}
                    placeholder={`Option ${String.fromCharCode(65 + idx)}`}
                    className="flex-1 p-2 rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#16499c]/20 focus:border-[#16499c] font-medium"
                  />
                </div>
              ))}
            </div>
          )}

          {/* Coding & Query Configuration */}
          {isCodeOrQuery && (
            <div className="p-4 bg-slate-50/80 border border-slate-200/80 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800">Starter Code & Test Cases</span>
                <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setCodeLanguageTab("python")}
                    className={`px-3 py-1 rounded-lg font-bold cursor-pointer transition-all ${
                      codeLanguageTab === "python"
                        ? "bg-[#16499c] text-white shadow-xs"
                        : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    Python
                  </button>
                  <button
                    type="button"
                    onClick={() => setCodeLanguageTab("sql")}
                    className={`px-3 py-1 rounded-lg font-bold cursor-pointer transition-all ${
                      codeLanguageTab === "sql"
                        ? "bg-[#16499c] text-white shadow-xs"
                        : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    SQL
                  </button>
                  <button
                    type="button"
                    onClick={() => setCodeLanguageTab("javascript")}
                    className={`px-3 py-1 rounded-lg font-bold cursor-pointer transition-all ${
                      codeLanguageTab === "javascript"
                        ? "bg-[#16499c] text-white shadow-xs"
                        : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    JavaScript
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Sample Test Input
                  </label>
                  <input
                    type="text"
                    value={sampleInput}
                    onChange={(e) => setSampleInput(e.target.value)}
                    placeholder="e.g., transactions dataset or nums = [2, 7]"
                    className="w-full p-2 rounded-xl border border-slate-200 bg-white font-mono text-[11px] text-slate-900 focus:outline-none focus:border-[#16499c]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Expected Test Output
                  </label>
                  <input
                    type="text"
                    value={sampleOutput}
                    onChange={(e) => setSampleOutput(e.target.value)}
                    placeholder="e.g., {'total_volume': 350.0} or [0, 1]"
                    className="w-full p-2 rounded-xl border border-slate-200 bg-white font-mono text-[11px] text-slate-900 focus:outline-none focus:border-[#16499c]"
                  />
                </div>
              </div>

              {/* Starter code box */}
              {codeLanguageTab === "python" && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Starter Code (Python)
                  </label>
                  <textarea
                    rows={4}
                    value={starterCodePy}
                    onChange={(e) => setStarterCodePy(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-mono text-[11px] bg-white text-slate-900 focus:outline-none focus:border-[#16499c]"
                  />
                </div>
              )}

              {codeLanguageTab === "sql" && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Starter Code (SQL)
                  </label>
                  <textarea
                    rows={4}
                    value={starterCodeSql}
                    onChange={(e) => setStarterCodeSql(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-mono text-[11px] bg-white text-slate-900 focus:outline-none focus:border-[#16499c]"
                  />
                </div>
              )}

              {codeLanguageTab === "javascript" && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Starter Code (JavaScript)
                  </label>
                  <textarea
                    rows={4}
                    value={starterCodeJs}
                    onChange={(e) => setStarterCodeJs(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-mono text-[11px] bg-white text-slate-900 focus:outline-none focus:border-[#16499c]"
                  />
                </div>
              )}
            </div>
          )}

          {/* Action buttons */}
          <div className="pt-3 flex justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs cursor-pointer transition-all"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#16499c] hover:bg-[#123c80] text-white font-extrabold text-xs shadow-xs cursor-pointer disabled:opacity-50 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
            >
              <Plus className="w-4 h-4" />
              {isSubmitting ? "Adding Question..." : "Add Question to Exam"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
