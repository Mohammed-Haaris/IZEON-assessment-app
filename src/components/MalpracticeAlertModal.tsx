import React, { useState } from "react";
import type { MalpracticeAlert } from "../types";
import { AlertOctagon, CheckCircle2, XCircle, Clock, ShieldAlert } from "lucide-react";

interface MalpracticeAlertModalProps {
  alert: MalpracticeAlert;
  onGiveChance: (attemptId: string, remarks: string) => void;
  onReject: (attemptId: string, remarks: string) => void;
}

export const MalpracticeAlertModal: React.FC<MalpracticeAlertModalProps> = ({
  alert,
  onGiveChance,
  onReject,
}) => {
  const [remarks, setRemarks] = useState<string>("");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-rose-200 overflow-hidden">
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-rose-600 to-red-600 px-6 py-4 flex items-center gap-3 text-white">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
            <AlertOctagon className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h3 className="text-lg font-bold tracking-tight">Malpractice Strike 2 Detected!</h3>
            <p className="text-xs text-rose-100">Immediate Proctoring Action Required</p>
          </div>
        </div>

        {/* Candidate Information Card */}
        <div className="p-6 space-y-4">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2.5">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 font-medium">Candidate Name:</span>
              <span className="font-semibold text-slate-900">{alert.studentName}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 font-medium">Candidate Email:</span>
              <span className="font-mono text-slate-700">{alert.studentEmail}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 font-medium">Assessment:</span>
              <span className="font-medium text-slate-800">{alert.assessmentTitle}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 font-medium">Violation Type:</span>
              <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-700 font-bold uppercase text-[10px]">
                {alert.violationType} ({alert.violationCount}/2 Strikes)
              </span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 font-medium">Timestamp:</span>
              <span className="flex items-center gap-1 text-slate-600">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                {new Date(alert.timestamp).toLocaleTimeString()}
              </span>
            </div>
          </div>

          {/* Incident context */}
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800">
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p>
              The candidate navigated away from the exam tab twice. Their screen is currently locked
              awaiting your decision.
            </p>
          </div>

          {/* Remarks input */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Admin Remarks (Optional)
            </label>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g., Candidate explained accidental keystroke; giving 1 final chance."
              rows={2}
              className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Decision Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => onGiveChance(alert.attemptId, remarks)}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-colors shadow-md shadow-emerald-600/20 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              Give Another Chance
            </button>

            <button
              onClick={() => onReject(alert.attemptId, remarks)}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs transition-colors shadow-md shadow-rose-600/20 cursor-pointer"
            >
              <XCircle className="w-4 h-4" />
              Reject & Disqualify
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
