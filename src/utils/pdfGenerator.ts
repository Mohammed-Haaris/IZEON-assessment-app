import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { AssessmentAttempt } from "../types";

export const generateExamResultsPDF = (
  attempts: AssessmentAttempt[],
  assessmentTitle: string = "IZEON Recruitment Assessment 2026"
) => {
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();

  // Primary Header Banner
  doc.setFillColor(30, 41, 59); // Slate-800
  doc.rect(0, 0, pageWidth, 28, "F");

  // Title & Subtitle
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("IZEON Assessment Portal — Official Examination Report", 14, 12);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(203, 213, 225); // Slate-300
  doc.text(
    `Assessment: ${assessmentTitle}  |  Generated on: ${new Date().toLocaleString()}`,
    14,
    20
  );

  // Summary Metrics Calculation
  const total = attempts.length;
  const completed = attempts.filter((a) => a.status === "COMPLETED").length;
  const passingScore = attempts[0]?.assessment?.passingScore || 60;
  const passed = attempts.filter((a) => {
    const totalScore = (a.round1Score || 0) + (a.round2Score || 0);
    return totalScore >= passingScore && a.status === "COMPLETED";
  }).length;

  const avgScore = total > 0
    ? (
        attempts.reduce(
          (acc, a) => acc + (a.round1Score || 0) + (a.round2Score || 0),
          0
        ) / total
      ).toFixed(1)
    : "0";

  // Summary KPI Cards
  const startY = 34;
  const cardWidth = (pageWidth - 28 - 15) / 4;

  const drawCard = (x: number, title: string, value: string | number, color: [number, number, number]) => {
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(x, startY, cardWidth, 16, 2, 2, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(title.toUpperCase(), x + 4, startY + 6);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(color[0], color[1], color[2]);
    doc.text(String(value), x + 4, startY + 13);
  };

  drawCard(14, "Total Candidates", total, [30, 41, 59]);
  drawCard(14 + cardWidth + 5, "Completed", completed, [16, 185, 129]);
  drawCard(14 + (cardWidth + 5) * 2, "Qualified (Passed)", passed, [79, 70, 229]);
  drawCard(14 + (cardWidth + 5) * 3, "Avg Marks", `${avgScore} Pts`, [14, 165, 233]);

  // Table Data Preparation
  const tableRows = attempts.map((a, idx) => {
    const r1 = a.round1Score !== null && a.round1Score !== undefined ? a.round1Score : 0;
    const r2 = a.round2Score !== null && a.round2Score !== undefined ? a.round2Score : 0;
    const totalScore = r1 + r2;
    const isPass = totalScore >= passingScore && a.status === "COMPLETED";

    const statusDisplay = a.status === "DISQUALIFIED"
      ? "DISQUALIFIED"
      : a.status === "COMPLETED"
      ? (isPass ? "PASSED" : "FAILED")
      : a.status.replace(/_/g, " ");

    return [
      idx + 1,
      a.user?.name || "N/A",
      a.user?.rollNumber || "—",
      a.user?.department || a.user?.college || "—",
      a.user?.position || "General",
      a.round1Score !== null && a.round1Score !== undefined ? `${a.round1Score} Pts` : "—",
      a.round2Score !== null && a.round2Score !== undefined ? `${a.round2Score} Pts` : "—",
      `${totalScore} Pts`,
      statusDisplay,
      `${a.tabSwitchCount || 0} tabs`,
    ];
  });

  // Table Drawing
  autoTable(doc, {
    startY: startY + 22,
    head: [[
      "#",
      "Candidate Name",
      "Roll No",
      "Dept / College",
      "Target Role",
      "Round 1",
      "Round 2",
      "Total Score",
      "Status",
      "Violations",
    ]],
    body: tableRows,
    theme: "grid",
    headStyles: {
      fillColor: [79, 70, 229], // Indigo-600
      textColor: [255, 255, 255],
      fontSize: 9,
      fontStyle: "bold",
      halign: "left",
    },
    bodyStyles: {
      fontSize: 8.5,
      textColor: [51, 65, 85],
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: 10, halign: "center" },
      1: { cellWidth: 42, fontStyle: "bold" },
      2: { cellWidth: 26 },
      3: { cellWidth: 46 },
      4: { cellWidth: 38 },
      5: { cellWidth: 22, halign: "center" },
      6: { cellWidth: 22, halign: "center" },
      7: { cellWidth: 24, fontStyle: "bold", halign: "center" },
      8: { cellWidth: 28, fontStyle: "bold", halign: "center" },
      9: { cellWidth: 20, halign: "center" },
    },
    didParseCell: (data) => {
      if (data.section === "body" && data.column.index === 8) {
        const val = String(data.cell.raw);
        if (val === "PASSED") {
          data.cell.styles.textColor = [16, 185, 129]; // Emerald
        } else if (val === "FAILED" || val === "DISQUALIFIED") {
          data.cell.styles.textColor = [239, 68, 68]; // Rose
        } else {
          data.cell.styles.textColor = [99, 102, 241]; // Indigo
        }
      }
    },
  });

  // Footer
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Confidential — IZEON Assessment Portal  |  Page ${i} of ${pageCount}`,
      14,
      doc.internal.pageSize.getHeight() - 6
    );
  }

  // Trigger download
  const dateStr = new Date().toISOString().split("T")[0];
  doc.save(`IZEON_Exam_Results_${dateStr}.pdf`);
};

export const generateCandidateScorecardPDF = (attempt: AssessmentAttempt) => {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Top Accent Stripe
  doc.setFillColor(79, 70, 229); // Indigo-600
  doc.rect(0, 0, pageWidth, 6, "F");

  // Header Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(30, 41, 59);
  doc.text("IZEON RECRUITMENT ASSESSMENT", 14, 22);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text("Official Candidate Scorecard & Performance Evaluation Report", 14, 28);

  // Line separator
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.line(14, 33, pageWidth - 14, 33);

  // Candidate Profile Box
  const profileY = 38;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(14, profileY, pageWidth - 28, 48, 3, 3, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text("Candidate Details", 20, profileY + 8);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(71, 85, 105);

  const col1X = 20;
  const col2X = pageWidth / 2 + 5;

  doc.text(`Full Name:`, col1X, profileY + 17);
  doc.setFont("helvetica", "bold");
  doc.text(attempt.user?.name || "N/A", col1X + 32, profileY + 17);

  doc.setFont("helvetica", "normal");
  doc.text(`Email Address:`, col1X, profileY + 24);
  doc.setFont("helvetica", "bold");
  doc.text(attempt.user?.email || "N/A", col1X + 32, profileY + 24);

  doc.setFont("helvetica", "normal");
  doc.text(`Roll Number:`, col1X, profileY + 31);
  doc.setFont("helvetica", "bold");
  doc.text(attempt.user?.rollNumber || "—", col1X + 32, profileY + 31);

  doc.setFont("helvetica", "normal");
  doc.text(`Mobile Number:`, col1X, profileY + 38);
  doc.setFont("helvetica", "bold");
  doc.text(attempt.user?.mobileNumber || "—", col1X + 32, profileY + 38);

  // Col 2
  doc.setFont("helvetica", "normal");
  doc.text(`Target Track:`, col2X, profileY + 17);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(79, 70, 229);
  doc.text(attempt.user?.position || "Software Developer", col2X + 30, profileY + 17);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(71, 85, 105);
  doc.text(`Department:`, col2X, profileY + 24);
  doc.setFont("helvetica", "bold");
  doc.text(attempt.user?.department || "—", col2X + 30, profileY + 24);

  doc.setFont("helvetica", "normal");
  doc.text(`College / Univ:`, col2X, profileY + 31);
  doc.setFont("helvetica", "bold");
  doc.text(attempt.user?.college || "—", col2X + 30, profileY + 31);

  doc.setFont("helvetica", "normal");
  doc.text(`Exam Title:`, col2X, profileY + 38);
  doc.setFont("helvetica", "bold");
  doc.text(attempt.assessment?.title || "Assessment 2026", col2X + 30, profileY + 38);

  // Scores & Evaluation Table
  const r1 = attempt.round1Score || 0;
  const r2 = attempt.round2Score || 0;
  const totalScore = r1 + r2;
  const passingScore = attempt.assessment?.passingScore || 60;
  const isPass = totalScore >= passingScore && attempt.status === "COMPLETED";

  const scoresY = profileY + 54;

  autoTable(doc, {
    startY: scoresY,
    head: [["Evaluation Section", "Category / Topic", "Score Earned", "Status"]],
    body: [
      [
        "Round 1: Cognitive & Grammar",
        attempt.user?.position === "Data Analyst"
          ? "Aptitude, Verbal, Python & SQL MCQs, Written"
          : "Aptitude, Verbal & Written Prompt",
        `${r1} Points`,
        r1 > 0 ? "Completed" : "Not Attempted",
      ],
      [
        "Round 2: Technical Hands-on",
        attempt.user?.position === "Data Analyst"
          ? "SQL Analytics Query & Python Data Scripting"
          : "DSA Problem Solving & Algorithmic Coding",
        `${r2} Points`,
        attempt.status === "COMPLETED" ? "Submitted" : attempt.status.replace(/_/g, " "),
      ],
      [
        "TOTAL AGGREGATE",
        `Passing Benchmark: ${passingScore} Points`,
        `${totalScore} Points`,
        isPass ? "QUALIFIED / PASSED" : attempt.status === "COMPLETED" ? "NOT QUALIFIED" : attempt.status.replace(/_/g, " "),
      ],
    ],
    theme: "striped",
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontSize: 9.5,
      fontStyle: "bold",
    },
    bodyStyles: {
      fontSize: 9,
      textColor: [51, 65, 85],
    },
    columnStyles: {
      0: { cellWidth: 60, fontStyle: "bold" },
      1: { cellWidth: 70 },
      2: { cellWidth: 26, fontStyle: "bold", halign: "center" },
      3: { cellWidth: 32, fontStyle: "bold", halign: "center" },
    },
    didParseCell: (data) => {
      if (data.row.index === 2) {
        data.cell.styles.fillColor = isPass ? [236, 253, 245] : [254, 242, 242];
        if (data.column.index === 3) {
          data.cell.styles.textColor = isPass ? [16, 185, 129] : [239, 68, 68];
        }
      }
    },
  });

  let currentY = (doc as any).lastAutoTable.finalY + 10;

  // Proctoring & Integrity Summary
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, currentY, pageWidth - 28, 26, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text("Proctoring & Exam Integrity Verification", 20, currentY + 7);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(
    `• Browser Tab Violations Recorded: ${attempt.tabSwitchCount || 0} times`,
    20,
    currentY + 14
  );
  doc.text(
    `• Final Proctoring Status: ${
      attempt.status === "DISQUALIFIED"
        ? "DISQUALIFIED DUE TO MALPRACTICE"
        : attempt.status === "MALPRACTICE_LOCKED"
        ? "LOCKED BY AI PROCTOR"
        : "CLEARED & VERIFIED ACCREDITATION"
    }`,
    20,
    currentY + 20
  );

  currentY += 34;

  // Written Essay Snippet (if available)
  if (attempt.writtenEssay) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);
    doc.text("Written Assessment Submission (Grammar & Expression)", 14, currentY);

    currentY += 5;
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(14, currentY, pageWidth - 28, 22, 2, 2, "F");

    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    const splitEssay = doc.splitTextToSize(attempt.writtenEssay, pageWidth - 36);
    doc.text(splitEssay.slice(0, 3), 18, currentY + 6);

    currentY += 28;
  }

  // Signature Block
  const sigY = pageHeight - 35;
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.4);
  doc.line(pageWidth - 75, sigY, pageWidth - 15, sigY);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  doc.text("Authorized Examiner / System Administrator", pageWidth - 75, sigY + 5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text("IZEON Assessment Verification Cell", pageWidth - 75, sigY + 9);

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text(
    `Report ID: ${attempt.id}  |  Generated: ${new Date().toLocaleString()}`,
    14,
    pageHeight - 10
  );

  const cleanName = (attempt.user?.name || "Candidate").replace(/[^a-zA-Z0-9]/g, "_");
  doc.save(`Scorecard_${cleanName}_${attempt.user?.rollNumber || "report"}.pdf`);
};
