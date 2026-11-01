/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = 'admin' | 'librarian' | 'student';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: UserRole;
  studentId?: string;
  department?: string;
  phone?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Book {
  id: string; // Firestore document ID
  bookId: string; // Library barcode / unique catalog ID
  isbn: string;
  title: string;
  author: string;
  publisher: string;
  publicationYear: number;
  category: string;
  totalCopies: number;
  availableCopies: number;
  shelfLocation: string;
  coverUrl?: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Student {
  id: string; // Firestore document ID
  studentId: string; // College Roll / Student ID
  fullName: string;
  email: string;
  phone: string;
  department: string;
  course: string;
  registrationDate: string;
  status: 'active' | 'suspended' | 'graduated';
  activeBorrowCount: number;
  totalFinesUnpaid: number;
  createdAt: string;
  updatedAt: string;
}

export interface BorrowRecord {
  id: string; // Firestore document ID
  recordId: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  bookId: string; // Library bookId / reference
  bookTitle: string;
  bookIsbn: string;
  issueDate: string; // YYYY-MM-DD
  dueDate: string; // YYYY-MM-DD
  returnDate?: string | null; // YYYY-MM-DD
  status: 'borrowed' | 'returned' | 'overdue';
  overdueDays: number;
  fineRatePerDay: number;
  fineAmount: number;
  finePaid: boolean;
  issuedBy: string;
  returnedBy?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationItem {
  id: string;
  notificationId: string;
  userId?: string;
  userEmail?: string;
  title: string;
  message: string;
  type: 'due_soon' | 'overdue' | 'issued' | 'returned' | 'fine' | 'system';
  read: boolean;
  createdAt: string;
}

export interface LibrarySettings {
  settingId: string;
  fineRatePerDay: number;
  maxBorrowDays: number;
  maxBooksPerStudent: number;
  libraryName: string;
  contactEmail: string;
  allowStudentReservation: boolean;
  updatedAt: string;
}

export interface LibrarianUser {
  id: string;
  uid: string;
  email: string;
  fullName: string;
  createdAt: string;
}
