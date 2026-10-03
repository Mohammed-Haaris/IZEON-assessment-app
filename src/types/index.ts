export type Role = "ADMIN" | "STUDENT";
export type StudentStatus = "PENDING_APPROVAL" | "APPROVED" | "REJECTED";
export type RoundType = "ROUND_1_APTITUDE_VERBAL_WRITTEN" | "ROUND_2_CODING";
export type QuestionCategory =
  | "APTITUDE"
  | "VERBAL"
  | "WRITTEN_PROMPT"
  | "CODING"
  | "SQL"
  | "PYTHON";
export type AttemptStatus =
  | "NOT_STARTED"
  | "ROUND_1_IN_PROGRESS"
  | "ROUND_1_COMPLETED"
  | "ROUND_2_IN_PROGRESS"
  | "MALPRACTICE_LOCKED"
  | "COMPLETED"
  | "DISQUALIFIED";

export interface User {
  id: string;
  name: string;
  email: string;
  college?: string;
  department?: string;
  rollNumber?: string;
  position?: string;
  dob?: string;
  mobileNumber?: string;
  tenthMark?: string;
  twelfthMark?: string;
  cgpa?: string;
  role: Role;
  status: StudentStatus;
  createdAt?: string;
}

export interface Question {
  id: string;
  assessmentId: string;
  round: RoundType;
  category: QuestionCategory;
  targetRole?: string | null;
  title: string;
  content: string;
  options?: string[] | null;
  correctAnswer?: string | null;
  points: number;
  starterCode?: Record<string, string> | null;
  testCases?: Array<{ input: string; output: string; isHidden?: boolean }> | null;
}

export interface Assessment {
  id: string;
  title: string;
  description?: string;
  durationR1: number;
  durationR2: number;
  passingScore?: number;
  isActive: boolean;
  questions?: Question[];
  _count?: {
    questions?: number;
    attempts?: number;
  };
}

export interface AssessmentAttempt {
  id: string;
  userId: string;
  assessmentId: string;
  status: AttemptStatus;
  currentRound?: RoundType | null;
  tabSwitchCount: number;
  round1Score?: number | null;
  round2Score?: number | null;
  writtenEssay?: string | null;
  answers?: any;
  startedAt?: string | null;
  completedAt?: string | null;
  user?: User;
  assessment?: Assessment;
}

export interface MalpracticeAlert {
  attemptId: string;
  logId?: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  assessmentTitle: string;
  violationType: string;
  violationCount: number;
  timestamp: string;
}
