/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  Bell,
  Shield,
  BookOpen,
  User,
  LogOut,
  LogIn,
  Check,
  Calendar,
  AlertTriangle,
  Menu,
  ChevronDown,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useLibrary } from '../../context/LibraryContext.tsx';
import { UserRole } from '../../types/library.ts';

interface HeaderProps {
  onToggleSidebar: () => void;
  onNavigate: (view: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleSidebar, onNavigate }) => {
  const { currentUser, userProfile, activeRole, setActiveRole, signInWithGoogle, signOut, isSimulatingRole } = useAuth();
  const { notifications, markNotificationRead, clearAllNotifications, settings, seedSampleData, books } = useLibrary();

  const [showNotifications, setShowNotifications] = useState(false);
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const notifRef = useRef<HTMLDivElement>(null);
  const roleRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      if (roleRef.current && !roleRef.current.contains(event.target as Node)) {
        setShowRoleMenu(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const roles: { id: UserRole; label: string; desc: string; icon: typeof Shield }[] = [
    { id: 'admin', label: 'Admin', desc: 'Full system management & settings', icon: Shield },
    { id: 'librarian', label: 'Librarian', desc: 'Books, students, issues & returns', icon: BookOpen },
    { id: 'student', label: 'Student', desc: 'Catalog, loans & personal history', icon: User },
  ];

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200/80 px-4 lg:px-8 py-3 flex items-center justify-between shadow-xs">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
          aria-label="Toggle navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-blue-700 flex items-center justify-center text-white font-bold shadow-md shadow-blue-500/20">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900 leading-tight flex items-center gap-2">
              {settings.libraryName || 'dreamcode Academy Library'}
              <span className="hidden sm:inline-flex px-2 py-0.5 text-[11px] font-semibold bg-blue-50 text-blue-700 rounded-md border border-blue-200">
                v2.4
              </span>
            </h1>
            <p className="text-xs text-slate-500 hidden md:block">Academy Catalog & Circulation Control</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {/* Quick Seed button if empty */}
        {books.length === 0 && (
          <button
            onClick={seedSampleData}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 rounded-lg transition-colors cursor-pointer"
            title="Populate catalog with academic books & students"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-600 animate-spin" />
            Seed Sample Catalog
          </button>
        )}

        {/* Role Switcher */}
        <div className="relative" ref={roleRef}>
          <button
            onClick={() => setShowRoleMenu(!showRoleMenu)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-all cursor-pointer ${
              activeRole === 'admin'
                ? 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100'
                : activeRole === 'librarian'
                ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-current"></span>
            <span className="capitalize font-semibold">{activeRole} View</span>
            <ChevronDown className="w-3.5 h-3.5 opacity-60" />
          </button>

          {showRoleMenu && (
            <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-200 p-2 z-50 animate-in fade-in slide-in-from-top-1">
              <div className="px-3 py-2 border-b border-slate-100">
                <div className="text-xs font-bold text-slate-800 uppercase tracking-wider">Simulate Role View</div>
                <div className="text-[11px] text-slate-500">Test permitted modules and restricted actions:</div>
              </div>
              <div className="py-1 space-y-1">
                {roles.map((r) => {
                  const Icon = r.icon;
                  const isSelected = activeRole === r.id;
                  return (
                    <button
                      key={r.id}
                      onClick={() => {
                        setActiveRole(r.id);
                        setShowRoleMenu(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs flex items-center justify-between transition-colors cursor-pointer ${
                        isSelected ? 'bg-blue-50 text-blue-900 font-medium' : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                            r.id === 'admin'
                              ? 'bg-purple-100 text-purple-700'
                              : r.id === 'librarian'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-emerald-100 text-emerald-700'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900">{r.label}</div>
                          <div className="text-[11px] text-slate-500">{r.desc}</div>
                        </div>
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-blue-600 shrink-0" />}
                    </button>
                  );
                })}
              </div>
              {isSimulatingRole && (
                <div className="mt-1 pt-2 border-t border-slate-100 px-3 text-[11px] text-amber-700 bg-amber-50 rounded-lg p-2">
                  Previewing UI as <strong>{activeRole}</strong>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Notifications Dropdown */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Open notifications"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-rose-600 text-[10px] font-bold text-white flex items-center justify-center ring-2 ring-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-2xl border border-slate-200 z-50 overflow-hidden animate-in fade-in slide-in-from-top-1">
              <div className="px-4 py-3 bg-slate-900 text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-blue-400" />
                  <span className="font-semibold text-sm">Library Notifications</span>
                </div>
                {notifications.length > 0 && (
                  <button
                    onClick={clearAllNotifications}
                    className="text-[11px] text-slate-300 hover:text-white underline cursor-pointer"
                  >
                    Clear all
                  </button>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs">
                    <Bell className="w-8 h-8 mx-auto mb-2 opacity-30 text-slate-500" />
                    No recent notifications
                  </div>
                ) : (
                  notifications.slice(0, 10).map((n) => {
                    const isOverdue = n.type === 'overdue';
                    const isDueSoon = n.type === 'due_soon';
                    const isFine = n.type === 'fine';

                    return (
                      <div
                        key={n.id}
                        onClick={() => markNotificationRead(n.id)}
                        className={`p-3 text-xs flex items-start gap-2.5 transition-colors cursor-pointer ${
                          !n.read ? 'bg-blue-50/50 hover:bg-blue-50' : 'hover:bg-slate-50'
                        }`}
                      >
                        <div
                          className={`w-7 h-7 rounded-full shrink-0 flex items-center justify-center mt-0.5 ${
                            isOverdue
                              ? 'bg-rose-100 text-rose-600'
                              : isDueSoon
                              ? 'bg-amber-100 text-amber-600'
                              : isFine
                              ? 'bg-purple-100 text-purple-600'
                              : 'bg-emerald-100 text-emerald-600'
                          }`}
                        >
                          {isOverdue ? (
                            <AlertTriangle className="w-3.5 h-3.5" />
                          ) : isDueSoon ? (
                            <Calendar className="w-3.5 h-3.5" />
                          ) : (
                            <Check className="w-3.5 h-3.5" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-slate-900 line-clamp-1">{n.title}</span>
                            {!n.read && (
                              <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0 ml-1"></span>
                            )}
                          </div>
                          <p className="text-slate-600 text-[11px] mt-0.5 leading-snug">{n.message}</p>
                          <span className="text-[10px] text-slate-400 mt-1 block">
                            {new Date(n.createdAt).toLocaleDateString()} {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Account / Profile */}
        {!currentUser ? (
          <button
            onClick={async () => {
              try {
                await signInWithGoogle();
              } catch (e) {
                console.warn('Sign-in cancelled or failed:', e);
              }
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Sign In</span>
          </button>
        ) : (
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <div className="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-xs ring-2 ring-blue-500/20">
                {currentUser?.photoURL ? (
                  <img
                    src={currentUser.photoURL}
                    alt={currentUser.displayName || 'User'}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  userProfile?.displayName?.charAt(0).toUpperCase() || 'U'
                )}
              </div>
              <div className="text-left hidden lg:block">
                <div className="text-xs font-semibold text-slate-900 leading-tight">
                  {userProfile?.displayName || currentUser.displayName || 'Staff User'}
                </div>
                <div className="text-[10px] text-slate-500 capitalize">{activeRole}</div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden lg:block" />
            </button>

            {showProfileMenu && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-200 p-2 z-50 animate-in fade-in slide-in-from-top-1">
                <div className="px-3 py-2 border-b border-slate-100">
                  <div className="font-semibold text-xs text-slate-900">{userProfile?.displayName || currentUser.displayName}</div>
                  <div className="text-[11px] text-slate-500 truncate">{currentUser.email}</div>
                  <div className="mt-1.5 inline-block px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-md bg-slate-100 text-slate-700">
                    Role: {activeRole}
                  </div>
                </div>

                <div className="py-1">
                  <button
                    onClick={async () => {
                      await signOut();
                      setShowProfileMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
};
