/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import {
  collection,
  doc,
  query,
  where,
  onSnapshot,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../lib/firebase.ts';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrors.ts';
import {
  Book,
  Student,
  BorrowRecord,
  NotificationItem,
  LibrarySettings,
  LibrarianUser,
} from '../types/library.ts';
import { useAuth } from './AuthContext.tsx';
import confetti from 'canvas-confetti';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message?: string;
}

interface LibraryContextType {
  books: Book[];
  students: Student[];
  borrowRecords: BorrowRecord[];
  notifications: NotificationItem[];
  settings: LibrarySettings;
  librarians: LibrarianUser[];
  loading: boolean;
  toasts: ToastMessage[];
  addToast: (type: ToastMessage['type'], title: string, message?: string) => void;
  removeToast: (id: string) => void;

  // Book CRUD
  addBook: (bookData: Omit<Book, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateBook: (id: string, bookData: Partial<Book>) => Promise<void>;
  deleteBook: (id: string, title?: string) => Promise<void>;

  // Student CRUD
  addStudent: (studentData: Omit<Student, 'id' | 'activeBorrowCount' | 'totalFinesUnpaid' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateStudent: (id: string, studentData: Partial<Student>) => Promise<void>;
  deleteStudent: (id: string, name?: string) => Promise<void>;

  // Circulation
  issueBook: (params: {
    studentId: string;
    bookId: string;
    issueDate: string;
    dueDate: string;
    notes?: string;
  }) => Promise<void>;
  returnBook: (params: {
    recordId: string;
    returnDate: string;
    markFinePaid: boolean;
    notes?: string;
  }) => Promise<void>;
  payFine: (recordId: string) => Promise<void>;

  // Settings & Staff
  updateSettings: (newSettings: Partial<LibrarySettings>) => Promise<void>;
  addLibrarian: (email: string, fullName: string) => Promise<void>;
  removeLibrarian: (id: string) => Promise<void>;

  // Notifications
  markNotificationRead: (id: string) => Promise<void>;
  clearAllNotifications: () => Promise<void>;

  // Seeding
  seedSampleData: () => Promise<void>;

  // Computed statistics
  stats: {
    totalBooks: number;
    availableBooks: number;
    borrowedBooks: number;
    registeredStudents: number;
    overdueBooks: number;
    totalFinesCollected: number;
    totalFinesPending: number;
  };
}

const DEFAULT_SETTINGS: LibrarySettings = {
  settingId: 'global',
  fineRatePerDay: 1.0, // $1.00 per day
  maxBorrowDays: 14,
  maxBooksPerStudent: 4,
  libraryName: 'dreamcode Academy Library',
  contactEmail: 'library@dreamcode.academy',
  allowStudentReservation: true,
  updatedAt: new Date().toISOString(),
};

const LibraryContext = createContext<LibraryContextType | undefined>(undefined);

export const LibraryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, userProfile, activeRole, loading: authLoading } = useAuth();

  const [books, setBooks] = useState<Book[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [borrowRecords, setBorrowRecords] = useState<BorrowRecord[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [settings, setSettings] = useState<LibrarySettings>(DEFAULT_SETTINGS);
  const [librarians, setLibrarians] = useState<LibrarianUser[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const isStaff = activeRole === 'admin' || activeRole === 'librarian';

  const addToast = (type: ToastMessage['type'], title: string, message?: string) => {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    setToasts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // 1. Synchronize Settings (Publicly accessible catalog setting)
  useEffect(() => {
    const settingsRef = doc(db, 'settings', 'global');
    const unsubSettings = onSnapshot(
      settingsRef,
      (snapshot) => {
        if (snapshot.exists()) {
          setSettings(snapshot.data() as LibrarySettings);
        } else if (currentUser && isStaff) {
          // Initialize default settings in Firestore if staff
          setDoc(settingsRef, DEFAULT_SETTINGS).catch((e) => {
            console.warn('Could not auto-seed settings document:', e);
          });
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, 'settings/global');
      }
    );

    return () => unsubSettings();
  }, [currentUser, isStaff]);

  // 2. Synchronize Books Catalog (Publicly accessible)
  useEffect(() => {
    const booksCol = collection(db, 'books');
    const unsubBooks = onSnapshot(
      booksCol,
      (snapshot) => {
        const loadedBooks: Book[] = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as Book[];
        loadedBooks.sort((a, b) => a.title.localeCompare(b.title));
        setBooks(loadedBooks);
        setLoading(false);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'books');
      }
    );

    return () => unsubBooks();
  }, []);

  // 3. Synchronize Students Roster (Strictly requires authentication & staff access)
  useEffect(() => {
    if (!currentUser || !isStaff) {
      setStudents([]);
      return;
    }

    const studentsCol = collection(db, 'students');
    const unsubStudents = onSnapshot(
      studentsCol,
      (snapshot) => {
        const loadedStudents: Student[] = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as Student[];
        loadedStudents.sort((a, b) => a.fullName.localeCompare(b.fullName));
        setStudents(loadedStudents);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'students');
      }
    );

    return () => unsubStudents();
  }, [currentUser, isStaff]);

  // 4. Synchronize Borrow Records (Staff sees all, students see their own records)
  useEffect(() => {
    if (!currentUser) {
      setBorrowRecords([]);
      return;
    }

    const recordsCol = collection(db, 'borrow_records');
    const recordsQuery = isStaff
      ? recordsCol
      : query(recordsCol, where('studentEmail', '==', currentUser.email || ''));

    const unsubRecords = onSnapshot(
      recordsQuery,
      (snapshot) => {
        const loadedRecords: BorrowRecord[] = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as BorrowRecord[];
        loadedRecords.sort((a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime());
        setBorrowRecords(loadedRecords);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'borrow_records');
      }
    );

    return () => unsubRecords();
  }, [currentUser, isStaff]);

  // 5. Synchronize Notifications (Staff sees all, users see their own)
  useEffect(() => {
    if (!currentUser) {
      setNotifications([]);
      return;
    }

    const notifsCol = collection(db, 'notifications');
    const notifsQuery = isStaff
      ? notifsCol
      : query(notifsCol, where('userEmail', '==', currentUser.email || ''));

    const unsubNotifs = onSnapshot(
      notifsQuery,
      (snapshot) => {
        const loadedNotifs: NotificationItem[] = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as NotificationItem[];
        loadedNotifs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setNotifications(loadedNotifs);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'notifications');
      }
    );

    return () => unsubNotifs();
  }, [currentUser, isStaff]);

  // 6. Synchronize Librarians (Staff only)
  useEffect(() => {
    if (!currentUser || !isStaff) {
      setLibrarians([]);
      return;
    }

    const librariansCol = collection(db, 'librarians');
    const unsubLibrarians = onSnapshot(
      librariansCol,
      (snapshot) => {
        const loaded: LibrarianUser[] = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as LibrarianUser[];
        setLibrarians(loaded);
      },
      (error) => {
        console.warn('Librarian list listener:', error);
      }
    );

    return () => unsubLibrarians();
  }, [currentUser, isStaff]);

  // Check and flag overdue records automatically (only runs for staff when records exist)
  useEffect(() => {
    if (!currentUser || !isStaff || borrowRecords.length === 0) return;

    const nowStr = new Date().toISOString().split('T')[0];
    borrowRecords.forEach(async (rec) => {
      if (rec.status === 'borrowed') {
        const isOverdue = new Date(rec.dueDate) < new Date(nowStr);
        if (isOverdue) {
          const diffTime = Math.abs(new Date(nowStr).getTime() - new Date(rec.dueDate).getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          const fine = diffDays * (rec.fineRatePerDay || settings.fineRatePerDay);

          if (rec.overdueDays !== diffDays) {
            try {
              await updateDoc(doc(db, 'borrow_records', rec.id), {
                status: 'overdue',
                overdueDays: diffDays,
                fineAmount: fine,
                updatedAt: new Date().toISOString(),
              });
            } catch (e) {
              console.warn('Auto overdue check note:', e);
            }
          }
        }
      }
    });
  }, [currentUser, isStaff, borrowRecords, settings.fineRatePerDay]);

  // Computed Dashboard Stats
  const stats = useMemo(() => {
    const totalBooks = books.reduce((acc, b) => acc + (b.totalCopies || 0), 0);
    const availableBooks = books.reduce((acc, b) => acc + (b.availableCopies || 0), 0);
    const currentlyBorrowed = borrowRecords.filter((r) => r.status === 'borrowed' || r.status === 'overdue');
    const borrowedBooksCount = currentlyBorrowed.length;
    const overdueBooksCount = borrowRecords.filter((r) => r.status === 'overdue').length;

    const totalFinesCollected = borrowRecords.reduce(
      (acc, r) => (r.finePaid && r.fineAmount ? acc + r.fineAmount : acc),
      0
    );
    const totalFinesPending = borrowRecords.reduce(
      (acc, r) => (!r.finePaid && r.fineAmount ? acc + r.fineAmount : acc),
      0
    );

    return {
      totalBooks,
      availableBooks,
      borrowedBooks: borrowedBooksCount,
      registeredStudents: students.length,
      overdueBooks: overdueBooksCount,
      totalFinesCollected,
      totalFinesPending,
    };
  }, [books, students, borrowRecords]);

  // Book Operations
  const addBook = async (bookData: Omit<Book, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const existsId = books.some((b) => b.bookId.toLowerCase() === bookData.bookId.toLowerCase());
      if (existsId) {
        throw new Error(`A book with Catalog ID "${bookData.bookId}" already exists.`);
      }
      const existsIsbn = books.some((b) => b.isbn.replace(/[- ]/g, '') === bookData.isbn.replace(/[- ]/g, ''));
      if (existsIsbn) {
        throw new Error(`A book with ISBN "${bookData.isbn}" already exists.`);
      }

      const docId = `book_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      const newBook: Book = {
        id: docId,
        ...bookData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await setDoc(doc(db, 'books', docId), newBook);
      addToast('success', 'Book Added Successfully', `"${bookData.title}" was added to catalog.`);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to add book';
      addToast('error', 'Error Adding Book', msg);
      throw error;
    }
  };

  const updateBook = async (id: string, bookData: Partial<Book>) => {
    try {
      const bookRef = doc(db, 'books', id);
      await updateDoc(bookRef, {
        ...bookData,
        updatedAt: new Date().toISOString(),
      });
      addToast('success', 'Book Updated', 'Book details have been saved.');
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to update book';
      addToast('error', 'Update Failed', msg);
      throw error;
    }
  };

  const deleteBook = async (id: string, title?: string) => {
    try {
      const bookDoc = books.find((b) => b.id === id);
      if (bookDoc) {
        const activeLoans = borrowRecords.some(
          (r) => (r.status === 'borrowed' || r.status === 'overdue') && (r.bookId === bookDoc.bookId || r.bookId === id)
        );
        if (activeLoans) {
          throw new Error('Cannot delete this book while there are active unreturned copies issued.');
        }
      }

      await deleteDoc(doc(db, 'books', id));
      addToast('success', 'Book Removed', `"${title || 'Book'}" has been removed from catalog.`);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to delete book';
      addToast('error', 'Deletion Prevented', msg);
      throw error;
    }
  };

  // Student Operations
  const addStudent = async (
    studentData: Omit<Student, 'id' | 'activeBorrowCount' | 'totalFinesUnpaid' | 'createdAt' | 'updatedAt'>
  ) => {
    try {
      const exists = students.some(
        (s) => s.studentId.toLowerCase() === studentData.studentId.toLowerCase() || s.email.toLowerCase() === studentData.email.toLowerCase()
      );
      if (exists) {
        throw new Error(`Student with ID "${studentData.studentId}" or Email "${studentData.email}" already exists.`);
      }

      const docId = `std_${studentData.studentId.replace(/[^a-zA-Z0-9]/g, '_')}`;
      const newStudent: Student = {
        id: docId,
        ...studentData,
        activeBorrowCount: 0,
        totalFinesUnpaid: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await setDoc(doc(db, 'students', docId), newStudent);
      addToast('success', 'Student Registered', `${studentData.fullName} added successfully.`);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Registration failed';
      addToast('error', 'Failed to Register Student', msg);
      throw error;
    }
  };

  const updateStudent = async (id: string, studentData: Partial<Student>) => {
    try {
      await updateDoc(doc(db, 'students', id), {
        ...studentData,
        updatedAt: new Date().toISOString(),
      });
      addToast('success', 'Student Record Updated', 'Information has been synchronized.');
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Update failed';
      addToast('error', 'Update Failed', msg);
      throw error;
    }
  };

  const deleteStudent = async (id: string, name?: string) => {
    try {
      const student = students.find((s) => s.id === id);
      if (student) {
        if (student.activeBorrowCount > 0) {
          throw new Error('Cannot remove student who currently has borrowed books.');
        }
        if (student.totalFinesUnpaid > 0) {
          throw new Error('Cannot remove student with unpaid fines balance.');
        }
      }

      await deleteDoc(doc(db, 'students', id));
      addToast('success', 'Student Removed', `${name || 'Student record'} has been deleted.`);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Deletion failed';
      addToast('error', 'Cannot Delete Student', msg);
      throw error;
    }
  };

  // Issue Book Flow
  const issueBook = async (params: {
    studentId: string;
    bookId: string;
    issueDate: string;
    dueDate: string;
    notes?: string;
  }) => {
    try {
      const student = students.find((s) => s.studentId === params.studentId || s.id === params.studentId);
      if (!student) {
        throw new Error('Selected student could not be located in records.');
      }
      if (student.status !== 'active') {
        throw new Error(`Student account is currently ${student.status}. Cannot issue books.`);
      }
      if (student.activeBorrowCount >= settings.maxBooksPerStudent) {
        throw new Error(`Student has reached maximum allowed borrow limit of ${settings.maxBooksPerStudent} books.`);
      }
      if (student.totalFinesUnpaid > 10) {
        throw new Error(`Student has outstanding unpaid fines of $${student.totalFinesUnpaid.toFixed(2)}. Please resolve fines before issuing.`);
      }

      const book = books.find((b) => b.bookId === params.bookId || b.id === params.bookId);
      if (!book) {
        throw new Error('Selected book could not be found in library catalog.');
      }
      if (book.availableCopies <= 0) {
        throw new Error(`All copies of "${book.title}" are currently checked out.`);
      }

      const batch = writeBatch(db);
      const recordId = `rec_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      const recordRef = doc(db, 'borrow_records', recordId);

      const borrowRecord: BorrowRecord = {
        id: recordId,
        recordId,
        studentId: student.studentId,
        studentName: student.fullName,
        studentEmail: student.email,
        bookId: book.bookId,
        bookTitle: book.title,
        bookIsbn: book.isbn,
        issueDate: params.issueDate,
        dueDate: params.dueDate,
        returnDate: null,
        status: 'borrowed',
        overdueDays: 0,
        fineRatePerDay: settings.fineRatePerDay,
        fineAmount: 0,
        finePaid: false,
        issuedBy: userProfile?.displayName || 'Library Staff',
        notes: params.notes || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      batch.set(recordRef, borrowRecord);

      // Decrement available copies on book
      const bookRef = doc(db, 'books', book.id);
      batch.update(bookRef, {
        availableCopies: Math.max(0, book.availableCopies - 1),
        updatedAt: new Date().toISOString(),
      });

      // Increment active borrow count on student
      const studentRef = doc(db, 'students', student.id);
      batch.update(studentRef, {
        activeBorrowCount: (student.activeBorrowCount || 0) + 1,
        updatedAt: new Date().toISOString(),
      });

      // Create notification
      const notifId = `notif_${Date.now()}`;
      const notifRef = doc(db, 'notifications', notifId);
      const notif: NotificationItem = {
        id: notifId,
        notificationId: notifId,
        userEmail: student.email,
        title: 'Book Borrowed Successfully',
        message: `"${book.title}" was issued to ${student.fullName}. Due date: ${params.dueDate}.`,
        type: 'issued',
        read: false,
        createdAt: new Date().toISOString(),
      };
      batch.set(notifRef, notif);

      await batch.commit();

      try {
        confetti({
          particleCount: 40,
          spread: 60,
          origin: { y: 0.8 },
        });
      } catch (e) {
        // ignore
      }

      addToast('success', 'Book Issued Successfully', `"${book.title}" issued to ${student.fullName}.`);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Issuance failed';
      addToast('error', 'Issue Book Failed', msg);
      throw error;
    }
  };

  // Return Book Flow
  const returnBook = async (params: {
    recordId: string;
    returnDate: string;
    markFinePaid: boolean;
    notes?: string;
  }) => {
    try {
      const record = borrowRecords.find((r) => r.id === params.recordId || r.recordId === params.recordId);
      if (!record) {
        throw new Error('Borrow record not found.');
      }
      if (record.status === 'returned') {
        throw new Error('This book has already been marked as returned.');
      }

      const book = books.find((b) => b.bookId === record.bookId || b.title === record.bookTitle);
      const student = students.find((s) => s.studentId === record.studentId || s.email === record.studentEmail);

      const dueDateObj = new Date(record.dueDate);
      const returnDateObj = new Date(params.returnDate);
      let overdueDays = 0;
      let fineAmount = 0;

      if (returnDateObj > dueDateObj) {
        const diffTime = returnDateObj.getTime() - dueDateObj.getTime();
        overdueDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        fineAmount = overdueDays * (record.fineRatePerDay || settings.fineRatePerDay);
      }

      const batch = writeBatch(db);
      const recordRef = doc(db, 'borrow_records', record.id);

      batch.update(recordRef, {
        returnDate: params.returnDate,
        status: 'returned',
        overdueDays,
        fineAmount,
        finePaid: fineAmount > 0 ? params.markFinePaid : true,
        returnedBy: userProfile?.displayName || 'Library Staff',
        notes: params.notes ? `${record.notes ? record.notes + ' | ' : ''}${params.notes}` : record.notes,
        updatedAt: new Date().toISOString(),
      });

      if (book) {
        const bookRef = doc(db, 'books', book.id);
        batch.update(bookRef, {
          availableCopies: Math.min(book.totalCopies, book.availableCopies + 1),
          updatedAt: new Date().toISOString(),
        });
      }

      if (student) {
        const studentRef = doc(db, 'students', student.id);
        const addedFine = !params.markFinePaid && fineAmount > 0 ? fineAmount : 0;
        batch.update(studentRef, {
          activeBorrowCount: Math.max(0, student.activeBorrowCount - 1),
          totalFinesUnpaid: (student.totalFinesUnpaid || 0) + addedFine,
          updatedAt: new Date().toISOString(),
        });
      }

      const notifId = `notif_${Date.now()}`;
      const notifRef = doc(db, 'notifications', notifId);
      const fineNotice = fineAmount > 0 ? (params.markFinePaid ? ` (Fine of $${fineAmount.toFixed(2)} paid)` : ` (Outstanding fine: $${fineAmount.toFixed(2)})`) : '';
      batch.set(notifRef, {
        id: notifId,
        notificationId: notifId,
        userEmail: record.studentEmail,
        title: 'Book Returned',
        message: `"${record.bookTitle}" was returned by ${record.studentName}.${fineNotice}`,
        type: 'returned',
        read: false,
        createdAt: new Date().toISOString(),
      });

      await batch.commit();

      try {
        confetti({
          particleCount: 50,
          spread: 70,
          origin: { y: 0.75 },
        });
      } catch (e) {
        // ignore
      }

      addToast(
        'success',
        'Book Returned',
        `"${record.bookTitle}" marked as returned.${fineAmount > 0 ? ` Overdue fine: $${fineAmount.toFixed(2)}` : ''}`
      );
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Return failed';
      addToast('error', 'Return Processing Failed', msg);
      throw error;
    }
  };

  // Pay Fine
  const payFine = async (recordId: string) => {
    try {
      const record = borrowRecords.find((r) => r.id === recordId);
      if (!record) return;

      const batch = writeBatch(db);
      const recordRef = doc(db, 'borrow_records', record.id);
      batch.update(recordRef, {
        finePaid: true,
        updatedAt: new Date().toISOString(),
      });

      const student = students.find((s) => s.studentId === record.studentId);
      if (student) {
        const studentRef = doc(db, 'students', student.id);
        batch.update(studentRef, {
          totalFinesUnpaid: Math.max(0, (student.totalFinesUnpaid || 0) - record.fineAmount),
          updatedAt: new Date().toISOString(),
        });
      }

      await batch.commit();
      addToast('success', 'Fine Paid', `Fine of $${record.fineAmount.toFixed(2)} settled for ${record.studentName}.`);
    } catch (error) {
      addToast('error', 'Payment Failed', 'Could not record fine payment.');
    }
  };

  // Update Settings
  const updateSettings = async (newSettings: Partial<LibrarySettings>) => {
    try {
      const ref = doc(db, 'settings', 'global');
      await updateDoc(ref, {
        ...newSettings,
        updatedAt: new Date().toISOString(),
      });
      addToast('success', 'Settings Saved', 'Library configuration has been updated.');
    } catch (error) {
      addToast('error', 'Update Failed', 'Could not save library settings.');
      throw error;
    }
  };

  // Manage Librarians
  const addLibrarian = async (email: string, fullName: string) => {
    try {
      const docId = `lib_${Date.now()}`;
      await setDoc(doc(db, 'librarians', docId), {
        uid: docId,
        email,
        fullName,
        createdAt: new Date().toISOString(),
      });
      addToast('success', 'Librarian Added', `${fullName} (${email}) now has staff credentials.`);
    } catch (error) {
      addToast('error', 'Failed to Add Librarian', 'Only administrators can manage librarian accounts.');
      throw error;
    }
  };

  const removeLibrarian = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'librarians', id));
      addToast('success', 'Librarian Access Removed', 'Account permissions revoked.');
    } catch (error) {
      addToast('error', 'Removal Failed', 'Could not remove librarian.');
    }
  };

  // Notifications
  const markNotificationRead = async (id: string) => {
    try {
      await updateDoc(doc(db, 'notifications', id), { read: true });
    } catch (e) {
      console.warn('markNotificationRead:', e);
    }
  };

  const clearAllNotifications = async () => {
    try {
      const batch = writeBatch(db);
      notifications.forEach((n) => {
        batch.delete(doc(db, 'notifications', n.id));
      });
      await batch.commit();
      addToast('info', 'Notifications Cleared');
    } catch (e) {
      console.warn('clearAllNotifications:', e);
    }
  };

  // Seed Rich Sample Library Catalog
  const seedSampleData = async () => {
    try {
      setLoading(true);
      const batch = writeBatch(db);

      const sampleBooks: Omit<Book, 'id'>[] = [
        {
          bookId: 'BK-1001',
          isbn: '978-0131103627',
          title: 'The C Programming Language (2nd Edition)',
          author: 'Brian W. Kernighan, Dennis M. Ritchie',
          publisher: 'Prentice Hall',
          publicationYear: 1988,
          category: 'Computer Science',
          totalCopies: 6,
          availableCopies: 5,
          shelfLocation: 'Stack A, Shelf 2',
          coverUrl: 'https://images.unsplash.com/photo-1532012164546-f432f2e3edd4?auto=format&fit=crop&w=600&q=80',
          description: 'The definitive classic reference work on C programming by the inventors of the language.',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          bookId: 'BK-1002',
          isbn: '978-0262033848',
          title: 'Introduction to Algorithms (CLRS)',
          author: 'Thomas H. Cormen, Charles E. Leiserson',
          publisher: 'MIT Press',
          publicationYear: 2009,
          category: 'Computer Science',
          totalCopies: 8,
          availableCopies: 6,
          shelfLocation: 'Stack A, Shelf 4',
          coverUrl: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=600&q=80',
          description: 'Comprehensive modern textbook on algorithms, data structures, and computational complexity.',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          bookId: 'BK-1003',
          isbn: '978-0132350884',
          title: 'Clean Code: A Handbook of Agile Software Craftsmanship',
          author: 'Robert C. Martin',
          publisher: 'Prentice Hall',
          publicationYear: 2008,
          category: 'Software Engineering',
          totalCopies: 5,
          availableCopies: 4,
          shelfLocation: 'Stack B, Shelf 1',
          coverUrl: 'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?auto=format&fit=crop&w=600&q=80',
          description: 'Best engineering practices for writing readable, maintainable, and elegant software code.',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          bookId: 'BK-1004',
          isbn: '978-0134685991',
          title: 'Effective Java (3rd Edition)',
          author: 'Joshua Bloch',
          publisher: 'Addison-Wesley Professional',
          publicationYear: 2018,
          category: 'Computer Science',
          totalCopies: 4,
          availableCopies: 3,
          shelfLocation: 'Stack B, Shelf 3',
          coverUrl: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=600&q=80',
          description: 'Essential guidance for modern Java design patterns and language idioms.',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          bookId: 'BK-1005',
          isbn: '978-0199535569',
          title: 'The Great Gatsby',
          author: 'F. Scott Fitzgerald',
          publisher: 'Oxford University Press',
          publicationYear: 1925,
          category: 'Literature',
          totalCopies: 10,
          availableCopies: 8,
          shelfLocation: 'Stack C, Shelf 1',
          coverUrl: 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?auto=format&fit=crop&w=600&q=80',
          description: 'Seminal American literary exploration of wealth, idealism, and social upheaval in the Roaring Twenties.',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          bookId: 'BK-1006',
          isbn: '978-0061120084',
          title: 'To Kill a Mockingbird',
          author: 'Harper Lee',
          publisher: 'Harper Perennial',
          publicationYear: 1960,
          category: 'Literature',
          totalCopies: 7,
          availableCopies: 6,
          shelfLocation: 'Stack C, Shelf 2',
          coverUrl: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=600&q=80',
          description: 'Pulitzer Prize-winning masterpiece addressing racial injustice in the American South.',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          bookId: 'BK-1007',
          isbn: '978-0465024759',
          title: 'The Feynman Lectures on Physics (Vol. 1)',
          author: 'Richard P. Feynman, Robert B. Leighton',
          publisher: 'Basic Books',
          publicationYear: 2011,
          category: 'Physics',
          totalCopies: 5,
          availableCopies: 4,
          shelfLocation: 'Stack D, Shelf 2',
          coverUrl: 'https://images.unsplash.com/photo-1636466497217-26a8cbeaf0aa?auto=format&fit=crop&w=600&q=80',
          description: 'Revolutionary lectures delivering deep intuition on mechanics, radiation, and thermodynamics.',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          bookId: 'BK-1008',
          isbn: '978-0062316097',
          title: 'Sapiens: A Brief History of Humankind',
          author: 'Yuval Noah Harari',
          publisher: 'Harper',
          publicationYear: 2015,
          category: 'History',
          totalCopies: 9,
          availableCopies: 7,
          shelfLocation: 'Stack E, Shelf 1',
          coverUrl: 'https://images.unsplash.com/photo-1461360370896-922624d12aa1?auto=format&fit=crop&w=600&q=80',
          description: 'Provocative survey of human evolution, cognitive revolutions, and our collective modern destiny.',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          bookId: 'BK-1009',
          isbn: '978-0387985794',
          title: 'Linear Algebra Done Right (3rd Edition)',
          author: 'Sheldon Axler',
          publisher: 'Springer',
          publicationYear: 2015,
          category: 'Mathematics',
          totalCopies: 6,
          availableCopies: 6,
          shelfLocation: 'Stack D, Shelf 4',
          coverUrl: 'https://images.unsplash.com/photo-1509228468518-180dd4864904?auto=format&fit=crop&w=600&q=80',
          description: 'Novel approach focusing on linear operators and finite-dimensional vector spaces without determinants.',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          bookId: 'BK-1010',
          isbn: '978-0134093413',
          title: 'Campbell Biology (11th Edition)',
          author: 'Lisa A. Urry, Michael L. Cain',
          publisher: 'Pearson',
          publicationYear: 2016,
          category: 'Biology',
          totalCopies: 4,
          availableCopies: 3,
          shelfLocation: 'Stack E, Shelf 3',
          coverUrl: 'https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?auto=format&fit=crop&w=600&q=80',
          description: 'Standard collegiate reference for biological sciences, molecular biology, and ecology.',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      sampleBooks.forEach((book, idx) => {
        const id = `book_seed_${idx + 1}`;
        batch.set(doc(db, 'books', id), {
          id,
          ...book,
        });
      });

      const sampleStudents: Omit<Student, 'id'>[] = [
        {
          studentId: 'STU-2024-001',
          fullName: 'Aiden Brooks',
          email: 'aiden.brooks@university.edu',
          phone: '+1 (555) 234-5678',
          department: 'Computer Science & Engineering',
          course: 'B.S. Computer Science',
          registrationDate: '2024-08-15',
          status: 'active',
          activeBorrowCount: 1,
          totalFinesUnpaid: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          studentId: 'STU-2024-002',
          fullName: 'Chloe Dupont',
          email: 'chloe.dupont@university.edu',
          phone: '+1 (555) 345-6789',
          department: 'Humanities & Literature',
          course: 'B.A. English Literature',
          registrationDate: '2024-08-18',
          status: 'active',
          activeBorrowCount: 1,
          totalFinesUnpaid: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          studentId: 'STU-2024-003',
          fullName: 'Marcus Vance',
          email: 'marcus.vance@university.edu',
          phone: '+1 (555) 456-7890',
          department: 'Physics & Astronomy',
          course: 'M.S. Applied Physics',
          registrationDate: '2023-09-01',
          status: 'active',
          activeBorrowCount: 1,
          totalFinesUnpaid: 4.0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          studentId: 'STU-2024-004',
          fullName: 'Elena Rostova',
          email: 'elena.rostova@university.edu',
          phone: '+1 (555) 567-8901',
          department: 'Mathematics',
          course: 'B.S. Applied Mathematics',
          registrationDate: '2024-08-20',
          status: 'active',
          activeBorrowCount: 0,
          totalFinesUnpaid: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          studentId: 'STU-2024-005',
          fullName: 'Julian Hayes',
          email: 'julian.hayes@university.edu',
          phone: '+1 (555) 678-9012',
          department: 'Biological Sciences',
          course: 'B.S. Molecular Biology',
          registrationDate: '2024-08-22',
          status: 'active',
          activeBorrowCount: 1,
          totalFinesUnpaid: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      sampleStudents.forEach((student, idx) => {
        const id = `student_seed_${idx + 1}`;
        batch.set(doc(db, 'students', id), {
          id,
          ...student,
        });
      });

      const sampleRecords: Omit<BorrowRecord, 'id'>[] = [
        {
          recordId: 'REC-2026-001',
          studentId: 'STU-2024-001',
          studentName: 'Aiden Brooks',
          studentEmail: 'aiden.brooks@university.edu',
          bookId: 'BK-1002',
          bookTitle: 'Introduction to Algorithms (CLRS)',
          bookIsbn: '978-0262033848',
          issueDate: '2026-10-20',
          dueDate: '2026-11-03',
          returnDate: null,
          status: 'borrowed',
          overdueDays: 0,
          fineRatePerDay: 1.0,
          fineAmount: 0,
          finePaid: false,
          issuedBy: 'Dr. Eleanor Vance',
          notes: 'Standard semester checkout',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          recordId: 'REC-2026-002',
          studentId: 'STU-2024-002',
          studentName: 'Chloe Dupont',
          studentEmail: 'chloe.dupont@university.edu',
          bookId: 'BK-1005',
          bookTitle: 'The Great Gatsby',
          bookIsbn: '978-0199535569',
          issueDate: '2026-10-22',
          dueDate: '2026-11-05',
          returnDate: null,
          status: 'borrowed',
          overdueDays: 0,
          fineRatePerDay: 1.0,
          fineAmount: 0,
          finePaid: false,
          issuedBy: 'Dr. Eleanor Vance',
          notes: 'Term paper research',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          recordId: 'REC-2026-003',
          studentId: 'STU-2024-003',
          studentName: 'Marcus Vance',
          studentEmail: 'marcus.vance@university.edu',
          bookId: 'BK-1007',
          bookTitle: 'The Feynman Lectures on Physics (Vol. 1)',
          bookIsbn: '978-0465024759',
          issueDate: '2026-10-10',
          dueDate: '2026-10-24',
          returnDate: null,
          status: 'overdue',
          overdueDays: 8,
          fineRatePerDay: 1.0,
          fineAmount: 8.0,
          finePaid: false,
          issuedBy: 'Library Staff',
          notes: 'Courtesy reminder emailed',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          recordId: 'REC-2026-004',
          studentId: 'STU-2024-005',
          studentName: 'Julian Hayes',
          studentEmail: 'julian.hayes@university.edu',
          bookId: 'BK-1010',
          bookTitle: 'Campbell Biology (11th Edition)',
          bookIsbn: '978-0134093413',
          issueDate: '2026-10-25',
          dueDate: '2026-11-08',
          returnDate: null,
          status: 'borrowed',
          overdueDays: 0,
          fineRatePerDay: 1.0,
          fineAmount: 0,
          finePaid: false,
          issuedBy: 'Dr. Eleanor Vance',
          notes: 'Bio 101 reference',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          recordId: 'REC-2026-005',
          studentId: 'STU-2024-004',
          studentName: 'Elena Rostova',
          studentEmail: 'elena.rostova@university.edu',
          bookId: 'BK-1003',
          bookTitle: 'Clean Code: A Handbook of Agile Software Craftsmanship',
          bookIsbn: '978-0132350884',
          issueDate: '2026-10-01',
          dueDate: '2026-10-15',
          returnDate: '2026-10-14',
          status: 'returned',
          overdueDays: 0,
          fineRatePerDay: 1.0,
          fineAmount: 0,
          finePaid: true,
          issuedBy: 'Dr. Eleanor Vance',
          returnedBy: 'Dr. Eleanor Vance',
          notes: 'Returned in pristine condition',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      sampleRecords.forEach((record, idx) => {
        const id = `record_seed_${idx + 1}`;
        batch.set(doc(db, 'borrow_records', id), {
          id,
          ...record,
        });
      });

      const sampleNotifs: Omit<NotificationItem, 'id'>[] = [
        {
          notificationId: 'notif_1',
          title: 'Overdue Notice',
          message: 'The Feynman Lectures on Physics is 8 days overdue. Current fine balance is $8.00.',
          type: 'overdue',
          read: false,
          userEmail: 'marcus.vance@university.edu',
          createdAt: new Date(Date.now() - 3600 * 1000 * 4).toISOString(),
        },
        {
          notificationId: 'notif_2',
          title: 'Due Date Approaching',
          message: '"The Great Gatsby" is due in 4 days (Nov 5, 2026).',
          type: 'due_soon',
          read: false,
          userEmail: 'chloe.dupont@university.edu',
          createdAt: new Date(Date.now() - 3600 * 1000 * 12).toISOString(),
        },
        {
          notificationId: 'notif_3',
          title: 'Book Returned Successfully',
          message: '"Clean Code" returned on time by Elena Rostova.',
          type: 'returned',
          read: true,
          userEmail: 'elena.rostova@university.edu',
          createdAt: new Date(Date.now() - 3600 * 1000 * 48).toISOString(),
        },
      ];

      sampleNotifs.forEach((n, idx) => {
        const id = `notif_seed_${idx + 1}`;
        batch.set(doc(db, 'notifications', id), {
          id,
          ...n,
        });
      });

      await batch.commit();

      try {
        confetti({
          particleCount: 80,
          spread: 80,
          origin: { y: 0.6 },
        });
      } catch (e) {
        // ignore
      }

      addToast('success', 'Library Catalog Seeded', 'Loaded 10 books, 5 students, and active circulation records.');
    } catch (error) {
      console.error('Seed error:', error);
      addToast('error', 'Seeding Failed', error instanceof Error ? error.message : 'Database error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <LibraryContext.Provider
      value={{
        books,
        students,
        borrowRecords,
        notifications,
        settings,
        librarians,
        loading,
        toasts,
        addToast,
        removeToast,
        addBook,
        updateBook,
        deleteBook,
        addStudent,
        updateStudent,
        deleteStudent,
        issueBook,
        returnBook,
        payFine,
        updateSettings,
        addLibrarian,
        removeLibrarian,
        markNotificationRead,
        clearAllNotifications,
        seedSampleData,
        stats,
      }}
    >
      {children}
    </LibraryContext.Provider>
  );
};

export const useLibrary = () => {
  const context = useContext(LibraryContext);
  if (!context) {
    throw new Error('useLibrary must be used within a LibraryProvider');
  }
  return context;
};
