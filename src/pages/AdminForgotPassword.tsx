import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Lock,
  Mail,
  KeyRound,
  ShieldAlert,
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  RefreshCw,
  Key,
  Clock,
  Sparkles,
  Info,
} from "lucide-react";
import { apiRequest } from "../services/api";
import interviewLogo from "../assets/interview logo.png";

type ResetMethod = "PASSCODE" | "MASTER_KEY";

export const AdminForgotPassword: React.FC = () => {
  const navigate = useNavigate();

  // Multi-step state: 1 = Email Input, 2 = Verify & Set Password, 3 = Success
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Form Fields
  const [email, setEmail] = useState("");
  const [maskedEmail, setMaskedEmail] = useState("");
  const [passcode, setPasscode] = useState("");
  const [recoveryKey, setRecoveryKey] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Method Toggle: Passcode vs Master Recovery Key
  const [method, setMethod] = useState<ResetMethod>("PASSCODE");

  // Status & Feedback
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [devCodeHint, setDevCodeHint] = useState<string | null>(null);

  // Countdown timer for passcode expiry (15 mins = 900s)
  const [timeLeft, setTimeLeft] = useState<number>(900);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    if (step === 2 && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [step, timeLeft]);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  // STEP 1: Request Passcode / Validate Admin Account
  const handleRequestPasscode = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError("");
    setSuccessMsg("");
    setDevCodeHint(null);

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setError("Please enter your administrator email address.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await apiRequest<{
        message: string;
        email: string;
        maskedEmail: string;
        devPasscode?: string;
      }>("/auth/admin/forgot-password/request", {
        method: "POST",
        body: JSON.stringify({ email: cleanEmail }),
      });

      setMaskedEmail(response.maskedEmail || cleanEmail);
      if (response.devPasscode) {
        setDevCodeHint(response.devPasscode);
      }
      setTimeLeft(900); // 15 mins
      setSuccessMsg("Administrator account verified. Passcode generated.");
      setStep(2);
    } catch (err: any) {
      setError(
        err.message || "Unable to request password reset. Please verify credentials."
      );
    } finally {
      setIsLoading(false);
    }
  };

  // STEP 2: Submit Reset with Passcode or Master Key
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    if (method === "PASSCODE" && (!passcode || passcode.trim().length !== 6)) {
      setError("Please enter the 6-digit security passcode.");
      return;
    }

    if (method === "MASTER_KEY" && !recoveryKey.trim()) {
      setError("Please enter the Master Admin Recovery Key.");
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      setError("New password must be at least 6 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match. Please verify both fields.");
      return;
    }

    setIsLoading(true);

    try {
      const payload: Record<string, any> = {
        email: email.trim(),
        newPassword,
        confirmPassword,
      };

      if (method === "PASSCODE") {
        payload.code = passcode.trim();
      } else {
        payload.recoveryKey = recoveryKey.trim();
      }

      await apiRequest("/auth/admin/forgot-password/reset", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      setStep(3);
    } catch (err: any) {
      setError(err.message || "Failed to reset password. Please check your inputs.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200/90 p-8 md:p-10 space-y-6 relative overflow-hidden">
        {/* Top Decorative Indigo/Blue Stripe */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-500 via-[#16499c] to-indigo-600" />

        {/* Header Section */}
        <div className="text-center space-y-2">
          <div className="inline-flex w-16 h-16 rounded-2xl bg-white border border-[#16499c]/25 p-1.5 shadow-sm mb-2 items-center justify-center">
            <img src={interviewLogo} alt="IZEON Logo" className="w-full h-full object-contain" />
          </div>

          <div className="flex items-center justify-center gap-1.5 text-xs font-bold tracking-wider uppercase text-amber-700 bg-amber-50 border border-amber-200/80 px-3 py-1 rounded-full mx-auto w-fit">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
            Admin Recovery Console
          </div>

          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
            Reset Admin Password
          </h1>
          <p className="text-xs text-slate-500 font-medium max-w-sm mx-auto">
            Strictly reserved for <span className="font-semibold text-slate-700">Administrator Accounts</span>. Student candidate accounts cannot be reset here.
          </p>
        </div>

        {/* Stepper Progress Bar */}
        <div className="flex items-center justify-between relative px-6 py-2">
          <div className="absolute left-10 right-10 top-1/2 -translate-y-1/2 h-0.5 bg-slate-200 -z-0" />
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold z-10 transition-colors ${
              step >= 1 ? "bg-[#16499c] text-white shadow-md shadow-[#16499c]/30" : "bg-slate-200 text-slate-500"
            }`}
          >
            1
          </div>
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold z-10 transition-colors ${
              step >= 2 ? "bg-[#16499c] text-white shadow-md shadow-[#16499c]/30" : "bg-slate-200 text-slate-500"
            }`}
          >
            2
          </div>
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold z-10 transition-colors ${
              step === 3 ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30" : "bg-slate-200 text-slate-500"
            }`}
          >
            ✓
          </div>
        </div>

        {/* Alert Feedback Messages */}
        {error && (
          <div className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-sm text-rose-700 font-medium animate-fadeIn">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="font-semibold">Security Alert</p>
              <p className="text-xs leading-relaxed">{error}</p>
            </div>
          </div>
        )}

        {successMsg && !error && (
          <div className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-800 font-medium animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <p className="text-xs leading-relaxed">{successMsg}</p>
          </div>
        )}

        {/* ======================================================== */}
        {/* STEP 1: Enter Administrator Email & Check Access         */}
        {/* ======================================================== */}
        {step === 1 && (
          <form onSubmit={handleRequestPasscode} className="space-y-4">
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs text-slate-600 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-slate-800">
                <Info className="w-3.5 h-3.5 text-[#16499c]" />
                Administrator Verification
              </div>
              <p>
                Enter the email address tied to your IZEON Administrator account. The system will verify administrative privileges before issuing a recovery passcode.
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                Administrator Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@izeon.com"
                  className="w-full text-sm pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#16499c]/20 focus:border-[#16499c] transition-all font-medium placeholder:text-slate-400"
                  autoFocus
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#16499c] hover:bg-[#123c80] disabled:opacity-50 text-white font-bold text-sm transition-all shadow-md shadow-[#16499c]/25 cursor-pointer transform hover:-translate-y-0.5 active:translate-y-0"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Verifying Admin Privileges...
                </>
              ) : (
                <>
                  Verify & Generate Passcode
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <div className="flex items-center justify-center pt-2">
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Return to Sign In
              </Link>
            </div>
          </form>
        )}

        {/* ======================================================== */}
        {/* STEP 2: Enter Verification Code / Master Key & New Pass  */}
        {/* ======================================================== */}
        {step === 2 && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            {/* Account Info Pill */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <div>
                  <div className="font-semibold text-slate-800">Admin Account Verified</div>
                  <div className="text-slate-500 font-mono">{maskedEmail}</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-[11px] font-semibold text-[#16499c] hover:underline"
              >
                Change
              </button>
            </div>

            {/* Dev Mode / Offline Passcode Banner */}
            {devCodeHint && (
              <div className="p-3 rounded-xl bg-amber-50/90 border border-amber-200 text-xs text-amber-900 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                    Security Passcode
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setPasscode(devCodeHint);
                      setMethod("PASSCODE");
                    }}
                    className="font-bold text-[#16499c] hover:underline bg-white px-2 py-0.5 rounded border border-amber-300"
                  >
                    Auto-Fill Passcode
                  </button>
                </div>
                <div className="flex items-center gap-2 pt-0.5">
                  <span className="font-mono text-base font-extrabold tracking-widest text-[#16499c] bg-white px-2.5 py-0.5 rounded border border-slate-200">
                    {devCodeHint}
                  </span>
                  <span className="text-[11px] text-amber-700">
                    (Valid for 15 mins • Logged in server console)
                  </span>
                </div>
              </div>
            )}

            {/* Authentication Method Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                Authentication Method
              </label>
              <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setMethod("PASSCODE")}
                  className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    method === "PASSCODE"
                      ? "bg-white text-[#16499c] shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  6-Digit Passcode
                </button>
                <button
                  type="button"
                  onClick={() => setMethod("MASTER_KEY")}
                  className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    method === "MASTER_KEY"
                      ? "bg-white text-[#16499c] shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Key className="w-3.5 h-3.5" />
                  Master Recovery Key
                </button>
              </div>
            </div>

            {/* Field: 6-Digit Passcode */}
            {method === "PASSCODE" ? (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-800">
                    Enter 6-Digit Security Passcode
                  </label>
                  <div className="flex items-center gap-1 text-[11px] text-slate-500 font-medium">
                    <Clock className="w-3 h-3 text-slate-400" />
                    Expires in:{" "}
                    <span className="font-mono font-bold text-slate-700">
                      {formatTimer(timeLeft)}
                    </span>
                  </div>
                </div>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    maxLength={6}
                    required
                    value={passcode}
                    onChange={(e) => setPasscode(e.target.value.replace(/\D/g, ""))}
                    placeholder="e.g. 583921"
                    className="w-full text-sm pl-10 pr-20 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 tracking-widest font-mono font-bold focus:outline-none focus:ring-2 focus:ring-[#16499c]/20 focus:border-[#16499c] transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => handleRequestPasscode()}
                    disabled={isLoading}
                    className="absolute right-2.5 top-2 px-2 py-1 text-[11px] font-bold text-[#16499c] hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                  >
                    Resend
                  </button>
                </div>
              </div>
            ) : (
              /* Field: Master Recovery Key */
              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                  Master Admin Recovery Key
                </label>
                <div className="relative">
                  <Key className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="password"
                    required
                    value={recoveryKey}
                    onChange={(e) => setRecoveryKey(e.target.value)}
                    placeholder="Enter system master recovery key..."
                    className="w-full text-sm pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#16499c]/20 focus:border-[#16499c] transition-all font-mono"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Configured in system environment (<span className="font-mono">ADMIN_RECOVERY_KEY</span>) for administrative break-glass access.
                </p>
              </div>
            )}

            {/* Field: New Password */}
            <div>
              <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                New Administrator Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full text-sm pl-10 pr-10 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#16499c]/20 focus:border-[#16499c] transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 p-1 text-slate-400 hover:text-[#16499c] transition-colors cursor-pointer"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Field: Confirm Password */}
            <div>
              <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                Confirm New Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  className={`w-full text-sm pl-10 pr-10 py-2.5 rounded-xl border bg-white text-slate-900 focus:outline-none focus:ring-2 transition-all ${
                    confirmPassword && confirmPassword !== newPassword
                      ? "border-rose-400 focus:ring-rose-200"
                      : "border-slate-300 focus:ring-[#16499c]/20 focus:border-[#16499c]"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-2.5 p-1 text-slate-400 hover:text-[#16499c] transition-colors cursor-pointer"
                  tabIndex={-1}
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {confirmPassword && confirmPassword !== newPassword && (
                <p className="text-[11px] text-rose-600 mt-1 font-medium">
                  Passwords do not match.
                </p>
              )}
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#16499c] hover:bg-[#123c80] disabled:opacity-50 text-white font-bold text-sm transition-all shadow-md shadow-[#16499c]/25 cursor-pointer transform hover:-translate-y-0.5 active:translate-y-0"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Updating Credentials...
                  </>
                ) : (
                  <>
                    Update Admin Password
                    <ShieldCheck className="w-4 h-4" />
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setStep(1)}
                className="w-full py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
              >
                Back to Email Verification
              </button>
            </div>
          </form>
        )}

        {/* ======================================================== */}
        {/* STEP 3: Success Screen                                   */}
        {/* ======================================================== */}
        {step === 3 && (
          <div className="text-center space-y-5 py-4 animate-fadeIn">
            <div className="w-16 h-16 rounded-full bg-emerald-100 border-2 border-emerald-500/30 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-10 h-10 text-emerald-600" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-extrabold text-slate-900">
                Password Successfully Reset!
              </h2>
              <p className="text-xs text-slate-600 max-w-sm mx-auto leading-relaxed">
                Your administrator credentials have been securely updated. You can now use your new password to access the IZEON Administrator Dashboard.
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-emerald-50/80 border border-emerald-200 text-xs text-emerald-800 font-medium">
              Security Notice: Previous active sessions and temporary verification passcodes have been invalidated.
            </div>

            <button
              onClick={() => navigate("/login")}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm transition-all shadow-md shadow-emerald-600/25 cursor-pointer transform hover:-translate-y-0.5 active:translate-y-0"
            >
              Sign In with New Password
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Footer */}
        <div className="text-center text-xs text-slate-500 pt-2 border-t border-slate-100 font-medium">
          Need student candidate assistance?{" "}
          <Link to="/login" className="font-bold text-[#16499c] hover:underline">
            Go to Student Sign In
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AdminForgotPassword;
