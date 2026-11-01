/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { LibraryProvider, useLibrary } from './context/LibraryContext.tsx';
import { Header } from './components/layout/Header.tsx';
import { Sidebar } from './components/layout/Sidebar.tsx';
import { DashboardView } from './components/dashboard/DashboardView.tsx';
import { BookManagementView } from './components/books/BookManagementView.tsx';
import { StudentManagementView } from './components/students/StudentManagementView.tsx';
import { IssueBookView } from './components/borrow/IssueBookView.tsx';
import { ReturnManagementView } from './components/returns/ReturnManagementView.tsx';
import { ReportsView } from './components/reports/ReportsView.tsx';
import { SettingsView } from './components/settings/SettingsView.tsx';
import { MyLoansView } from './components/student/MyLoansView.tsx';
import { ToastContainer } from './components/common/Toast.tsx';
import { BookOpen, Loader2 } from 'lucide-react';

function LibraryAppContent() {
  const { activeRole } = useAuth();
  const { loading } = useLibrary();
  const [currentView, setCurrentView] = useState<string>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Auto route if a role cannot access current view
  const isStaff = activeRole === 'admin' || activeRole === 'librarian';
  const isAdmin = activeRole === 'admin';

  let effectiveView = currentView;
  if (!isStaff && (currentView === 'students' || currentView === 'issue' || currentView === 'returns' || currentView === 'reports')) {
    effectiveView = 'dashboard';
  }
  if (!isAdmin && currentView === 'settings') {
    effectiveView = 'dashboard';
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col font-sans text-slate-800 antialiased selection:bg-blue-600 selection:text-white">
      <div className="flex flex-1 min-h-screen overflow-hidden">
        {/* Sidebar */}
        <Sidebar
          currentView={effectiveView}
          onNavigate={(view) => setCurrentView(view)}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
          {/* Header */}
          <Header
            onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
            onNavigate={(view) => setCurrentView(view)}
          />

          {/* View Body */}
          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
            {loading ? (
              <div className="h-96 flex flex-col items-center justify-center text-slate-400 gap-3">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                <span className="text-xs font-semibold text-slate-600">Connecting to Cloud Firestore...</span>
              </div>
            ) : (
              <>
                {effectiveView === 'dashboard' && <DashboardView onNavigate={(view) => setCurrentView(view)} />}
                {effectiveView === 'books' && <BookManagementView onIssueBookWithPreset={() => setCurrentView('issue')} />}
                {effectiveView === 'students' && <StudentManagementView />}
                {effectiveView === 'issue' && <IssueBookView />}
                {effectiveView === 'returns' && <ReturnManagementView />}
                {effectiveView === 'my_loans' && <MyLoansView />}
                {effectiveView === 'reports' && <ReportsView />}
                {effectiveView === 'settings' && <SettingsView />}
              </>
            )}
          </main>
        </div>
      </div>

      {/* Toast Notifications container */}
      <ToastContainer />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <LibraryProvider>
        <LibraryAppContent />
      </LibraryProvider>
    </AuthProvider>
  );
}
