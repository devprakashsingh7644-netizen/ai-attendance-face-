import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, Camera, Calendar, LogOut, Moon, Sun, GraduationCap, Menu, X, Wifi, WifiOff } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

export default function Layout() {
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const [isDark, setIsDark] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dbConnected, setDbConnected] = useState(false);

  useEffect(() => {
    document.documentElement.classList.add('dark');
    // Check DB connection
    checkDbConnection();
  }, []);

  const checkDbConnection = async () => {
    try {
      const { error } = await supabase.from('students').select('id', { count: 'exact', head: true });
      setDbConnected(!error);
    } catch {
      setDbConnected(false);
    }
  };

  const toggleTheme = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle('dark');
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
      navigate('/login');
    } finally {
      setLoggingOut(false);
    }
  };

  const navItems = [
    { to: '/', icon: <LayoutDashboard size={19} />, label: 'Dashboard', end: true },
    { to: '/students', icon: <Users size={19} />, label: 'Students' },
    { to: '/scanner', icon: <Camera size={19} />, label: 'Scanner' },
    { to: '/attendance', icon: <Calendar size={19} />, label: 'Attendance' },
  ];

  const NavContent = () => (
    <>
      {/* Logo */}
      <div className="h-16 flex items-center px-5 border-b border-[hsl(var(--sidebar-border))] shrink-0">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
            <GraduationCap size={18} className="text-white" />
          </div>
          <div>
            <span className="font-bold text-slate-900 dark:text-white text-sm tracking-wide block">AI Attendance</span>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium tracking-widest uppercase">Face Recognition</span>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={() => setMobileMenuOpen(false)}
            className={({ isActive }) =>
              `flex items-center space-x-3 rounded-xl px-4 py-2.5 text-sm transition-all duration-200 group relative ${
                isActive
                  ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-lg shadow-indigo-500/25 font-semibold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/70 font-medium'
              }`
            }
          >
            <span className="transition-transform duration-200 group-hover:scale-110">{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-[hsl(var(--sidebar-border))] space-y-1 shrink-0">
        {/* Connection Status */}
        <div className="flex items-center gap-2 px-4 py-2 text-xs text-slate-400 dark:text-slate-500">
          {dbConnected ? (
            <>
              <Wifi size={13} className="text-emerald-500" />
              <span>Database Connected</span>
            </>
          ) : (
            <>
              <WifiOff size={13} className="text-red-400" />
              <span>Database Offline</span>
            </>
          )}
        </div>

        {/* User email */}
        <div className="px-4 py-1.5 text-xs text-slate-400 dark:text-slate-500 truncate font-medium">
          {user?.email}
        </div>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="flex w-full items-center space-x-3 rounded-xl px-4 py-2.5 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/70 transition-all font-medium group"
        >
          <span className="transition-transform duration-300 group-hover:rotate-180">
            {isDark ? <Sun size={19} /> : <Moon size={19} />}
          </span>
          <span>{isDark ? 'Light Mode' : 'Dark Mode'}</span>
        </button>

        {/* Logout */}
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="flex w-full items-center space-x-3 rounded-xl px-4 py-2.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all font-medium"
        >
          <LogOut size={19} />
          <span>{loggingOut ? 'Logging out...' : 'Logout'}</span>
        </button>

        {/* Version badge */}
        <div className="px-4 py-2 text-[10px] text-slate-400 dark:text-slate-600 font-mono">
          v1.0.0 — Premium
        </div>
      </div>
    </>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-[hsl(var(--content-bg))] transition-theme">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 shrink-0 flex-col bg-[hsl(var(--sidebar-bg))] border-r border-[hsl(var(--sidebar-border))] transition-theme">
        <NavContent />
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 h-14 bg-[hsl(var(--sidebar-bg))]/90 backdrop-blur-xl border-b border-[hsl(var(--sidebar-border))] flex items-center justify-between px-4 transition-theme">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
            <GraduationCap size={16} className="text-white" />
          </div>
          <span className="font-bold text-slate-900 dark:text-white text-sm">AI Attendance</span>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="absolute left-0 top-0 bottom-0 w-72 bg-[hsl(var(--sidebar-bg))] border-r border-[hsl(var(--sidebar-border))] flex flex-col animate-slide-in-right shadow-glass-lg transition-theme"
            style={{ animationName: 'slide-in-left' }}
          >
            <NavContent />
          </aside>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto lg:pt-0 pt-14">
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
