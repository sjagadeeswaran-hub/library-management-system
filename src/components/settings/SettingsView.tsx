/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Settings,
  DollarSign,
  Clock,
  BookCopy,
  Mail,
  Shield,
  Plus,
  Trash2,
  Save,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { useLibrary } from '../../context/LibraryContext.tsx';
import { useAuth } from '../../context/AuthContext.tsx';

export const SettingsView: React.FC = () => {
  const { settings, updateSettings, librarians, addLibrarian, removeLibrarian, seedSampleData } = useLibrary();
  const { activeRole, currentUser, signInWithGoogle } = useAuth();
  const isAdmin = activeRole === 'admin';

  const [formData, setFormData] = useState({
    fineRatePerDay: settings.fineRatePerDay || 1.0,
    maxBorrowDays: settings.maxBorrowDays || 14,
    maxBooksPerStudent: settings.maxBooksPerStudent || 4,
    libraryName: settings.libraryName || 'dreamcode Academy Library',
    contactEmail: settings.contactEmail || 'library@dreamcode.academy',
    allowStudentReservation: settings.allowStudentReservation ?? true,
  });

  const [newLibEmail, setNewLibEmail] = useState('');
  const [newLibName, setNewLibName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      await updateSettings(formData);
    } catch (e) {
      // handled
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddLibrarian = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLibEmail || !newLibName) return;
    try {
      await addLibrarian(newLibEmail, newLibName);
      setNewLibEmail('');
      setNewLibName('');
    } catch (e) {
      // handled
    }
  };

  if (!currentUser) {
    return (
      <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center max-w-lg mx-auto my-12 shadow-xs">
        <Shield className="w-12 h-12 text-blue-600 mx-auto mb-3" />
        <h3 className="text-base font-bold text-slate-900">Administrator Sign-In Required</h3>
        <p className="text-xs text-slate-500 mt-1 mb-5 leading-relaxed">
          System policies and circulation rate configurations are restricted to administrators. Please sign in with sjagadees59@gmail.com.
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

  if (!isAdmin) {
    return (
      <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center">
        <Shield className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <h3 className="text-base font-bold text-slate-800">Admin Privileges Required</h3>
        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
          System policies, circulation fine limits, and librarian account provisioning can only be configured by system administrators.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <Settings className="w-5 h-5 text-blue-600" />
          Library Policies & Global Configuration
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Configure circulation fine rules, loan duration boundaries, and staff account authorizations
        </p>
      </div>

      {/* Main Settings Form */}
      <form onSubmit={handleSaveSettings} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-6">
        <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
          Circulation & Loan Parameters
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-amber-600" />
              Fine Rate Per Overdue Day ($)
            </label>
            <input
              type="number"
              step="0.25"
              min="0"
              max="50"
              required
              value={formData.fineRatePerDay}
              onChange={(e) => setFormData({ ...formData, fineRatePerDay: parseFloat(e.target.value) || 0 })}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-semibold text-slate-800"
            />
            <p className="text-[10px] text-slate-400 mt-1">Charged automatically for each late day</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-blue-600" />
              Standard Loan Duration (Days)
            </label>
            <input
              type="number"
              min="1"
              max="180"
              required
              value={formData.maxBorrowDays}
              onChange={(e) => setFormData({ ...formData, maxBorrowDays: parseInt(e.target.value) || 14 })}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-semibold text-slate-800"
            />
            <p className="text-[10px] text-slate-400 mt-1">Default checkout term for students</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
              <BookCopy className="w-3.5 h-3.5 text-indigo-600" />
              Max Books Per Student
            </label>
            <input
              type="number"
              min="1"
              max="20"
              required
              value={formData.maxBooksPerStudent}
              onChange={(e) => setFormData({ ...formData, maxBooksPerStudent: parseInt(e.target.value) || 4 })}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-semibold text-slate-800"
            />
            <p className="text-[10px] text-slate-400 mt-1">Concurrent active checkouts allowed</p>
          </div>
        </div>

        <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 pt-2">
          Institution Branding & Inquiries
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Library / Institution Name</label>
            <input
              type="text"
              required
              value={formData.libraryName}
              onChange={(e) => setFormData({ ...formData, libraryName: e.target.value })}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium text-slate-800"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Contact & Support Email</label>
            <input
              type="email"
              required
              value={formData.contactEmail}
              onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium text-slate-800"
            />
          </div>
        </div>

        <div className="pt-3 border-t border-slate-100 flex items-center justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="flex items-center gap-2 px-5 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Saving Changes...' : 'Save Configuration'}
          </button>
        </div>
      </form>

      {/* Librarian Accounts Management */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Authorized Librarian Staff Accounts</h3>
          <p className="text-xs text-slate-500">
            Staff members listed here are granted circulation desk, catalog edit, and return processing rights
          </p>
        </div>

        <form onSubmit={handleAddLibrarian} className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <input
            type="text"
            required
            value={newLibName}
            onChange={(e) => setNewLibName(e.target.value)}
            placeholder="Staff Full Name (e.g. Marcus Reed)"
            className="px-3 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
          <input
            type="email"
            required
            value={newLibEmail}
            onChange={(e) => setNewLibEmail(e.target.value)}
            placeholder="Staff Email (e.g. librarian@university.edu)"
            className="px-3 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
          <button
            type="submit"
            className="flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-xl transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Grant Librarian Role
          </button>
        </form>

        <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl mt-4">
          {librarians.length === 0 ? (
            <div className="p-4 text-center text-slate-400 text-xs">
              No additional librarians registered. System Admin retains primary circulation authority.
            </div>
          ) : (
            librarians.map((lib) => (
              <div key={lib.id} className="p-3 flex items-center justify-between text-xs">
                <div>
                  <div className="font-semibold text-slate-900">{lib.fullName}</div>
                  <div className="text-[11px] text-slate-500">{lib.email}</div>
                </div>
                <button
                  onClick={() => removeLibrarian(lib.id)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                  title="Revoke Librarian Access"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Database Seeding & Maintenance */}
      <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-3">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-500" />
          Data Seeding & Verification Utilities
        </h3>
        <p className="text-xs text-slate-600 leading-relaxed">
          Quickly inject high quality test books, active student rosters, and active circulation checkouts into Cloud Firestore for demonstrations or testing.
        </p>
        <button
          onClick={seedSampleData}
          className="px-4 py-2 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-xl shadow-xs transition-colors cursor-pointer"
        >
          Seed / Reset Sample Catalog
        </button>
      </div>
    </div>
  );
};
