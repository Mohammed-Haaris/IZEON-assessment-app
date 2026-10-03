import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { apiRequest } from "../services/api";
import type { Assessment, AssessmentAttempt } from "../types";
import {
  CheckCircle2,
  AlertTriangle,
  Play,
  RotateCw,
  Code2,
  FileText,
  Camera,
  ShieldCheck,
  Lock,
} from "lucide-react";
import interviewLogo from "../assets/interview logo.png";

export const StudentDashboard: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();

  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [existingAttempt, setExistingAttempt] = useState<AssessmentAttempt | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState("");

  const loadAssessment = async () => {
    if (user?.status === "REJECTED") {
      setIsLoading(false);
      return;
    }

    try {
      setError("");
      const data = await apiRequest<{
        assessment: Assessment;
        existingAttempt: AssessmentAttempt | null;
      }>("/assessment/active");
      setAssessment(data.assessment);
      setExistingAttempt(data.existingAttempt);
    } catch (err: any) {
      setError(err.message || "Failed to load active assessment");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAssessment();
  }, [user?.status]);

  const handleStartAssessment = async () => {
    if (!assessment) return;
    if (existingAttempt?.status === "COMPLETED" || existingAttempt?.status === "DISQUALIFIED") {
      setError("You have already completed this assessment. Retakes or resuming are not permitted.");
      return;
    }

    if (
      existingAttempt?.status === "MALPRACTICE_LOCKED" ||
      (existingAttempt?.tabSwitchCount && existingAttempt.tabSwitchCount >= 2)
    ) {
      if (existingAttempt.currentRound === "ROUND_2_CODING") {
        navigate(`/assessment/round2?attemptId=${existingAttempt.id}`);
      } else {
        navigate(`/assessment/round1?attemptId=${existingAttempt.id}`);
      }
      return;
    }

    setIsStarting(true);
    setError("");

    try {
      const data = await apiRequest<{ attempt: AssessmentAttempt }>("/assessment/start", {
        method: "POST",
        body: JSON.stringify({ assessmentId: assessment.id }),
      });

      if (data.attempt.currentRound === "ROUND_2_CODING") {
        navigate(`/assessment/round2?attemptId=${data.attempt.id}`);
      } else {
        navigate(`/assessment/round1?attemptId=${data.attempt.id}`);
      }
    } catch (err: any) {
      setError(err.message || "Failed to start assessment");
      setIsStarting(false);
    }
  };

  if (!user) return null;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* 1. Header greeting */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-[#16499c]/25 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-white border border-[#16499c]/25 p-1 flex items-center justify-center shrink-0 shadow-xs">
            <img src={interviewLogo} alt="IZEON Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
              Welcome, <span className="text-[#16499c]">{user.name}</span> 👋
            </h1>
            <p className="text-sm text-slate-600 mt-1 font-medium">
              {user.college ? `${user.college} • ` : ""}Candidate Assessment Examination Portal
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              refreshUser();
              loadAssessment();
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[#16499c]/30 hover:border-[#16499c] bg-white hover:bg-[#eff5ff] text-sm font-semibold text-[#16499c] cursor-pointer transition-all shadow-xs"
          >
            <RotateCw className="w-4 h-4 text-[#16499c]" />
            Refresh Portal
          </button>
        </div>
      </div>

      {/* 2. State: REJECTED */}
      {user.status === "REJECTED" ? (
        <div className="bg-rose-50 border border-rose-200 rounded-3xl p-8 text-center space-y-3">
          <AlertTriangle className="w-12 h-12 text-rose-600 mx-auto" />
          <h2 className="text-xl font-bold text-rose-900">Registration Not Approved</h2>
          <p className="text-sm text-rose-700 max-w-md mx-auto leading-relaxed">
            Unfortunately, your access to take this assessment has been restricted by the
            administrator. Please contact your coordinator for clarification.
          </p>
        </div>
      ) : (
        /* 3. State: DIRECT ACCESS FOR CANDIDATES */
        <div className="space-y-6">
          {error && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-sm text-rose-700">
              {error}
            </div>
          )}

          {isLoading ? (
            <div className="p-12 text-center text-sm text-slate-500 font-medium">Loading assessment...</div>
          ) : assessment ? (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
              {/* Header Banner */}
              <div className="bg-[#eff5ff]/80 border-b border-[#16499c]/20 p-8 relative overflow-hidden">
                <div className="absolute right-0 top-0 -mt-10 -mr-10 w-64 h-64 bg-[#16499c]/10 rounded-full blur-3xl pointer-events-none" />
                <div className="relative z-10 flex flex-wrap items-center justify-between gap-6">
                  <div>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white text-[#16499c] text-xs font-bold border border-[#16499c]/30 mb-2.5">
                      <span className="w-2 h-2 rounded-full bg-[#16499c] animate-pulse" />
                      Active Assessment Live
                    </span>
                    <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900">
                      {assessment.title}
                    </h2>
                    <p className="text-sm text-slate-700 mt-2 max-w-2xl font-normal leading-relaxed">
                      {assessment.description}
                    </p>
                  </div>

                  {existingAttempt?.status === "COMPLETED" ? (
                    <div className="flex flex-col items-end gap-1.5">
                      <div className="px-6 py-3.5 bg-[#16499c] text-white rounded-2xl flex items-center gap-2 text-sm font-extrabold shadow-md shadow-[#16499c]/20">
                        <CheckCircle2 className="w-5 h-5 text-blue-100" />
                        Assessment Completed
                      </div>
                      <span className="text-[11px] font-semibold text-[#16499c]">
                        Both rounds submitted. Retakes disabled.
                      </span>
                    </div>
                  ) : existingAttempt?.status === "DISQUALIFIED" ? (
                    <div className="flex flex-col items-end gap-1.5">
                      <div className="px-6 py-3.5 bg-rose-600 text-white rounded-2xl flex items-center gap-2 text-sm font-extrabold shadow-md shadow-rose-600/20">
                        <AlertTriangle className="w-5 h-5 text-rose-100" />
                        Assessment Disqualified
                      </div>
                      <span className="text-[11px] font-semibold text-rose-700">
                        Access closed due to policy violations.
                      </span>
                    </div>
                  ) : existingAttempt?.status === "MALPRACTICE_LOCKED" ||
                    (existingAttempt?.tabSwitchCount && existingAttempt.tabSwitchCount >= 2) ? (
                    <div className="flex flex-col items-end gap-1.5">
                      <button
                        onClick={handleStartAssessment}
                        className="px-6 py-3.5 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl flex items-center gap-2 text-sm font-extrabold shadow-md shadow-rose-600/20 cursor-pointer transition-all"
                      >
                        <Lock className="w-5 h-5 text-rose-100" />
                        Screen Locked (View Session)
                      </button>
                      <span className="text-[11px] font-semibold text-rose-700">
                        Suspended due to malpractice. Awaiting administrator review.
                      </span>
                    </div>
                  ) : (
                    <button
                      onClick={handleStartAssessment}
                      disabled={isStarting}
                      className="flex items-center gap-2.5 px-8 py-4 rounded-xl bg-[#16499c] hover:bg-[#123c80] text-white font-bold text-base transition-all shadow-lg shadow-[#16499c]/25 cursor-pointer transform hover:-translate-y-0.5 active:translate-y-0"
                    >
                      <Play className="w-5 h-5 fill-white" />
                      {existingAttempt ? "Resume Assessment" : "Start Assessment Now"}
                    </button>
                  )}
                </div>
              </div>

              {/* Completed Notice Strip */}
              {existingAttempt?.status === "COMPLETED" && (
                <div className="p-5 bg-[#eff5ff] border-b border-[#16499c]/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#16499c] text-white flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-slate-900 text-xs sm:text-sm">
                        You have successfully completed both rounds of this assessment!
                      </h3>
                      <p className="text-[11px] text-slate-600 mt-0.5">
                        Your MCQ questions, written prompt, and coding solutions are securely saved. Retaking or resuming is not permitted.
                      </p>
                    </div>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-[#eff5ff] text-[#16499c] font-extrabold text-[10px] uppercase tracking-wider shrink-0 border border-[#16499c]/30">
                    Submission Locked
                  </span>
                </div>
              )}

              {/* Assessment Breakdown Cards */}
              <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50/40">
                {/* Round 1 Card */}
                <div className="bg-white p-7 rounded-2xl border border-slate-200 shadow-sm space-y-4 hover:border-[#16499c]/40 transition-all">
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-2xl bg-[#eff5ff] border border-[#16499c]/30 flex items-center justify-center text-[#16499c] shadow-inner">
                      <FileText className="w-6 h-6" />
                    </div>
                    <span className="px-3.5 py-1.5 rounded-full bg-[#eff5ff] border border-[#16499c]/30 text-xs sm:text-sm font-bold text-[#16499c] font-mono">
                      ⏱ {assessment.durationR1} Minutes
                    </span>
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-lg">Round 1: Aptitude, Reasoning & English</h3>
                    <p className="text-sm text-slate-600 mt-1.5 leading-relaxed">
                      Multiple-choice questions and a short written paragraph to test your problem-solving and communication.
                    </p>
                  </div>
                  <ul className="text-sm text-slate-800 space-y-2.5 pt-3 border-t border-slate-100">
                    <li className="flex items-center gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-[#16499c] shrink-0" />
                      <span>Maths, puzzles & logical thinking questions</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-[#16499c] shrink-0" />
                      <span>Basic domain questions matching your selected role</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-[#16499c] shrink-0" />
                      <span>Short written English answer (minimum 100 words)</span>
                    </li>
                  </ul>
                </div>

                {/* Round 2 Card */}
                <div className="bg-white p-7 rounded-2xl border border-slate-200 shadow-sm space-y-4 hover:border-[#16499c]/40 transition-all">
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-2xl bg-[#eff5ff] border border-[#16499c]/30 flex items-center justify-center text-[#16499c] shadow-inner">
                      <Code2 className="w-6 h-6" />
                    </div>
                    <span className="px-3.5 py-1.5 rounded-full bg-[#eff5ff] border border-[#16499c]/30 text-xs sm:text-sm font-bold text-[#16499c] font-mono">
                      ⏱ {assessment.durationR2} Minutes
                    </span>
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-lg">Round 2: Practical Coding Tasks</h3>
                    <p className="text-sm text-slate-600 mt-1.5 leading-relaxed">
                      Hands-on coding and query tasks directly in your browser based on your chosen track.
                    </p>
                  </div>
                  <ul className="text-sm text-slate-800 space-y-2.5 pt-3 border-t border-slate-100">
                    <li className="flex items-center gap-2.5">
                      <Camera className="w-4 h-4 text-[#16499c] shrink-0" />
                      <span><strong>Webcam Required:</strong> Your camera must stay on throughout the test</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <ShieldCheck className="w-4 h-4 text-[#16499c] shrink-0" />
                      <span><strong>Write & Run Code:</strong> Python for Developers or SQL for Data Analysts</span>
                    </li>
                    <li className="flex items-center gap-2.5 text-rose-600 font-medium">
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span><strong>Important Rule:</strong> Do not switch tabs or copy-paste (test will lock automatically)</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center text-slate-500 text-sm shadow-sm font-medium">
              No active assessment is currently scheduled by the admin.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
