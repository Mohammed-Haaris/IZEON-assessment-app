import React, { useEffect, useState } from "react";
import { apiRequest } from "../services/api";
import { getSocket } from "../services/socket";
import { MalpracticeAlertModal } from "../components/MalpracticeAlertModal";
import { AddQuestionModal } from "../components/AddQuestionModal";
import { QuestionListModal } from "../components/QuestionListModal";
import { CandidateDetailsModal } from "../components/CandidateDetailsModal";
import { CreateAdminModal } from "../components/CreateAdminModal";
import { ConfigureTimersModal } from "../components/ConfigureTimersModal";
import { ManageCollegeModal } from "../components/ManageCollegeModal";
import { CustomSelect } from "../components/CustomSelect";
import {
  generateExamResultsPDF,
  generateCandidateScorecardPDF,
} from "../utils/pdfGenerator";
import { exportStudentsToExcel } from "../utils/excelExporter";
import interviewLogo from "../assets/interview logo.png";
import type { User, Assessment, MalpracticeAlert, AssessmentAttempt, College } from "../types";
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
  Calendar,
  Building,
  Edit2,
  GraduationCap,
  Camera,
  CameraOff,
  History as HistoryIcon,
  Radio
} from "lucide-react";

interface MalpracticeLogItem {
  id: string;
  attemptId: string;
  userId?: string;
  violationType: string;
  violationCount: number;
  adminDecision?: string;
  adminRemarks?: string;
  timestamp: string | Date;
  attempt?: {
    status?: string;
  };
  user?: {
    name?: string;
    email?: string;
  };
}

export const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"approvals" | "proctor" | "past_proctor" | "exams" | "results" | "admins" | "colleges">("approvals");

  // Colleges Directory state
  const [colleges, setColleges] = useState<College[]>([]);
  const [isManageCollegeModalOpen, setIsManageCollegeModalOpen] = useState(false);
  const [selectedCollegeForEdit, setSelectedCollegeForEdit] = useState<College | null>(null);
  const [collegeSearchQuery, setCollegeSearchQuery] = useState("");

  // Administrators state
  const [admins, setAdmins] = useState<User[]>([]);
  const [isCreateAdminOpen, setIsCreateAdminOpen] = useState(false);

  // Students approval state
  const [students, setStudents] = useState<User[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  // Past Proctoring Logs Filter States
  const [pastLogsSearch, setPastLogsSearch] = useState("");
  const [pastLogsDecisionFilter, setPastLogsDecisionFilter] = useState<string>("ALL");
  const [pastLogsDatePreset, setPastLogsDatePreset] = useState<"ALL" | "TODAY" | "YESTERDAY" | "LAST_7_DAYS">("ALL");

  // Live Proctor & Malpractice Alerts
  const [activeAlert, setActiveAlert] = useState<MalpracticeAlert | null>(null);
  const [dismissedAlerts, setDismissedAlerts] = useState<string[]>([]);
  const [malpracticeLogs, setMalpracticeLogs] = useState<MalpracticeLogItem[]>([]);

  // Real-time Camera Exemption Requests (Students with webcam problems in Chrome)
  const [cameraHelpRequests, setCameraHelpRequests] = useState<Array<{
    studentId: string;
    studentName: string;
    studentEmail: string;
    college?: string;
    reason?: string;
    timestamp: string | Date;
  }>>([]);
  const [activeCameraModal, setActiveCameraModal] = useState<{
    studentId: string;
    studentName: string;
    studentEmail: string;
    college?: string;
    reason?: string;
    timestamp: string | Date;
  } | null>(null);

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
  const [resultsRoleFilter, setResultsRoleFilter] = useState<string>("ALL");
  const [resultsStatusFilter, setResultsStatusFilter] = useState<string>("ALL");
  const [resultsDatePreset, setResultsDatePreset] = useState<"ALL" | "TODAY" | "YESTERDAY" | "LAST_7_DAYS" | "LAST_30_DAYS" | "CUSTOM">("ALL");
  const [resultsStartDate, setResultsStartDate] = useState<string>("");
  const [resultsEndDate, setResultsEndDate] = useState<string>("");

  // Candidate Directory Date Filters
  const [studentDatePreset, setStudentDatePreset] = useState<"ALL" | "TODAY" | "YESTERDAY" | "LAST_7_DAYS" | "CUSTOM">("ALL");
  const [studentStartDate, setStudentStartDate] = useState<string>("");
  const [studentEndDate, setStudentEndDate] = useState<string>("");

  // Socket
  const socket = getSocket();

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
      const data = await apiRequest<{ logs: MalpracticeLogItem[] }>("/admin/malpractice-logs");
      setMalpracticeLogs(data.logs || []);
      return data.logs || [];
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
      const data = await apiRequest<{ attempts: AssessmentAttempt[] }>("/admin/attempts");
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

  const loadColleges = async () => {
    try {
      const data = await apiRequest<{ colleges: College[] }>("/admin/colleges");
      setColleges(data.colleges || []);
    } catch (err) {
      console.error("Load colleges error:", err);
    }
  };

  const handleToggleCollegeActive = async (college: College) => {
    try {
      await apiRequest(`/admin/colleges/${college.id}`, {
        method: "PUT",
        body: JSON.stringify({ isActive: !college.isActive }),
      });
      await loadColleges();
    } catch (err: any) {
      alert(err.message || "Failed to update college status");
    }
  };

  const handleDeleteCollege = async (college: College) => {
    if (!confirm(`Are you sure you want to delete "${college.name}" from colleges directory?`)) {
      return;
    }
    try {
      await apiRequest(`/admin/colleges/${college.id}`, {
        method: "DELETE",
      });
      await loadColleges();
    } catch (err: any) {
      alert(err.message || "Failed to delete college");
    }
  };

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

    // Real-time camera help requests from students whose webcams failed in Google Chrome
    socket.on("admin:camera_help_request", (req: any) => {
      setCameraHelpRequests((prev) => {
        if (prev.some((r) => r.studentId === req.studentId)) return prev;
        return [req, ...prev];
      });
      setActiveCameraModal(req);
    });

    socket.on("admin:camera_exemption_confirmed", (data: { studentId: string; allowWithoutCamera: boolean }) => {
      setCameraHelpRequests((prev) => prev.filter((r) => r.studentId !== data.studentId));
      setActiveCameraModal((current) => (current?.studentId === data.studentId ? null : current));
    });

    return () => {
      socket.off("connect", handleConnect);
      socket.off("admin:malpractice_alert");
      socket.off("admin:action_resolved");
      socket.off("admin:camera_help_request");
      socket.off("admin:camera_exemption_confirmed");
    };
  }, [socket]);

  useEffect(() => {
    async function loadAllInitialData() {
      loadStudents();
      loadAssessments();
      loadAdmins();
      loadColleges();
      const [logs, atts] = await Promise.all([loadMalpracticeLogs(), loadAttempts()]);

      // Auto-popup if candidate is locked and admin just loaded dashboard
      if (atts && logs) {
        const lockedAttempt = atts.find(
          (a: AssessmentAttempt) => a.status === "MALPRACTICE_LOCKED" && !dismissedAlerts.includes(a.id)
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to delete user from database";
      alert(message);

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
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to delete attempt";
      alert(message);

    }
  };

  // Student approval handler
  const handleUpdateStudentStatus = async (id: string, status: "APPROVED" | "REJECTED") => {
    if (updatingStudentId === id) return;
    setUpdatingStudentId(id);
    try {
      await apiRequest(`/admin/students/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      loadStudents();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update status";
      alert(message);

    } finally {
      setUpdatingStudentId(null);
    }
  };

  const [processingLogId, setProcessingLogId] = useState<string | null>(null);
  const [processingAttemptId, setProcessingAttemptId] = useState<string | null>(null);
  const [updatingStudentId, setUpdatingStudentId] = useState<string | null>(null);
  const [updatingCameraExemptionId, setUpdatingCameraExemptionId] = useState<string | null>(null);

  const handleToggleCameraExemption = async (studentId: string, currentStatus: boolean, studentName: string = "Candidate") => {
    if (updatingCameraExemptionId === studentId) return;
    const newStatus = !currentStatus;
    setUpdatingCameraExemptionId(studentId);
    try {
      await apiRequest(`/admin/students/${studentId}/camera-exemption`, {
        method: "PATCH",
        body: JSON.stringify({ allowWithoutCamera: newStatus }),
      });
      setStudents((prev) =>
        prev.map((s) => (s.id === studentId ? { ...s, allowWithoutCamera: newStatus } : s))
      );
      setAttempts((prev) =>
        prev.map((att) =>
          att.user?.id === studentId
            ? { ...att, user: { ...att.user, allowWithoutCamera: newStatus } }
            : att
        )
      );
      setCameraHelpRequests((prev) => prev.filter((r) => r.studentId !== studentId));
      socket.emit("admin:grant_camera_exemption", {
        studentId,
        allowWithoutCamera: newStatus,
      });
    } catch (err: any) {
      alert(err.message || `Failed to update camera exemption for ${studentName}`);
    } finally {
      setUpdatingCameraExemptionId(null);
    }
  };

  const handleAllowStudentWithoutCamera = async (studentId: string, studentName: string) => {
    await handleToggleCameraExemption(studentId, false, studentName);
    setCameraHelpRequests((prev) => prev.filter((r) => r.studentId !== studentId));
    setActiveCameraModal((current) => (current?.studentId === studentId ? null : current));
  };

  // Malpractice decision handlers
  const handleGiveChance = async (attemptId: string, remarks: string = "Admin granted candidate another chance", logId?: string) => {
    if (processingAttemptId === attemptId || (logId && processingLogId === logId)) return;
    setProcessingAttemptId(attemptId);
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
    } catch (err) {
      console.error("Give chance REST error:", err);
      const message = err instanceof Error ? err.message : "Failed to give chance";
      alert(message);
      console.error("Give chance REST error:", err);

    }
    socket.emit("admin:give_chance", { attemptId, remarks, logId });
    setActiveAlert(null);
    setDismissedAlerts((prev) => [...prev, attemptId]);
    await Promise.all([loadMalpracticeLogs(), loadAttempts()]);
    setProcessingLogId(null);
    setProcessingAttemptId(null);
  };

  const handleRejectCandidate = async (attemptId: string, remarks: string = "Disqualified for repeated tab-switching malpractice", logId?: string) => {
    if (processingAttemptId === attemptId || (logId && processingLogId === logId)) return;
    setProcessingAttemptId(attemptId);
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
    } catch (err) {
      console.error("Reject candidate REST error:", err);
      const message = err instanceof Error ? err.message : "Failed to reject candidate";
      alert(message);
      console.error("Reject candidate REST error:", err);

    }
    socket.emit("admin:reject_student", { attemptId, remarks, logId });
    setActiveAlert(null);
    setDismissedAlerts((prev) => [...prev, attemptId]);
    await Promise.all([loadMalpracticeLogs(), loadAttempts()]);
    setProcessingLogId(null);
    setProcessingAttemptId(null);
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

    if (!matchesStatus || !matchesSearch) return false;

    // Date Filter for Students
    if (studentDatePreset !== "ALL") {
      if (!s.createdAt) return false;
      const sDate = new Date(s.createdAt);
      if (isNaN(sDate.getTime())) return false;

      const y = sDate.getFullYear();
      const m = String(sDate.getMonth() + 1).padStart(2, "0");
      const d = String(sDate.getDate()).padStart(2, "0");
      const sDateStr = `${y}-${m}-${d}`;

      const now = new Date();
      const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

      if (studentDatePreset === "TODAY") {
        if (sDateStr !== todayStr) return false;
      } else if (studentDatePreset === "YESTERDAY") {
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        const yestStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, "0")}-${String(yesterday.getDate()).padStart(2, "0")}`;
        if (sDateStr !== yestStr) return false;
      } else if (studentDatePreset === "LAST_7_DAYS") {
        const sevenDaysAgo = new Date(now);
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        sevenDaysAgo.setHours(0, 0, 0, 0);
        if (sDate < sevenDaysAgo) return false;
      } else if (studentDatePreset === "CUSTOM") {
        if (studentStartDate && sDateStr < studentStartDate) return false;
        if (studentEndDate && sDateStr > studentEndDate) return false;
      }
    }

    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* REAL-TIME MALPRACTICE MODAL ALERT */}
      {activeAlert && (
        <MalpracticeAlertModal
          alert={activeAlert}
          onGiveChance={(attemptId, remarks) => handleGiveChance(attemptId, remarks, activeAlert.logId)}
          onReject={(attemptId, remarks) => handleRejectCandidate(attemptId, remarks, activeAlert.logId)}
          onClose={() => {
            if (activeAlert) {
              setDismissedAlerts((prev) => [...prev, activeAlert.attemptId]);
            }
            setActiveAlert(null);
          }}
        />
      )}

      {/* REAL-TIME CAMERA HELP REQUEST MODAL POPUP (1-CLICK ALLOW) */}
      {activeCameraModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border-2 border-amber-400 shadow-2xl max-w-md w-full overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700">
                  <CameraOff className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900">Camera Access Request</h3>
                  <p className="text-[10px] text-amber-700 font-semibold uppercase tracking-wider">Candidate Needs 1-Click Exemption</p>
                </div>
              </div>
              <button
                onClick={() => setActiveCameraModal(null)}
                className="text-slate-400 hover:text-slate-600 text-xs p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 text-xs">
              <div>
                <span className="text-slate-500 font-medium">Candidate:</span>
                <span className="font-bold text-slate-900 ml-1.5">{activeCameraModal.studentName}</span>
              </div>
              <div>
                <span className="text-slate-500 font-medium">Email:</span>
                <span className="font-mono text-slate-700 ml-1.5">{activeCameraModal.studentEmail}</span>
              </div>
              {activeCameraModal.college && (
                <div>
                  <span className="text-slate-500 font-medium">College:</span>
                  <span className="font-semibold text-slate-800 ml-1.5">{activeCameraModal.college}</span>
                </div>
              )}
              <div className="pt-1 text-[11px] text-rose-600 bg-rose-50 p-2 rounded-xl border border-rose-200">
                ⚠️ Reason: {activeCameraModal.reason || "Webcam failed or permission blocked in Google Chrome"}
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              Click below to grant this candidate immediate permission to take the exam without camera. Their assessment screen will unlock in real time.
            </p>

            <div className="flex gap-2.5 pt-1">
              <button
                onClick={() => handleAllowStudentWithoutCamera(activeCameraModal.studentId, activeCameraModal.studentName)}
                className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/25 transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                Allow Candidate (No Camera)
              </button>
              <button
                onClick={() => setActiveCameraModal(null)}
                className="py-2.5 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs cursor-pointer transition-colors"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
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
                loadColleges();
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
                      disabled={processingAttemptId === attempt.id}
                      className="px-4 py-2 rounded-xl bg-[#16499c] hover:bg-[#123c80] disabled:opacity-50 disabled:cursor-not-allowed text-white font-extrabold text-xs shadow-sm shadow-[#16499c]/20 transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      {processingAttemptId === attempt.id ? "Updating..." : "Give Another Chance"}
                    </button>
                    <button
                      onClick={() => handleRejectCandidate(attempt.id, "Candidate disqualified by admin")}
                      disabled={processingAttemptId === attempt.id}
                      className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-extrabold text-xs shadow-sm shadow-rose-600/20 transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <XCircle className="w-4 h-4" />
                      {processingAttemptId === attempt.id ? "Updating..." : "Disqualify Candidate"}
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
          { id: "proctor", label: "Live Monitoring & Logs", icon: ShieldAlert, badge: cameraHelpRequests.length || undefined },
          { id: "exams", label: "Assessment & Question Bank", icon: FileSpreadsheet },
          { id: "results", label: "Candidate Scores & Master Marks", icon: Award, badge: attempts.length },
          { id: "colleges", label: "Colleges & Campuses", icon: Building, badge: colleges.length },
          { id: "admins", label: "Administrators", icon: ShieldCheck, badge: admins.length },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as "approvals" | "proctor" | "past_proctor" | "exams" | "results" | "admins" | "colleges")}
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

            <div className="flex items-center gap-1.5 w-full sm:w-auto flex-wrap">
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

              <div className="w-44">
                <CustomSelect
                  value={studentDatePreset}
                  onChange={(val) => {
                    setStudentDatePreset(val as any);
                    if (val !== "CUSTOM") {
                      setStudentStartDate("");
                      setStudentEndDate("");
                    }
                  }}
                  options={[
                    { label: "All Reg Dates", value: "ALL" },
                    { label: "Today", value: "TODAY" },
                    { label: "Yesterday", value: "YESTERDAY" },
                    { label: "Last 7 Days", value: "LAST_7_DAYS" },
                    { label: "Custom Range", value: "CUSTOM" },
                  ]}
                  placeholder="Filter Date"
                />
              </div>

              {studentDatePreset === "CUSTOM" && (
                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-xl shadow-xs">
                  <input
                    type="date"
                    value={studentStartDate}
                    onChange={(e) => setStudentStartDate(e.target.value)}
                    className="text-xs bg-white border border-slate-200 rounded-lg px-2 py-1 text-slate-800 font-medium focus:outline-none focus:border-[#16499c]"
                    title="From Date"
                  />
                  <span className="text-slate-400 text-xs font-semibold">to</span>
                  <input
                    type="date"
                    value={studentEndDate}
                    onChange={(e) => setStudentEndDate(e.target.value)}
                    className="text-xs bg-white border border-slate-200 rounded-lg px-2 py-1 text-slate-800 font-medium focus:outline-none focus:border-[#16499c]"
                    title="To Date"
                  />
                </div>
              )}

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
                    <th className="py-3.5 px-6">Camera Access</th>
                    <th className="py-3.5 px-6">Status</th>
                    <th className="py-3.5 px-6">Registered On</th>
                    <th className="py-3.5 px-6 text-right">Access Control</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-400 font-medium">
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
                              {student.position === "Data Analyst"
                                ? "📊 Data Analyst"
                                : student.position === "Network Engineer"
                                ? "🌐 Network Engineer"
                                : student.position === "Cloud Engineer"
                                ? "☁️ Cloud Engineer"
                                : student.position === "AI Engineer"
                                ? "🤖 AI Engineer"
                                : student.position === "Digital Marketing"
                                ? "📈 Digital Marketing"
                                : "💻 Software Dev"}
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
                        <td className="py-3.5 px-6 whitespace-nowrap">
                          <button
                            type="button"
                            disabled={updatingCameraExemptionId === student.id}
                            onClick={() => handleToggleCameraExemption(student.id, Boolean(student.allowWithoutCamera), student.name)}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[10px] font-bold transition-all border cursor-pointer ${
                              student.allowWithoutCamera
                                ? "bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100 shadow-xs"
                                : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                            }`}
                            title={
                              student.allowWithoutCamera
                                ? "Camera exempted (Click to require camera)"
                                : "Camera required (Click to exempt student without camera)"
                            }
                          >
                            {student.allowWithoutCamera ? (
                              <>
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                <CameraOff className="w-3 h-3 text-amber-600" />
                                <span>No Camera Allowed</span>
                              </>
                            ) : (
                              <>
                                <Camera className="w-3 h-3 text-[#16499c]" />
                                <span>Camera Required</span>
                              </>
                            )}
                          </button>
                        </td>
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

      {/* TAB 2: 🔴 LIVE MONITORING (ACTIVE CANDIDATES ONLY) */}
      {activeTab === "proctor" && (() => {
        const liveAttempts = attempts.filter((att) => {
          return (
            att.status === "ROUND_1_IN_PROGRESS" ||
            att.status === "ROUND_1_COMPLETED" ||
            att.status === "ROUND_2_IN_PROGRESS" ||
            att.status === "MALPRACTICE_LOCKED"
          );
        });
        const lockedAttempts = liveAttempts.filter((att) => att.status === "MALPRACTICE_LOCKED");

        return (
          <div className="space-y-6">
            {/* Live Monitoring Command Header */}
            <div className="bg-slate-900 text-white p-6 rounded-3xl border border-slate-800 shadow-xl space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <span className="relative flex h-3.5 w-3.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500"></span>
                  </span>
                  <div>
                    <h2 className="text-base font-extrabold text-white flex items-center gap-2">
                      Real-Time Live Monitoring Room
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Displaying strictly active candidate sessions currently taking an exam. Past sessions are archived.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      loadAttempts();
                      loadMalpracticeLogs();
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition-colors cursor-pointer"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                    <span>Refresh Live</span>
                  </button>
                  <button
                    onClick={() => setActiveTab("past_proctor")}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#16499c] hover:bg-[#123c80] text-white text-xs font-bold shadow-md shadow-[#16499c]/30 transition-all cursor-pointer"
                  >
                    <HistoryIcon className="w-3.5 h-3.5" />
                    <span>Past Proctoring History ({malpracticeLogs.length}) →</span>
                  </button>
                </div>
              </div>

              {/* 4 Live Metric KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700/80 space-y-1">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                    <span>Active In Exam</span>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  </div>
                  <div className="text-2xl font-black text-white">{liveAttempts.length}</div>
                  <p className="text-[10px] text-emerald-400 font-medium">Currently writing Round 1 or 2</p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700/80 space-y-1">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                    <span>Malpractice Suspended</span>
                    <span className={`w-2 h-2 rounded-full ${lockedAttempts.length > 0 ? "bg-rose-500 animate-ping" : "bg-slate-500"}`} />
                  </div>
                  <div className={`text-2xl font-black ${lockedAttempts.length > 0 ? "text-rose-400" : "text-white"}`}>{lockedAttempts.length}</div>
                  <p className="text-[10px] text-slate-400 font-medium">Awaiting Admin Unlock / Disqualify</p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700/80 space-y-1">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                    <span>Camera Exempt Requests</span>
                    <span className={`w-2 h-2 rounded-full ${cameraHelpRequests.length > 0 ? "bg-amber-400 animate-pulse" : "bg-slate-500"}`} />
                  </div>
                  <div className={`text-2xl font-black ${cameraHelpRequests.length > 0 ? "text-amber-400" : "text-white"}`}>{cameraHelpRequests.length}</div>
                  <p className="text-[10px] text-slate-400 font-medium">1-Click Chrome Exemption</p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700/80 space-y-1">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                    <span>Anti-Cheating Engine</span>
                    <ShieldCheck className="w-3.5 h-3.5 text-[#93c5fd]" />
                  </div>
                  <div className="text-xs font-extrabold text-emerald-400 pt-1">Active Protection</div>
                  <p className="text-[10px] text-slate-400 font-medium">Auto Tab & Strike Detection</p>
                </div>
              </div>
            </div>

            {/* Real-time Camera Exemption Requests Queue */}
            {cameraHelpRequests.length > 0 && (
              <div className="bg-amber-50/95 border-2 border-amber-300 rounded-2xl p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                    <CameraOff className="w-5 h-5 text-amber-600" />
                    <div>
                      <h3 className="font-extrabold text-sm text-amber-950">
                        Camera Issues Reported by Candidates ({cameraHelpRequests.length})
                      </h3>
                      <p className="text-[11px] text-amber-800 font-medium">
                        Webcam failed or permission was denied in Google Chrome. Allow them to proceed with 1 click.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="divide-y divide-amber-200/80 bg-white rounded-xl border border-amber-200 overflow-hidden">
                  {cameraHelpRequests.map((req) => (
                    <div key={req.studentId} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-amber-50/40 transition-colors">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-xs">{req.studentName}</span>
                          {req.college && (
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md text-[10px] font-semibold">
                              {req.college}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono">{req.studentEmail}</div>
                        <div className="text-[10px] text-rose-600 font-medium">
                          Issue: {req.reason || "Webcam failed to start in browser"}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleAllowStudentWithoutCamera(req.studentId, req.studentName)}
                        className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-all cursor-pointer shrink-0"
                      >
                        <Check className="w-4 h-4" />
                        Allow Candidate (No Camera)
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Currently Active Candidates Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
                <div className="flex items-center gap-2">
                  <Radio className="w-4 h-4 text-emerald-600 animate-pulse" />
                  <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                    Currently Active Candidates in Exam ({liveAttempts.length})
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-500 font-medium">
                    Strictly Live Active Sessions • Auto-refreshed via WebSockets
                  </span>
                </div>
              </div>

              {liveAttempts.length === 0 ? (
                <div className="py-16 text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                    <Radio className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-slate-800">No candidates currently taking an exam</p>
                    <p className="text-xs text-slate-500 max-w-md mx-auto">
                      Only active live examinees appear here. All past completed exams and historical proctoring incident logs are archived separately.
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveTab("past_proctor")}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold border border-slate-300 transition-colors cursor-pointer"
                  >
                    <HistoryIcon className="w-3.5 h-3.5" />
                    <span>View Past Proctoring Logs ({malpracticeLogs.length})</span>
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-extrabold uppercase tracking-wider text-slate-600">
                        <th className="py-3.5 px-6">Candidate</th>
                        <th className="py-3.5 px-6">Track & College</th>
                        <th className="py-3.5 px-6">Live Exam Stage</th>
                        <th className="py-3.5 px-6">Integrity / Strikes</th>
                        <th className="py-3.5 px-6">Camera Status</th>
                        <th className="py-3.5 px-6 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {liveAttempts.map((att) => {
                        const isLocked = att.status === "MALPRACTICE_LOCKED";
                        const strikes = att.tabSwitchCount || 0;
                        const allowNoCam = att.user?.allowWithoutCamera;

                        return (
                          <tr key={att.id} className={`hover:bg-slate-50/60 transition-colors ${isLocked ? "bg-rose-50/40" : ""}`}>
                            <td className="py-3.5 px-6">
                              <div className="font-bold text-slate-900">{att.user?.name}</div>
                              <div className="text-[11px] text-slate-400 font-mono">{att.user?.email}</div>
                              {att.user?.rollNumber && (
                                <div className="text-[10px] text-slate-500 font-mono">Roll: {att.user.rollNumber}</div>
                              )}
                            </td>

                            <td className="py-3.5 px-6">
                              <span className="inline-block px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-800 font-bold text-[10px] border border-slate-300">
                                {att.user?.position || "General Candidate"}
                              </span>
                              <div className="text-[11px] text-slate-500 mt-0.5">{att.user?.college || "College not set"}</div>
                            </td>

                            <td className="py-3.5 px-6">
                              {isLocked ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 border border-rose-300 font-extrabold text-[10px] animate-pulse">
                                  <AlertOctagon className="w-3 h-3 text-rose-600" />
                                  Suspended (Strike 2/2)
                                </span>
                              ) : att.status === "ROUND_2_IN_PROGRESS" ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200 font-extrabold text-[10px]">
                                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-ping" />
                                  Round 2 Coding Active
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-sky-100 text-sky-800 border border-sky-200 font-extrabold text-[10px]">
                                  <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-ping" />
                                  Round 1 Aptitude Active
                                </span>
                              )}
                            </td>

                            <td className="py-3.5 px-6">
                              <span
                                className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold border ${
                                  strikes >= 2
                                    ? "bg-rose-100 text-rose-800 border-rose-300"
                                    : strikes === 1
                                    ? "bg-amber-100 text-amber-800 border-amber-300"
                                    : "bg-emerald-100 text-emerald-800 border-emerald-300"
                                }`}
                              >
                                {strikes}/2 Strikes {strikes === 0 ? "✓ Clean" : strikes === 1 ? "⚠️ Warning" : "🚨 Locked"}
                              </span>
                            </td>

                            <td className="py-3.5 px-6">
                              {allowNoCam ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                                  <CameraOff className="w-3 h-3 text-amber-600" />
                                  Exempted by Admin
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                                  <Camera className="w-3 h-3 text-emerald-600" />
                                  Webcam Monitored
                                </span>
                              )}
                            </td>

                            <td className="py-3.5 px-6 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-2">
                                {isLocked && (
                                  <>
                                    <button
                                      onClick={() => handleGiveChance(att.id, "Admin authorized candidate to resume from Live Room")}
                                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#16499c] hover:bg-[#123c80] text-white font-bold text-xs shadow-xs cursor-pointer"
                                    >
                                      <CheckCircle2 className="w-3.5 h-3.5" />
                                      <span>Unlock Exam</span>
                                    </button>
                                    <button
                                      onClick={() => handleRejectCandidate(att.id, "Disqualified by admin from Live Room")}
                                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs cursor-pointer"
                                    >
                                      <XCircle className="w-3.5 h-3.5" />
                                      <span>Disqualify</span>
                                    </button>
                                  </>
                                )}
                                <button
                                  onClick={() => handleToggleCameraExemption(att.user!.id, !!allowNoCam, att.user?.name || "Candidate")}
                                  className={`p-1.5 rounded-lg border text-xs font-semibold cursor-pointer transition-colors ${
                                    allowNoCam
                                      ? "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300"
                                      : "bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-300"
                                  }`}
                                  title={allowNoCam ? "Revoke Camera Exemption" : "Grant 1-Click Camera Exemption"}
                                >
                                  {allowNoCam ? <Camera className="w-3.5 h-3.5 text-slate-600" /> : <CameraOff className="w-3.5 h-3.5 text-amber-700" />}
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* TAB 2.5: 📜 PAST PROCTORING LOGS & MALPRACTICE HISTORY (DEDICATED SEPARATE UI) */}
      {activeTab === "past_proctor" && (() => {
        const filteredPastLogs = malpracticeLogs.filter((log) => {
          // Search query
          if (pastLogsSearch.trim()) {
            const q = pastLogsSearch.toLowerCase().trim();
            const name = (log.user?.name || "").toLowerCase();
            const email = (log.user?.email || "").toLowerCase();
            const type = (log.violationType || "").toLowerCase();
            const remarks = (log.adminRemarks || "").toLowerCase();
            if (!name.includes(q) && !email.includes(q) && !type.includes(q) && !remarks.includes(q)) {
              return false;
            }
          }

          // Decision filter
          if (pastLogsDecisionFilter !== "ALL") {
            if (pastLogsDecisionFilter === "GIVEN_CHANCE" && log.adminDecision !== "GIVEN_CHANCE") return false;
            if (pastLogsDecisionFilter === "REJECTED" && log.adminDecision !== "REJECTED") return false;
            if (pastLogsDecisionFilter === "PENDING" && (log.adminDecision && log.adminDecision !== "PENDING")) return false;
          }

          // Date preset
          if (pastLogsDatePreset !== "ALL") {
            const logDate = new Date(log.timestamp);
            const now = new Date();
            const logDateStr = logDate.toISOString().split("T")[0];
            const todayStr = now.toISOString().split("T")[0];

            if (pastLogsDatePreset === "TODAY") {
              if (logDateStr !== todayStr) return false;
            } else if (pastLogsDatePreset === "YESTERDAY") {
              const yest = new Date(now);
              yest.setDate(yest.getDate() - 1);
              if (logDateStr !== yest.toISOString().split("T")[0]) return false;
            } else if (pastLogsDatePreset === "LAST_7_DAYS") {
              const d7 = new Date(now);
              d7.setDate(d7.getDate() - 7);
              if (logDate < d7) return false;
            }
          }

          return true;
        });

        return (
          <div className="space-y-6">
            {/* Header Banner */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2.5">
                  <span className="p-2 rounded-xl bg-slate-100 text-slate-800">
                    <HistoryIcon className="w-5 h-5" />
                  </span>
                  <div>
                    <h2 className="text-base font-extrabold text-slate-900">
                      Past Proctoring & Malpractice Audit Logs
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Historical archive of completed candidate sessions, resolved tab-switch violations, and administrator verdicts.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveTab("proctor")}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-sm transition-colors cursor-pointer"
                >
                  <Radio className="w-3.5 h-3.5 text-emerald-400" />
                  <span>← Switch to Live Monitoring</span>
                </button>
              </div>
            </div>

            {/* Filter Bar */}
            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2 flex-1">
                {/* Search */}
                <div className="relative min-w-[220px] flex-1 max-w-sm">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={pastLogsSearch}
                    onChange={(e) => setPastLogsSearch(e.target.value)}
                    placeholder="Search candidate name, email, remarks..."
                    className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#16499c]"
                  />
                </div>

                {/* Decision Filter Pills */}
                <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
                  {[
                    { id: "ALL", label: `All (${malpracticeLogs.length})` },
                    { id: "GIVEN_CHANCE", label: `Chance Given (${malpracticeLogs.filter(l => l.adminDecision === "GIVEN_CHANCE").length})` },
                    { id: "REJECTED", label: `Disqualified (${malpracticeLogs.filter(l => l.adminDecision === "REJECTED").length})` },
                  ].map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setPastLogsDecisionFilter(f.id)}
                      className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                        pastLogsDecisionFilter === f.id
                          ? "bg-white text-slate-900 shadow-xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                {/* Date Filter Pills */}
                <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
                  {[
                    { id: "ALL", label: "All Time" },
                    { id: "TODAY", label: "Today" },
                    { id: "YESTERDAY", label: "Yesterday" },
                    { id: "LAST_7_DAYS", label: "Last 7 Days" },
                  ].map((d) => (
                    <button
                      key={d.id}
                      onClick={() => setPastLogsDatePreset(d.id as any)}
                      className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                        pastLogsDatePreset === d.id
                          ? "bg-white text-slate-900 shadow-xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Historical Audit Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-extrabold uppercase tracking-wider text-slate-600">
                    <th className="py-3.5 px-6">Candidate</th>
                    <th className="py-3.5 px-6">Violation Infraction</th>
                    <th className="py-3.5 px-6">Strikes</th>
                    <th className="py-3.5 px-6">Admin Decision</th>
                    <th className="py-3.5 px-6">Admin Remarks</th>
                    <th className="py-3.5 px-6">Incident Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredPastLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400 font-medium">
                        No past malpractice incidents matched your filters.
                      </td>
                    </tr>
                  ) : (
                    filteredPastLogs.map((log) => (
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
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                              log.adminDecision === "GIVEN_CHANCE"
                                ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                                : log.adminDecision === "REJECTED"
                                ? "bg-rose-100 text-rose-800 border border-rose-200"
                                : "bg-amber-100 text-amber-800 border border-amber-200"
                            }`}
                          >
                            {log.adminDecision === "GIVEN_CHANCE"
                              ? "CHANCE GRANTED"
                              : log.adminDecision === "REJECTED"
                              ? "DISQUALIFIED"
                              : log.adminDecision || "PENDING"}
                          </span>
                        </td>
                        <td className="py-3.5 px-6 text-slate-600 text-[11px] font-medium max-w-xs">
                          {log.adminRemarks || "—"}
                        </td>
                        <td className="py-3.5 px-6 text-slate-500 text-[11px] font-mono whitespace-nowrap">
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}

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
                      title="Click to edit Round 1 timer & cutoff"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-bold text-slate-400">Round 1</span>
                        <Settings className="w-3 h-3 text-slate-400 group-hover:text-[#16499c]" />
                      </div>
                      <p className="font-extrabold text-slate-900 mt-0.5">{a.durationR1} Minutes</p>
                      <span className="inline-block text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 mt-1">
                        Cutoff: {a.cutoffRound1 ?? 12} Pts
                      </span>
                    </div>
                    <div
                      onClick={() => setConfiguringTimersAssessment(a)}
                      className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 hover:border-[#16499c]/40 hover:bg-[#eff5ff]/40 cursor-pointer transition-all group"
                      title="Click to edit Round 2 timer & cutoff"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-bold text-slate-400">Round 2</span>
                        <Settings className="w-3 h-3 text-slate-400 group-hover:text-[#16499c]" />
                      </div>
                      <p className="font-extrabold text-slate-900 mt-0.5">{a.durationR2} Minutes</p>
                      <span className="inline-block text-[10px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200 mt-1">
                        Cutoff: {a.cutoffRound2 ?? 30} Pts
                      </span>
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

          // Date Filter
          if (resultsDatePreset !== "ALL") {
            const attemptDateRaw = att.createdAt || att.startedAt || att.completedAt;
            if (!attemptDateRaw) return false;

            const attemptDate = new Date(attemptDateRaw);
            if (isNaN(attemptDate.getTime())) return false;

            const y = attemptDate.getFullYear();
            const m = String(attemptDate.getMonth() + 1).padStart(2, "0");
            const d = String(attemptDate.getDate()).padStart(2, "0");
            const attemptDateStr = `${y}-${m}-${d}`;

            const now = new Date();
            const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

            if (resultsDatePreset === "TODAY") {
              if (attemptDateStr !== todayStr) return false;
            } else if (resultsDatePreset === "YESTERDAY") {
              const yesterday = new Date(now);
              yesterday.setDate(yesterday.getDate() - 1);
              const yestStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, "0")}-${String(yesterday.getDate()).padStart(2, "0")}`;
              if (attemptDateStr !== yestStr) return false;
            } else if (resultsDatePreset === "LAST_7_DAYS") {
              const sevenDaysAgo = new Date(now);
              sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
              sevenDaysAgo.setHours(0, 0, 0, 0);
              if (attemptDate < sevenDaysAgo) return false;
            } else if (resultsDatePreset === "LAST_30_DAYS") {
              const thirtyDaysAgo = new Date(now);
              thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
              thirtyDaysAgo.setHours(0, 0, 0, 0);
              if (attemptDate < thirtyDaysAgo) return false;
            } else if (resultsDatePreset === "CUSTOM") {
              if (resultsStartDate && attemptDateStr < resultsStartDate) return false;
              if (resultsEndDate && attemptDateStr > resultsEndDate) return false;
            }
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
                    onChange={(val) => setResultsRoleFilter(val)}
                    options={[
                      { label: "All Tracks & Roles", value: "ALL" },
                      { label: "Software Developer", value: "Software Developer", badge: "Core Dev" },
                      { label: "Data Analyst", value: "Data Analyst", badge: "Python & SQL" },
                      { label: "Network Engineer", value: "Network Engineer", badge: "Networks & Security" },
                      { label: "Cloud Engineer", value: "Cloud Engineer", badge: "Cloud & DevOps" },
                      { label: "AI Engineer", value: "AI Engineer", badge: "AI, RAG & ML" },
                      { label: "Digital Marketing", value: "Digital Marketing", badge: "Growth & SEO" },
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

                {/* Human-Crafted Custom Select: Date Filter */}
                <div className="w-52">
                  <CustomSelect
                    value={resultsDatePreset}
                    onChange={(val) => {
                      setResultsDatePreset(val as any);
                      if (val !== "CUSTOM") {
                        setResultsStartDate("");
                        setResultsEndDate("");
                      }
                    }}
                    options={[
                      { label: "All Exam Dates", value: "ALL" },
                      { label: "Today", value: "TODAY", badge: "Live" },
                      { label: "Yesterday", value: "YESTERDAY" },
                      { label: "Last 7 Days", value: "LAST_7_DAYS" },
                      { label: "Last 30 Days", value: "LAST_30_DAYS" },
                      { label: "Custom Date Range", value: "CUSTOM", badge: "Calendar" },
                    ]}
                    placeholder="Filter by Date"
                  />
                </div>

                {/* Custom Date Pickers */}
                {resultsDatePreset === "CUSTOM" && (
                  <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl shadow-xs animate-in fade-in">
                    <Calendar className="w-3.5 h-3.5 text-[#16499c] shrink-0" />
                    <input
                      type="date"
                      value={resultsStartDate}
                      onChange={(e) => setResultsStartDate(e.target.value)}
                      className="text-xs bg-white border border-slate-200 rounded-lg px-2 py-1 text-slate-800 font-medium focus:outline-none focus:border-[#16499c]"
                      title="From Date"
                    />
                    <span className="text-slate-400 text-xs font-semibold">to</span>
                    <input
                      type="date"
                      value={resultsEndDate}
                      onChange={(e) => setResultsEndDate(e.target.value)}
                      className="text-xs bg-white border border-slate-200 rounded-lg px-2 py-1 text-slate-800 font-medium focus:outline-none focus:border-[#16499c]"
                      title="To Date"
                    />
                    {(resultsStartDate || resultsEndDate) && (
                      <button
                        type="button"
                        onClick={() => {
                          setResultsStartDate("");
                          setResultsEndDate("");
                        }}
                        className="text-slate-400 hover:text-slate-600 p-1 text-xs hover:bg-slate-200 rounded-md transition-colors"
                        title="Clear date inputs"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                )}
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
              <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/50 flex-wrap gap-2">
                <div className="flex items-center gap-3 flex-wrap">
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Candidate Submissions & Evaluated Marks
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Showing {filteredAttempts.length} of {attempts.length} total attempts
                    </p>
                  </div>
                  {resultsDatePreset !== "ALL" && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#eff5ff] border border-[#16499c]/30 text-[#16499c] text-xs font-bold shadow-xs">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>
                        Date:{" "}
                        {resultsDatePreset === "TODAY"
                          ? "Today"
                          : resultsDatePreset === "YESTERDAY"
                          ? "Yesterday"
                          : resultsDatePreset === "LAST_7_DAYS"
                          ? "Last 7 Days"
                          : resultsDatePreset === "LAST_30_DAYS"
                          ? "Last 30 Days"
                          : `${resultsStartDate || "Start"} → ${resultsEndDate || "End"}`}
                      </span>
                      <button
                        onClick={() => {
                          setResultsDatePreset("ALL");
                          setResultsStartDate("");
                          setResultsEndDate("");
                        }}
                        className="ml-1 text-[#16499c] hover:text-rose-600 font-bold p-0.5 cursor-pointer"
                        title="Remove date filter"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      <th className="py-3 px-5">Candidate Profile</th>
                      <th className="py-3 px-5">Target Track</th>
                      <th className="py-3 px-5 text-center">
                        Round 1
                        <span className="block text-[9px] font-normal text-slate-400 capitalize">Cutoff: {assessments[0]?.cutoffRound1 ?? 12} Pts</span>
                      </th>
                      <th className="py-3 px-5 text-center">
                        Round 2
                        <span className="block text-[9px] font-normal text-slate-400 capitalize">Cutoff: {assessments[0]?.cutoffRound2 ?? 30} Pts</span>
                      </th>
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
                              
                              {(att.createdAt || att.startedAt) && (
                                <div className="text-[10px] text-slate-500 font-medium flex items-center gap-1.5 mt-1.5 bg-slate-50 px-2 py-0.5 rounded-md w-fit border border-slate-200/70">
                                  <Calendar className="w-3 h-3 text-[#16499c]" />
                                  <span>
                                    Exam:{" "}
                                    <strong>
                                      {new Date(att.createdAt || att.startedAt!).toLocaleDateString("en-IN", {
                                        day: "2-digit",
                                        month: "short",
                                        year: "numeric",
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      })}
                                    </strong>
                                  </span>
                                </div>
                              )}
                            </td>

                            {/* Target Track */}
                            <td className="py-3.5 px-5 whitespace-nowrap">
                              <div className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                                {att.user?.position === "Data Analyst" ? (
                                  <span>Data Analyst</span>
                                ) : att.user?.position === "Network Engineer" ? (
                                  <span>Network Engineer</span>
                                ) : att.user?.position === "Cloud Engineer" ? (
                                  <span>Cloud Engineer</span>
                                ) : att.user?.position === "AI Engineer" ? (
                                  <span>AI Engineer</span>
                                ) : att.user?.position === "Digital Marketing" ? (
                                  <span>Digital Marketing</span>
                                ) : (
                                  <span>Software Dev</span>
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

      {/* TAB 5: COLLEGES & CAMPUSES DIRECTORY */}
      {activeTab === "colleges" && (() => {
        const filteredCollegesList = colleges.filter((c) => {
          if (!collegeSearchQuery.trim()) return true;
          const q = collegeSearchQuery.toLowerCase();
          return (
            c.name.toLowerCase().includes(q) ||
            (c.code ? c.code.toLowerCase().includes(q) : false)
          );
        });

        const activeCount = colleges.filter((c) => c.isActive).length;
        const totalEnrolledAcrossColleges = colleges.reduce((acc, c) => acc + (c.studentCount || 0), 0);

        return (
          <div className="space-y-6">
            {/* Top Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Total Configured Colleges
                  </span>
                  <p className="text-2xl font-black text-slate-900 mt-1">{colleges.length}</p>
                </div>
                <div className="w-10 h-10 rounded-2xl bg-[#eff5ff] border border-[#16499c]/20 flex items-center justify-center text-[#16499c]">
                  <Building className="w-5 h-5" />
                </div>
              </div>

              <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Active in Registration Dropdown
                  </span>
                  <p className="text-2xl font-black text-emerald-600 mt-1">{activeCount}</p>
                </div>
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
              </div>

              <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Candidates from Directory
                  </span>
                  <p className="text-2xl font-black text-indigo-600 mt-1">{totalEnrolledAcrossColleges}</p>
                </div>
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                  <GraduationCap className="w-5 h-5" />
                </div>
              </div>
            </div>

            {/* Header & Controls */}
            <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search college name or short code..."
                  value={collegeSearchQuery}
                  onChange={(e) => setCollegeSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-[#16499c] focus:bg-white transition-all font-medium"
                />
                {collegeSearchQuery && (
                  <button
                    onClick={() => setCollegeSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                  >
                    ✕
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setSelectedCollegeForEdit(null);
                    setIsManageCollegeModalOpen(true);
                  }}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#16499c] hover:bg-[#123c80] text-white font-bold text-xs shadow-md shadow-[#16499c]/25 cursor-pointer transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add College</span>
                </button>
              </div>
            </div>

            {/* Colleges Table */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center">
                <div>
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Institutional College Directory
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Showing {filteredCollegesList.length} of {colleges.length} colleges
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      <th className="py-3 px-6">College / Institution Name</th>
                      <th className="py-3 px-6 text-center">Short Code</th>
                      <th className="py-3 px-6 text-center">Enrolled Candidates</th>
                      <th className="py-3 px-6 text-center">Dropdown Status</th>
                      <th className="py-3 px-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {filteredCollegesList.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-slate-400 font-medium">
                          No colleges found matching your search. Click &ldquo;Add College&rdquo; to add one.
                        </td>
                      </tr>
                    ) : (
                      filteredCollegesList.map((col) => (
                        <tr key={col.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3.5 px-6">
                            <div className="font-bold text-slate-900 flex items-center gap-2">
                              <Building className="w-4 h-4 text-[#16499c] shrink-0" />
                              <span>{col.name}</span>
                            </div>
                          </td>
                          <td className="py-3.5 px-6 text-center">
                            {col.code ? (
                              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                                {col.code}
                              </span>
                            ) : (
                              <span className="text-slate-300 font-mono text-xs">—</span>
                            )}
                          </td>
                          <td className="py-3.5 px-6 text-center">
                            <span className="inline-flex items-center gap-1 font-bold text-xs px-2.5 py-1 rounded-full bg-[#eff5ff] text-[#16499c] border border-[#16499c]/20">
                              <Users className="w-3 h-3" />
                              {col.studentCount || 0}
                            </span>
                          </td>
                          <td className="py-3.5 px-6 text-center">
                            <button
                              type="button"
                              onClick={() => handleToggleCollegeActive(col)}
                              className={`px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider cursor-pointer transition-all ${
                                col.isActive
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                                  : "bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200"
                              }`}
                              title="Click to toggle active status"
                            >
                              {col.isActive ? "✓ Active in Dropdown" : "Hidden"}
                            </button>
                          </td>
                          <td className="py-3.5 px-6 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => {
                                  setSelectedCollegeForEdit(col);
                                  setIsManageCollegeModalOpen(true);
                                }}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-[#16499c] hover:bg-[#eff5ff] border border-slate-200 transition-colors cursor-pointer"
                                title="Edit College"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteCollege(col)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 transition-colors cursor-pointer"
                                title="Delete College"
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
        );
      })()}

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
          onToggleCameraExemption={handleToggleCameraExemption}
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

      {/* MANAGE / ADD COLLEGE MODAL */}
      {isManageCollegeModalOpen && (
        <ManageCollegeModal
          college={selectedCollegeForEdit}
          onClose={() => {
            setIsManageCollegeModalOpen(false);
            setSelectedCollegeForEdit(null);
          }}
          onSuccess={() => {
            loadColleges();
          }}
        />
      )}
    </div>
  );
};
