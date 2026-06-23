import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Users, UserCheck, Calendar } from 'lucide-react';

export default function Dashboard() {
  const [stats, setStats] = useState({ totalStudents: 0, presentToday: 0 });
  const [loading, setLoading] = useState(true);
  const [recentAttendance, setRecentAttendance] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Get total students
      const { count: studentCount } = await supabase
        .from('students')
        .select('*', { count: 'exact', head: true });

      // Get present today
      const today = new Date().toISOString().split('T')[0];
      const { count: presentCount } = await supabase
        .from('attendance')
        .select('*', { count: 'exact', head: true })
        .eq('date', today);

      // Get recent attendance
      const { data: recent } = await supabase
        .from('attendance')
        .select('id, student_name, time, status')
        .eq('date', today)
        .order('time', { ascending: false })
        .limit(5);

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

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-white">Dashboard</h2>
        <p className="text-slate-400 mt-1">Overview of today's attendance metrics.</p>
      </div>
      
      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-sm">
          <div className="flex flex-row items-center justify-between pb-4">
            <h3 className="tracking-tight text-sm font-medium text-slate-400">Total Students</h3>
            <Users className="text-indigo-400" size={20} />
          </div>
          <div className="text-3xl font-bold text-white">{loading ? '-' : stats.totalStudents}</div>
        </div>
        
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-sm">
          <div className="flex flex-row items-center justify-between pb-4">
            <h3 className="tracking-tight text-sm font-medium text-slate-400">Present Today</h3>
            <UserCheck className="text-green-400" size={20} />
          </div>
          <div className="text-3xl font-bold text-white">{loading ? '-' : stats.presentToday}</div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-sm">
          <div className="flex flex-row items-center justify-between pb-4">
            <h3 className="tracking-tight text-sm font-medium text-slate-400">Date</h3>
            <Calendar className="text-blue-400" size={20} />
          </div>
          <div className="text-2xl font-bold text-white mt-1">
            {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-800">
          <h3 className="text-lg font-medium text-white">Recent Attendance Scans</h3>
        </div>
        <div className="p-0">
          {loading ? (
            <div className="p-6 text-center text-slate-400 text-sm">Loading...</div>
          ) : recentAttendance.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-sm">
              No attendance recorded today yet.
            </div>
          ) : (
            <ul className="divide-y divide-slate-800">
              {recentAttendance.map((record) => (
                <li key={record.id} className="flex items-center justify-between p-6 hover:bg-slate-800/50 transition-colors">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 rounded-full bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                      <span className="text-indigo-400 font-medium text-sm">
                        {record.student_name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{record.student_name}</p>
                      <p className="text-xs text-slate-400">Marked present via Scanner</p>
                    </div>
                  </div>
                  <div className="text-sm text-slate-400 font-medium bg-slate-800 px-3 py-1 rounded-full">
                    {record.time.substring(0, 5)}
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
