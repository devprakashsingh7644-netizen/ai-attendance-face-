import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, Camera, Calendar, LogOut, Moon, Sun, GraduationCap } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

export default function Layout() {
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const [isDark, setIsDark] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    // Default to dark mode
    document.documentElement.classList.add('dark');
  }, []);

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

  return (
    <div className="flex h-screen bg-slate-950 dark:bg-slate-950 bg-slate-100 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 bg-slate-900 dark:bg-slate-900 bg-white border-r border-slate-800 dark:border-slate-800 border-slate-200 flex flex-col">
        {/* Logo */}
        <div className="h-16 flex items-center px-6 border-b border-slate-800 dark:border-slate-800 border-slate-200">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center flex-shrink-0">
              <GraduationCap size={16} className="text-white" />
            </div>
            <span className="font-bold text-white dark:text-white text-slate-900 text-sm tracking-wide">AI Attendance</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center space-x-3 rounded-xl px-4 py-2.5 text-sm transition-all duration-150 ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25 font-semibold'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/70 dark:hover:bg-slate-800/70 font-medium'
                }`
              }
            >
              {item.icon}
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* User & Controls */}
        <div className="p-4 border-t border-slate-800 dark:border-slate-800 border-slate-200 space-y-1">
          <div className="px-4 py-2 text-xs text-slate-500 truncate">{user?.email}</div>
          <button
            onClick={toggleTheme}
            className="flex w-full items-center space-x-3 rounded-xl px-4 py-2.5 text-sm text-slate-400 hover:text-white hover:bg-slate-800/70 transition-all font-medium"
          >
            {isDark ? <Sun size={19} /> : <Moon size={19} />}
            <span>{isDark ? 'Light Mode' : 'Dark Mode'}</span>
          </button>
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex w-full items-center space-x-3 rounded-xl px-4 py-2.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all font-medium"
          >
            <LogOut size={19} />
            <span>{loggingOut ? 'Logging out...' : 'Logout'}</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-slate-950 dark:bg-slate-950 bg-slate-50">
        <div className="p-8 max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
