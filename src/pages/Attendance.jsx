import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Search, Calendar, Download, Trash2, CheckCircle2, Clock, FileSpreadsheet } from 'lucide-react';
import { useNotification } from '../components/NotificationProvider';
import * as XLSX from 'xlsx';

export default function Attendance() {
  const { notify } = useNotification();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0]);

  const [showCleanupConfirm, setShowCleanupConfirm] = useState(false);

  useEffect(() => {
    fetchAttendance();
  }, [dateFilter]);

  const fetchAttendance = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('attendance')
        .select('*')
        .order('time', { ascending: false });

      if (dateFilter) {
        query = query.eq('date', dateFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      setRecords(data || []);
    } catch (err) {
      console.error('Error fetching attendance:', err);
      notify({ type: 'error', title: 'Error', message: 'Failed to load attendance records.' });
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (records.length === 0) {
      notify({ type: 'warning', title: 'No Data', message: 'No records to export.' });
      return;
    }

    const exportData = records.map(record => ({
      'Student Name': record.student_name,
      'Date': record.date,
      'Time': record.time,
      'Status': record.status
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Attendance");
    XLSX.writeFile(wb, `Attendance_${dateFilter || 'All'}.xlsx`);
    notify({ type: 'success', title: 'Exported', message: `${records.length} records exported successfully.` });
  };

  const handleCleanup = async () => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const dateStr = thirtyDaysAgo.toISOString().split('T')[0];

    try {
      const { error } = await supabase
        .from('attendance')
        .delete()
        .lt('date', dateStr);
        
      if (error) throw error;
      notify({ type: 'success', title: 'Cleaned Up', message: 'Old records removed successfully.' });
      setShowCleanupConfirm(false);
      fetchAttendance();
    } catch (err) {
      console.error('Error cleaning up records:', err);
      notify({ type: 'error', title: 'Error', message: 'Failed to cleanup old records.' });
      setShowCleanupConfirm(false);
    }
  };

  const filteredRecords = records.filter(r => 
    r.student_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-5 sm:space-y-6 flex flex-col h-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-fade-in-up">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Attendance Records</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">View, filter, and export attendance history.</p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
          <button 
            onClick={handleExport}
            disabled={records.length === 0}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 rounded-xl text-sm font-semibold glass-card text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 h-10 px-4 transition-all disabled:opacity-50"
          >
            <Download size={15} />
            <span>Export</span>
          </button>
          
          {showCleanupConfirm ? (
            <div className="flex items-center gap-1.5 bg-red-500/5 border border-red-500/10 rounded-xl p-1">
              <span className="text-xs text-red-500 font-semibold px-2 hidden xs:inline">Delete older than 30 days?</span>
              <button
                onClick={handleCleanup}
                className="bg-red-500 hover:bg-red-600 text-white rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors"
              >
                Confirm
              </button>
              <button
                onClick={() => setShowCleanupConfirm(false)}
                className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button 
              onClick={() => setShowCleanupConfirm(true)}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 rounded-xl text-sm font-semibold bg-red-500/10 text-red-500 dark:text-red-400 hover:bg-red-500/20 h-10 px-4 transition-all"
              title="Delete records older than 30 days"
            >
              <Trash2 size={15} />
              <span>Cleanup</span>
            </button>
          )}
        </div>
      </div>

      {/* Summary Bar */}
      {!loading && (
        <div className="glass-card rounded-xl px-4 py-3 flex items-center gap-4 text-sm animate-fade-in-up" style={{ animationDelay: '50ms' }}>
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
            <FileSpreadsheet size={15} className="text-indigo-500" />
            <span className="font-medium">{filteredRecords.length} records</span>
          </div>
          <div className="w-px h-4 bg-slate-200 dark:bg-slate-700" />
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
            <Calendar size={15} className="text-indigo-500" />
            <span className="font-medium">
              {dateFilter ? new Date(dateFilter + 'T00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : 'All dates'}
            </span>
          </div>
        </div>
      )}
      
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input 
            type="text" 
            placeholder="Search student name..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 glass-input rounded-xl text-sm"
          />
        </div>
        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input 
            type="date" 
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="w-full sm:w-auto pl-10 pr-4 py-2.5 glass-input rounded-xl text-sm"
          />
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 glass-card rounded-2xl overflow-hidden flex flex-col animate-fade-in-up" style={{ animationDelay: '150ms' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 dark:text-slate-400 uppercase bg-slate-50/50 dark:bg-slate-800/30 border-b border-slate-200/50 dark:border-slate-700/50">
              <tr>
                <th className="px-5 sm:px-6 py-3.5 font-semibold">Student Name</th>
                <th className="px-5 sm:px-6 py-3.5 font-semibold">Date</th>
                <th className="px-5 sm:px-6 py-3.5 font-semibold">Time</th>
                <th className="px-5 sm:px-6 py-3.5 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
              {loading ? (
                [...Array(4)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-5 sm:px-6 py-4"><div className="w-32 h-4 bg-slate-200 dark:bg-slate-700 rounded" /></td>
                    <td className="px-5 sm:px-6 py-4"><div className="w-24 h-4 bg-slate-200 dark:bg-slate-700 rounded" /></td>
                    <td className="px-5 sm:px-6 py-4"><div className="w-16 h-4 bg-slate-200 dark:bg-slate-700 rounded" /></td>
                    <td className="px-5 sm:px-6 py-4"><div className="w-20 h-4 bg-slate-200 dark:bg-slate-700 rounded" /></td>
                  </tr>
                ))
              ) : filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                        <Calendar size={28} className="text-slate-300 dark:text-slate-600" />
                      </div>
                      <p className="text-slate-500 dark:text-slate-400 font-medium">No records found for this date.</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500">Try selecting a different date or search term.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredRecords.map((record, i) => (
                  <tr
                    key={record.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
                  >
                    <td className="px-5 sm:px-6 py-3.5">
                      <div className="font-medium text-slate-900 dark:text-white flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center shrink-0 shadow-sm">
                          <span className="text-white font-semibold text-xs">
                            {record.student_name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <span>{record.student_name}</span>
                      </div>
                    </td>
                    <td className="px-5 sm:px-6 py-3.5 text-slate-600 dark:text-slate-300 font-medium text-xs font-mono">{record.date}</td>
                    <td className="px-5 sm:px-6 py-3.5 text-slate-500 dark:text-slate-400 text-xs font-mono">{record.time.substring(0, 8)}</td>
                    <td className="px-5 sm:px-6 py-3.5">
                      <div className="inline-flex items-center gap-1.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2.5 py-1 rounded-full text-xs font-semibold border border-emerald-500/20">
                        <CheckCircle2 size={13} />
                        <span>{record.status}</span>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
