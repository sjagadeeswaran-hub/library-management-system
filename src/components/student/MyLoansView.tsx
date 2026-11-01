/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import {
  BookOpen,
  Calendar,
  AlertTriangle,
  Clock,
  CheckCircle,
  DollarSign,
  ShieldAlert,
  HelpCircle,
} from 'lucide-react';
import { useLibrary } from '../../context/LibraryContext.tsx';
import { useAuth } from '../../context/AuthContext.tsx';

export const MyLoansView: React.FC = () => {
  const { borrowRecords, payFine, settings, books } = useLibrary();
  const { currentUser, userProfile } = useAuth();

  // Find loans belonging to current student or demo student Aiden Brooks
  const myLoans = useMemo(() => {
    const email = currentUser?.email || 'aiden.brooks@university.edu';
    const name = userProfile?.displayName || 'Aiden Brooks';

    const matches = borrowRecords.filter(
      (r) =>
        r.studentEmail.toLowerCase() === email.toLowerCase() ||
        r.studentName.toLowerCase().includes(name.toLowerCase()) ||
        r.studentId === 'STU-2024-001'
    );

    return matches;
  }, [borrowRecords, currentUser, userProfile]);

  const activeLoans = myLoans.filter((r) => r.status === 'borrowed' || r.status === 'overdue');
  const pastLoans = myLoans.filter((r) => r.status === 'returned');

  const unpaidFinesTotal = myLoans.reduce(
    (acc, r) => (!r.finePaid && r.fineAmount ? acc + r.fineAmount : acc),
    0
  );

  return (
    <div className="space-y-6">
      {/* Welcome banner */}
      <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white p-6 rounded-2xl shadow-md border border-blue-800">
        <h2 className="text-xl font-bold">My Student Library Account</h2>
        <p className="text-xs text-blue-200 mt-1">
          Review your currently checked out library books, due date deadlines, and settled transactions.
        </p>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-white/10 backdrop-blur-xs p-3 rounded-xl border border-white/10">
            <span className="text-[11px] text-blue-200 block">Active Checkouts</span>
            <span className="text-xl font-bold">{activeLoans.length} of {settings.maxBooksPerStudent} books</span>
          </div>

          <div className="bg-white/10 backdrop-blur-xs p-3 rounded-xl border border-white/10">
            <span className="text-[11px] text-blue-200 block">Overdue Books</span>
            <span className="text-xl font-bold text-rose-300">
              {activeLoans.filter((r) => r.status === 'overdue').length}
            </span>
          </div>

          <div className="bg-white/10 backdrop-blur-xs p-3 rounded-xl border border-white/10">
            <span className="text-[11px] text-blue-200 block">Unpaid Fines Balance</span>
            <span className={`text-xl font-bold ${unpaidFinesTotal > 0 ? 'text-amber-300' : 'text-emerald-300'}`}>
              ${unpaidFinesTotal.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* Currently Borrowed Books */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-900">Current Borrowed Books ({activeLoans.length})</h3>
          </div>
          <span className="text-xs text-slate-500">Max limit: {settings.maxBooksPerStudent} books</span>
        </div>

        <div className="divide-y divide-slate-100">
          {activeLoans.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              You do not have any active books checked out. Visit the catalog to find books!
            </div>
          ) : (
            activeLoans.map((loan) => {
              const isOverdue = loan.status === 'overdue';
              const dueObj = new Date(loan.dueDate);
              const nowObj = new Date();
              const diffDays = Math.ceil((dueObj.getTime() - nowObj.getTime()) / (1000 * 60 * 60 * 24));

              return (
                <div key={loan.id} className="p-4 hover:bg-slate-50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="space-y-1">
                    <div className="font-bold text-slate-900 text-sm">{loan.bookTitle}</div>
                    <div className="text-slate-500 flex flex-wrap items-center gap-2 text-[11px]">
                      <span>ISBN: <strong className="font-mono text-slate-700">{loan.bookIsbn}</strong></span>
                      <span>•</span>
                      <span>Borrowed: {loan.issueDate}</span>
                      <span>•</span>
                      <span>Due: <strong className={isOverdue ? 'text-rose-600' : 'text-slate-800'}>{loan.dueDate}</strong></span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-center">
                    {isOverdue ? (
                      <div className="text-right">
                        <span className="px-2.5 py-1 text-[10px] font-bold rounded-full bg-rose-100 text-rose-700 uppercase">
                          {loan.overdueDays || 1}d Overdue
                        </span>
                        <div className="text-[11px] font-bold text-rose-600 mt-1">
                          Fine: ${(loan.fineAmount || 0).toFixed(2)}
                        </div>
                      </div>
                    ) : (
                      <span className="px-2.5 py-1 text-[10px] font-bold rounded-full bg-blue-100 text-blue-700">
                        {diffDays <= 0 ? 'Due Today' : `Due in ${diffDays} days`}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Return History */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">Past Returned Books ({pastLoans.length})</h3>
        </div>

        <div className="divide-y divide-slate-100 text-xs">
          {pastLoans.length === 0 ? (
            <div className="p-8 text-center text-slate-400">No past borrowing history recorded</div>
          ) : (
            pastLoans.map((loan) => (
              <div key={loan.id} className="p-4 flex items-center justify-between gap-3">
                <div>
                  <div className="font-semibold text-slate-900">{loan.bookTitle}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Returned on: {loan.returnDate} • Loan Period: {loan.issueDate} to {loan.dueDate}
                  </div>
                </div>
                <div className="text-right">
                  <span className="px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-700">
                    Returned
                  </span>
                  {loan.fineAmount > 0 && (
                    <div className="text-[10px] font-semibold text-slate-600 mt-1">
                      Fine: ${loan.fineAmount.toFixed(2)} ({loan.finePaid ? 'Paid' : 'Unpaid'})
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
