/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  BookUp2,
  Users,
  BookOpen,
  Calendar,
  AlertCircle,
  CheckCircle,
  Search,
  Sparkles,
  Clock,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import { useLibrary } from '../../context/LibraryContext.tsx';
import { useAuth } from '../../context/AuthContext.tsx';

export const IssueBookView: React.FC = () => {
  const { books, students, borrowRecords, issueBook, settings } = useLibrary();
  const { userProfile, currentUser, signInWithGoogle } = useAuth();

  // Selection states
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [selectedBookId, setSelectedBookId] = useState<string>('');

  // Searches
  const [studentSearch, setStudentSearch] = useState('');
  const [bookSearch, setBookSearch] = useState('');

  // Dates
  const todayStr = new Date().toISOString().split('T')[0];
  const [issueDate, setIssueDate] = useState(todayStr);

  // Default due date = today + settings.maxBorrowDays
  const getDefaultDueDate = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
  };

  const [dueDate, setDueDate] = useState(() => getDefaultDueDate(settings.maxBorrowDays || 14));
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Available books
  const availableBooks = useMemo(() => {
    return books.filter((b) => b.availableCopies > 0);
  }, [books]);

  // Selected entities
  const selectedStudent = useMemo(() => {
    return students.find((s) => s.studentId === selectedStudentId || s.id === selectedStudentId);
  }, [students, selectedStudentId]);

  const selectedBook = useMemo(() => {
    return books.find((b) => b.bookId === selectedBookId || b.id === selectedBookId);
  }, [books, selectedBookId]);

  // Filtered lists
  const filteredStudents = useMemo(() => {
    const q = studentSearch.toLowerCase();
    return students.filter(
      (s) => s.fullName.toLowerCase().includes(q) || s.studentId.toLowerCase().includes(q) || s.email.toLowerCase().includes(q)
    );
  }, [students, studentSearch]);

  const filteredBooks = useMemo(() => {
    const q = bookSearch.toLowerCase();
    return books.filter(
      (b) => b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q) || b.bookId.toLowerCase().includes(q) || b.isbn.toLowerCase().includes(q)
    );
  }, [books, bookSearch]);

  // Validation
  const studentEligibility = useMemo(() => {
    if (!selectedStudent) return { eligible: false, reason: 'Select a student' };
    if (selectedStudent.status !== 'active') {
      return { eligible: false, reason: `Student account is ${selectedStudent.status}` };
    }
    if (selectedStudent.activeBorrowCount >= settings.maxBooksPerStudent) {
      return { eligible: false, reason: `Student reached max borrow limit (${settings.maxBooksPerStudent} books)` };
    }
    if (selectedStudent.totalFinesUnpaid > 10) {
      return { eligible: false, reason: `Unpaid fine balance ($${selectedStudent.totalFinesUnpaid.toFixed(2)}) must be settled` };
    }
    return { eligible: true, reason: 'Eligible for checkout' };
  }, [selectedStudent, settings.maxBooksPerStudent]);

  const bookAvailability = useMemo(() => {
    if (!selectedBook) return { available: false, reason: 'Select a book' };
    if (selectedBook.availableCopies <= 0) {
      return { available: false, reason: 'All copies are currently checked out' };
    }
    return { available: true, reason: `${selectedBook.availableCopies} copies available on shelf` };
  }, [selectedBook]);

  const handleApplyPreset = (days: number) => {
    setDueDate(getDefaultDueDate(days));
  };

  const handleIssueSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent || !selectedBook) return;
    if (!studentEligibility.eligible || !bookAvailability.available) return;

    try {
      setIsSubmitting(true);
      await issueBook({
        studentId: selectedStudent.studentId,
        bookId: selectedBook.bookId,
        issueDate,
        dueDate,
        notes,
      });

      // Reset
      setSelectedBookId('');
      setNotes('');
      setDueDate(getDefaultDueDate(settings.maxBorrowDays || 14));
    } catch (err) {
      // handled
    } finally {
      setIsSubmitting(false);
    }
  };

  // Recent 5 active borrow records
  const activeRecords = useMemo(() => {
    return borrowRecords.filter((r) => r.status === 'borrowed' || r.status === 'overdue').slice(0, 6);
  }, [borrowRecords]);

  if (!currentUser) {
    return (
      <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center max-w-lg mx-auto my-12 shadow-xs">
        <ShieldAlert className="w-12 h-12 text-blue-600 mx-auto mb-3" />
        <h3 className="text-base font-bold text-slate-900">Staff Authentication Required</h3>
        <p className="text-xs text-slate-500 mt-1 mb-5 leading-relaxed">
          Issuing books to students requires authenticated circulation privileges. Please sign in with your staff Google account (e.g. sjagadees59@gmail.com).
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <BookUp2 className="w-5 h-5 text-blue-600" />
          Book Checkout & Issuance Desk
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Select student and catalog book to issue loan with automated inventory and due-date tracking
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Issuance Form */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-6">
          <form onSubmit={handleIssueSubmit} className="space-y-6">
            {/* Step 1: Select Student */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center justify-between">
                <span>1. Select Student Patron *</span>
                {selectedStudent && (
                  <span
                    className={`text-[11px] font-semibold ${
                      studentEligibility.eligible ? 'text-emerald-600' : 'text-rose-600'
                    }`}
                  >
                    {studentEligibility.reason}
                  </span>
                )}
              </label>

              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  placeholder="Type name, student ID, or email..."
                  className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              {/* Student picker */}
              <div className="max-h-36 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-xl">
                {filteredStudents.length === 0 ? (
                  <div className="p-3 text-center text-slate-400 text-xs">No matching students found</div>
                ) : (
                  filteredStudents.slice(0, 8).map((stu) => {
                    const isSelected = selectedStudentId === stu.studentId || selectedStudentId === stu.id;
                    const atLimit = stu.activeBorrowCount >= settings.maxBooksPerStudent;

                    return (
                      <div
                        key={stu.id}
                        onClick={() => setSelectedStudentId(stu.studentId)}
                        className={`p-2.5 text-xs flex items-center justify-between transition-colors cursor-pointer ${
                          isSelected ? 'bg-blue-50 border-l-4 border-blue-600' : 'hover:bg-slate-50'
                        }`}
                      >
                        <div>
                          <div className="font-semibold text-slate-900">{stu.fullName}</div>
                          <div className="text-[11px] text-slate-500 font-mono">
                            {stu.studentId} • {stu.department}
                          </div>
                        </div>

                        <div className="text-right flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 text-[10px] font-bold rounded-md ${
                              atLimit ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {stu.activeBorrowCount}/{settings.maxBooksPerStudent} books
                          </span>
                          {isSelected && <CheckCircle className="w-4 h-4 text-blue-600" />}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Step 2: Select Available Book */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center justify-between">
                <span>2. Select Catalog Book *</span>
                {selectedBook && (
                  <span
                    className={`text-[11px] font-semibold ${
                      bookAvailability.available ? 'text-emerald-600' : 'text-rose-600'
                    }`}
                  >
                    {bookAvailability.reason}
                  </span>
                )}
              </label>

              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={bookSearch}
                  onChange={(e) => setBookSearch(e.target.value)}
                  placeholder="Search book by Title, Author, ISBN, or Catalog ID..."
                  className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              {/* Book picker */}
              <div className="max-h-40 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-xl">
                {filteredBooks.length === 0 ? (
                  <div className="p-3 text-center text-slate-400 text-xs">No matching books</div>
                ) : (
                  filteredBooks.slice(0, 10).map((b) => {
                    const isSelected = selectedBookId === b.bookId || selectedBookId === b.id;
                    const isAvailable = b.availableCopies > 0;

                    return (
                      <div
                        key={b.id}
                        onClick={() => isAvailable && setSelectedBookId(b.bookId)}
                        className={`p-2.5 text-xs flex items-center justify-between transition-colors ${
                          !isAvailable
                            ? 'opacity-50 bg-slate-50 cursor-not-allowed'
                            : isSelected
                            ? 'bg-blue-50 border-l-4 border-blue-600 cursor-pointer'
                            : 'hover:bg-slate-50 cursor-pointer'
                        }`}
                      >
                        <div className="min-w-0 pr-2">
                          <div className="font-semibold text-slate-900 truncate">{b.title}</div>
                          <div className="text-[11px] text-slate-500">
                            by {b.author} • <span className="font-mono">{b.bookId}</span>
                          </div>
                        </div>

                        <div className="text-right shrink-0 flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 text-[10px] font-bold rounded-md ${
                              isAvailable ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                            }`}
                          >
                            {isAvailable ? `${b.availableCopies} on shelf` : 'Unavailable'}
                          </span>
                          {isSelected && <CheckCircle className="w-4 h-4 text-blue-600" />}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Step 3: Dates & Durations */}
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                3. Issue Period & Due Date
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Issue Date</label>
                  <input
                    type="date"
                    required
                    value={issueDate}
                    onChange={(e) => setIssueDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Due Date</label>
                  <input
                    type="date"
                    required
                    value={dueDate}
                    min={issueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Quick Presets */}
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-400 text-[11px] font-medium">Quick Presets:</span>
                <button
                  type="button"
                  onClick={() => handleApplyPreset(7)}
                  className="px-2.5 py-1 text-xs bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700 font-medium transition-colors cursor-pointer"
                >
                  7 Days (1 Wk)
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset(14)}
                  className="px-2.5 py-1 text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium rounded-lg transition-colors cursor-pointer"
                >
                  14 Days (Standard)
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset(30)}
                  className="px-2.5 py-1 text-xs bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700 font-medium transition-colors cursor-pointer"
                >
                  30 Days (Semester)
                </button>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Circulation Notes (Optional)</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Special research assignment, thesis loan, or condition notes..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Submit Action */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <div className="text-xs text-slate-500">
                Staff Issuer: <strong className="text-slate-800">{userProfile?.displayName || 'Library Staff'}</strong>
              </div>

              <button
                type="submit"
                disabled={!selectedStudent || !selectedBook || !studentEligibility.eligible || !bookAvailability.available || isSubmitting}
                className="px-6 py-2.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer"
              >
                <BookUp2 className="w-4 h-4" />
                {isSubmitting ? 'Recording Issue...' : 'Confirm Book Issue'}
              </button>
            </div>
          </form>
        </div>

        {/* Loan Summary & Active Records Preview */}
        <div className="space-y-6">
          {/* Checkout Preview Summary Card */}
          <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-md border border-slate-800">
            <h3 className="text-sm font-bold flex items-center gap-2 text-blue-400 mb-3">
              <Sparkles className="w-4 h-4" />
              Checkout Verification
            </h3>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/80">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Student Selected</span>
                {selectedStudent ? (
                  <div className="mt-1">
                    <div className="font-bold text-white text-sm">{selectedStudent.fullName}</div>
                    <div className="text-[11px] text-slate-300 font-mono mt-0.5">{selectedStudent.studentId}</div>
                    <div className="text-[10px] text-blue-300 mt-1">
                      Loans: {selectedStudent.activeBorrowCount}/{settings.maxBooksPerStudent}
                    </div>
                  </div>
                ) : (
                  <span className="text-slate-500 italic">No student selected</span>
                )}
              </div>

              <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/80">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Book Selected</span>
                {selectedBook ? (
                  <div className="mt-1">
                    <div className="font-bold text-white text-sm line-clamp-1">{selectedBook.title}</div>
                    <div className="text-[11px] text-slate-300 mt-0.5">by {selectedBook.author}</div>
                    <div className="text-[10px] text-emerald-300 mt-1">
                      Shelf: {selectedBook.shelfLocation} • {selectedBook.availableCopies} available
                    </div>
                  </div>
                ) : (
                  <span className="text-slate-500 italic">No book selected</span>
                )}
              </div>

              <div className="p-3 rounded-xl bg-blue-950/60 border border-blue-900/60 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-blue-300 block">Due Return Date</span>
                  <span className="font-bold text-white text-sm">{dueDate}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-blue-300 block">Fine Rate</span>
                  <span className="font-bold text-white">${settings.fineRatePerDay.toFixed(2)} / day</span>
                </div>
              </div>
            </div>
          </div>

          {/* Active Borrow Records List */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
            <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center justify-between">
              <span>Active Loans Queue</span>
              <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                {activeRecords.length} Active
              </span>
            </h3>

            <div className="divide-y divide-slate-100 text-xs">
              {activeRecords.length === 0 ? (
                <div className="py-6 text-center text-slate-400">No active loans</div>
              ) : (
                activeRecords.map((r) => {
                  const isOverdue = r.status === 'overdue';
                  return (
                    <div key={r.id} className="py-2.5 flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-800 truncate">{r.bookTitle}</div>
                        <div className="text-[11px] text-slate-500 truncate">{r.studentName}</div>
                        <div className="text-[10px] text-slate-400">Due: {r.dueDate}</div>
                      </div>
                      <span
                        className={`px-2 py-0.5 text-[10px] font-bold rounded-md shrink-0 uppercase tracking-wider ${
                          isOverdue ? 'bg-rose-100 text-rose-700' : 'bg-blue-100 text-blue-700'
                        }`}
                      >
                        {isOverdue ? 'Overdue' : 'Active'}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
