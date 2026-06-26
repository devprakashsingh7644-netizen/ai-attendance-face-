// Simplified Login page with only Google Sign-In
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { GraduationCap, Sparkles } from "lucide-react";
import { FaGoogle } from "react-icons/fa";
import { supabase } from "../lib/supabase";

export default function Login() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [error, setError] = useState("");
  useEffect(() => {
    if (user) navigate('/');
  }, [user, navigate]);
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setLoading(true);
    const redirectUrl = import.meta.env.VITE_APP_URL ?? window.location.origin;
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: redirectUrl },
      });
      if (error) throw error;
    } catch (err) {
      setError(err.message || "Google login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[hsl(var(--background))] flex items-center justify-center p-4 transition-theme relative overflow-hidden">
      {/* Animated background orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/3 -left-1/4 w-[600px] h-[600px] rounded-full bg-indigo-500/10 dark:bg-indigo-900/20 blur-[100px] animate-float" />
        <div className="absolute -bottom-1/3 -right-1/4 w-[600px] h-[600px] rounded-full bg-violet-500/10 dark:bg-violet-900/20 blur-[100px] animate-float" style={{ animationDelay: "3s" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full bg-cyan-500/5 dark:bg-cyan-900/10 blur-[80px] animate-float" style={{ animationDelay: "1.5s" }} />
      </div>

      {/* Grid pattern overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03] dark:opacity-[0.05]"
        style={{
          backgroundImage: `linear-gradient(rgba(99, 102, 241, 0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(99, 102, 241, 0.3) 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
        }}
      />

      <div className="relative w-full max-w-md animate-fade-in-up">
        <div className="glass-card rounded-2xl p-7 sm:p-8 shadow-2xl">
          <div className="text-center mb-7">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-xl shadow-indigo-500/25 mb-5">
              <GraduationCap className="text-white" size={28} />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-1.5">Welcome</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm flex items-center justify-center gap-1.5">
              <Sparkles size={14} className="text-indigo-500" />
              AI Attendance Management System
            </p>
          </div>

          {error && (
            <div className="mb-5 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-sm text-center font-medium animate-fade-in">
              {error}
            </div>
          )}

          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full glass-card hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-white font-semibold py-3 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 text-sm"
          >
            <FaGoogle size={18} />
            {loading ? "Signing in..." : "Sign in with Google"}
          </button>
        </div>
      </div>
    </div>
  );
}
