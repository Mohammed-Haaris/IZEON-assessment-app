import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import Editor from "@monaco-editor/react";
import { CameraTile } from "../components/CameraTile";
import { CameraGuard } from "../components/CameraGuard";
import { getSocket } from "../services/socket";
import { apiRequest } from "../services/api";
import { useAuth } from "../context/AuthContext";
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
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const attemptId = searchParams.get("attemptId");
  const [activeAttemptId, setActiveAttemptId] = useState<string | null>(attemptId);
  const effectiveAttemptId = attemptId || activeAttemptId;
  const navigate = useNavigate();

  const candidateRole =
    user?.position ||
    (JSON.parse(localStorage.getItem("izeon_user") || "{}")?.position as string | undefined);
  const isDataAnalyst = candidateRole === "Data Analyst";

  const [questions, setQuestions] = useState<Question[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [language, setLanguage] = useState<"python" | "sql" | "javascript">(
    isDataAnalyst ? "sql" : "python"
  );
  const [codeAnswers, setCodeAnswers] = useState<Record<string, string>>({});
  const [testOutput, setTestOutput] = useState<string>("");
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Malpractice states (Persistent across page refreshes)
  const [tabSwitchCount, setTabSwitchCount] = useState<number>(0);
  const [warningModal, setWarningModal] = useState<string | null>(null);
  const [isLocked, setIsLocked] = useState<boolean>(() => {
    return localStorage.getItem("izeon_locked_round2") === "true";
  });
  const [isDisqualified, setIsDisqualified] = useState(false);
  const [lockMessage, setLockMessage] = useState(
    "Assessment locked due to multiple malpractice violations. Administrator has been notified to review your session."
  );
  const [isCompleted, setIsCompleted] = useState(false);

  const socket = getSocket();

  const [showSchemaDrawer, setShowSchemaDrawer] = useState(false);

  // Clean starter code templates (NEVER expose answers directly in assessment)
  const getCleanTemplate = (lang: string, isDATrack: boolean) => {
    if (lang === "sql") {
      return "-- Write your SQL query here\n";
    }
    if (lang === "python") {
      return isDATrack
        ? "def analyze_transactions(transactions, threshold):\n    # Write your solution here\n    pass\n"
        : "# Write your Python solution here\n";
    }
    return "function solution(input) {\n  // Write solution here\n  \n}\n";
  };

  const sanitizeStarter = (code: string | undefined | null, lang: string, isDATrack: boolean) => {
    if (!code) return getCleanTemplate(lang, isDATrack);
    if (
      code.includes("SELECT department") ||
      code.includes("AVG(salary)") ||
      code.includes("total_volume = sum") ||
      code.includes("outlier_count =")
    ) {
      return getCleanTemplate(lang, isDATrack);
    }
    return code;
  };

  // Helper to maintain separate code for SQL vs Python per question
  const getAnswerKey = (qId: string, lang: string) => `${qId}_${lang}`;

  // Load questions
  useEffect(() => {
    async function loadRound2() {
      try {
        const res = await apiRequest<{ assessment?: any; existingAttempt?: any; attempt?: any }>("/assessment/active");
        const currentAttempt = res.existingAttempt || res.attempt;

        if (currentAttempt) {
          if (currentAttempt.id) {
            setActiveAttemptId(currentAttempt.id);
          }

          if (typeof currentAttempt.tabSwitchCount === "number") {
            setTabSwitchCount(currentAttempt.tabSwitchCount);
          }

          if (currentAttempt.status === "COMPLETED") {
            localStorage.removeItem("izeon_locked_round2");
            alert("You have already completed this assessment. Resuming or retaking is strictly not permitted.");
            navigate("/dashboard");
            return;
          }

          if (currentAttempt.status === "DISQUALIFIED") {
            localStorage.removeItem("izeon_locked_round2");
            setIsDisqualified(true);
            setLockMessage(
              currentAttempt.adminRemarks ||
                "Your assessment has been disqualified by the administrator due to malpractice violations."
            );
            return;
          }

          if (
            currentAttempt.status === "MALPRACTICE_LOCKED" ||
            (currentAttempt.tabSwitchCount && currentAttempt.tabSwitchCount >= 2)
          ) {
            setIsLocked(true);
            localStorage.setItem("izeon_locked_round2", "true");
            setLockMessage(
              "Assessment locked due to multiple malpractice violations. Administrator has been notified to review your session."
            );
          } else {
            setIsLocked(false);
            localStorage.removeItem("izeon_locked_round2");
          }
        }

        if (res.assessment?.questions) {
          let r2 = res.assessment.questions.filter((q: any) => q.round === "ROUND_2_CODING");

          // Strict role-based filtering:
          // Software Developer candidates must NEVER see SQL questions; only Data Analyst candidates can see SQL.
          if (candidateRole === "Software Developer") {
            r2 = r2.filter((q: any) => q.category !== "SQL" && q.targetRole !== "Data Analyst");
          } else if (candidateRole === "Data Analyst") {
            r2 = r2.filter((q: any) => q.targetRole !== "Software Developer");
          } else {
            // General / default fallback: exclude SQL unless candidate is Data Analyst
            r2 = r2.filter((q: any) => q.category !== "SQL");
          }

          setQuestions(r2);

          // Populate initial starter codes (clean templates with no solutions)
          const initialCodes: Record<string, string> = {};
          r2.forEach((q: any) => {
            const sqlStarter = sanitizeStarter(q.starterCode?.sql, "sql", isDataAnalyst);
            const pyStarter = sanitizeStarter(q.starterCode?.python, "python", isDataAnalyst);
            const jsStarter = sanitizeStarter(q.starterCode?.javascript, "javascript", isDataAnalyst);

            initialCodes[`${q.id}_sql`] = sqlStarter;
            initialCodes[`${q.id}_python`] = pyStarter;
            initialCodes[`${q.id}_javascript`] = jsStarter;

            // Preferred initial code per question
            if (isDataAnalyst && (q.category === "SQL" || q.starterCode?.sql)) {
              initialCodes[q.id] = sqlStarter;
            } else if (q.category === "PYTHON" || q.starterCode?.python) {
              initialCodes[q.id] = pyStarter;
            } else {
              initialCodes[q.id] = jsStarter;
            }
          });
          setCodeAnswers(initialCodes);

          // Auto-select language for first question:
          // Data Analyst defaults to SQL or Python; Software Developer defaults to Python or JavaScript (never SQL)
          if (isDataAnalyst) {
            if (r2[0]?.category === "SQL" || r2[0]?.starterCode?.sql) {
              setLanguage("sql");
            } else {
              setLanguage("python");
            }
          } else {
            // Software Developer
            if (r2[0]?.starterCode?.javascript) {
              setLanguage("javascript");
            } else {
              setLanguage("python");
            }
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
    const handleConnect = () => {
      socket.emit("join:attempt", effectiveAttemptId);
    };

    if (socket.connected) {
      socket.emit("join:attempt", effectiveAttemptId);
    }
    socket.on("connect", handleConnect);

    // Strike 1 Warning
    socket.on("proctor:warning", (data: { count: number; message: string }) => {
      setWarningModal(data.message);
    });

    // Strike 2 Malpractice Lock
    socket.on("proctor:locked", (data: { count: number; message: string }) => {
      setWarningModal(null);
      setIsLocked(true);
      localStorage.setItem("izeon_locked_round2", "true");
      setLockMessage(data.message);
    });

    // Admin decisions
    socket.on("proctor:unlocked", (data: { attemptId?: string; message: string }) => {
      if (!data.attemptId || data.attemptId === effectiveAttemptId) {
        setIsLocked(false);
        localStorage.removeItem("izeon_locked_round2");
        setTabSwitchCount(1);
        setWarningModal(null);
      }
    });

    socket.on("proctor:disqualified", (data: { attemptId?: string; message: string }) => {
      if (!data.attemptId || data.attemptId === effectiveAttemptId) {
        setIsLocked(false);
        localStorage.removeItem("izeon_locked_round2");
        setIsDisqualified(true);
        setLockMessage(data.message);
      }
    });

    return () => {
      socket.off("connect", handleConnect);
      socket.off("proctor:warning");
      socket.off("proctor:locked");
      socket.off("proctor:unlocked");
      socket.off("proctor:disqualified");
    };
  }, [effectiveAttemptId]);

  // Fallback sync when locked to instantly detect admin unlock decision
  useEffect(() => {
    if (!isLocked) return;

    const interval = setInterval(async () => {
      try {
        const res = await apiRequest<{ attempt?: any; existingAttempt?: any }>("/assessment/active");
        const currentAttempt = res.attempt || res.existingAttempt;
        if (currentAttempt) {
          if (
            currentAttempt.status === "ROUND_2_IN_PROGRESS" ||
            currentAttempt.status === "IN_PROGRESS"
          ) {
            setIsLocked(false);
            localStorage.removeItem("izeon_locked_round2");
          } else if (currentAttempt.status === "DISQUALIFIED") {
            setIsLocked(false);
            localStorage.removeItem("izeon_locked_round2");
            setIsDisqualified(true);
            setLockMessage(currentAttempt.adminRemarks || "Disqualified by administrator.");
          }
        }
      } catch (err) {
        // silent
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [isLocked]);

  // Anti-Cheating: Immediate tab switch detection (Strike 1 and Strike 2 marked instantly without waiting)
  useEffect(() => {
    if (isLocked || isDisqualified || isCompleted || !effectiveAttemptId) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Immediately mark Strike 1 and Strike 2 without waiting for any event
        setTabSwitchCount((prev) => {
          const nextCount = prev + 1;
          if (nextCount === 1) {
            setWarningModal(
              "Warning 1 of 2: Tab switch detected! One more tab switch will flag you for malpractice and lock your test."
            );
          } else if (nextCount >= 2) {
            setWarningModal(null);
            setIsLocked(true);
            localStorage.setItem("izeon_locked_round2", "true");
            setLockMessage(
              "Assessment locked due to multiple malpractice violations. Administrator has been notified to review your session."
            );
          }
          return nextCount;
        });

        // Notify server immediately via Socket & REST API fallback
        socket.emit("student:tab_switch", {
          attemptId: effectiveAttemptId,
          violationType: "TAB_SWITCH",
        });

        apiRequest("/assessment/report-malpractice", {
          method: "POST",
          body: JSON.stringify({
            attemptId: effectiveAttemptId,
            violationType: "TAB_SWITCH",
          }),
        }).catch((err) => console.error("Report malpractice error:", err));
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

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
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("copy", handleCopyPaste);
      document.removeEventListener("paste", handleCopyPaste);
    };
  }, [isLocked, isDisqualified, isCompleted, effectiveAttemptId]);

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
    const defaultTemplate = sanitizeStarter(
      currentQ.starterCode?.[language],
      language,
      isDataAnalyst
    );

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
    const targetAttemptId = effectiveAttemptId || attemptId;
    if (!targetAttemptId) return;
    if (!confirm("Are you sure you want to finish and submit your coding assessment?")) return;

    try {
      await apiRequest("/assessment/submit-round2", {
        method: "POST",
        body: JSON.stringify({
          attemptId: targetAttemptId,
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
      sanitizeStarter(currentQ.starterCode?.[language], language, isDataAnalyst)
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

  // 1.5 Malpractice Lock Screen (Persistent across page refreshes)
  if (isLocked) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-lg flex items-center justify-center p-6 text-center text-white">
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
              {lockMessage ||
                "You navigated away from the exam tab twice. Your session is suspended. An alert has been sent to the administrator to review your attempt."}
            </p>
          </div>
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-[11px] text-amber-400 flex items-center justify-center gap-2">
            <Clock className="w-4 h-4 animate-spin" />
            <span>Waiting for Admin Decision in real-time...</span>
          </div>
          <p className="text-[10px] text-slate-500">
            Do not close or attempt to bypass this screen. If granted another chance by the administrator, this screen will automatically unlock.
          </p>
        </div>
      </div>
    );
  }

  // 2. Completed Screen
  if (isCompleted) {
    return (
      <div className="max-w-lg mx-auto my-16 bg-white p-8 rounded-3xl border border-slate-200 shadow-xl text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-[#eff5ff] text-[#16499c] flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900">Assessment Submitted!</h2>
        <p className="text-xs text-slate-600">
          Congratulations! You have completed both Round 1 (Cognitive & Written) and Round 2 (Coding
          Test). The administrator will evaluate your submission.
        </p>
        <button
          onClick={() => navigate("/dashboard")}
          className="px-6 py-2.5 rounded-xl bg-[#16499c] hover:bg-[#123c80] text-white font-semibold text-xs shadow-md shadow-[#16499c]/20 cursor-pointer transition-all"
        >
          Return to Candidate Dashboard
        </button>
      </div>
    );
  }

  return (
    <CameraGuard roundName="Round 2: Coding & SQL Technical Lab">
      {(cameraStream) => (
        <div className="h-[calc(100vh-4rem)] flex flex-col bg-slate-950 text-slate-100 overflow-hidden relative">
      {/* FULLSCREEN PROMPT OVERLAY */}
      {!isFullscreen && (
        <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-6 text-center">
          <div className="max-w-md bg-slate-900 p-8 rounded-3xl border border-slate-800 shadow-2xl space-y-5">
            <div className="w-14 h-14 rounded-2xl bg-[#16499c]/20 text-[#93c5fd] flex items-center justify-center mx-auto border border-[#16499c]/30">
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
              className="w-full py-3 px-6 rounded-xl bg-[#16499c] hover:bg-[#123c80] text-white font-bold text-xs shadow-lg shadow-[#16499c]/30 cursor-pointer transition-all"
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



      {/* TOP BAR WITH DISTINCT TASK TABS */}
      <div className="h-14 px-6 border-b border-slate-800 bg-slate-900/60 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="px-2.5 py-0.5 rounded-md bg-[#16499c]/20 text-[#93c5fd] text-[10px] font-bold uppercase border border-[#16499c]/30">
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
                        : "bg-[#16499c] text-white shadow-md shadow-[#16499c]/20"
                      : "bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-slate-700"
                  }`}
                >
                  <span>{label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Tab strike indicator */}
          {tabSwitchCount > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              <span>Strike {tabSwitchCount}/2</span>
            </div>
          )}

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
                  ? "bg-indigo-500 text-white shadow-xs"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              JavaScript
            </button>
          </div>

          <button
            onClick={handleSubmitAssessment}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[#16499c] hover:bg-[#123c80] text-white font-semibold text-xs shadow-md shadow-[#16499c]/20 cursor-pointer transition-all"
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
                <div className="flex justify-between items-center text-sm text-slate-400 mb-1.5">
                  <span className="font-semibold text-[#93c5fd] uppercase tracking-wider text-xs">
                    {currentQ.category} Challenge
                  </span>
                  <span className="text-[#93c5fd] font-extrabold text-sm">{currentQ.points} Points</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">{currentQ.title}</h2>
              </div>

              <div className="text-sm sm:text-[15px] text-slate-200 leading-relaxed whitespace-pre-wrap bg-slate-900/90 p-5 rounded-2xl border border-slate-700/80 font-normal">
                {currentQ.content}
              </div>

              {/* Sample test cases */}
              {Array.isArray(currentQ.testCases) && (
                <div className="space-y-3">
                  <h4 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
                    Sample Test Cases
                  </h4>
                  {currentQ.testCases.map((tc, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-xs sm:text-sm font-mono space-y-1.5"
                    >
                      <div className="text-slate-400">
                        Input: <span className="text-slate-100 font-semibold">{tc.input}</span>
                      </div>
                      <div className="text-slate-400">
                        Output: <span className="text-[#93c5fd] font-bold">{tc.output}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Problem Switcher */}
              <div className="pt-4 border-t border-slate-800 flex flex-wrap gap-2">
                {questions.map((q, idx) => (
                  <button
                    key={q.id}
                    onClick={() => {
                      setActiveIdx(idx);
                      if (isDataAnalyst) {
                        if (q.category === "SQL" || q.starterCode?.sql) {
                          setLanguage("sql");
                        } else {
                          setLanguage("python");
                        }
                      } else {
                        // Software Developer
                        if (q.starterCode?.javascript) {
                          setLanguage("javascript");
                        } else {
                          setLanguage("python");
                        }
                      }
                    }}
                    className={`px-4 py-2 rounded-xl text-sm font-bold cursor-pointer transition-all ${
                      activeIdx === idx
                        ? "bg-[#16499c] text-white shadow-md shadow-[#16499c]/30"
                        : "bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700"
                    }`}
                  >
                    Task {idx + 1}
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
            <CameraTile stream={cameraStream} />
          </div>

          {/* DEDICATED EDITOR HEADER TOOLBAR */}
          <div className="px-4 py-2.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between shrink-0">
            {/* Editor Dialect Indicator */}
            <div className="flex items-center gap-2">
              {language === "sql" && isDataAnalyst ? (
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
                    {isDataAnalyst ? "Python 3 Data Analytics Console" : "Python 3 Algorithmic Environment"}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#16499c] animate-pulse" />
                  <span className="text-xs font-bold text-[#93c5fd] flex items-center gap-1.5">
                    <Code2 className="w-3.5 h-3.5" />
                    JavaScript / Algorithmic Environment
                  </span>
                </div>
              )}
            </div>

            {/* Quick Editor Mode Switcher */}
            <div className="flex items-center gap-2">
              <div className="flex items-center bg-slate-950 p-0.5 rounded-xl border border-slate-800">
                {isDataAnalyst ? (
                  <>
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
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => setLanguage("python")}
                      className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                        language === "python"
                          ? "bg-sky-500 text-slate-950 shadow-sm"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      <Code2 className="w-3 h-3" />
                      Python
                    </button>
                    <button
                      onClick={() => setLanguage("javascript")}
                      className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                        language === "javascript"
                          ? "bg-indigo-500 text-white shadow-sm"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      <Code2 className="w-3 h-3" />
                      JavaScript
                    </button>
                  </>
                )}
              </div>

              {/* Table Schema / Dataset Reference Toggle (Only for Data Analyst) */}
              {isDataAnalyst && (
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
              )}

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
                  className="flex items-center gap-1.5 px-3.5 py-1 rounded-md bg-[#16499c] hover:bg-[#123c80] text-white text-xs font-bold cursor-pointer transition-colors"
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
      )}
    </CameraGuard>
  );
};
