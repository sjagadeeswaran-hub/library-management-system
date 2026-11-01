# Security Specification & Security TDD Matrix

## 1. Data Invariants
1. **Administrative Access**: Admin actions (deleting books, changing global settings, managing librarian roles) require the caller to either have a record in `/admins/{uid}` or match the bootstrapped admin email `sjagadees59@gmail.com`.
2. **Staff Access**: Book management, student registry creation/modification, issuing books, processing returns, and recording fines can only be executed by authenticated staff (Admin or Librarian in `/librarians/{uid}`).
3. **Student Privacy**: Students can view their own borrowing history and notifications (`studentEmail == request.auth.token.email` or `userId == request.auth.uid`), but cannot view other students' private records or modify inventory.
4. **Catalog Readability**: Authenticated users can browse and query books in the catalog.
5. **Inventory Integrity**: Available copies cannot exceed total copies, cannot be negative, and can only be altered through authorized issue/return transactions.
6. **Immutable Fields**: Primary keys (`bookId`, `studentId`, `recordId`), issue dates, and original timestamps cannot be mutated after creation.
7. **Fine & Overdue Integrity**: Only staff can update return records, mark fines as paid, or close out borrow records.

---

## 2. The "Dirty Dozen" Threat Payloads (Must be Denied)
1. **Payload 1 (Privilege Escalation)**: Student attempts to write a document to `/admins/{their_uid}` or `/librarians/{their_uid}` to grant themselves staff powers.
2. **Payload 2 (Ghost Book Creation)**: Unauthenticated visitor attempts to insert a book into `/books/{bookId}`.
3. **Payload 3 (Negative Inventory Attack)**: Malicious client attempts to update a book with `availableCopies: -5`.
4. **Payload 4 (Student Profile Scraping)**: Student A queries `/students/{studentB_Id}` where email does not match `request.auth.token.email`.
5. **Payload 5 (Self-Borrowing Forgery)**: Student attempts to insert a `/borrow_records/{recordId}` directly bypassing staff authorization.
6. **Payload 6 (Fine Forgiveness Tamper)**: Student updates their borrow record to set `finePaid: true` and `fineAmount: 0`.
7. **Payload 7 (Denial-of-Wallet Massive String)**: Attacker attempts to write a book title with a 2MB payload string.
8. **Payload 8 (Path ID Poisoning)**: Write with invalid document ID containing path traversal characters like `../../hack`.
9. **Payload 9 (Settings Hijack)**: Non-admin user tries to update `/settings/global` to change `fineRatePerDay: 0`.
10. **Payload 10 (Notification Impersonation)**: Regular user sends a notification to another user's inbox in `/notifications/{id}`.
11. **Payload 11 (Student Roster Deletion)**: Student or unauthorized user attempts `delete` on `/students/{id}`.
12. **Payload 12 (Immortality Violation)**: Staff member or attacker tries to overwrite `recordId` or `issueDate` on an existing `/borrow_records/{id}`.

---

## 3. Test Runner Specification
All 12 payloads must result in `PERMISSION_DENIED` under the enforced security rules.
