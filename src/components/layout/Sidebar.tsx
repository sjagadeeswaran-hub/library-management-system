/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  LayoutDashboard,
  BookMarked,
  Users,
  BookUp2,
  BookDown,
  BarChart3,
  Settings,
  Sparkles,
  X,
  History,
  ShieldAlert,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useLibrary } from '../../context/LibraryContext.tsx';

interface SidebarProps {
  currentView: string;
  onNavigate: (view: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onNavigate, isOpen, onClose }) => {
  const { activeRole } = useAuth();
  const { stats, books, seedSampleData } = useLibrary();

  const isStaff = activeRole === 'admin' || activeRole === 'librarian';
  const isAdmin = activeRole === 'admin';

  interface NavItem {
    id: string;
    label: string;
    icon: typeof LayoutDashboard;
    roles: ('admin' | 'librarian' | 'student')[];
    badge?: string | number;
    badgeColor?: string;
  }

  const navItems: NavItem[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      roles: ['admin', 'librarian', 'student'],
    },
    {
      id: 'books',
      label: isStaff ? 'Book Management' : 'Browse Catalog',
      icon: BookMarked,
      roles: ['admin', 'librarian', 'student'],
      badge: books.length > 0 ? books.length : undefined,
    },
    {
      id: 'students',
      label: 'Student Directory',
      icon: Users,
      roles: ['admin', 'librarian'],
      badge: stats.registeredStudents > 0 ? stats.registeredStudents : undefined,
    },
    {
      id: 'issue',
      label: 'Issue Book',
      icon: BookUp2,
      roles: ['admin', 'librarian'],
    },
    {
      id: 'returns',
      label: 'Returns & Fines',
      icon: BookDown,
      roles: ['admin', 'librarian'],
      badge: stats.overdueBooks > 0 ? `${stats.overdueBooks} Overdue` : undefined,
      badgeColor: stats.overdueBooks > 0 ? 'bg-rose-500 text-white' : undefined,
    },
    {
      id: 'my_loans',
      label: 'My Loans & Fines',
      icon: History,
      roles: ['student'],
    },
    {
      id: 'reports',
      label: 'Reports & Analytics',
      icon: BarChart3,
      roles: ['admin', 'librarian'],
    },
    {
      id: 'settings',
      label: 'Library Settings',
      icon: Settings,
      roles: ['admin'],
    },
  ];

  const visibleItems = navItems.filter((item) => item.roles.includes(activeRole));

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-xs lg:hidden transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Sidebar Panel */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-[#0a1120] text-slate-300 flex flex-col border-r border-slate-800 transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand / Logo Area */}
        <div className="h-16 px-6 flex items-center justify-between border-b border-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/25">
              <BookMarked className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-white text-base tracking-tight">dreamcode</span>
              <span className="text-[10px] block text-blue-400 font-mono tracking-wider uppercase">Academy Library</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation list */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          <div className="px-3 pb-2 text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
            Main Navigation
          </div>

          {visibleItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;

            return (
              <button
                key={item.id}
                onClick={() => {
                  onNavigate(item.id);
                  onClose();
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all group cursor-pointer ${
                  isActive
                    ? 'bg-blue-600 text-white font-semibold shadow-md shadow-blue-600/30'
                    : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 transition-colors ${
                      isActive ? 'text-white' : 'text-slate-400 group-hover:text-blue-400'
                    }`}
                  />
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span
                    className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                      item.badgeColor || (isActive ? 'bg-blue-700 text-white' : 'bg-slate-800 text-slate-300')
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}

          {/* Quick catalog seeding tool for Admin */}
          {isAdmin && (
            <div className="pt-6 px-3">
              <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60">
                <div className="flex items-center gap-2 text-xs font-semibold text-white mb-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  Starter Data
                </div>
                <p className="text-[11px] text-slate-400 mb-2.5 leading-relaxed">
                  Seed academic books, students, and active loans into Firestore.
                </p>
                <button
                  onClick={seedSampleData}
                  className="w-full py-1.5 px-2 text-xs font-semibold bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white rounded-lg border border-blue-500/30 transition-all cursor-pointer text-center"
                >
                  Populate Demo Data
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="p-4 border-t border-slate-800/80 bg-[#070d18]">
          <div className="flex items-center gap-2.5">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
            <span className="text-xs text-slate-400">Cloud Firestore Online</span>
          </div>
          <div className="mt-1 text-[10px] text-slate-500 truncate">Database: ai-studio-libroflowlibrary</div>
        </div>
      </aside>
    </>
  );
};
