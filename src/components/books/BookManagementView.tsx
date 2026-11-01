/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  BookOpen,
  Search,
  Filter,
  Plus,
  Edit2,
  Trash2,
  CheckCircle,
  XCircle,
  MapPin,
  Calendar,
  Layers,
  BookCopy,
  Info,
  X,
  Sparkles,
} from 'lucide-react';
import { useLibrary } from '../../context/LibraryContext.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import { Book } from '../../types/library.ts';

interface BookManagementViewProps {
  onIssueBookWithPreset?: (bookId: string) => void;
}

export const BookManagementView: React.FC<BookManagementViewProps> = ({ onIssueBookWithPreset }) => {
  const { books, addBook, updateBook, deleteBook, seedSampleData } = useLibrary();
  const { activeRole } = useAuth();
  const isStaff = activeRole === 'admin' || activeRole === 'librarian';
  const isAdmin = activeRole === 'admin';

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [availabilityFilter, setAvailabilityFilter] = useState<'all' | 'available' | 'out_of_stock'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [viewingBook, setViewingBook] = useState<Book | null>(null);
  const [deletingBook, setDeletingBook] = useState<Book | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    bookId: '',
    isbn: '',
    title: '',
    author: '',
    publisher: '',
    publicationYear: new Date().getFullYear(),
    category: 'Computer Science',
    totalCopies: 5,
    availableCopies: 5,
    shelfLocation: 'Stack A, Shelf 1',
    coverUrl: '',
    description: '',
  });

  const categories = useMemo(() => {
    const list = Array.from(new Set(books.map((b) => b.category).filter(Boolean)));
    return ['all', ...list];
  }, [books]);

  // Filtered books
  const filteredBooks = useMemo(() => {
    return books.filter((book) => {
      const q = searchTerm.toLowerCase();
      const matchesSearch =
        book.title.toLowerCase().includes(q) ||
        book.author.toLowerCase().includes(q) ||
        book.isbn.toLowerCase().includes(q) ||
        book.bookId.toLowerCase().includes(q) ||
        book.category.toLowerCase().includes(q);

      const matchesCat = selectedCategory === 'all' || book.category.toLowerCase() === selectedCategory.toLowerCase();

      let matchesAvail = true;
      if (availabilityFilter === 'available') {
        matchesAvail = book.availableCopies > 0;
      } else if (availabilityFilter === 'out_of_stock') {
        matchesAvail = book.availableCopies <= 0;
      }

      return matchesSearch && matchesCat && matchesAvail;
    });
  }, [books, searchTerm, selectedCategory, availabilityFilter]);

  const handleOpenAdd = () => {
    const randomId = `BK-${1000 + books.length + 1}`;
    setFormData({
      bookId: randomId,
      isbn: `978-0${Math.floor(100000000 + Math.random() * 900000000)}`,
      title: '',
      author: '',
      publisher: 'University Press',
      publicationYear: 2024,
      category: 'Computer Science',
      totalCopies: 5,
      availableCopies: 5,
      shelfLocation: 'Stack A, Shelf 1',
      coverUrl: '',
      description: '',
    });
    setEditingBook(null);
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (book: Book) => {
    setEditingBook(book);
    setFormData({
      bookId: book.bookId,
      isbn: book.isbn,
      title: book.title,
      author: book.author,
      publisher: book.publisher || '',
      publicationYear: book.publicationYear || 2024,
      category: book.category || 'General',
      totalCopies: book.totalCopies,
      availableCopies: book.availableCopies,
      shelfLocation: book.shelfLocation || '',
      coverUrl: book.coverUrl || '',
      description: book.description || '',
    });
    setIsAddModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.author || !formData.bookId || !formData.isbn) {
      alert('Please fill in required fields: Book ID, ISBN, Title, and Author.');
      return;
    }

    try {
      setIsSubmitting(true);
      if (editingBook) {
        await updateBook(editingBook.id, formData);
      } else {
        await addBook(formData);
      }
      setIsAddModalOpen(false);
    } catch (err) {
      // handled in context toast
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingBook) return;
    try {
      setIsSubmitting(true);
      await deleteBook(deletingBook.id, deletingBook.title);
      setDeletingBook(null);
    } catch (err) {
      // handled
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-600" />
            {isStaff ? 'Library Catalog & Inventory' : 'University Book Catalog'}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {books.length} titles indexed • {filteredBooks.length} matching current filter
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {books.length === 0 && (
            <button
              onClick={seedSampleData}
              className="px-3 py-2 text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-emerald-600" />
              Seed Demo Books
            </button>
          )}

          {isStaff && (
            <button
              onClick={handleOpenAdd}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Add New Book
            </button>
          )}
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row items-center gap-3">
          {/* Search bar */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by Title, Author, ISBN, or Catalog ID..."
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
              >
                Clear
              </button>
            )}
          </div>

          {/* Availability filter */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl w-full md:w-auto shrink-0 text-xs font-medium">
            <button
              onClick={() => setAvailabilityFilter('all')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                availabilityFilter === 'all' ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Status
            </button>
            <button
              onClick={() => setAvailabilityFilter('available')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                availabilityFilter === 'available' ? 'bg-white text-emerald-700 shadow-2xs font-semibold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Available
            </button>
            <button
              onClick={() => setAvailabilityFilter('out_of_stock')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                availabilityFilter === 'out_of_stock' ? 'bg-white text-rose-700 shadow-2xs font-semibold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Checked Out
            </button>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <span className="text-slate-400 text-[11px] font-semibold uppercase tracking-wider mr-1">Discipline:</span>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 rounded-lg text-xs capitalize whitespace-nowrap transition-colors cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-blue-600 text-white font-semibold shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat === 'all' ? 'All Disciplines' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Books Display: Grid vs Table */}
      {filteredBooks.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <BookOpen className="w-12 h-12 mx-auto text-slate-300 mb-3" />
          <h3 className="text-sm font-bold text-slate-800">No books found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Try adjusting your search terms or availability filters, or add new books to the catalog.
          </p>
          {isStaff && (
            <button
              onClick={handleOpenAdd}
              className="mt-4 px-4 py-2 text-xs font-semibold bg-blue-600 text-white rounded-xl shadow-xs hover:bg-blue-700 transition-colors cursor-pointer"
            >
              Add First Book
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredBooks.map((book) => {
            const isAvailable = book.availableCopies > 0;
            const percentAvailable = book.totalCopies > 0 ? (book.availableCopies / book.totalCopies) * 100 : 0;

            return (
              <div
                key={book.id}
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs hover:shadow-md hover:border-blue-300 transition-all flex flex-col group"
              >
                {/* Book Cover Banner */}
                <div className="h-40 bg-slate-900 relative overflow-hidden flex items-center justify-center">
                  {book.coverUrl ? (
                    <img
                      src={book.coverUrl}
                      alt={book.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  ) : null}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent"></div>

                  {/* Badges on cover */}
                  <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-slate-900/80 text-white backdrop-blur-xs font-mono">
                      {book.bookId}
                    </span>
                    <span
                      className={`px-2 py-0.5 text-[10px] font-bold rounded-md backdrop-blur-xs uppercase tracking-wider ${
                        isAvailable
                          ? 'bg-emerald-500/90 text-white'
                          : 'bg-rose-500/90 text-white'
                      }`}
                    >
                      {isAvailable ? `${book.availableCopies} Available` : 'Out of Stock'}
                    </span>
                  </div>

                  <div className="absolute bottom-3 left-3 right-3">
                    <span className="px-2 py-0.5 text-[10px] font-semibold rounded-md bg-blue-600/90 text-white">
                      {book.category}
                    </span>
                  </div>
                </div>

                {/* Body info */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    <h3
                      onClick={() => setViewingBook(book)}
                      className="font-bold text-slate-900 text-sm hover:text-blue-600 transition-colors line-clamp-2 cursor-pointer"
                      title={book.title}
                    >
                      {book.title}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-1">by {book.author}</p>
                  </div>

                  {/* Metadata chips */}
                  <div className="space-y-2 text-[11px] text-slate-600 border-t border-slate-100 pt-3">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">ISBN:</span>
                      <span className="font-mono text-slate-700">{book.isbn}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        Shelf:
                      </span>
                      <span className="font-medium text-slate-700 truncate max-w-[130px]">{book.shelfLocation}</span>
                    </div>

                    {/* Copies availability bar */}
                    <div>
                      <div className="flex items-center justify-between text-[10px] mb-1">
                        <span className="text-slate-500">Holdings:</span>
                        <span className="font-semibold text-slate-700">
                          {book.availableCopies} of {book.totalCopies} copies
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            percentAvailable > 50 ? 'bg-emerald-500' : percentAvailable > 0 ? 'bg-amber-500' : 'bg-rose-500'
                          }`}
                          style={{ width: `${percentAvailable}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                    <button
                      onClick={() => setViewingBook(book)}
                      className="px-2.5 py-1.5 text-xs text-slate-600 hover:text-blue-600 font-medium hover:bg-blue-50 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Info className="w-3.5 h-3.5" />
                      Details
                    </button>

                    {isStaff ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenEdit(book)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          title="Edit Book"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        {isAdmin && (
                          <button
                            onClick={() => setDeletingBook(book)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Delete Book"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ) : (
                      <span className="text-[11px] text-slate-400 font-medium">
                        {isAvailable ? 'In Library' : 'Loaned Out'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Book Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-blue-600" />
                {editingBook ? 'Edit Book Details' : 'Add New Book to Catalog'}
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Book Catalog ID *</label>
                  <input
                    type="text"
                    required
                    value={formData.bookId}
                    onChange={(e) => setFormData({ ...formData, bookId: e.target.value })}
                    placeholder="e.g. BK-1025"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-mono focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">ISBN Number *</label>
                  <input
                    type="text"
                    required
                    value={formData.isbn}
                    onChange={(e) => setFormData({ ...formData, isbn: e.target.value })}
                    placeholder="e.g. 978-0131103627"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-mono focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Book Title *</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Artificial Intelligence: A Modern Approach"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Author Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.author}
                    onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                    placeholder="e.g. Stuart Russell, Peter Norvig"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Publisher</label>
                  <input
                    type="text"
                    value={formData.publisher}
                    onChange={(e) => setFormData({ ...formData, publisher: e.target.value })}
                    placeholder="e.g. Pearson"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Category / Discipline</label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    placeholder="e.g. Computer Science"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Publication Year</label>
                  <input
                    type="number"
                    min="1800"
                    max="2030"
                    value={formData.publicationYear}
                    onChange={(e) => setFormData({ ...formData, publicationYear: parseInt(e.target.value) || 2024 })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Shelf Location</label>
                  <input
                    type="text"
                    value={formData.shelfLocation}
                    onChange={(e) => setFormData({ ...formData, shelfLocation: e.target.value })}
                    placeholder="Stack B, Shelf 3"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Total Copies</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={formData.totalCopies}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 1;
                      setFormData({
                        ...formData,
                        totalCopies: val,
                        availableCopies: Math.min(formData.availableCopies, val),
                      });
                    }}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Available Copies</label>
                  <input
                    type="number"
                    min="0"
                    max={formData.totalCopies}
                    value={formData.availableCopies}
                    onChange={(e) => setFormData({ ...formData, availableCopies: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Cover Image URL (Optional)</label>
                <input
                  type="url"
                  value={formData.coverUrl}
                  onChange={(e) => setFormData({ ...formData, coverUrl: e.target.value })}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Synopsis / Notes</label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief overview of contents, prerequisites, or editions..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
                ></textarea>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? 'Saving...' : editingBook ? 'Save Changes' : 'Add to Catalog'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Book Details Modal */}
      {viewingBook && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-start justify-between pb-4 border-b border-slate-100">
              <div>
                <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-slate-100 text-slate-700 rounded-md">
                  {viewingBook.bookId}
                </span>
                <h3 className="text-lg font-bold text-slate-900 mt-1">{viewingBook.title}</h3>
                <p className="text-xs text-slate-500">by {viewingBook.author}</p>
              </div>
              <button
                onClick={() => setViewingBook(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              {viewingBook.coverUrl && (
                <div className="w-full h-44 rounded-xl overflow-hidden bg-slate-900">
                  <img src={viewingBook.coverUrl} alt={viewingBook.title} className="w-full h-full object-cover" />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">ISBN</span>
                  <span className="font-mono text-slate-800 font-semibold">{viewingBook.isbn}</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Category</span>
                  <span className="text-slate-800 font-semibold">{viewingBook.category}</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Publisher & Year</span>
                  <span className="text-slate-800 font-semibold">
                    {viewingBook.publisher} ({viewingBook.publicationYear})
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Shelf Location</span>
                  <span className="text-slate-800 font-semibold">{viewingBook.shelfLocation}</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-100 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-blue-900">Current Shelf Availability</span>
                  <p className="text-[11px] text-blue-700">
                    {viewingBook.availableCopies} available out of {viewingBook.totalCopies} total copies
                  </p>
                </div>
                <span
                  className={`px-3 py-1 text-xs font-bold rounded-lg ${
                    viewingBook.availableCopies > 0 ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
                  }`}
                >
                  {viewingBook.availableCopies > 0 ? 'Available' : 'Unavailable'}
                </span>
              </div>

              {viewingBook.description && (
                <div>
                  <span className="text-xs font-semibold text-slate-700 block mb-1">Description</span>
                  <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                    {viewingBook.description}
                  </p>
                </div>
              )}
            </div>

            <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-end">
              <button
                onClick={() => setViewingBook(null)}
                className="px-4 py-2 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-xl transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingBook && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mb-3">
              <Trash2 className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Remove Book from Catalog?</h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Are you sure you want to delete <strong>"{deletingBook.title}"</strong> (ID: {deletingBook.bookId})? This will permanently remove it from library records.
            </p>

            <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeletingBook(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                {isSubmitting ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
