import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Users, UserCheck, UserX, TrendingUp, Clock, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ totalStudents: 0, presentToday: 0 });
  const [loading, setLoading] = useState(true);
  const [recentAttendance, setRecentAttendance] = useState([]);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    fetchDashboardData();
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      const { count: studentCount } = await supabase
        .from('students')
        .select('*', { count: 'exact', head: true });

      const today = new Date().toISOString().split('T')[0];
      const { count: presentCount } = await supabase
        .from('attendance')
        .select('*', { count: 'exact', head: true })
        .eq('date', today);

      const { data: recent } = await supabase
        .from('attendance')
        .select('id, student_name, time, status, date')
        .eq('date', today)
        .order('time', { ascending: false })
        .limit(8);

      setStats({
        totalStudents: studentCount || 0,
        presentToday: presentCount || 0
      });
      setRecentAttendance(recent || []);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const absentToday = stats.totalStudents - stats.presentToday;
  const attendancePercent = stats.totalStudents > 0
    ? Math.round((stats.presentToday / stats.totalStudents) * 100)
    : 0;

  const getTimeAgo = (timeStr) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const dateTime = new Date(`${today}T${timeStr}`);
      const diffMs = Date.now() - dateTime.getTime();
      const diffMin = Math.floor(diffMs / 60000);
      if (diffMin < 1) return 'Just now';
      if (diffMin < 60) return `${diffMin}m ago`;
      const diffHr = Math.floor(diffMin / 60);
      return `${diffHr}h ago`;
    } catch {
      return timeStr?.substring(0, 5) || '';
    }
  };

  const statCards = [
    {
      label: 'Total Students',
      value: stats.totalStudents,
      icon: Users,
      gradient: 'from-indigo-500 to-violet-600',
      shadowColor: 'shadow-indigo-500/20',
      bgAccent: 'bg-indigo-500/10 dark:bg-indigo-500/10',
      textAccent: 'text-indigo-600 dark:text-indigo-400',
      description: 'Registered in system',
    },
    {
      label: 'Present Today',
      value: stats.presentToday,
      icon: UserCheck,
      gradient: 'from-emerald-500 to-cyan-500',
      shadowColor: 'shadow-emerald-500/20',
      bgAccent: 'bg-emerald-500/10 dark:bg-emerald-500/10',
      textAccent: 'text-emerald-600 dark:text-emerald-400',
      description: 'Marked attendance',
    },
    {
      label: 'Absent Today',
      value: absentToday,
      icon: UserX,
      gradient: 'from-amber-500 to-orange-500',
      shadowColor: 'shadow-amber-500/20',
      bgAccent: 'bg-amber-500/10 dark:bg-amber-500/10',
      textAccent: 'text-amber-600 dark:text-amber-400',
      description: 'Not yet scanned',
    },
    {
      label: 'Attendance %',
      value: `${attendancePercent}%`,
      icon: TrendingUp,
      gradient: 'from-blue-500 to-purple-600',
      shadowColor: 'shadow-blue-500/20',
      bgAccent: 'bg-blue-500/10 dark:bg-blue-500/10',
      textAccent: 'text-blue-600 dark:text-blue-400',
      description: "Today's rate",
      isPercentage: true,
      percentValue: attendancePercent,
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-fade-in-up">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Welcome back{user?.email ? `, ${user.email.split('@')[0]}` : ''} 👋
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm sm:text-base">
            Here's an overview of today's attendance metrics.
          </p>
        </div>
        <div className="glass-card rounded-xl px-4 py-2.5 flex items-center gap-3">
          <Clock size={16} className="text-indigo-500" />
          <div className="text-right">
            <p className="text-xs text-slate-400 dark:text-slate-500 font-medium uppercase tracking-wider">
              {currentTime.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
            </p>
            <p className="text-sm font-mono font-semibold text-slate-900 dark:text-white">
              {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card, i) => (
          <div
            key={card.label}
            className={`glass-card rounded-2xl p-5 sm:p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${card.shadowColor} cursor-default`}
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                {card.label}
              </span>
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${card.gradient} flex items-center justify-center shadow-lg ${card.shadowColor}`}>
                <card.icon size={18} className="text-white" />
              </div>
            </div>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-3xl font-bold text-slate-900 dark:text-white">
                  {loading ? (
                    <span className="inline-block w-12 h-8 bg-slate-200 dark:bg-slate-700 rounded-lg animate-pulse" />
                  ) : (
                    card.value
                  )}
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 font-medium">{card.description}</p>
              </div>
              {card.isPercentage && !loading && (
                <div className="relative w-12 h-12">
                  <svg className="w-12 h-12 transform -rotate-90" viewBox="0 0 40 40">
                    <circle cx="20" cy="20" r="16" fill="none" stroke="currentColor" strokeWidth="3"
                      className="text-slate-200 dark:text-slate-700" />
                    <circle cx="20" cy="20" r="16" fill="none" strokeWidth="3"
                      className="text-blue-500"
                      strokeLinecap="round"
                      strokeDasharray={`${(card.percentValue / 100) * 100.53} 100.53`}
                      style={{ transition: 'stroke-dasharray 1s ease' }}
                    />
                  </svg>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="glass-card rounded-2xl overflow-hidden animate-fade-in-up" style={{ animationDelay: '200ms' }}>
        <div className="p-5 sm:p-6 border-b border-slate-200/50 dark:border-slate-700/50 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Recent Activity</h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Today's attendance scans</p>
          </div>
          <Link
            to="/attendance"
            className="text-xs font-semibold text-indigo-500 hover:text-indigo-400 flex items-center gap-1 transition-colors"
          >
            View All <ArrowRight size={14} />
          </Link>
        </div>
        <div>
          {loading ? (
            <div className="p-6 space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 animate-pulse">
                  <div className="w-10 h-10 bg-slate-200 dark:bg-slate-700 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <div className="w-32 h-3 bg-slate-200 dark:bg-slate-700 rounded" />
                    <div className="w-20 h-2 bg-slate-200 dark:bg-slate-700 rounded" />
                  </div>
                  <div className="w-16 h-6 bg-slate-200 dark:bg-slate-700 rounded-full" />
                </div>
              ))}
            </div>
          ) : recentAttendance.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
                <Clock size={28} className="text-slate-300 dark:text-slate-600" />
              </div>
              <p className="text-slate-500 dark:text-slate-400 font-medium">No attendance recorded yet today.</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Start scanning to see activity here.</p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800/50">
              {recentAttendance.map((record, i) => (
                <li
                  key={record.id}
                  className="flex items-center justify-between p-4 sm:px-6 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
                  style={{ animationDelay: `${i * 50}ms` }}
                >
                  <div className="flex items-center gap-3 sm:gap-4">
                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center shadow-md shadow-indigo-500/20">
                      <span className="text-white font-semibold text-sm">
                        {record.student_name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">{record.student_name}</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                        Marked present via Scanner
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono font-medium text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-full">
                      {record.time.substring(0, 5)}
                    </span>
                    <span className="text-xs text-slate-400 dark:text-slate-500 hidden sm:inline">
                      {getTimeAgo(record.time)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
