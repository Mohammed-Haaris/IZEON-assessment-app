import React, { useState } from "react";
import { apiRequest } from "../services/api";
import type { College } from "../types";
import { X, Building, CheckCircle2, AlertCircle } from "lucide-react";

interface ManageCollegeModalProps {
  college?: College | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const ManageCollegeModal: React.FC<ManageCollegeModalProps> = ({
  college,
  onClose,
  onSuccess,
}) => {
  const isEditing = !!college;
  const [name, setName] = useState(college?.name || "");
  const [code, setCode] = useState(college?.code || "");
  const [isActive, setIsActive] = useState(college?.isActive ?? true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setErrorMessage(null);

    if (!name.trim()) {
      setErrorMessage("Please enter the college / institution name.");
      return;
    }

    setIsSubmitting(true);
    try {
      if (isEditing) {
        await apiRequest<{ message: string; college: College }>(
          `/admin/colleges/${college.id}`,
          {
            method: "PUT",
            body: JSON.stringify({
              name: name.trim(),
              code: code.trim().toUpperCase() || null,
              isActive,
            }),
          }
        );
        setSuccessMessage("College updated successfully!");
      } else {
        await apiRequest<{ message: string; college: College }>(
          "/admin/colleges",
          {
            method: "POST",
            body: JSON.stringify({
              name: name.trim(),
              code: code.trim().toUpperCase() || null,
            }),
          }
        );
        setSuccessMessage("New college added to directory successfully!");
      }

      setTimeout(() => {
        onSuccess();
        onClose();
      }, 900);
    } catch (err: any) {
      setErrorMessage(err.message || "Operation failed. Please try again.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-md rounded-3xl border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-6 bg-[#eff5ff] border-b border-[#16499c]/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#16499c] text-white flex items-center justify-center shadow-md shadow-[#16499c]/20">
              <Building className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">
                {isEditing ? "Edit College Information" : "Add College / Campus"}
              </h3>
              <p className="text-[11px] text-[#16499c] font-medium">
                Candidates select this institution in registration dropdown
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
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
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

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              College / Institution Full Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., PSNA College of Engineering and Technology"
              className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#16499c]/20 focus:border-[#16499c] font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Short Code / Acronym <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="e.g., PSNA, NEC, AU"
              className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#16499c]/20 focus:border-[#16499c] font-medium uppercase font-mono"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              Short code shown as a badge in student selection dropdown
            </p>
          </div>

          {isEditing && (
            <div className="flex items-center gap-2.5 pt-1">
              <input
                type="checkbox"
                id="college-is-active"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="w-4 h-4 rounded text-[#16499c] focus:ring-[#16499c]"
              />
              <label htmlFor="college-is-active" className="text-xs font-semibold text-slate-700 cursor-pointer">
                Active in Student Registration Dropdown
              </label>
            </div>
          )}

          <div className="pt-2 flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold text-xs transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-2.5 rounded-xl bg-[#16499c] hover:bg-[#123c80] disabled:opacity-50 text-white font-bold text-xs shadow-md shadow-[#16499c]/25 transition-all cursor-pointer"
            >
              {isSubmitting
                ? "Saving..."
                : isEditing
                ? "Update College"
                : "Add to Directory"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
