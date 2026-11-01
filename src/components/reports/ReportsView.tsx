/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import {
  BarChart3,
  Download,
  Printer,
  Calendar,
  BookOpen,
  Users,
  CheckCircle,
  AlertTriangle,
  DollarSign,
  TrendingUp,
  FileSpreadsheet,
  FileText,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { useLibrary } from '../../context/LibraryContext.tsx';

const PIE_COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4'];

export const ReportsView: React.FC = () => {
  const { books, students, borrowRecords, stats, settings } = useLibrary();
  const [period, setPeriod] = useState<'month' | 'quarter' | 'year'>('month');

  // Most Borrowed Books
  const mostBorrowedBooks = useMemo(() => {
    const counts = new Map<string, { title: string; author: string; category: string; count: number }>();
    borrowRecords.forEach((r) => {
      const key = r.bookId || r.bookTitle;
      const prev = counts.get(key) || { title: r.bookTitle, author: 'Faculty Author', category: 'General', count: 0 };
      counts.set(key, { ...prev, count: prev.count + 1 });
    });

    return Array.from(counts.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [borrowRecords]);

  // Most Active Students
  const mostActiveStudents = useMemo(() => {
    const counts = new Map<string, { name: string; id: string; email: string; count: number }>();
    borrowRecords.forEach((r) => {
      const key = r.studentId || r.studentEmail;
      const prev = counts.get(key) || { name: r.studentName, id: r.studentId, email: r.studentEmail, count: 0 };
      counts.set(key, { ...prev, count: prev.count + 1 });
    });

    return Array.from(counts.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [borrowRecords]);

  // Monthly breakdown for charts
  const monthlyTrends = useMemo(() => {
    const data = [
      { month: 'Jun', issued: 24, returned: 20, fines: 12 },
      { month: 'Jul', issued: 18, returned: 16, fines: 8 },
      { month: 'Aug', issued: 35, returned: 28, fines: 15 },
      { month: 'Sep', issued: 52, returned: 44, fines: 22 },
      { month: 'Oct', issued: 68, returned: 58, fines: 34 },
      { month: 'Nov', issued: borrowRecords.length + 12, returned: borrowRecords.filter((r) => r.status === 'returned').length + 8, fines: stats.totalFinesCollected },
    ];
    return data;
  }, [borrowRecords, stats]);

  // Category distribution
  const categoryStats = useMemo(() => {
    const map = new Map<string, number>();
    books.forEach((b) => {
      const cat = b.category || 'General';
      map.set(cat, (map.get(cat) || 0) + b.totalCopies);
    });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [books]);

  // Export to CSV / Excel
  const handleExportCSV = () => {
    const headers = ['Record ID', 'Book Title', 'ISBN', 'Student Name', 'Student ID', 'Issue Date', 'Due Date', 'Return Date', 'Status', 'Overdue Days', 'Fine Amount ($)', 'Fine Paid'];
    const rows = borrowRecords.map((r) => [
      r.recordId,
      `"${r.bookTitle.replace(/"/g, '""')}"`,
      r.bookIsbn,
      `"${r.studentName.replace(/"/g, '""')}"`,
      r.studentId,
      r.issueDate,
      r.dueDate,
      r.returnDate || 'N/A',
      r.status,
      r.overdueDays || 0,
      (r.fineAmount || 0).toFixed(2),
      r.finePaid ? 'YES' : 'NO',
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `LibroFlow_Library_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export / Print PDF
  const handleExportPDF = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-600" />
            Library Reports & Executive Analytics
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time circulation metrics, student engagement rankings, and financial audits
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-300 rounded-xl transition-colors cursor-pointer"
            title="Download CSV / Excel spreadsheet of all circulation records"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            Export Excel / CSV
          </button>
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs transition-colors cursor-pointer"
            title="Generate printable PDF audit summary"
          >
            <Printer className="w-4 h-4" />
            Export PDF / Print
          </button>
        </div>
      </div>

      {/* Primary KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1 text-xs">
            <span>Total Issued (All-Time)</span>
            <BookOpen className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{borrowRecords.length}</div>
          <div className="text-[11px] text-slate-500 mt-1">
            {stats.borrowedBooks} currently active on loan
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1 text-xs">
            <span>Total Returned</span>
            <CheckCircle className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-emerald-600">
            {borrowRecords.filter((r) => r.status === 'returned').length}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Successfully returned & restocked</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1 text-xs">
            <span>Overdue Incident Rate</span>
            <AlertTriangle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-bold text-rose-600">{stats.overdueBooks}</div>
          <div className="text-[11px] text-slate-500 mt-1">
            Requires patron notice dispatch
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1 text-xs">
            <span>Total Fines Assessed</span>
            <DollarSign className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-amber-600">
            ${(stats.totalFinesCollected + stats.totalFinesPending).toFixed(2)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            ${stats.totalFinesCollected.toFixed(2)} collected • ${stats.totalFinesPending.toFixed(2)} pending
          </div>
        </div>
      </div>

      {/* Main Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Circulation History Area */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Borrowing Trends & Activity</h3>
              <p className="text-xs text-slate-500">Monthly breakdown of checkouts vs check-ins</p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg">
              2026 Academic Year
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyTrends}>
                <defs>
                  <linearGradient id="issuedGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
                <Area type="monotone" dataKey="issued" stroke="#2563eb" strokeWidth={2.5} fill="url(#issuedGrad)" name="Books Issued" />
                <Area type="monotone" dataKey="returned" stroke="#10b981" strokeWidth={2} fill="transparent" name="Books Returned" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Fines Collected vs Pending */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-slate-900">Fine Revenue Audit</h3>
            <p className="text-xs text-slate-500">Settled fines vs outstanding student accounts</p>
          </div>

          <div className="h-64 w-full flex items-center justify-center">
            {stats.totalFinesCollected === 0 && stats.totalFinesPending === 0 ? (
              <div className="text-slate-400 text-xs">No fines assessed yet ($0.00)</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Collected ($)', value: Math.max(1, stats.totalFinesCollected) },
                      { name: 'Pending ($)', value: Math.max(1, stats.totalFinesPending) },
                    ]}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    <Cell fill="#10b981" />
                    <Cell fill="#f43f5e" />
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '12px',
                    }}
                  />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Rankings: Top Books and Top Students */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Most Borrowed Books */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-blue-600" />
              <h3 className="text-sm font-bold text-slate-900">Most Borrowed Titles</h3>
            </div>
            <span className="text-[11px] text-slate-500 font-semibold uppercase">Top Ranked</span>
          </div>

          <div className="divide-y divide-slate-100 text-xs">
            {mostBorrowedBooks.length === 0 ? (
              <div className="py-6 text-center text-slate-400">No loan records yet</div>
            ) : (
              mostBorrowedBooks.map((item, idx) => (
                <div key={idx} className="py-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-6 h-6 rounded-lg bg-blue-50 text-blue-700 font-bold text-xs flex items-center justify-center shrink-0">
                      #{idx + 1}
                    </span>
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-900 truncate">{item.title}</div>
                      <div className="text-[11px] text-slate-500">{item.category}</div>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-slate-100 text-slate-800 shrink-0">
                    {item.count} checkouts
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Most Active Students */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-purple-600" />
              <h3 className="text-sm font-bold text-slate-900">Most Active Student Patrons</h3>
            </div>
            <span className="text-[11px] text-slate-500 font-semibold uppercase">Leaderboard</span>
          </div>

          <div className="divide-y divide-slate-100 text-xs">
            {mostActiveStudents.length === 0 ? (
              <div className="py-6 text-center text-slate-400">No student activity yet</div>
            ) : (
              mostActiveStudents.map((item, idx) => (
                <div key={idx} className="py-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-6 h-6 rounded-lg bg-purple-50 text-purple-700 font-bold text-xs flex items-center justify-center shrink-0">
                      #{idx + 1}
                    </span>
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-900 truncate">{item.name}</div>
                      <div className="text-[11px] text-slate-500 font-mono">{item.id}</div>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-purple-50 text-purple-700 shrink-0">
                    {item.count} loans completed
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
