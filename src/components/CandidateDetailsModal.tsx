import React from "react";
import type { AssessmentAttempt } from "../types";
import { generateCandidateScorecardPDF } from "../utils/pdfGenerator";
import {
  X,
  User,
  GraduationCap,
  Briefcase,
  Calendar,
  Phone,
  FileText,
  Code2,
  Database,
  ShieldAlert,
  Award,
  Download,
  CheckCircle2,
  XCircle,
} from "lucide-react";

interface CandidateDetailsModalProps {
  attempt: AssessmentAttempt;
  onClose: () => void;
}

export const CandidateDetailsModal: React.FC<CandidateDetailsModalProps> = ({
  attempt,
  onClose,
}) => {
  const r1Score = attempt.round1Score ?? 0;
  const r2Score = attempt.round2Score ?? 0;
  const totalScore = r1Score + r2Score;
  const passingScore = attempt.assessment?.passingScore ?? 60;
  const isPass = totalScore >= passingScore && attempt.status === "COMPLETED";

  const codingAnswers = attempt.answers?.codingAnswers || {};
  const codingEntries = Object.entries(codingAnswers);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-4xl rounded-3xl border border-slate-200 shadow-2xl overflow-hidden my-8 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-5 bg-slate-900 text-white flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center font-bold text-base shadow-sm">
              {attempt.user?.name?.charAt(0).toUpperCase() || "C"}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold">{attempt.user?.name}</h3>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                    isPass
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                      : attempt.status === "COMPLETED"
                      ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                      : "bg-[#16499c]/20 text-[#93c5fd] border border-[#16499c]/30"
                  }`}
                >
                  {isPass
                    ? "QUALIFIED / PASSED"
                    : attempt.status === "COMPLETED"
                    ? "NOT QUALIFIED"
                    : attempt.status.replace(/_/g, " ")}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">{attempt.user?.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => generateCandidateScorecardPDF(attempt)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-colors cursor-pointer shadow-sm shadow-emerald-600/25"
            >
              <Download className="w-3.5 h-3.5" />
              Download Scorecard PDF
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Candidate Bio Info Grid */}
          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5 text-emerald-600" />
                Target Track / Role
              </span>
              <p className="font-bold text-slate-900 mt-1 text-sm">
                {attempt.user?.position || "Software Developer"}
              </p>
            </div>
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-emerald-600" />
                Roll Number
              </span>
              <p className="font-mono font-bold text-slate-900 mt-1 text-sm">
                {attempt.user?.rollNumber || "Not Provided"}
              </p>
            </div>
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <GraduationCap className="w-3.5 h-3.5 text-emerald-600" />
                Department
              </span>
              <p className="font-semibold text-slate-900 mt-1 text-sm">
                {attempt.user?.department || "—"}
              </p>
            </div>
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <GraduationCap className="w-3.5 h-3.5 text-emerald-600" />
                College / Institution
              </span>
              <p className="font-semibold text-slate-900 mt-1 text-sm">
                {attempt.user?.college || "—"}
              </p>
            </div>

            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-emerald-600" />
                Mobile Number
              </span>
              <p className="font-mono font-semibold text-slate-800 mt-1 text-sm">
                {attempt.user?.mobileNumber || "—"}
              </p>
            </div>
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                Date of Birth (DOB)
              </span>
              <p className="text-slate-800 font-medium mt-1 text-sm">{attempt.user?.dob || "—"}</p>
            </div>
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-emerald-600" />
                Tab Switch Violations
              </span>
              <p
                className={`font-bold mt-1 text-sm ${
                  (attempt.tabSwitchCount || 0) > 1 ? "text-rose-600" : "text-slate-800"
                }`}
              >
                {attempt.tabSwitchCount || 0} times
              </p>
            </div>
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                Attempt Started
              </span>
              <p className="text-slate-800 font-medium mt-1 text-sm">
                {attempt.startedAt ? new Date(attempt.startedAt).toLocaleTimeString() : "—"}
              </p>
            </div>
          </div>

          {/* Scores Overview Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-teal-50/60 border border-teal-100 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase text-teal-700">
                  Round 1: Cognitive
                </span>
                <p className="text-2xl font-black text-teal-900 mt-0.5">
                  {attempt.round1Score !== null && attempt.round1Score !== undefined
                    ? `${attempt.round1Score} Pts`
                    : "—"}
                </p>
              </div>
              <Award className="w-8 h-8 text-teal-300" />
            </div>

            <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-100 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase text-emerald-700">
                  Round 2: Technical
                </span>
                <p className="text-2xl font-black text-emerald-900 mt-0.5">
                  {attempt.round2Score !== null && attempt.round2Score !== undefined
                    ? `${attempt.round2Score} Pts`
                    : "—"}
                </p>
              </div>
              <Code2 className="w-8 h-8 text-emerald-300" />
            </div>

            <div
              className={`p-4 rounded-2xl border flex items-center justify-between ${
                isPass
                  ? "bg-emerald-50 border-emerald-200"
                  : "bg-slate-50 border-slate-200"
              }`}
            >
              <div>
                <span className="text-[11px] font-bold uppercase text-slate-500">
                  Total Aggregate
                </span>
                <p className="text-2xl font-black text-slate-900 mt-0.5">
                  {totalScore} Pts{" "}
                  <span className="text-xs font-normal text-slate-400">
                    (Min: {passingScore})
                  </span>
                </p>
              </div>
              {isPass ? (
                <CheckCircle2 className="w-8 h-8 text-emerald-500" />
              ) : (
                <XCircle className="w-8 h-8 text-slate-400" />
              )}
            </div>
          </div>

          {/* Written Grammar Assessment Submission */}
          {attempt.writtenEssay && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                <FileText className="w-4 h-4 text-indigo-600" />
                Round 1 Written Prompt (Grammar, Vocabulary & Tone)
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-700 leading-relaxed font-sans whitespace-pre-wrap">
                {attempt.writtenEssay}
              </div>
            </div>
          )}

          {/* Round 2 Submitted Code / SQL Queries */}
          <div className="space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
              <Database className="w-4 h-4 text-indigo-600" />
              Round 2 Submitted Solutions ({codingEntries.length} Problems Submitted)
            </div>

            {codingEntries.length === 0 ? (
              <p className="text-xs text-slate-400 italic bg-slate-50 p-4 rounded-2xl border border-slate-200">
                No code or SQL query submissions recorded for Round 2.
              </p>
            ) : (
              <div className="space-y-3">
                {codingEntries.map(([qId, code], idx) => (
                  <div
                    key={qId}
                    className="p-4 rounded-2xl bg-slate-900 text-slate-100 border border-slate-800 space-y-2"
                  >
                    <div className="flex justify-between items-center text-xs pb-2 border-b border-slate-800">
                      <span className="font-semibold text-slate-300">Problem #{idx + 1}</span>
                      <span className="text-[10px] font-mono bg-slate-800 text-slate-400 px-2 py-0.5 rounded">
                        Question ID: {qId.slice(0, 8)}...
                      </span>
                    </div>
                    <pre className="text-xs font-mono overflow-x-auto p-2 bg-slate-950/80 rounded-xl text-emerald-400 leading-relaxed max-h-56">
                      {String(code)}
                    </pre>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center text-xs">
          <span className="text-slate-500 font-mono text-[11px]">
            Attempt ID: {attempt.id}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white border border-[#16499c]/30 hover:border-[#16499c] hover:bg-[#eff5ff] text-[#16499c] font-semibold cursor-pointer transition-colors shadow-xs"
          >
            Close View
          </button>
        </div>
      </div>
    </div>
  );
};
