import React, { useEffect, useState } from "react";
import { apiRequest } from "../services/api";
import { getSocket } from "../services/socket";
import { MalpracticeAlertModal } from "../components/MalpracticeAlertModal";
import { AddQuestionModal } from "../components/AddQuestionModal";
import { QuestionListModal } from "../components/QuestionListModal";
import { CandidateDetailsModal } from "../components/CandidateDetailsModal";
import { CreateAdminModal } from "../components/CreateAdminModal";
import { ConfigureTimersModal } from "../components/ConfigureTimersModal";
import { CustomSelect } from "../components/CustomSelect";
import {
  generateExamResultsPDF,
  generateCandidateScorecardPDF,
} from "../utils/pdfGenerator";
import { exportStudentsToExcel } from "../utils/excelExporter";
import interviewLogo from "../assets/interview logo.png";
import type { User, Assessment, MalpracticeAlert, AssessmentAttempt } from "../types";
import {
  Users,
  ShieldAlert,
  FileSpreadsheet,
  RotateCw,
  Search,
  Check,
  Award,
  Plus,
  Eye,
  Download,
  CheckCircle2,
  Trash2,
  UserPlus,
  ShieldCheck,
  XCircle,
  AlertOctagon,
  Clock,
  Settings,
} from "lucide-react";

export const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"approvals" | "proctor" | "exams" | "results" | "admins">("approvals");

  // Administrators state
  const [admins, setAdmins] = useState<User[]>([]);
  const [isCreateAdminOpen, setIsCreateAdminOpen] = useState(false);

  // Students approval state
  const [students, setStudents] = useState<User[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Live Proctor & Malpractice Alerts
  const [activeAlert, setActiveAlert] = useState<MalpracticeAlert | null>(null);
  const [dismissedAlerts, setDismissedAlerts] = useState<string[]>([]);
  const [malpracticeLogs, setMalpracticeLogs] = useState<any[]>([]);

  // Assessments & Question Modals
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [attempts, setAttempts] = useState<AssessmentAttempt[]>([]);
  const [isAddQuestionOpen, setIsAddQuestionOpen] = useState(false);
  const [selectedAssessmentForAdd, setSelectedAssessmentForAdd] = useState<string>("");
  const [viewQuestionsAssessment, setViewQuestionsAssessment] = useState<Assessment | null>(null);
  const [configuringTimersAssessment, setConfiguringTimersAssessment] = useState<Assessment | null>(null);

  // Results & Candidate Inspection Modal
  const [selectedAttemptForDetails, setSelectedAttemptForDetails] = useState<AssessmentAttempt | null>(null);
  const [resultsSearchQuery, setResultsSearchQuery] = useState("");
  const [resultsRoleFilter, setResultsRoleFilter] = useState<"ALL" | "Software Developer" | "Data Analyst">("ALL");
  const [resultsStatusFilter, setResultsStatusFilter] = useState<string>("ALL");

  // Socket
  const socket = getSocket();

  useEffect(() => {
    const handleConnect = () => {
      socket.emit("join:admin");
    };

    if (socket.connected) {
      socket.emit("join:admin");
    }
    socket.on("connect", handleConnect);

    // Real-time malpractice popup alert listener
    socket.on("admin:malpractice_alert", (alert: MalpracticeAlert) => {
      setActiveAlert(alert);
      loadMalpracticeLogs();
      loadAttempts();
    });

    socket.on("admin:action_resolved", () => {
      setActiveAlert(null);
      loadMalpracticeLogs();
      loadAttempts();
    });

    return () => {
      socket.off("connect", handleConnect);
      socket.off("admin:malpractice_alert");
      socket.off("admin:action_resolved");
    };
  }, []);

  const loadStudents = async () => {
    try {
      const data = await apiRequest<{ students: User[] }>("/admin/students");
      setStudents(data.students);
    } catch (err) {
      console.error("Load students error:", err);
    }
  };

  const loadMalpracticeLogs = async () => {
    try {
      const data = await apiRequest<{ logs: any[] }>("/admin/malpractice-logs");
      setMalpracticeLogs(data.logs);
      return data.logs;
    } catch (err) {
      console.error("Load logs error:", err);
      return [];
    }
  };

  const loadAssessments = async () => {
    try {
      const data = await apiRequest<{ assessments: Assessment[] }>("/admin/assessments");
      setAssessments(data.assessments);
    } catch (err) {
      console.error("Load assessments error:", err);
    }
  };

  const loadAttempts = async () => {
    try {
      const data = await apiRequest<{ attempts: any[] }>("/admin/attempts");
      setAttempts(data.attempts);
      return data.attempts;
    } catch (err) {
      console.error("Load attempts error:", err);
      return [];
    }
  };

  const loadAdmins = async () => {
    try {
      const data = await apiRequest<{ admins: User[] }>("/admin/admins");
      setAdmins(data.admins);
    } catch (err) {
      console.error("Load admins error:", err);
    }
  };

  useEffect(() => {
    async function loadAllInitialData() {
      loadStudents();
      loadAssessments();
      loadAdmins();
      const [logs, atts] = await Promise.all([loadMalpracticeLogs(), loadAttempts()]);

      // Auto-popup if candidate is locked and admin just loaded dashboard
      if (atts && logs) {
        const lockedAttempt = atts.find(
          (a: any) => a.status === "MALPRACTICE_LOCKED" && !dismissedAlerts.includes(a.id)
        );
        if (lockedAttempt && lockedAttempt.user) {
          setActiveAlert({
            attemptId: lockedAttempt.id,
            studentId: lockedAttempt.user.id,
            studentName: lockedAttempt.user.name,
            studentEmail: lockedAttempt.user.email,
            assessmentTitle: lockedAttempt.assessment?.title || "Round 2 Assessment",
            violationType: "TAB_SWITCH",
            violationCount: lockedAttempt.tabSwitchCount || 2,
            timestamp: new Date().toISOString(),
          });
        }
      }
    }
    loadAllInitialData();
  }, []);

  // Permanently delete user from entire database
  const handleDeleteUser = async (userId: string, userName: string) => {
    const isConfirmed = window.confirm(
      `⚠️ PERMANENT DATABASE DELETION\n\nAre you sure you want to permanently delete "${userName}" from the entire database?\n\nThis will completely erase this user, their test attempts, answers, and proctoring violation logs. This action CANNOT be undone.`
    );
    if (!isConfirmed) return;

    try {
      await apiRequest(`/admin/users/${userId}`, { method: "DELETE" });
      await Promise.all([loadStudents(), loadAttempts(), loadMalpracticeLogs(), loadAdmins()]);
    } catch (err: any) {
      alert(err.message || "Failed to delete user from database");
    }
  };

  // Permanently delete a single assessment attempt
  const handleDeleteAttempt = async (attemptId: string, candidateName: string) => {
    const isConfirmed = window.confirm(
      `⚠️ DELETE ATTEMPT RECORD\n\nAre you sure you want to delete the attempt record for "${candidateName}"?\n\nThis will remove this specific test attempt, scores, submitted code, and proctoring violation logs.`
    );
    if (!isConfirmed) return;

    try {
      await apiRequest(`/admin/attempts/${attemptId}`, { method: "DELETE" });
      await Promise.all([loadAttempts(), loadMalpracticeLogs()]);
    } catch (err: any) {
      alert(err.message || "Failed to delete attempt");
    }
  };

  // Student approval handler
  const handleUpdateStudentStatus = async (id: string, status: "APPROVED" | "REJECTED") => {
    try {
      await apiRequest(`/admin/students/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      loadStudents();
    } catch (err: any) {
      alert(err.message || "Failed to update status");
    }
  };

  const [processingLogId, setProcessingLogId] = useState<string | null>(null);

  // Malpractice decision handlers
  const handleGiveChance = async (attemptId: string, remarks: string = "Admin granted candidate another chance", logId?: string) => {
    if (logId) {
      setProcessingLogId(logId);
      setMalpracticeLogs((prev) =>
        prev.map((l) => (l.id === logId ? { ...l, adminDecision: "GIVEN_CHANCE" } : l))
      );
    }
    try {
      if (logId) {
        await apiRequest(`/admin/malpractice-logs/${logId}/decision`, {
          method: "POST",
          body: JSON.stringify({ decision: "GIVEN_CHANCE", remarks }),
        });
      } else {
        await apiRequest(`/admin/attempts/${attemptId}/give-chance`, {
          method: "POST",
          body: JSON.stringify({ remarks }),
        });
      }
    } catch (err: any) {
      console.error("Give chance REST error:", err);
      alert(err.message || "Failed to give chance");
    }
    socket.emit("admin:give_chance", { attemptId, remarks, logId });
    setActiveAlert(null);
    setDismissedAlerts((prev) => [...prev, attemptId]);
    await Promise.all([loadMalpracticeLogs(), loadAttempts()]);
    setProcessingLogId(null);
  };

  const handleRejectCandidate = async (attemptId: string, remarks: string = "Disqualified for repeated tab-switching malpractice", logId?: string) => {
    if (logId) {
      setProcessingLogId(logId);
      setMalpracticeLogs((prev) =>
        prev.map((l) => (l.id === logId ? { ...l, adminDecision: "REJECTED" } : l))
      );
    }
    try {
      if (logId) {
        await apiRequest(`/admin/malpractice-logs/${logId}/decision`, {
          method: "POST",
          body: JSON.stringify({ decision: "REJECTED", remarks }),
        });
      } else {
        await apiRequest(`/admin/attempts/${attemptId}/reject`, {
          method: "POST",
          body: JSON.stringify({ remarks }),
        });
      }
    } catch (err: any) {
      console.error("Reject candidate REST error:", err);
      alert(err.message || "Failed to reject candidate");
    }
    socket.emit("admin:reject_student", { attemptId, remarks, logId });
    setActiveAlert(null);
    setDismissedAlerts((prev) => [...prev, attemptId]);
    await Promise.all([loadMalpracticeLogs(), loadAttempts()]);
    setProcessingLogId(null);
  };

  const filteredStudents = students.filter((s) => {
    const matchesStatus = statusFilter === "ALL" || s.status === statusFilter;
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      s.name.toLowerCase().includes(q) ||
      s.email.toLowerCase().includes(q) ||
      (s.rollNumber && s.rollNumber.toLowerCase().includes(q)) ||
      (s.department && s.department.toLowerCase().includes(q)) ||
      (s.position && s.position.toLowerCase().includes(q)) ||
      (s.mobileNumber && s.mobileNumber.toLowerCase().includes(q)) ||
      (s.college && s.college.toLowerCase().includes(q));
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* REAL-TIME MALPRACTICE MODAL ALERT */}
      {activeAlert && (
        <MalpracticeAlertModal
          alert={activeAlert}
          onGiveChance={handleGiveChance}
          onReject={handleRejectCandidate}
          onClose={() => {
            if (activeAlert) {
              setDismissedAlerts((prev) => [...prev, activeAlert.attemptId]);
            }
            setActiveAlert(null);
          }}
        />
      )}

      {/* Header Banner - Executive Human-Designed Light Green & Brand Blue Aesthetic */}
      <div className="relative overflow-hidden bg-white p-7 rounded-3xl shadow-sm border border-[#16499c]/25">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white border border-[#16499c]/25 p-1 flex items-center justify-center shrink-0 shadow-xs">
              <img src={interviewLogo} alt="IZEON Logo" className="w-full h-full object-contain" />
            </div>
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#eff5ff] text-[#16499c] font-bold text-[10px] uppercase tracking-wider border border-[#16499c]/30">
                <span className="w-2 h-2 rounded-full bg-[#16499c] animate-pulse" />
                Administrative Command Center
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                IZEON<span className="text-[#16499c]">Assessment</span> System
              </h1>
              <p className="text-xs text-slate-500 max-w-xl leading-relaxed">
                Real-time candidate verification, supervised tab-switch security, dual-track assessment configuration, and official scorecard evaluation.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsCreateAdminOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#16499c] hover:bg-[#123c80] text-white text-xs font-bold shadow-sm shadow-[#16499c]/20 transition-all cursor-pointer transform hover:-translate-y-0.5 active:translate-y-0"
            >
              <UserPlus className="w-3.5 h-3.5" />
              Register New Admin
            </button>

            {/* Secondary Button: Export to Excel */}
            <button
              onClick={() => exportStudentsToExcel(students, attempts)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#16499c] hover:bg-[#123c80] text-white text-xs font-bold shadow-sm shadow-[#16499c]/20 border border-[#16499c] transition-all cursor-pointer transform hover:-translate-y-0.5 active:translate-y-0"
              title="Export all database candidate records and exam metrics to Excel spreadsheet"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Export to Excel
            </button>

            {/* Secondary Outline Button: Sync Real-time Data */}
            <button
              onClick={() => {
                loadStudents();
                loadMalpracticeLogs();
                loadAttempts();
                loadAdmins();
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#eff5ff] hover:bg-[#e0ecff] text-[#16499c] text-xs font-bold border border-[#16499c]/30 shadow-xs transition-all cursor-pointer"
            >
              <RotateCw className="w-3.5 h-3.5" />
              Sync Real-time Data
            </button>
          </div>
        </div>

        {/* Real-time KPI Stats Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-100">
          <div className="p-3.5 rounded-2xl bg-[#eff5ff]/40 border border-[#16499c]/20 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white border border-[#16499c]/30 text-[#16499c] flex items-center justify-center shrink-0 shadow-xs">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-semibold text-slate-500">Enrolled Candidates</div>
              <div className="text-lg font-black text-slate-900 flex items-center gap-1.5">
                {students.length} Total
              </div>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#eff5ff] border border-[#16499c]/25 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white border border-[#16499c]/30 text-[#16499c] flex items-center justify-center shrink-0 shadow-xs">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-semibold text-slate-500">Active Exams</div>
              <div className="text-lg font-black text-slate-900">
                {assessments.filter((a) => a.isActive).length} Live
              </div>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#eff5ff]/40 border border-[#16499c]/20 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white border border-[#16499c]/30 text-[#16499c] flex items-center justify-center shrink-0 shadow-xs">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-semibold text-slate-500">Submissions</div>
              <div className="text-lg font-black text-slate-900">
                {attempts.filter((a) => a.status === "COMPLETED").length} Finished
              </div>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 border border-[#16499c]/20 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white border border-[#16499c]/30 text-[#16499c] flex items-center justify-center shrink-0 shadow-xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-semibold text-slate-500">System Admins</div>
              <div className="text-lg font-black text-[#16499c]">{admins.length} Active</div>
            </div>
          </div>
        </div>
      </div>

      {/* CANDIDATE EXAM LOCKED URGENT ACTION BANNER */}
      {attempts.filter((a) => a.status === "MALPRACTICE_LOCKED").length > 0 && (
        <div className="bg-gradient-to-r from-rose-50 via-red-50 to-amber-50 border-2 border-rose-300 rounded-3xl p-6 shadow-md space-y-4 animate-in fade-in duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-rose-200/60 pb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-rose-600/30">
                <AlertOctagon className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  Action Required: Candidate Exam Suspended ({attempts.filter((a) => a.status === "MALPRACTICE_LOCKED").length} Candidate{attempts.filter((a) => a.status === "MALPRACTICE_LOCKED").length > 1 ? "s" : ""})
                  <span className="px-2.5 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-black uppercase tracking-wider">
                    Locked
                  </span>
                </h2>
                <p className="text-xs text-slate-600">
                  The candidate reached the tab switch limit during Round 2. Please review and authorize whether to grant another chance or disqualify.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {attempts
              .filter((a) => a.status === "MALPRACTICE_LOCKED")
              .map((attempt) => (
                <div
                  key={attempt.id}
                  className="bg-white p-4 rounded-2xl border border-rose-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-slate-900 text-sm">{attempt.user?.name}</span>
                      <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                        {attempt.user?.email}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 text-[10px] font-black uppercase">
                        {attempt.tabSwitchCount}/2 Tab Switches
                      </span>
                    </div>
                    <div className="text-xs text-slate-600 flex items-center gap-2">
                      <span className="font-semibold text-slate-700">{attempt.assessment?.title || "Assessment"}</span>
                      <span>•</span>
                      <span className="text-slate-500 font-mono text-[11px]">ID: {attempt.id}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleGiveChance(attempt.id, "Admin authorized candidate to resume assessment")}
                      className="px-4 py-2 rounded-xl bg-[#16499c] hover:bg-[#123c80] text-white font-extrabold text-xs shadow-sm shadow-[#16499c]/20 transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Give Another Chance
                    </button>
                    <button
                      onClick={() => handleRejectCandidate(attempt.id, "Candidate disqualified by admin")}
                      className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs shadow-sm shadow-rose-600/20 transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <XCircle className="w-4 h-4" />
                      Disqualify Candidate
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Modern Floating Pill Navigation Tabs */}
      <div className="bg-white p-1.5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap gap-1">
        {[
          { id: "approvals", label: "Candidate Directory", icon: Users, badge: students.length },
          { id: "proctor", label: "Live Monitoring & Logs", icon: ShieldAlert },
          { id: "exams", label: "Assessment & Question Bank", icon: FileSpreadsheet },
          { id: "results", label: "Candidate Scores & Master Marks", icon: Award, badge: attempts.length },
          { id: "admins", label: "Administrators", icon: ShieldCheck, badge: admins.length },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${isActive
                ? "bg-[#16499c] text-white shadow-xs"
                : "text-slate-600 hover:text-[#16499c] hover:bg-[#eff5ff]"
                }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-slate-400"}`} />
              <span>{tab.label}</span>
              {tab.badge !== undefined && tab.badge > 0 && (
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${isActive
                    ? "bg-white text-[#16499c]"
                    : "bg-[#eff5ff] text-[#16499c]"
                    }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* TAB 1: CANDIDATE DIRECTORY */}
      {activeTab === "approvals" && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-3 justify-between items-center bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="relative w-full sm:w-96">
              <Search className="w-4 h-4 text-[#16499c] absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search by name, roll no, dept, position, phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs pl-9 pr-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#16499c]/20 focus:border-[#16499c] font-medium"
              />
            </div>

            <div className="flex items-center gap-1.5 w-full sm:w-auto">
              <span className="text-xs text-slate-500 font-bold">Filter:</span>
              {(["ALL", "APPROVED", "REJECTED"] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all ${statusFilter === status
                    ? "bg-[#16499c] text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-[#eff5ff] hover:text-[#16499c]"
                    }`}
                >
                  {status === "ALL" ? "All" : status === "APPROVED" ? "Active" : "Restricted"}
                </button>
              ))}

              <button
                onClick={() =>
                  exportStudentsToExcel(
                    filteredStudents,
                    attempts,
                    `IZEON_Candidates_Directory_${new Date().toISOString().split("T")[0]}.csv`
                  )
                }
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#16499c] hover:bg-[#123c80] text-white text-xs font-bold transition-all cursor-pointer shadow-xs sm:ml-2 border border-[#16499c]"
                title="Export filtered candidate directory to Excel spreadsheet"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Export ({filteredStudents.length})</span>
              </button>
            </div>
          </div>

          {/* Students Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#eff5ff]/40 border-b border-[#16499c]/20 text-[11px] font-extrabold uppercase tracking-wider text-slate-900">
                    <th className="py-3.5 px-6">Candidate</th>
                    <th className="py-3.5 px-6">Roll & Dept</th>
                    <th className="py-3.5 px-6">Applied Role</th>
                    <th className="py-3.5 px-6">Contact & DOB</th>
                    <th className="py-3.5 px-6">College / Org</th>
                    <th className="py-3.5 px-6">Status</th>
                    <th className="py-3.5 px-6">Registered On</th>
                    <th className="py-3.5 px-6 text-right">Access Control</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400 font-medium">
                        No candidates found matching your filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map((student) => (
                      <tr key={student.id} className="hover:bg-[#eff5ff]/30 transition-colors">
                        <td className="py-3.5 px-6">
                          <div className="font-bold text-slate-900">{student.name}</div>
                          <div className="text-[11px] font-mono text-slate-400">{student.email}</div>
                        </td>
                        <td className="py-3.5 px-6">
                          <div className="font-mono font-bold text-slate-900 text-[11px]">
                            {student.rollNumber || "—"}
                          </div>
                          {student.department && (
                            <div className="text-slate-500 font-medium text-[11px] mt-0.5">{student.department}</div>
                          )}
                        </td>
                        <td className="py-3.5 px-6 whitespace-nowrap">
                          {student.position ? (
                            <span className="font-semibold text-slate-800 text-xs">
                              {student.position === "Data Analyst" ? " Data Analyst" : " Software Dev"}
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="py-3.5 px-6">
                          <div className="text-slate-800 font-bold text-[11px]">
                            {student.mobileNumber || "—"}
                          </div>
                          {student.dob && (
                            <div className="text-slate-400 text-[10px] mt-0.5">DOB: {student.dob}</div>
                          )}
                        </td>
                        <td className="py-3.5 px-6 text-slate-600 font-medium">{student.college || "—"}</td>
                        <td className="py-3.5 px-6">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${student.status === "APPROVED"
                              ? "bg-[#eff5ff] text-[#16499c]"
                              : student.status === "PENDING_APPROVAL"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-rose-100 text-rose-800"
                              }`}
                          >
                            {student.status === "APPROVED" ? "ACTIVE" : student.status === "REJECTED" ? "RESTRICTED" : student.status.replace("_", " ")}
                          </span>
                        </td>
                        <td className="py-3.5 px-6 text-slate-400 text-[11px] font-medium">
                          {student.createdAt ? new Date(student.createdAt).toLocaleDateString() : "—"}
                        </td>
                        <td className="py-3.5 px-6 text-right">
                          <div className="inline-flex items-center justify-end gap-2">
                            {student.status === "PENDING_APPROVAL" ? (
                              <button
                                onClick={() => handleUpdateStudentStatus(student.id, "APPROVED")}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#16499c] hover:bg-[#123c80] text-white font-bold text-xs shadow-xs cursor-pointer transition-all"
                              >
                                <Check className="w-3.5 h-3.5" />
                                Activate
                              </button>
                            ) : student.status === "APPROVED" ? (
                              <button
                                onClick={() => handleUpdateStudentStatus(student.id, "REJECTED")}
                                className="text-[11px] font-bold text-rose-600 hover:text-rose-700 hover:underline cursor-pointer"
                              >
                                Restrict Access
                              </button>
                            ) : (
                              <button
                                onClick={() => handleUpdateStudentStatus(student.id, "APPROVED")}
                                className="text-[11px] font-bold text-[#16499c] hover:text-[#16499c] hover:underline cursor-pointer"
                              >
                                Restore Access
                              </button>
                            )}

                            <button
                              onClick={() => handleDeleteUser(student.id, student.name)}
                              className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 transition-all cursor-pointer ml-1"
                              title="Permanently Delete Student from Database"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: LIVE PROCTORING & MALPRACTICE LOGS */}
      {activeTab === "proctor" && (
        <div className="space-y-6">
          <div className="p-4 rounded-2xl bg-[#eff5ff]/80 border border-[#16499c]/30 text-xs text-slate-900 flex items-start gap-3 shadow-xs">
            <ShieldAlert className="w-5 h-5 text-[#16499c] shrink-0 mt-0.5" />
            <div>
              <p className="font-extrabold text-slate-900">Real-time Anti-Cheating System is Active</p>
              <p className="text-[11px] text-slate-600 mt-0.5 font-medium">
                When a candidate switches tabs twice in Round 2, an instant interactive pop-up
                will appear allowing you to either give them another chance or immediately disqualify
                them.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                Malpractice Incident History
              </h3>
              <span className="text-[11px] text-slate-500 font-medium">
                Auto-synced via WebSockets
              </span>
            </div>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-extrabold uppercase tracking-wider text-slate-600">
                  <th className="py-3.5 px-6">Candidate</th>
                  <th className="py-3.5 px-6">Violation Type</th>
                  <th className="py-3.5 px-6">Strikes</th>
                  <th className="py-3.5 px-6">Admin Decision</th>
                  <th className="py-3.5 px-6">Timestamp</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {malpracticeLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400 font-medium">
                      No malpractice incidents recorded yet. Clean exam environment!
                    </td>
                  </tr>
                ) : (
                  malpracticeLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-6">
                        <div className="font-bold text-slate-900">{log.user?.name}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{log.user?.email}</div>
                      </td>
                      <td className="py-3.5 px-6">
                        <span className="px-2.5 py-0.5 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 font-extrabold text-[10px]">
                          {log.violationType}
                        </span>
                      </td>
                      <td className="py-3.5 px-6 font-extrabold text-slate-900">
                        {log.violationCount}/2 Strikes
                      </td>
                      <td className="py-3.5 px-6">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${log.adminDecision === "GIVEN_CHANCE"
                            ? "bg-[#eff5ff] text-[#16499c] border border-[#16499c]/30"
                            : log.adminDecision === "REJECTED"
                              ? "bg-rose-100 text-rose-800 border border-rose-200"
                              : "bg-amber-100 text-amber-800 border border-amber-200"
                            }`}
                        >
                          {log.adminDecision || "PENDING ACTION"}
                        </span>
                      </td>
                      <td className="py-3.5 px-6 text-slate-500 text-[11px] font-medium">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="py-3.5 px-6 text-right whitespace-nowrap">
                        {log.adminDecision === "PENDING" || !log.adminDecision || log.attempt?.status === "MALPRACTICE_LOCKED" ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleGiveChance(log.attemptId, "Admin authorized candidate to resume", log.id)}
                              disabled={processingLogId === log.id}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#16499c] hover:bg-[#123c80] disabled:opacity-50 text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
                              title="Give candidate another chance and unlock assessment"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>{processingLogId === log.id ? "Updating..." : "Give Chance"}</span>
                            </button>
                            <button
                              onClick={() => handleRejectCandidate(log.attemptId, "Disqualified for repeated tab switching", log.id)}
                              disabled={processingLogId === log.id}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
                              title="Disqualify candidate"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              <span>{processingLogId === log.id ? "Updating..." : "Disqualify"}</span>
                            </button>
                          </div>
                        ) : log.adminDecision === "GIVEN_CHANCE" ? (
                          <div className="flex items-center justify-end gap-2">
                            <span className="inline-flex items-center gap-1 text-[#16499c] font-bold text-xs">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Chance Granted
                            </span>
                            {log.attempt?.status === "MALPRACTICE_LOCKED" && (
                              <button
                                onClick={() => handleGiveChance(log.attemptId, "Admin re-unlocked exam", log.id)}
                                disabled={processingLogId === log.id}
                                className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-[11px] font-bold cursor-pointer transition-all"
                              >
                                {processingLogId === log.id ? "Updating..." : "Re-Unlock"}
                              </button>
                            )}
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-rose-600 font-bold text-xs">
                            <XCircle className="w-3.5 h-3.5" />
                            Disqualified
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: ASSESSMENTS & QUESTIONS */}
      {activeTab === "exams" && (
        <div className="space-y-6">
          <div className="flex justify-between items-center bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div>
              <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                Configured Assessments & Question Bank
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                Set manual timer durations for Round 1 & Round 2, or manage questions
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (assessments[0]) {
                    setConfiguringTimersAssessment(assessments[0]);
                  }
                }}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-[#16499c]/30 bg-white hover:bg-[#eff5ff] text-[#16499c] font-extrabold text-xs shadow-xs cursor-pointer transition-all"
              >
                <Clock className="w-4 h-4 text-[#16499c]" />
                Configure Exam Timers
              </button>

              <button
                onClick={() => {
                  setSelectedAssessmentForAdd(assessments[0]?.id || "");
                  setIsAddQuestionOpen(true);
                }}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#16499c] hover:bg-[#123c80] text-white font-extrabold text-xs shadow-md shadow-[#16499c]/20 cursor-pointer transition-all transform hover:-translate-y-0.5 active:translate-y-0"
              >
                <Plus className="w-4 h-4" />
                Add New Question
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {assessments.map((a) => (
              <div
                key={a.id}
                className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:border-[#16499c]/40 hover:shadow-md transition-all space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="px-3 py-1 rounded-full bg-[#eff5ff] text-[#16499c] text-[10px] font-bold uppercase border border-[#16499c]/30">
                        {a.isActive ? "Active Exam" : "Inactive"}
                      </span>
                      <h3 className="text-base font-bold text-slate-900 mt-1.5">{a.title}</h3>
                    </div>
                    <span className="text-xs font-mono text-[#16499c] font-bold bg-[#eff5ff] border border-[#16499c]/30 px-3 py-1 rounded-xl">
                      {a._count?.questions || 0} Questions
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 font-medium leading-relaxed">{a.description}</p>

                  <div className="grid grid-cols-2 gap-3 pt-2 text-xs">
                    <div
                      onClick={() => setConfiguringTimersAssessment(a)}
                      className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 hover:border-[#16499c]/40 hover:bg-[#eff5ff]/40 cursor-pointer transition-all group"
                      title="Click to edit Round 1 timer"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-bold text-slate-400">Round 1</span>
                        <Settings className="w-3 h-3 text-slate-400 group-hover:text-[#16499c]" />
                      </div>
                      <p className="font-extrabold text-slate-900 mt-0.5">{a.durationR1} Minutes</p>
                    </div>
                    <div
                      onClick={() => setConfiguringTimersAssessment(a)}
                      className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 hover:border-[#16499c]/40 hover:bg-[#eff5ff]/40 cursor-pointer transition-all group"
                      title="Click to edit Round 2 timer"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-bold text-slate-400">Round 2</span>
                        <Settings className="w-3 h-3 text-slate-400 group-hover:text-[#16499c]" />
                      </div>
                      <p className="font-extrabold text-slate-900 mt-0.5">{a.durationR2} Minutes</p>
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="pt-4 border-t border-slate-100 flex flex-wrap gap-2">
                  <button
                    onClick={() => setConfiguringTimersAssessment(a)}
                    className="flex items-center gap-1.5 py-2.5 px-3 rounded-xl border border-slate-200 bg-white hover:bg-[#eff5ff] hover:border-[#16499c]/30 text-xs font-bold text-[#16499c] cursor-pointer transition-all shadow-xs"
                    title="Set manual timers for Round 1 & Round 2"
                  >
                    <Clock className="w-3.5 h-3.5" />
                    Set Timers
                  </button>

                  <button
                    onClick={() => setViewQuestionsAssessment(a)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border border-slate-200 bg-white hover:bg-[#eff5ff]/50 hover:border-[#16499c]/30 text-xs font-bold text-slate-700 hover:text-[#16499c] cursor-pointer transition-all shadow-xs"
                  >
                    <Eye className="w-3.5 h-3.5 text-[#16499c]" />
                    Questions ({a._count?.questions || 0})
                  </button>

                  <button
                    onClick={() => {
                      setSelectedAssessmentForAdd(a.id);
                      setIsAddQuestionOpen(true);
                    }}
                    className="flex items-center gap-1 py-2.5 px-3 rounded-xl bg-[#eff5ff] hover:bg-[#eff5ff] text-[#16499c] border border-[#16499c]/30 text-xs font-bold cursor-pointer transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Question
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: RESULTS & SCORE MANAGEMENT */}
      {activeTab === "results" && (() => {
        const filteredAttempts = attempts.filter((att) => {
          // Search filter
          if (resultsSearchQuery.trim()) {
            const q = resultsSearchQuery.toLowerCase();
            const matchName = att.user?.name?.toLowerCase().includes(q);
            const matchEmail = att.user?.email?.toLowerCase().includes(q);
            const matchRoll = att.user?.rollNumber?.toLowerCase().includes(q);
            const matchDept = att.user?.department?.toLowerCase().includes(q);
            const matchCollege = att.user?.college?.toLowerCase().includes(q);
            if (!matchName && !matchEmail && !matchRoll && !matchDept && !matchCollege) {
              return false;
            }
          }

          // Role filter
          if (resultsRoleFilter !== "ALL") {
            if (att.user?.position !== resultsRoleFilter) return false;
          }

          // Status filter
          if (resultsStatusFilter !== "ALL") {
            if (att.status !== resultsStatusFilter) return false;
          }

          return true;
        });

        // Compute metrics
        const totalCandidates = attempts.length;
        const completedAttempts = attempts.filter((a) => a.status === "COMPLETED");
        const passingThreshold = assessments[0]?.passingScore ?? 60;
        const passedCandidates = attempts.filter((a) => {
          const totalScore = (a.round1Score ?? 0) + (a.round2Score ?? 0);
          return totalScore >= passingThreshold && a.status === "COMPLETED";
        });
        const avgScore =
          totalCandidates > 0
            ? (
              attempts.reduce(
                (acc, a) => acc + (a.round1Score ?? 0) + (a.round2Score ?? 0),
                0
              ) / totalCandidates
            ).toFixed(1)
            : "0";

        return (
          <div className="space-y-6">
            {/* Top KPI Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Total Attempts
                  </span>
                  <p className="text-2xl font-black text-slate-900 mt-1">{totalCandidates}</p>
                </div>
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                  <Users className="w-5 h-5" />
                </div>
              </div>

              <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Completed & Evaluated
                  </span>
                  <p className="text-2xl font-black text-slate-900 mt-1">{completedAttempts.length}</p>
                </div>
                <div className="w-10 h-10 rounded-2xl bg-[#eff5ff] border border-[#16499c]/20 flex items-center justify-center text-[#16499c]">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
              </div>

              <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Qualified (≥ {passingThreshold} Pts)
                  </span>
                  <p className="text-2xl font-black text-[#16499c] mt-1">
                    {passedCandidates.length}
                    <span className="text-xs font-normal text-slate-400 ml-1">
                      (
                      {totalCandidates > 0
                        ? Math.round((passedCandidates.length / totalCandidates) * 100)
                        : 0}
                      %)
                    </span>
                  </p>
                </div>
                <div className="w-10 h-10 rounded-2xl bg-[#eff5ff] border border-[#16499c]/20 flex items-center justify-center text-[#16499c]">
                  <Award className="w-5 h-5" />
                </div>
              </div>

              <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Average Score
                  </span>
                  <p className="text-2xl font-black text-[#16499c] mt-1">
                    {avgScore} <span className="text-xs font-normal text-slate-400">Pts</span>
                  </p>
                </div>
                <div className="w-10 h-10 rounded-2xl bg-[#eff5ff] border border-[#16499c]/20 flex items-center justify-center text-[#16499c]">
                  <Award className="w-5 h-5" />
                </div>
              </div>
            </div>

            {/* Controls Bar: Search, Custom Select Dropdowns & Master PDF Download */}
            <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3 flex-1">
                {/* Search */}
                <div className="relative flex-1 min-w-[220px]">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search candidate, roll no, college, dept..."
                    value={resultsSearchQuery}
                    onChange={(e) => setResultsSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-[#16499c] focus:bg-white transition-all"
                  />
                  {resultsSearchQuery && (
                    <button
                      onClick={() => setResultsSearchQuery("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Human-Crafted Custom Select: Track / Role Filter */}
                <div className="w-52">
                  <CustomSelect
                    value={resultsRoleFilter}
                    onChange={(val) => setResultsRoleFilter(val as any)}
                    options={[
                      { label: "All Tracks & Roles", value: "ALL" },
                      { label: "Software Developer", value: "Software Developer", badge: "Core Dev" },
                      { label: "Data Analyst", value: "Data Analyst", badge: "Python & SQL" },
                    ]}
                    placeholder="Filter by Track"
                  />
                </div>

                {/* Human-Crafted Custom Select: Status Filter */}
                <div className="w-56">
                  <CustomSelect
                    value={resultsStatusFilter}
                    onChange={(val) => setResultsStatusFilter(val)}
                    options={[
                      { label: "All Statuses", value: "ALL" },
                      { label: "Completed & Graded", value: "COMPLETED", badge: "Done" },
                      { label: "Round 2 In Progress", value: "ROUND_2_IN_PROGRESS" },
                      { label: "Round 1 In Progress", value: "ROUND_1_IN_PROGRESS" },
                      { label: "Malpractice Locked", value: "MALPRACTICE_LOCKED" },
                      { label: "Disqualified", value: "DISQUALIFIED" },
                    ]}
                    placeholder="Filter Status"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2.5 shrink-0">
                {/* Master Excel Export Button */}
                <button
                  onClick={() =>
                    exportStudentsToExcel(
                      students.filter((s) => filteredAttempts.some((att) => att.userId === s.id)),
                      filteredAttempts,
                      `IZEON_Evaluated_Marks_Report_${new Date().toISOString().split("T")[0]}.csv`
                    )
                  }
                  disabled={filteredAttempts.length === 0}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#16499c] hover:bg-[#123c80] disabled:opacity-50 text-white font-bold text-xs shadow-md shadow-[#16499c]/20 border border-[#16499c] cursor-pointer transition-all"
                  title="Export candidate evaluated marks to Excel"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  Export Marks (Excel)
                </button>

                {/* Master PDF Export Button */}
                <button
                  onClick={() =>
                    generateExamResultsPDF(filteredAttempts, assessments[0]?.title || "IZEON Assessment 2026")
                  }
                  disabled={filteredAttempts.length === 0}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold text-xs shadow-md shadow-slate-900/20 cursor-pointer transition-all"
                >
                  <Download className="w-4 h-4 text-blue-300" />
                  Export Report (PDF)
                </button>
              </div>
            </div>

            {/* Master Marks & Candidate Submissions Table */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
                <div>
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Candidate Submissions & Evaluated Marks
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Showing {filteredAttempts.length} of {attempts.length} total attempts
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      <th className="py-3 px-5">Candidate Profile</th>
                      <th className="py-3 px-5">Target Track</th>
                      <th className="py-3 px-5 text-center">Round 1</th>
                      <th className="py-3 px-5 text-center">Round 2</th>
                      <th className="py-3 px-5 text-center">Total Marks</th>
                      <th className="py-3 px-5 text-center">Integrity</th>
                      <th className="py-3 px-5 text-center">Status</th>
                      <th className="py-3 px-5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {filteredAttempts.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-slate-400">
                          No candidate attempts matching the selected criteria.
                        </td>
                      </tr>
                    ) : (
                      filteredAttempts.map((att) => {
                        const r1 = att.round1Score ?? 0;
                        const r2 = att.round2Score ?? 0;
                        const totalScore = r1 + r2;
                        const isPass = totalScore >= passingThreshold && att.status === "COMPLETED";

                        return (
                          <tr key={att.id} className="hover:bg-slate-50/80 transition-colors">
                            {/* Candidate Info */}
                            <td className="py-3.5 px-5">
                              <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                {att.user?.name}
                                {att.user?.rollNumber && (
                                  <span className="font-mono text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-semibold border border-slate-200">
                                    {att.user.rollNumber}
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                                {att.user?.email}
                              </div>
                              <div className="text-[10px] text-slate-500 mt-1 flex flex-wrap gap-2">
                                {att.user?.department && (
                                  <span>Dept: <strong>{att.user.department}</strong></span>
                                )}
                                {att.user?.college && (
                                  <span className="text-slate-400">• {att.user.college}</span>
                                )}
                                {att.user?.mobileNumber && (
                                  <span className="text-slate-400 font-mono">• Ph: {att.user.mobileNumber}</span>
                                )}
                              </div>
                            </td>

                            {/* Target Track */}
                            <td className="py-3.5 px-5 whitespace-nowrap">
                              <div className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                                {att.user?.position === "Data Analyst" ? (
                                  <>

                                    <span>Data Analyst</span>
                                  </>
                                ) : (
                                  <>

                                    <span>Software Dev</span>
                                  </>
                                )}
                              </div>
                            </td>

                            {/* Round 1 Score */}
                            <td className="py-3.5 px-5 text-center whitespace-nowrap">
                              {att.round1Score !== null && att.round1Score !== undefined ? (
                                <span className="font-bold text-slate-800 text-sm">
                                  {att.round1Score} <span className="text-[11px] text-slate-400 font-normal">pts</span>
                                </span>
                              ) : (
                                <span className="text-slate-300 font-medium">—</span>
                              )}
                            </td>

                            {/* Round 2 Score */}
                            <td className="py-3.5 px-5 text-center whitespace-nowrap">
                              {att.round2Score !== null && att.round2Score !== undefined ? (
                                <span className="font-bold text-[#16499c] text-sm">
                                  {att.round2Score} <span className="text-[11px] text-[#16499c]/70 font-normal">pts</span>
                                </span>
                              ) : (
                                <span className="text-slate-300 font-medium">—</span>
                              )}
                            </td>

                            {/* Total Marks */}
                            <td className="py-3.5 px-5 text-center whitespace-nowrap">
                              <div className="font-black text-slate-900 text-sm">
                                {totalScore} <span className="text-[11px] text-slate-400 font-normal">pts</span>
                              </div>
                              {att.status === "COMPLETED" && (
                                <div
                                  className={`text-[9px] font-bold uppercase tracking-wider mt-0.5 ${isPass ? "text-[#16499c]" : "text-rose-500"
                                    }`}
                                >
                                  {isPass ? "✓ Qualified" : "✗ Not Qualified"}
                                </div>
                              )}
                            </td>

                            {/* Proctoring / Integrity */}
                            <td className="py-3.5 px-5 text-center whitespace-nowrap">
                              {(att.tabSwitchCount || 0) > 0 ? (
                                <span className="font-mono text-xs font-bold text-rose-600">
                                  {att.tabSwitchCount} tab {att.tabSwitchCount > 1 ? "switches" : "switch"}
                                </span>
                              ) : (
                                <span className="text-slate-400 text-xs font-medium">Clean (0)</span>
                              )}
                            </td>

                            {/* Status */}
                            <td className="py-3.5 px-5 text-center whitespace-nowrap">
                              <span
                                className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${att.status === "COMPLETED"
                                  ? isPass
                                    ? "bg-[#eff5ff] text-[#16499c]"
                                    : "bg-slate-100 text-slate-600"
                                  : att.status === "DISQUALIFIED"
                                    ? "bg-rose-50 text-rose-700"
                                    : att.status === "MALPRACTICE_LOCKED"
                                      ? "bg-amber-50 text-amber-700"
                                      : "bg-[#eff5ff] text-[#16499c]"
                                  }`}
                              >
                                {att.status === "COMPLETED"
                                  ? isPass
                                    ? "PASSED"
                                    : "FAILED"
                                  : att.status.replace(/_/g, " ")}
                              </span>
                            </td>

                            {/* Actions */}
                            <td className="py-3.5 px-5 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1.5">
                                {att.status === "MALPRACTICE_LOCKED" && (
                                  <button
                                    onClick={() => handleGiveChance(att.id, "Admin granted chance from scores table")}
                                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[#16499c] hover:bg-[#123c80] text-white text-xs font-bold cursor-pointer transition-colors shadow-xs"
                                    title="Give candidate another chance and unlock assessment"
                                  >
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    <span>Unlock</span>
                                  </button>
                                )}

                                <button
                                  onClick={() => setSelectedAttemptForDetails(att)}
                                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold cursor-pointer transition-colors"
                                  title="View full candidate submission, essay, and code"
                                >
                                  <Eye className="w-3.5 h-3.5 text-slate-500" />
                                  <span>Details</span>
                                </button>

                                <button
                                  onClick={() => generateCandidateScorecardPDF(att)}
                                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[#eff5ff] hover:bg-[#eff5ff] text-[#16499c] border border-[#16499c]/30 text-xs font-semibold cursor-pointer transition-colors"
                                  title="Download Individual Candidate Scorecard PDF"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                  <span>PDF</span>
                                </button>

                                <button
                                  onClick={() => handleDeleteAttempt(att.id, att.user?.name || "Candidate")}
                                  className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 transition-all cursor-pointer"
                                  title="Permanently Delete This Attempt Record"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      })()}

      {/* TAB 5: ADMINISTRATOR MANAGEMENT & REGISTRATION */}
      {activeTab === "admins" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#eff5ff] text-[#16499c] font-bold text-[10px] uppercase tracking-wider border border-[#16499c]/30 mb-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-[#16499c]" />
                Administrative Access Control
              </div>
              <h3 className="text-base font-extrabold text-slate-900">
                System Administrators & Access Keys
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Active admin accounts with examination supervisory and candidate evaluation authority
              </p>
            </div>

            <button
              onClick={() => setIsCreateAdminOpen(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#16499c] hover:bg-[#123c80] text-white font-extrabold text-xs shadow-md shadow-[#16499c]/20 cursor-pointer transition-all transform hover:-translate-y-0.5 active:translate-y-0"
            >
              <UserPlus className="w-4 h-4" />
              Register New Administrator
            </button>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Configured Admin Accounts ({admins.length})
              </span>
              <span className="text-[11px] text-slate-500">
                Role: Full Administrative Control
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="py-3.5 px-6">Administrator Name</th>
                    <th className="py-3.5 px-6">Email Address</th>
                    <th className="py-3.5 px-6 text-center">System Role</th>
                    <th className="py-3.5 px-6 text-center">Status</th>
                    <th className="py-3.5 px-6">Created On</th>
                    <th className="py-3.5 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {admins.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400 font-medium">
                        Loading administrators...
                      </td>
                    </tr>
                  ) : (
                    admins.map((adm) => (
                      <tr key={adm.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-4 px-6">
                          <div className="font-bold text-slate-900 flex items-center gap-2">
                            <span className="w-7 h-7 rounded-lg bg-[#eff5ff] text-[#16499c] font-black text-xs flex items-center justify-center border border-[#16499c]/30">
                              {adm.name.charAt(0).toUpperCase()}
                            </span>
                            <span>{adm.name}</span>
                          </div>
                        </td>
                        <td className="py-4 px-6 font-mono text-slate-600 text-xs">
                          {adm.email}
                        </td>
                        <td className="py-4 px-6 text-center whitespace-nowrap">
                          <span className="px-2.5 py-1 rounded-full bg-[#eff5ff] text-[#16499c] text-[10px] font-extrabold border border-[#16499c]/30 uppercase tracking-wider">
                            {adm.role}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-center whitespace-nowrap">
                          <span className="px-2.5 py-1 rounded-full bg-[#eff5ff] text-[#16499c] text-[10px] font-bold uppercase tracking-wider border border-[#16499c]/30">
                            {adm.status}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-slate-400 text-xs font-medium">
                          {adm.createdAt ? new Date(adm.createdAt).toLocaleString() : "System Default"}
                        </td>
                        <td className="py-4 px-6 text-right whitespace-nowrap">
                          {adm.email === "admin@izeon.com" ? (
                            <span className="text-[10px] font-bold text-slate-400 italic">Root Admin</span>
                          ) : (
                            <button
                              onClick={() => handleDeleteUser(adm.id, adm.name)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-rose-600 hover:bg-rose-50 border border-rose-200 text-xs font-bold cursor-pointer transition-all"
                              title="Delete Administrator Account"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Remove</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ADD QUESTION MODAL */}
      {isAddQuestionOpen && (
        <AddQuestionModal
          assessments={assessments}
          selectedAssessmentId={selectedAssessmentForAdd}
          onClose={() => setIsAddQuestionOpen(false)}
          onSuccess={() => {
            loadAssessments();
          }}
        />
      )}

      {/* VIEW & DELETE QUESTIONS MODAL */}
      {viewQuestionsAssessment && (
        <QuestionListModal
          assessment={viewQuestionsAssessment}
          onClose={() => setViewQuestionsAssessment(null)}
          onOpenAddQuestion={() => {
            setSelectedAssessmentForAdd(viewQuestionsAssessment.id);
            setIsAddQuestionOpen(true);
          }}
        />
      )}

      {/* CANDIDATE INSPECTION & MARKS MODAL */}
      {selectedAttemptForDetails && (
        <CandidateDetailsModal
          attempt={selectedAttemptForDetails}
          onClose={() => setSelectedAttemptForDetails(null)}
        />
      )}

      {/* REGISTER NEW ADMIN MODAL */}
      {isCreateAdminOpen && (
        <CreateAdminModal
          onClose={() => setIsCreateAdminOpen(false)}
          onSuccess={() => {
            loadAdmins();
          }}
        />
      )}

      {/* CONFIGURE EXAM TIMERS MODAL */}
      {configuringTimersAssessment && (
        <ConfigureTimersModal
          assessment={configuringTimersAssessment}
          onClose={() => setConfiguringTimersAssessment(null)}
          onSuccess={() => {
            loadAssessments();
          }}
        />
      )}
    </div>
  );
};
