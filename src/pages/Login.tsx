import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { LogIn, Lock, Mail, AlertCircle, ArrowRight } from "lucide-react";

export const Login: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const user = await login(email, password);
      if (user.role === "ADMIN") {
        navigate("/admin");
      } else {
        navigate("/dashboard");
      }
    } catch (err: any) {
      setError(err.message || "Failed to log in");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickFillAdmin = () => {
    setEmail("admin@izeon.com");
    setPassword("admin123");
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-200/90 p-8 md:p-10 space-y-6 relative overflow-hidden">
        {/* Decorative Top Accent Glow */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-600 via-teal-400 to-emerald-500" />
        
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-200 p-0.5 shadow-sm mb-2">
            <div className="w-full h-full bg-white rounded-[14px] flex items-center justify-center text-emerald-700">
              <LogIn className="w-6 h-6" />
            </div>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Sign in to IZEON</h1>
          <p className="text-xs text-slate-500 font-medium">
            Proctored Assessment & Verification Platform
          </p>
        </div>

        {/* Quick fill demo helper */}
        <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200 text-xs flex items-center justify-between text-emerald-950 font-medium">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            Admin Demo Access:
          </span>
          <button
            type="button"
            onClick={handleQuickFillAdmin}
            className="text-xs font-bold text-emerald-800 hover:text-emerald-950 bg-white px-3 py-1 rounded-lg border border-emerald-200 shadow-xs cursor-pointer transition-all hover:bg-emerald-50"
          >
            Auto-fill Admin
          </button>
        </div>

        {error && (
          <div className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-900 mb-1.5">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full text-xs pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-900 mb-1.5">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full text-xs pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-extrabold text-xs transition-all shadow-md shadow-emerald-600/25 cursor-pointer transform hover:-translate-y-0.5 active:translate-y-0"
          >
            {isSubmitting ? "Signing in..." : "Sign In to Portal"}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Footer */}
        <div className="text-center text-xs text-slate-500 pt-4 border-t border-slate-100 font-medium">
          New student candidate?{" "}
          <Link to="/register" className="font-bold text-emerald-700 hover:text-emerald-800 hover:underline">
            Register for Assessment
          </Link>
        </div>
      </div>
    </div>
  );
};
