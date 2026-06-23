import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Search, Calendar, Download, Trash2, CheckCircle2 } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function Attendance() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0]);

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
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (records.length === 0) return;

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
  };

  const handleCleanup = async () => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const dateStr = thirtyDaysAgo.toISOString().split('T')[0];

    if (!window.confirm(`Are you sure you want to delete all attendance records older than ${dateStr}?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('attendance')
        .delete()
        .lt('date', dateStr);
        
      if (error) throw error;
      alert('Old records cleaned up successfully.');
      fetchAttendance();
    } catch (err) {
      console.error('Error cleaning up records:', err);
      alert('Failed to cleanup old records.');
    }
  };

  const filteredRecords = records.filter(r => 
    r.student_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 flex flex-col h-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white">Attendance Records</h2>
          <p className="text-slate-400 mt-1">View, filter, and export attendance history.</p>
        </div>
        <div className="flex items-center space-x-3 w-full sm:w-auto">
          <button 
            onClick={handleExport}
            disabled={records.length === 0}
            className="flex-1 sm:flex-none inline-flex items-center justify-center space-x-2 rounded-xl text-sm font-medium border border-slate-700 bg-slate-800 text-white hover:bg-slate-700 h-11 px-4 transition-colors disabled:opacity-50"
          >
            <Download size={16} />
            <span>Export CSV</span>
          </button>
          <button 
            onClick={handleCleanup}
            className="flex-1 sm:flex-none inline-flex items-center justify-center space-x-2 rounded-xl text-sm font-medium bg-red-500/10 text-red-400 hover:bg-red-500/20 h-11 px-4 transition-colors"
            title="Delete records older than 30 days"
          >
            <Trash2 size={16} />
            <span>Cleanup</span>
          </button>
        </div>
      </div>
      
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 p-1">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
          <input 
            type="text" 
            placeholder="Search student name..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
          <input 
            type="date" 
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="w-full sm:w-auto pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden shadow-sm flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-400 uppercase bg-slate-800/50 border-b border-slate-800">
              <tr>
                <th className="px-6 py-4 font-medium">Student Name</th>
                <th className="px-6 py-4 font-medium">Date</th>
                <th className="px-6 py-4 font-medium">Time</th>
                <th className="px-6 py-4 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan="4" className="px-6 py-8 text-center text-slate-500">Loading records...</td>
                </tr>
              ) : filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-500 space-y-3">
                      <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center">
                        <Calendar size={28} className="text-slate-600" />
                      </div>
                      <p>No attendance records found for this date.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredRecords.map(record => (
                  <tr key={record.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-white flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 shrink-0">
                          <span className="text-indigo-400 font-medium text-xs">
                            {record.student_name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <span>{record.student_name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-300 font-medium">{record.date}</td>
                    <td className="px-6 py-4 text-slate-400">{record.time.substring(0, 8)}</td>
                    <td className="px-6 py-4">
                      <div className="inline-flex items-center space-x-1.5 bg-green-500/10 text-green-400 px-2.5 py-1 rounded-md text-xs font-medium border border-green-500/20">
                        <CheckCircle2 size={14} />
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
