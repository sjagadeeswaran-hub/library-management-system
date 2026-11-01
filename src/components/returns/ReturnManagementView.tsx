/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  BookDown,
  Search,
  CheckCircle,
  AlertTriangle,
  Clock,
  DollarSign,
  Calendar,
  X,
  CreditCard,
  Archive,
  ArrowRight,
  Filter,
} from 'lucide-react';
import { useLibrary } from '../../context/LibraryContext.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import { BorrowRecord } from '../../types/library.ts';

export const ReturnManagementView: React.FC = () => {
  const { borrowRecords, returnBook, payFine, settings } = useLibrary();
  const { userProfile, currentUser, signInWithGoogle } = useAuth();

  const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'borrowed' | 'overdue'>('all');

  // Modal for returning
  const [selectedRecordForReturn, setSelectedRecordForReturn] = useState<BorrowRecord | null>(null);
  const [returnDate, setReturnDate] = useState(new Date().toISOString().split('T')[0]);
  const [markFinePaid, setMarkFinePaid] = useState(true);
  const [returnNotes, setReturnNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Computed overdue and fine for the modal
  const returnCalculation = useMemo(() => {
    if (!selectedRecordForReturn) return { overdueDays: 0, fine: 0 };
    const dueObj = new Date(selectedRecordForReturn.dueDate);
    const returnObj = new Date(returnDate);

    if (returnObj > dueObj) {
      const diffTime = returnObj.getTime() - dueObj.getTime();
      const overdueDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const fineRate = selectedRecordForReturn.fineRatePerDay || settings.fineRatePerDay;
      const fine = overdueDays * fineRate;
      return { overdueDays, fine };
    }
    return { overdueDays: 0, fine: 0 };
  }, [selectedRecordForReturn, returnDate, settings.fineRatePerDay]);

  // Active records
  const activeRecords = useMemo(() => {
    return borrowRecords.filter((r) => r.status === 'borrowed' || r.status === 'overdue');
  }, [borrowRecords]);

  // History records
  const historyRecords = useMemo(() => {
    return borrowRecords.filter((r) => r.status === 'returned');
  }, [borrowRecords]);

  // Filtered by search & status
  const currentList = useMemo(() => {
    const source = activeTab === 'active' ? activeRecords : historyRecords;
    return source.filter((r) => {
      const q = searchTerm.toLowerCase();
      const matchesSearch =
        r.bookTitle.toLowerCase().includes(q) ||
        r.studentName.toLowerCase().includes(q) ||
        r.studentId.toLowerCase().includes(q) ||
        r.bookIsbn.toLowerCase().includes(q) ||
        r.recordId.toLowerCase().includes(q);

      let matchesStatus = true;
      if (activeTab === 'active' && statusFilter !== 'all') {
        matchesStatus = r.status === statusFilter;
      }

      return matchesSearch && matchesStatus;
    });
  }, [activeTab, activeRecords, historyRecords, searchTerm, statusFilter]);

  if (!currentUser) {
    return (
      <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center max-w-lg mx-auto my-12 shadow-xs">
        <Clock className="w-12 h-12 text-blue-600 mx-auto mb-3" />
        <h3 className="text-base font-bold text-slate-900">Circulation Records Protected</h3>
        <p className="text-xs text-slate-500 mt-1 mb-5 leading-relaxed">
          Active borrowing records and fine management require authentication. Please sign in with your staff Google account (e.g. sjagadees59@gmail.com).
        </p>
        <button
          onClick={signInWithGoogle}
          className="px-6 py-2.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs transition-colors cursor-pointer"
        >
          Sign In with Google
        </button>
      </div>
    );
  }

  const handleOpenReturnModal = (record: BorrowRecord) => {
    setSelectedRecordForReturn(record);
    setReturnDate(new Date().toISOString().split('T')[0]);
    setMarkFinePaid(true);
    setReturnNotes('');
  };

  const handleConfirmReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecordForReturn) return;

    try {
      setIsSubmitting(true);
      await returnBook({
        recordId: selectedRecordForReturn.id,
        returnDate,
        markFinePaid,
        notes: returnNotes,
      });
      setSelectedRecordForReturn(null);
    } catch (e) {
      // handled
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <BookDown className="w-5 h-5 text-blue-600" />
            Book Returns & Fines Processing
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Process returned library materials, calculate overdue days, and settle student fines
          </p>
        </div>

        {/* Tab switch */}
        <div className="flex items-center gap-1 bg-slate-200/80 p-1 rounded-xl text-xs font-semibold">
          <button
            onClick={() => setActiveTab('active')}
            className={`px-3.5 py-1.5 rounded-lg transition-colors cursor-pointer ${
              activeTab === 'active' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Active Loans ({activeRecords.length})
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-3.5 py-1.5 rounded-lg transition-colors cursor-pointer ${
              activeTab === 'history' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Return History ({historyRecords.length})
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by Student Name, ID, Book Title, or ISBN..."
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>

        {activeTab === 'active' && (
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-medium w-full sm:w-auto shrink-0">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                statusFilter === 'all' ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Loans
            </button>
            <button
              onClick={() => setStatusFilter('borrowed')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                statusFilter === 'borrowed' ? 'bg-white text-blue-700 shadow-2xs font-semibold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              On Time
            </button>
            <button
              onClick={() => setStatusFilter('overdue')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                statusFilter === 'overdue' ? 'bg-white text-rose-700 shadow-2xs font-semibold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Overdue
            </button>
          </div>
        )}
      </div>

      {/* Table Display */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-700 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Borrow Record ID</th>
                <th className="py-3 px-4">Book Title</th>
                <th className="py-3 px-4">Student Patron</th>
                <th className="py-3 px-4">Issued On</th>
                <th className="py-3 px-4">Due Date</th>
                {activeTab === 'history' && <th className="py-3 px-4">Returned On</th>}
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Fine Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {currentList.length === 0 ? (
                <tr>
                  <td colSpan={activeTab === 'history' ? 9 : 8} className="py-12 text-center text-slate-400">
                    No borrowing records found matching your filters.
                  </td>
                </tr>
              ) : (
                currentList.map((rec) => {
                  const isOverdue = rec.status === 'overdue';
                  const isReturned = rec.status === 'returned';

                  return (
                    <tr key={rec.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-medium text-slate-700">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                          {rec.recordId}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900 truncate max-w-[200px]" title={rec.bookTitle}>
                          {rec.bookTitle}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">ISBN: {rec.bookIsbn}</div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-medium text-slate-800">{rec.studentName}</div>
                        <div className="text-[11px] text-slate-500 font-mono">{rec.studentId}</div>
                      </td>

                      <td className="py-3.5 px-4 text-slate-600">{rec.issueDate}</td>

                      <td className="py-3.5 px-4">
                        <span className={isOverdue ? 'font-bold text-rose-600' : 'text-slate-700'}>{rec.dueDate}</span>
                      </td>

                      {activeTab === 'history' && (
                        <td className="py-3.5 px-4 font-medium text-slate-700">{rec.returnDate || 'Returned'}</td>
                      )}

                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`px-2 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-wider ${
                            isReturned
                              ? 'bg-emerald-100 text-emerald-700'
                              : isOverdue
                              ? 'bg-rose-100 text-rose-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}
                        >
                          {isReturned ? 'Returned' : isOverdue ? `${rec.overdueDays || 1}d Overdue` : 'Borrowed'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        {rec.fineAmount > 0 ? (
                          <div className="inline-flex flex-col items-center">
                            <span
                              className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                                rec.finePaid ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                              }`}
                            >
                              ${rec.fineAmount.toFixed(2)} ({rec.finePaid ? 'Paid' : 'Unpaid'})
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px]">—</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        {activeTab === 'active' ? (
                          <button
                            onClick={() => handleOpenReturnModal(rec)}
                            className="px-3 py-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-2xs transition-colors flex items-center gap-1.5 ml-auto cursor-pointer"
                          >
                            <BookDown className="w-3.5 h-3.5" />
                            Return Book
                          </button>
                        ) : (
                          !rec.finePaid && rec.fineAmount > 0 ? (
                            <button
                              onClick={() => payFine(rec.id)}
                              className="px-2.5 py-1 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors cursor-pointer"
                            >
                              Pay Fine
                            </button>
                          ) : (
                            <span className="text-[11px] text-slate-400">Completed</span>
                          )
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Return Modal */}
      {selectedRecordForReturn && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-start justify-between pb-4 border-b border-slate-100">
              <div>
                <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-blue-50 text-blue-700 rounded-md">
                  {selectedRecordForReturn.recordId}
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-1">Process Book Return</h3>
                <p className="text-xs text-slate-500">Record check-in and reconcile overdue fines</p>
              </div>
              <button
                onClick={() => setSelectedRecordForReturn(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmReturn} className="mt-4 space-y-4 text-xs">
              {/* Book & Student Summary */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">Book Title:</span>
                  <span className="font-semibold text-slate-800 text-right truncate max-w-[240px]">
                    {selectedRecordForReturn.bookTitle}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Student Patron:</span>
                  <span className="font-semibold text-slate-800">
                    {selectedRecordForReturn.studentName} ({selectedRecordForReturn.studentId})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Due Date:</span>
                  <span className="font-mono font-semibold text-slate-800">{selectedRecordForReturn.dueDate}</span>
                </div>
              </div>

              {/* Return Date Input */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Return Date</label>
                <input
                  type="date"
                  required
                  value={returnDate}
                  onChange={(e) => setReturnDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              {/* Overdue Calculation Banner */}
              {returnCalculation.overdueDays > 0 ? (
                <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-sm">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    Overdue Notice ({returnCalculation.overdueDays} Days Late)
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span>Rate: ${settings.fineRatePerDay.toFixed(2)}/day × {returnCalculation.overdueDays} days</span>
                    <span className="font-bold text-sm text-rose-700">Total Fine: ${returnCalculation.fine.toFixed(2)}</span>
                  </div>

                  {/* Payment toggle */}
                  <div className="pt-2 border-t border-rose-200 flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={markFinePaid}
                        onChange={(e) => setMarkFinePaid(e.target.checked)}
                        className="rounded-sm text-blue-600 focus:ring-blue-500 w-4 h-4"
                      />
                      <span className="font-semibold text-rose-900">Fine Paid at Desk Now</span>
                    </label>
                    <span className="text-[11px] text-rose-700">
                      {markFinePaid ? 'Settled on receipt' : 'Add to student balance'}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <span className="font-medium">Returned on time. No overdue fines accrued.</span>
                </div>
              )}

              {/* Return Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Return Notes (Optional)</label>
                <input
                  type="text"
                  value={returnNotes}
                  onChange={(e) => setReturnNotes(e.target.value)}
                  placeholder="e.g. Book in pristine condition, minor cover wear..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              {/* Actions */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedRecordForReturn(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  {isSubmitting ? 'Processing...' : 'Confirm Return & Restock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
