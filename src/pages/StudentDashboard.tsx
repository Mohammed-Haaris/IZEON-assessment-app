import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { apiRequest } from "../services/api";
import type { Assessment, AssessmentAttempt } from "../types";
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  Play,
  RotateCw,
  Code2,
  FileText,
  Camera,
  ShieldCheck,
  Check,
} from "lucide-react";

export const StudentDashboard: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();

  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [existingAttempt, setExistingAttempt] = useState<AssessmentAttempt | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState("");

  const loadAssessment = async () => {
    if (user?.status !== "APPROVED") {
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/90 shadow-sm">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
            Welcome, <span className="text-emerald-700">{user.name}</span> 👋
          </h1>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            {user.college ? `${user.college} • ` : ""}Candidate Assessment Portal
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => refreshUser()}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer transition-all shadow-xs"
          >
            <RotateCw className="w-3.5 h-3.5 text-slate-500" />
            Refresh Status
          </button>
        </div>
      </div>

      {/* 2. State: PENDING APPROVAL */}
      {user.status === "PENDING_APPROVAL" && (
        <div className="bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-white border border-amber-200 rounded-3xl p-8 text-center space-y-4 shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-amber-100 border border-amber-200 text-amber-700 flex items-center justify-center mx-auto shadow-inner">
            <Clock className="w-8 h-8 animate-pulse" />
          </div>
          <div className="max-w-md mx-auto space-y-2">
            <h2 className="text-xl font-bold text-slate-900">Awaiting Administrator Approval</h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              Your profile has been registered and is pending verification by the exam admin. Once
              approved, your assessment unlock button will become active immediately.
            </p>
          </div>

          <div className="pt-2">
            <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-amber-100 text-amber-800 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
              Status: In Review Queue
            </span>
          </div>
        </div>
      )}

      {/* 3. State: REJECTED */}
      {user.status === "REJECTED" && (
        <div className="bg-rose-50 border border-rose-200 rounded-3xl p-8 text-center space-y-3">
          <AlertTriangle className="w-12 h-12 text-rose-600 mx-auto" />
          <h2 className="text-xl font-bold text-rose-900">Registration Not Approved</h2>
          <p className="text-xs text-rose-700 max-w-md mx-auto">
            Unfortunately, your request to take this assessment has been rejected by the
            administrator. Please contact your coordinator for clarification.
          </p>
        </div>
      )}

      {/* 4. State: APPROVED */}
      {user.status === "APPROVED" && (
        <div className="space-y-6">
          {error && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
              {error}
            </div>
          )}

          {isLoading ? (
            <div className="p-12 text-center text-xs text-slate-400">Loading assessment...</div>
          ) : assessment ? (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
              {/* Header Banner - Executive Light Green / Mint Card with deep typography */}
              <div className="bg-emerald-50/70 border-b border-emerald-100/80 p-8 relative overflow-hidden">
                <div className="absolute right-0 top-0 -mt-10 -mr-10 w-64 h-64 bg-emerald-200/30 rounded-full blur-3xl pointer-events-none" />
                <div className="relative z-10 flex flex-wrap items-center justify-between gap-6">
                  <div>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-200 mb-2.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      Active Assessment Live
                    </span>
                    <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900">
                      {assessment.title}
                    </h2>
                    <p className="text-xs text-slate-600 mt-1.5 max-w-2xl font-medium leading-relaxed">
                      {assessment.description}
                    </p>
                  </div>

                  {existingAttempt?.status === "COMPLETED" ? (
                    <div className="px-5 py-2.5 bg-emerald-100 border border-emerald-200 rounded-xl flex items-center gap-2 text-emerald-900 text-xs font-bold">
                      <Check className="w-4 h-4 text-emerald-700" />
                      Test Completed
                    </div>
                  ) : (
                    <button
                      onClick={handleStartAssessment}
                      disabled={isStarting}
                      className="flex items-center gap-2.5 px-7 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm transition-all shadow-lg shadow-emerald-600/25 cursor-pointer transform hover:-translate-y-0.5 active:translate-y-0"
                    >
                      <Play className="w-4 h-4 fill-white" />
                      {existingAttempt ? "Resume Assessment" : "Start Assessment Now"}
                    </button>
                  )}
                </div>
              </div>

              {/* Assessment Breakdown Cards */}
              <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50/40">
                {/* Round 1 Card */}
                <div className="bg-white p-7 rounded-2xl border border-slate-200 shadow-sm space-y-4 hover:border-emerald-300 transition-all">
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shadow-inner">
                      <FileText className="w-6 h-6" />
                    </div>
                    <span className="px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-800 font-mono">
                      ⏱ {assessment.durationR1} Mins
                    </span>
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">Round 1: Cognitive & Domain Analysis</h3>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      Aptitude, Verbal Reasoning, Domain Questions, and written grammar analysis.
                    </p>
                  </div>
                  <ul className="text-xs text-slate-700 space-y-2 pt-3 border-t border-slate-100">
                    <li className="flex items-center gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Quantitative Aptitude & Logical Reasoning</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Role Track Evaluation (SQL & Python / Developer)</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Grammar & Composition evaluation</span>
                    </li>
                  </ul>
                </div>

                {/* Round 2 Card */}
                <div className="bg-white p-7 rounded-2xl border border-slate-200 shadow-sm space-y-4 hover:border-emerald-300 transition-all">
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700 shadow-inner">
                      <Code2 className="w-6 h-6" />
                    </div>
                    <span className="px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-xs font-bold text-teal-800 font-mono">
                      ⏱ {assessment.durationR2} Mins
                    </span>
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">Round 2: Supervised Coding Laboratory</h3>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      Live problem solving in specialized Monaco Code and SQL editors with proctoring.
                    </p>
                  </div>
                  <ul className="text-xs text-slate-700 space-y-2 pt-3 border-t border-slate-100">
                    <li className="flex items-center gap-2.5">
                      <Camera className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Mandatory live proctored camera verification</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Multi-language execution engine (SQL & Python)</span>
                    </li>
                    <li className="flex items-center gap-2.5 text-rose-600 font-semibold">
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>Tab switch & anti-cheating audit trail</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center text-slate-400 text-xs shadow-sm">
              No active assessment is currently scheduled by the admin.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
