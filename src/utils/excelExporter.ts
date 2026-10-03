import type { User, AssessmentAttempt } from "../types";

/**
 * Clean and escape CSV fields according to RFC 4180
 */
const escapeCSV = (value: string | number | null | undefined): string => {
  if (value === null || value === undefined) return '""';
  const stringValue = String(value);
  // If value contains comma, quote, or newline, escape quotes and wrap in quotes
  if (stringValue.includes(",") || stringValue.includes('"') || stringValue.includes("\n") || stringValue.includes("\r")) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return `"${stringValue}"`;
};

/**
 * Exports all students and their assessment performance to an Excel-compatible CSV file.
 * Automatically formatted with UTF-8 BOM so Microsoft Excel opens it natively without encoding issues.
 */
export const exportStudentsToExcel = (
  students: User[],
  attempts: AssessmentAttempt[] = [],
  customFilename?: string
) => {
  if (!students || students.length === 0) {
    alert("No student records available to export.");
    return;
  }

  // Map latest attempt by student id
  const attemptsByUser = new Map<string, AssessmentAttempt>();
  attempts.forEach((att) => {
    const existing = attemptsByUser.get(att.userId);
    if (!existing || new Date(att.startedAt || 0) > new Date(existing.startedAt || 0)) {
      attemptsByUser.set(att.userId, att);
    }
  });

  // Excel CSV Headers
  const headers = [
    "S.No",
    "Candidate Name",
    "Email Address",
    "Contact Number",
    "Roll Number",
    "College / Institution",
    "Department",
    "Applied Position / Track",
    "Date of Birth",
    "Account Status",
    "Registration Date",
    "Assessment Title",
    "Exam Status",
    "Round 1 Score (pts)",
    "Round 2 Score (pts)",
    "Total Marks (pts)",
    "Passing Criteria (Min 60 pts)",
    "Final Result",
    "Proctoring Tab Switches",
    "Exam Started At",
    "Exam Completed At",
  ];

  // Rows mapping
  const rows = students.map((student, index) => {
    const attempt = attemptsByUser.get(student.id);

    const r1 = attempt?.round1Score ?? null;
    const r2 = attempt?.round2Score ?? null;
    const total = r1 !== null || r2 !== null ? (r1 ?? 0) + (r2 ?? 0) : null;
    const passingScore = attempt?.assessment?.passingScore ?? 60;

    let finalResult = "NOT STARTED";
    if (attempt) {
      if (attempt.status === "COMPLETED") {
        finalResult = (total ?? 0) >= passingScore ? "QUALIFIED" : "NOT QUALIFIED";
      } else if (attempt.status === "DISQUALIFIED") {
        finalResult = "DISQUALIFIED (MALPRACTICE)";
      } else if (attempt.status === "MALPRACTICE_LOCKED") {
        finalResult = "SUSPENDED (LOCKED)";
      } else {
        finalResult = "IN PROGRESS";
      }
    }

    return [
      escapeCSV(index + 1),
      escapeCSV(student.name),
      escapeCSV(student.email),
      escapeCSV(student.mobileNumber || "N/A"),
      escapeCSV(student.rollNumber || "N/A"),
      escapeCSV(student.college || "N/A"),
      escapeCSV(student.department || "N/A"),
      escapeCSV(student.position || "Software Developer"),
      escapeCSV(student.dob || "N/A"),
      escapeCSV(student.status),
      escapeCSV(student.createdAt ? new Date(student.createdAt).toLocaleString() : "N/A"),
      escapeCSV(attempt?.assessment?.title || "N/A"),
      escapeCSV(attempt ? attempt.status.replace(/_/g, " ") : "NOT STARTED"),
      escapeCSV(r1 !== null ? r1 : "—"),
      escapeCSV(r2 !== null ? r2 : "—"),
      escapeCSV(total !== null ? total : "—"),
      escapeCSV(`${passingScore} pts`),
      escapeCSV(finalResult),
      escapeCSV(attempt ? `${attempt.tabSwitchCount || 0} switches` : "0 switches"),
      escapeCSV(attempt?.startedAt ? new Date(attempt.startedAt).toLocaleString() : "—"),
      escapeCSV(attempt?.completedAt ? new Date(attempt.completedAt).toLocaleString() : "—"),
    ].join(",");
  });

  // Prepend UTF-8 BOM (\uFEFF) so Excel respects UTF-8 encoding
  const csvContent = "\uFEFF" + [headers.map(escapeCSV).join(","), ...rows].join("\r\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const dateStr = new Date().toISOString().split("T")[0];
  const filename = customFilename || `IZEON_Candidates_Database_${dateStr}.csv`;

  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
