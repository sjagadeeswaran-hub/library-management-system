/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase.ts';
import { UserProfile, UserRole } from '../types/library.ts';

interface AuthContextType {
  currentUser: User | null;
  userProfile: UserProfile | null;
  activeRole: UserRole;
  effectiveRole: UserRole;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  setActiveRole: (role: UserRole) => void;
  isSimulatingRole: boolean;
  resetRoleToAssigned: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ADMIN_BOOTSTRAP_EMAIL = 'sjagadees59@gmail.com';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [assignedRole, setAssignedRole] = useState<UserRole>('admin');
  const [activeRole, setActiveRole] = useState<UserRole>('admin');
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setLoading(true);
      if (user) {
        setCurrentUser(user);
        try {
          // Check if admin or librarian or existing profile
          const userDocRef = doc(db, 'users', user.uid);
          const userDocSnap = await getDoc(userDocRef);

          let role: UserRole = 'student';
          const isBootstrapAdmin = user.email?.toLowerCase() === ADMIN_BOOTSTRAP_EMAIL.toLowerCase();

          // Check admin collection
          const adminDoc = await getDoc(doc(db, 'admins', user.uid));
          const librarianDoc = await getDoc(doc(db, 'librarians', user.uid));

          if (isBootstrapAdmin || adminDoc.exists()) {
            role = 'admin';
            // Auto bootstrap admin document if missing
            if (!adminDoc.exists()) {
              try {
                await setDoc(doc(db, 'admins', user.uid), {
                  uid: user.uid,
                  email: user.email || '',
                  createdAt: new Date().toISOString(),
                });
              } catch (e) {
                console.warn('Could not auto-write admin doc:', e);
              }
            }
          } else if (librarianDoc.exists()) {
            role = 'librarian';
          } else if (userDocSnap.exists()) {
            role = (userDocSnap.data()?.role as UserRole) || 'student';
          }

          let profileData: UserProfile;
          if (userDocSnap.exists()) {
            profileData = {
              ...userDocSnap.data(),
              role,
            } as UserProfile;
          } else {
            profileData = {
              uid: user.uid,
              email: user.email || 'user@library.edu',
              displayName: user.displayName || user.email?.split('@')[0] || 'Library User',
              photoURL: user.photoURL || undefined,
              role,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            try {
              await setDoc(userDocRef, profileData);
            } catch (err) {
              console.warn('Initial user profile create note:', err);
            }
          }

          setUserProfile(profileData);
          setAssignedRole(role);
          setActiveRole(role);
        } catch (error) {
          console.error('Error synchronizing user profile:', error);
          // Fallback to default user
          const isBootstrap = user.email?.toLowerCase() === ADMIN_BOOTSTRAP_EMAIL.toLowerCase();
          const fallbackRole = isBootstrap ? 'admin' : 'student';
          setUserProfile({
            uid: user.uid,
            email: user.email || '',
            displayName: user.displayName || 'Library User',
            photoURL: user.photoURL || undefined,
            role: fallbackRole,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
          setAssignedRole(fallbackRole);
          setActiveRole(fallbackRole);
        }
      } else {
        setCurrentUser(null);
        setUserProfile(null);
        setAssignedRole('student');
        setActiveRole('student');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    try {
      setLoading(true);
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('Sign-in failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      setCurrentUser(null);
      setUserProfile(null);
      setAssignedRole('student');
      setActiveRole('student');
    } catch (error) {
      console.error('Sign-out failed:', error);
    }
  };

  const isSimulatingRole = activeRole !== assignedRole;

  const resetRoleToAssigned = () => {
    setActiveRole(assignedRole);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userProfile,
        activeRole,
        effectiveRole: activeRole,
        loading,
        signInWithGoogle,
        signOut,
        setActiveRole,
        isSimulatingRole,
        resetRoleToAssigned,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
