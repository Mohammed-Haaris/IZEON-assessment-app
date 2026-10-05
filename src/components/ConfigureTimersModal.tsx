import React, { useState } from "react";
import { apiRequest } from "../services/api";
import type { Assessment } from "../types";
import {
  X,
  Clock,
  Award,
  CheckCircle2,
  AlertCircle,
  FileText,
  Code2,
  Zap,
} from "lucide-react";

interface ConfigureTimersModalProps {
  assessment: Assessment;
  onClose: () => void;
  onSuccess: () => void;
}

export const ConfigureTimersModal: React.FC<ConfigureTimersModalProps> = ({
  assessment,
  onClose,
  onSuccess,
}) => {
  const [durationR1, setDurationR1] = useState<number>(assessment.durationR1 || 25);
  const [durationR2, setDurationR2] = useState<number>(assessment.durationR2 || 40);
  const [passingScore, setPassingScore] = useState<number>(assessment.passingScore || 60);
  const [title, setTitle] = useState(assessment.title || "");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const presets = [
    { label: " Quick (15m • 30m)", r1: 15, r2: 30 },
    { label: " Standard (25m • 40m)", r1: 25, r2: 40 },
    { label: " Moderate (30m • 45m)", r1: 30, r2: 45 },
    { label: " Extended (45m • 60m)", r1: 45, r2: 60 },
  ];

  const applyPreset = (r1: number, r2: number) => {
    setDurationR1(r1);
    setDurationR2(r2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (durationR1 < 1 || durationR2 < 1) {
      setErrorMessage("Timer duration must be at least 1 minute for each round.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await apiRequest<{ message: string; assessment: Assessment }>(
        `/admin/assessments/${assessment.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            title: title.trim(),
            durationR1: Number(durationR1),
            durationR2: Number(durationR2),
            passingScore: Number(passingScore),
          }),
        }
      );

      setSuccessMessage(res.message || "Exam timers updated successfully!");
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1200);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to update exam timers.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-lg rounded-3xl border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-6 bg-[#eff5ff] border-b border-[#16499c]/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#16499c] text-white flex items-center justify-center shadow-md shadow-[#16499c]/20">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">Configure Exam Timers</h3>
              <p className="text-[11px] text-[#16499c] font-medium">
                Set manual durations for Round 1 & Round 2
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center cursor-pointer transition-colors shadow-xs"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3.5 rounded-xl bg-[#eff5ff] border border-[#16499c]/30 text-[#16499c] text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Quick Presets */}
          <div className="space-y-2">
            <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-[#16499c]" />
              Quick Presets
            </label>
            <div className="grid grid-cols-2 gap-2">
              {presets.map((p) => {
                const isSelected = durationR1 === p.r1 && durationR2 === p.r2;
                return (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => applyPreset(p.r1, p.r2)}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer border text-left ${isSelected
                      ? "bg-[#16499c] text-white border-[#16499c] shadow-xs"
                      : "bg-slate-50 hover:bg-[#eff5ff] text-slate-700 border-slate-200"
                      }`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Duration Inputs Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            {/* Round 1 Timer */}
            <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200 space-y-2">
              <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-[#16499c]" />
                Round 1 Timer (Minutes)
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  max="180"
                  required
                  value={durationR1}
                  onChange={(e) => setDurationR1(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full text-base font-extrabold pl-3 pr-14 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#16499c]/20 focus:border-[#16499c] transition-all font-mono"
                />
                <span className="absolute right-3 top-3 text-xs font-bold text-slate-400">
                  Mins
                </span>
              </div>
              <p className="text-[10px] text-slate-500 font-medium">
                Cognitive Aptitude, Verbal MCQs & Written Prompt
              </p>
            </div>

            {/* Round 2 Timer */}
            <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200 space-y-2">
              <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Code2 className="w-4 h-4 text-[#16499c]" />
                Round 2 Timer (Minutes)
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  max="240"
                  required
                  value={durationR2}
                  onChange={(e) => setDurationR2(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full text-base font-extrabold pl-3 pr-14 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#16499c]/20 focus:border-[#16499c] transition-all font-mono"
                />
                <span className="absolute right-3 top-3 text-xs font-bold text-slate-400">
                  Mins
                </span>
              </div>
              <p className="text-[10px] text-slate-500 font-medium">
                Live Coding, Python Data Analysis & SQL Queries
              </p>
            </div>
          </div>

          {/* Assessment Title & Passing Score */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
            <div className="sm:col-span-2 space-y-1.5">
              <label className="block text-xs font-bold text-slate-800">
                Exam Title
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full text-xs py-2.5 px-3 rounded-xl border border-slate-300 bg-white text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-[#16499c]/20 focus:border-[#16499c] transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-800 flex items-center gap-1">
                <Award className="w-3.5 h-3.5 text-[#16499c]" />
                Passing Score
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max="200"
                  value={passingScore}
                  onChange={(e) => setPassingScore(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full text-xs font-bold py-2.5 pl-3 pr-10 rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#16499c]/20 focus:border-[#16499c] transition-all font-mono"
                />
                <span className="absolute right-3 top-2.5 text-[11px] font-bold text-slate-400">
                  Pts
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-700 cursor-pointer transition-colors shadow-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#16499c] hover:bg-[#123c80] text-white text-xs font-extrabold shadow-md shadow-[#16499c]/25 cursor-pointer transition-all transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50"
            >
              <Clock className="w-3.5 h-3.5" />
              {isSubmitting ? "Updating Timers..." : "Save Timers"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
