import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ShieldCheck, LogOut, CheckCircle2, AlertTriangle } from "lucide-react";

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-sm shadow-emerald-600/20 group-hover:scale-105 transition-transform">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <span className="text-lg font-extrabold tracking-tight text-slate-900">
              IZEON<span className="text-emerald-600 font-black">Assessment</span>
            </span>
            <span className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase -mt-0.5">
              Secure Proctoring Network
            </span>
          </div>
        </Link>

        {/* User actions */}
        {user ? (
          <div className="flex items-center gap-3.5">
            {/* Status indicator for students */}
            {user.role === "STUDENT" && (
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium">
                {user.status === "REJECTED" ? (
                  <span className="flex items-center gap-1 text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-full font-semibold">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                    Account Restricted
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Assessment Ready
                  </span>
                )}
              </div>
            )}

            {/* Role Badge */}
            <span
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold tracking-wider uppercase ${
                user.role === "ADMIN"
                  ? "bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-xs"
                  : "bg-slate-100 text-slate-700 border border-slate-200"
              }`}
            >
              {user.role}
            </span>

            {/* User profile */}
            <div className="flex items-center gap-2 pl-3 border-l border-slate-200">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 font-bold text-xs shadow-xs">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="hidden md:block text-left">
                <p className="text-xs font-bold text-slate-800 leading-none">{user.name}</p>
                <p className="text-[11px] text-slate-400 truncate max-w-[130px] mt-0.5">{user.email}</p>
              </div>
            </div>

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="text-xs font-bold text-slate-700 hover:text-emerald-600 px-3 py-1.5 rounded-xl hover:bg-slate-100 transition-colors"
            >
              Sign In
            </Link>
            <Link
              to="/register"
              className="text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 px-4 py-2 rounded-xl shadow-xs transition-all"
            >
              Create Account
            </Link>
          </div>
        )}
      </div>
    </header>
  );
};
