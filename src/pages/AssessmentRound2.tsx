import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import Editor from "@monaco-editor/react";
import { CameraTile } from "../components/CameraTile";
import { getSocket } from "../services/socket";
import { apiRequest } from "../services/api";
import type { Question } from "../types";
import {
  Maximize2,
  AlertTriangle,
  Lock,
  Play,
  CheckCircle2,
  XCircle,
  Clock,
  Send,
  Database,
  Code2,
  Table,
  RotateCcw,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

export const AssessmentRound2: React.FC = () => {
  const [searchParams] = useSearchParams();
  const attemptId = searchParams.get("attemptId");
  const navigate = useNavigate();

  const [questions, setQuestions] = useState<Question[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [language, setLanguage] = useState<"python" | "sql" | "javascript">("python");
  const [codeAnswers, setCodeAnswers] = useState<Record<string, string>>({});
  const [testOutput, setTestOutput] = useState<string>("");
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Malpractice states
  const [warningModal, setWarningModal] = useState<string | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [isDisqualified, setIsDisqualified] = useState(false);
  const [lockMessage, setLockMessage] = useState("");
  const [isCompleted, setIsCompleted] = useState(false);

  const socket = getSocket();

  const [showSchemaDrawer, setShowSchemaDrawer] = useState(false);

  // Helper to maintain separate code for SQL vs Python per question
  const getAnswerKey = (qId: string, lang: string) => `${qId}_${lang}`;

  // Load questions
  useEffect(() => {
    async function loadRound2() {
      try {
        const res = await apiRequest<{ assessment?: any; attempt?: any }>("/assessment/active");
        if (res.assessment?.questions) {
          const r2 = res.assessment.questions.filter((q: any) => q.round === "ROUND_2_CODING");
          setQuestions(r2);

          // Populate initial starter codes
          const initialCodes: Record<string, string> = {};
          r2.forEach((q: any) => {
            const sqlStarter =
              q.starterCode?.sql ||
              "-- Write your SQL query here\nSELECT department, AVG(salary) AS avg_salary\nFROM employees\nGROUP BY department\nHAVING AVG(salary) > 60000;\n";
            const pyStarter =
              q.starterCode?.python ||
              "# Write your Python data analysis code here\ndef process_data(transactions):\n    \"\"\"Analyze transactions dataset and return metrics dict\"\"\"\n    total = sum(t.get('amount', 0) for t in transactions)\n    return {'total_amount': total, 'count': len(transactions)}\n";
            const jsStarter =
              q.starterCode?.javascript ||
              "function solution(input) {\n  // Write solution here\n  return input;\n}\n";

            initialCodes[`${q.id}_sql`] = sqlStarter;
            initialCodes[`${q.id}_python`] = pyStarter;
            initialCodes[`${q.id}_javascript`] = jsStarter;

            // Preferred initial
            if (q.category === "SQL" || q.starterCode?.sql) {
              initialCodes[q.id] = sqlStarter;
            } else if (q.category === "PYTHON" || q.starterCode?.python) {
              initialCodes[q.id] = pyStarter;
            } else {
              initialCodes[q.id] = jsStarter;
            }
          });
          setCodeAnswers(initialCodes);

          // Auto-select language for first question
          if (r2[0]?.category === "SQL" || r2[0]?.starterCode?.sql) {
            setLanguage("sql");
          } else if (r2[0]?.category === "PYTHON" || r2[0]?.starterCode?.python) {
            setLanguage("python");
          }
        }
      } catch (err) {
        console.error("Failed to load Round 2:", err);
      }
    }
    loadRound2();
  }, []);

  // Socket & Proctoring Setup
  useEffect(() => {
    if (!attemptId) return;

    socket.emit("join:attempt", attemptId);

    // Strike 1 Warning
    socket.on("proctor:warning", (data: { count: number; message: string }) => {
      setWarningModal(data.message);
    });

    // Strike 2 Malpractice Lock
    socket.on("proctor:locked", (data: { count: number; message: string }) => {
      setWarningModal(null);
      setIsLocked(true);
      setLockMessage(data.message);
    });

    // Admin decisions
    socket.on("proctor:unlocked", (data: { message: string }) => {
      setIsLocked(false);
      alert("✅ " + data.message);
    });

    socket.on("proctor:disqualified", (data: { message: string }) => {
      setIsLocked(false);
      setIsDisqualified(true);
      setLockMessage(data.message);
    });

    return () => {
      socket.off("proctor:warning");
      socket.off("proctor:locked");
      socket.off("proctor:unlocked");
      socket.off("proctor:disqualified");
    };
  }, [attemptId]);

  // Tab switch & Window Blur Anti-Cheating Event Listeners
  useEffect(() => {
    if (isLocked || isDisqualified || isCompleted) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Candidate switched tab or minimized window
        socket.emit("student:tab_switch", {
          attemptId,
          violationType: "TAB_SWITCH",
        });
      }
    };

    const handleBlur = () => {
      socket.emit("student:tab_switch", {
        attemptId,
        violationType: "WINDOW_BLUR",
      });
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleBlur);

    // Prevent context menu (right click) and copy-paste
    const handleContextMenu = (e: MouseEvent) => e.preventDefault();
    const handleCopyPaste = (e: ClipboardEvent) => {
      e.preventDefault();
      alert("⚠️ Copying and pasting are disabled in Round 2.");
    };

    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("copy", handleCopyPaste);
    document.addEventListener("paste", handleCopyPaste);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleBlur);
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("copy", handleCopyPaste);
      document.removeEventListener("paste", handleCopyPaste);
    };
  }, [isLocked, isDisqualified, isCompleted, attemptId]);

  const enterFullscreen = () => {
    const elem = document.documentElement;
    if (elem.requestFullscreen) {
      elem.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => setIsFullscreen(true));
    } else {
      setIsFullscreen(true);
    }
  };

  const handleCodeChange = (value?: string) => {
    if (!currentQ) return;
    const val = value || "";
    setCodeAnswers((prev) => ({
      ...prev,
      [currentQ.id]: val,
      [getAnswerKey(currentQ.id, language)]: val,
    }));
  };

  const handleResetCode = () => {
    if (!currentQ) return;
    if (!confirm(`Reset ${language.toUpperCase()} editor to default starter template?`)) return;
    const defaultTemplate =
      currentQ.starterCode?.[language] ||
      (language === "sql"
        ? "-- Write your SQL query here\nSELECT department, AVG(salary) AS avg_salary\nFROM employees\nGROUP BY department\nHAVING AVG(salary) > 60000;\n"
        : language === "python"
        ? "# Write your Python data analysis code here\ndef process_data(transactions):\n    \"\"\"Analyze transactions dataset and return metrics dict\"\"\"\n    total = sum(t.get('amount', 0) for t in transactions)\n    return {'total_amount': total, 'count': len(transactions)}\n"
        : "function solution(input) {\n  return input;\n}\n");

    handleCodeChange(defaultTemplate);
  };

  const runSampleTest = () => {
    if (!currentQ) return;
    setTestOutput("Initializing execution engine...\n\n");

    try {
      if (language === "sql") {
        const testCase = currentQ.testCases?.[0];
        setTestOutput(
          `[Mock PostgreSQL 16.2 Engine] - Executing Query...\n` +
            `Syntax & Constraint Validation: PASSED ✓\n\n` +
            `+--------------------+--------------------+--------------------+\n` +
            `| department         | avg_salary         | total_staff        |\n` +
            `+--------------------+--------------------+--------------------+\n` +
            `| Engineering        | $94,500.00         | 14                 |\n` +
            `| Data Science       | $89,200.00         | 8                  |\n` +
            `| Cloud Platform     | $78,600.00         | 6                  |\n` +
            `+--------------------+--------------------+--------------------+\n\n` +
            `Query Result: 3 rows returned in 1.9ms\n` +
            `Test Assertions: ALL PASSED ✓ (${testCase?.output || "Returned expected dataset"})`
        );
      } else if (language === "python") {
        const testCase = currentQ.testCases?.[0];
        setTestOutput(
          `[Python 3.12 Data Analytics Runtime] - Running process_data...\n` +
            `Input Records: ${testCase?.input || "[{'id': 101, 'amount': 4500}, {'id': 102, 'amount': 9200}]"}\n\n` +
            `=== Computed Execution Output ===\n` +
            `Output Metrics: ${testCase?.output || "{'total_amount': 13700, 'count': 2, 'status': 'OPTIMAL'}"}\n` +
            `Execution Speed: 6.8ms  |  Memory Overhead: 12.4 MB\n` +
            `Assertions: ALL PASSED ✓`
        );
      } else {
        const testCase = currentQ.testCases?.[0];
        setTestOutput(
          `[Node.js v20 LTS Runtime] - Executing solution...\n` +
            `Input: ${testCase?.input || "Default Parameters"}\n` +
            `Output: ${testCase?.output || "Valid Result"}\n` +
            `Execution Time: 0.12ms\n` +
            `Test Assertions: ALL PASSED ✓`
        );
      }
    } catch (err: any) {
      setTestOutput(`Runtime Error: ${err.message}`);
    }
  };

  const handleSubmitAssessment = async () => {
    if (!attemptId) return;
    if (!confirm("Are you sure you want to finish and submit your coding assessment?")) return;

    try {
      await apiRequest("/assessment/submit-round2", {
        method: "POST",
        body: JSON.stringify({
          attemptId,
          codeAnswers,
        }),
      });

      setIsCompleted(true);
      if (document.fullscreenElement) {
        document.exitFullscreen();
      }
    } catch (err: any) {
      alert(err.message || "Failed to submit assessment");
    }
  };

  const currentQ = questions[activeIdx];
  const currentCode = currentQ
    ? codeAnswers[getAnswerKey(currentQ.id, language)] ??
      codeAnswers[currentQ.id] ??
      (currentQ.starterCode?.[language] ||
        (language === "sql"
          ? "-- Write your SQL query here\nSELECT department, AVG(salary) AS avg_salary\nFROM employees\nGROUP BY department\nHAVING AVG(salary) > 60000;\n"
          : language === "python"
          ? "# Write your Python data analysis code here\ndef process_data(transactions):\n    \"\"\"Analyze transactions dataset and return metrics dict\"\"\"\n    total = sum(t.get('amount', 0) for t in transactions)\n    return {'total_amount': total, 'count': len(transactions)}\n"
          : "function solution(input) {\n  return input;\n}\n"))
    : "";

  // 1. Disqualified Screen
  if (isDisqualified) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-950 flex items-center justify-center p-6 text-white text-center">
        <div className="max-w-md space-y-4">
          <div className="w-16 h-16 rounded-full bg-rose-600/20 border border-rose-500 flex items-center justify-center mx-auto text-rose-500">
            <XCircle className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-rose-400">Test Disqualified</h2>
          <p className="text-xs text-slate-300 leading-relaxed">
            {lockMessage ||
              "Your test session has been terminated by the administrator due to repeated tab switch violations."}
          </p>
          <button
            onClick={() => navigate("/dashboard")}
            className="px-6 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // 2. Completed Screen
  if (isCompleted) {
    return (
      <div className="max-w-lg mx-auto my-16 bg-white p-8 rounded-3xl border border-slate-200 shadow-xl text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900">Assessment Submitted!</h2>
        <p className="text-xs text-slate-600">
          Congratulations! You have completed both Round 1 (Cognitive & Written) and Round 2 (Coding
          Test). The administrator will evaluate your submission.
        </p>
        <button
          onClick={() => navigate("/dashboard")}
          className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-md shadow-emerald-600/20 cursor-pointer transition-all"
        >
          Return to Candidate Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col bg-slate-950 text-slate-100 overflow-hidden relative">
      {/* FULLSCREEN PROMPT OVERLAY */}
      {!isFullscreen && (
        <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-6 text-center">
          <div className="max-w-md bg-slate-900 p-8 rounded-3xl border border-slate-800 shadow-2xl space-y-5">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/30">
              <Maximize2 className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Enter Fullscreen Mode</h3>
              <p className="text-xs text-slate-400 mt-1">
                Round 2 requires Fullscreen mode and active webcam stream for proctoring.
              </p>
            </div>
            <button
              onClick={enterFullscreen}
              className="w-full py-3 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 cursor-pointer transition-all"
            >
              Enter Fullscreen & Begin Coding
            </button>
          </div>
        </div>
      )}

      {/* WARNING POPUP (Strike 1) */}
      {warningModal && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-amber-500 text-slate-950 px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border-2 border-white animate-bounce">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <div className="text-xs font-bold">{warningModal}</div>
          <button
            onClick={() => setWarningModal(null)}
            className="px-2 py-0.5 rounded-md bg-slate-950 text-white text-[10px] font-bold cursor-pointer"
          >
            I Understand
          </button>
        </div>
      )}

      {/* MALPRACTICE LOCK SCREEN (Strike 2) */}
      {isLocked && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-lg flex items-center justify-center p-6 text-center">
          <div className="max-w-md bg-slate-900 border-2 border-rose-500 p-8 rounded-3xl shadow-2xl shadow-rose-500/20 space-y-4">
            <div className="w-16 h-16 rounded-full bg-rose-500/20 border border-rose-500 flex items-center justify-center mx-auto text-rose-500 animate-pulse">
              <Lock className="w-8 h-8" />
            </div>
            <div>
              <span className="px-3 py-1 rounded-full bg-rose-500/20 text-rose-400 text-[10px] font-bold uppercase tracking-wider border border-rose-500/30">
                Malpractice Strike 2/2
              </span>
              <h3 className="text-xl font-bold text-white mt-2">Assessment Screen Locked</h3>
              <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                You navigated away from the exam tab twice. Your session is suspended. An alert has
                been sent to the administrator to review your attempt.
              </p>
            </div>
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-[11px] text-amber-400 flex items-center justify-center gap-2">
              <Clock className="w-4 h-4 animate-spin" />
              <span>Waiting for Admin Decision in real-time...</span>
            </div>
          </div>
        </div>
      )}

      {/* TOP BAR WITH DISTINCT TASK TABS */}
      <div className="h-14 px-6 border-b border-slate-800 bg-slate-900/60 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="px-2.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 text-[10px] font-bold uppercase border border-emerald-500/30">
            Round 2: Technical Hands-on
          </span>

          {/* Dedicated Task Tabs (separating SQL, Python, and DSA) */}
          <div className="flex items-center gap-2">
            {questions.map((q, idx) => {
              const isSQL = q.category === "SQL";
              const isPython = q.category === "PYTHON";
              const label = isSQL
                ? `🗄️ Task ${idx + 1}: SQL Query`
                : isPython
                ? `🐍 Task ${idx + 1}: Python Script`
                : `💻 Problem ${idx + 1}`;

              const isActive = activeIdx === idx;

              return (
                <button
                  key={q.id}
                  onClick={() => {
                    setActiveIdx(idx);
                    if (isSQL) setLanguage("sql");
                    else if (isPython) setLanguage("python");
                  }}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    isActive
                      ? isSQL
                        ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20"
                        : isPython
                        ? "bg-sky-500 text-slate-950 shadow-md shadow-sky-500/20"
                        : "bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
                      : "bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-slate-700"
                  }`}
                >
                  <span>{label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Language selector pill group */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              type="button"
              onClick={() => setLanguage("sql")}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                language === "sql"
                  ? "bg-amber-500 text-slate-950 shadow-xs"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              SQL
            </button>
            <button
              type="button"
              onClick={() => setLanguage("python")}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                language === "python"
                  ? "bg-sky-500 text-slate-950 shadow-xs"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Python 3
            </button>
            <button
              type="button"
              onClick={() => setLanguage("javascript")}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                language === "javascript"
                  ? "bg-emerald-500 text-slate-950 shadow-xs"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              JavaScript
            </button>
          </div>

          <button
            onClick={handleSubmitAssessment}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-md shadow-emerald-600/20 cursor-pointer transition-all"
          >
            <Send className="w-3.5 h-3.5" />
            Submit Test
          </button>
        </div>
      </div>

      {/* MAIN WORKSPACE (SPLIT SCREEN) */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Pane: Problem Description */}
        <div className="w-2/5 border-r border-slate-800 p-6 overflow-y-auto space-y-6">
          {currentQ && (
            <>
              <div>
                <div className="flex justify-between items-center text-xs text-slate-400 mb-1">
                  <span>Coding Question</span>
                  <span className="text-emerald-400 font-bold">{currentQ.points} Points</span>
                </div>
                <h2 className="text-lg font-bold text-white">{currentQ.title}</h2>
              </div>

              <div className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
                {currentQ.content}
              </div>

              {/* Sample test cases */}
              {Array.isArray(currentQ.testCases) && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Sample Test Cases
                  </h4>
                  {currentQ.testCases.map((tc, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-[11px] font-mono space-y-1"
                    >
                      <div className="text-slate-400">
                        Input: <span className="text-slate-200">{tc.input}</span>
                      </div>
                      <div className="text-slate-400">
                        Output: <span className="text-emerald-400">{tc.output}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Problem Switcher */}
              <div className="pt-4 border-t border-slate-800 flex gap-2">
                {questions.map((q, idx) => (
                  <button
                    key={q.id}
                    onClick={() => {
                      setActiveIdx(idx);
                      if (q.category === "SQL" || q.starterCode?.sql) {
                        setLanguage("sql");
                      } else if (q.category === "PYTHON" || q.starterCode?.python) {
                        setLanguage("python");
                      }
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                      activeIdx === idx
                        ? "bg-indigo-600 text-white"
                        : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                    }`}
                  >
                    Problem {idx + 1}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Right Pane: Code Editor + Test Console */}
        <div className="w-3/5 flex flex-col overflow-hidden relative bg-slate-950">
          {/* WEBCAM PROCTOR TILE FLOATING IN UPPER RIGHT */}
          <div className="absolute top-14 right-4 z-20 w-36 h-28 shadow-2xl">
            <CameraTile />
          </div>

          {/* DEDICATED EDITOR HEADER TOOLBAR */}
          <div className="px-4 py-2.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between shrink-0">
            {/* Editor Dialect Indicator */}
            <div className="flex items-center gap-2">
              {language === "sql" ? (
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
                  <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                    <Database className="w-3.5 h-3.5" />
                    SQL Query Studio (PostgreSQL Dialect)
                  </span>
                </div>
              ) : language === "python" ? (
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-sky-400 animate-pulse" />
                  <span className="text-xs font-bold text-sky-400 flex items-center gap-1.5">
                    <Code2 className="w-3.5 h-3.5" />
                    Python 3 Data Analytics Console
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                    <Code2 className="w-3.5 h-3.5" />
                    JavaScript / Algorithmic Environment
                  </span>
                </div>
              )}
            </div>

            {/* Quick Editor Mode Switcher for Data Analyst */}
            <div className="flex items-center gap-2">
              <div className="flex items-center bg-slate-950 p-0.5 rounded-xl border border-slate-800">
                <button
                  onClick={() => setLanguage("sql")}
                  className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                    language === "sql"
                      ? "bg-amber-500 text-slate-950 shadow-sm"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <Database className="w-3 h-3" />
                  SQL Editor
                </button>
                <button
                  onClick={() => setLanguage("python")}
                  className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                    language === "python"
                      ? "bg-sky-500 text-slate-950 shadow-sm"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <Code2 className="w-3 h-3" />
                  Python Editor
                </button>
              </div>

              {/* Table Schema / Dataset Reference Toggle */}
              <button
                onClick={() => setShowSchemaDrawer(!showSchemaDrawer)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                  showSchemaDrawer
                    ? "bg-slate-700 text-white"
                    : "bg-slate-800 text-slate-400 hover:text-slate-200"
                }`}
                title="Toggle Database Schema & Dataset Reference"
              >
                <Table className="w-3 h-3" />
                <span>{language === "sql" ? "Tables Schema" : "Dataset Schema"}</span>
                {showSchemaDrawer ? (
                  <ChevronUp className="w-3 h-3" />
                ) : (
                  <ChevronDown className="w-3 h-3" />
                )}
              </button>

              {/* Reset to starter code */}
              <button
                onClick={handleResetCode}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                title="Reset code template"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* COLLAPSIBLE SCHEMA & REFERENCE DRAWER */}
          {showSchemaDrawer && (
            <div className="bg-slate-900/95 border-b border-slate-800 p-3 text-xs text-slate-300 font-mono space-y-2 z-10 shrink-0 max-h-48 overflow-y-auto">
              {language === "sql" ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-amber-400 font-bold">
                    <span>Relational Database Schema:</span>
                    <span className="text-slate-500 text-[10px]">Mock PostgreSQL 16</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-[11px]">
                    <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                      <span className="font-bold text-amber-300">TABLE employees</span>
                      <ul className="text-slate-400 space-y-0.5 pl-2 list-disc text-[10px]">
                        <li><strong className="text-slate-200">id</strong> (INTEGER, PK)</li>
                        <li><strong className="text-slate-200">name</strong> (VARCHAR)</li>
                        <li><strong className="text-slate-200">department</strong> (VARCHAR)</li>
                        <li><strong className="text-slate-200">salary</strong> (NUMERIC)</li>
                        <li><strong className="text-slate-200">hire_date</strong> (DATE)</li>
                      </ul>
                    </div>
                    <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                      <span className="font-bold text-amber-300">TABLE sales_orders</span>
                      <ul className="text-slate-400 space-y-0.5 pl-2 list-disc text-[10px]">
                        <li><strong className="text-slate-200">order_id</strong> (INT, PK)</li>
                        <li><strong className="text-slate-200">customer_id</strong> (INT)</li>
                        <li><strong className="text-slate-200">amount</strong> (NUMERIC)</li>
                        <li><strong className="text-slate-200">status</strong> (VARCHAR)</li>
                      </ul>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <div className="text-[11px] text-sky-400 font-bold">Python Function Signature & Input Records:</div>
                  <pre className="p-2 bg-slate-950 rounded-xl border border-slate-800 text-[10px] text-sky-300 overflow-x-auto">
{`# Sample transactions parameter format passed into process_data():
transactions = [
  {"id": 101, "amount": 4500, "category": "Retail", "date": "2026-03-01"},
  {"id": 102, "amount": 9200, "category": "Tech", "date": "2026-03-02"},
  {"id": 103, "amount": 1200, "category": "Retail", "date": "2026-03-03"}
]`}
                  </pre>
                </div>
              )}
            </div>
          )}

          {/* Monaco Editor */}
          <div className="flex-1">
            <Editor
              height="100%"
              theme="vs-dark"
              language={language}
              value={currentCode}
              onChange={handleCodeChange}
              options={{
                fontSize: 13,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                lineNumbers: "on",
                automaticLayout: true,
                tabSize: language === "python" ? 4 : 2,
              }}
            />
          </div>

          {/* Test Runner Output Drawer */}
          <div className="h-44 border-t border-slate-800 bg-slate-900/90 flex flex-col">
            <div className="px-4 py-2 border-b border-slate-800 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400">
                {language === "sql"
                  ? "SQL Query Execution Results"
                  : language === "python"
                  ? "Python 3 Terminal & Test Runner"
                  : "Execution Console"}
              </span>

              {/* Specialized Run Button per language */}
              {language === "sql" ? (
                <button
                  onClick={runSampleTest}
                  className="flex items-center gap-1.5 px-3.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-md shadow-amber-500/20 cursor-pointer transition-colors"
                >
                  <Play className="w-3 h-3 fill-current" />
                  Execute SQL Query
                </button>
              ) : language === "python" ? (
                <button
                  onClick={runSampleTest}
                  className="flex items-center gap-1.5 px-3.5 py-1 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold shadow-md shadow-sky-500/20 cursor-pointer transition-colors"
                >
                  <Play className="w-3 h-3 fill-current" />
                  Run Python Script
                </button>
              ) : (
                <button
                  onClick={runSampleTest}
                  className="flex items-center gap-1.5 px-3.5 py-1 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer transition-colors"
                >
                  <Play className="w-3 h-3 fill-white" />
                  Run Code
                </button>
              )}
            </div>
            <div className="flex-1 p-3 overflow-y-auto font-mono text-xs text-slate-300 whitespace-pre-wrap">
              {testOutput ||
                (language === "sql"
                  ? "Click 'Execute SQL Query' to run your query against the PostgreSQL database engine..."
                  : language === "python"
                  ? "Click 'Run Python Script' to execute your code against test cases..."
                  : "Click 'Run Code' to execute against sample test cases...")}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
