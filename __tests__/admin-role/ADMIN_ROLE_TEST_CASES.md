# 🛡️ Admin Role - Detailed Test Cases

## Overview
This document contains comprehensive test cases for the **Admin** role in the LetLink mobile app. Admins are system administrators who can manage all aspects of the platform including users, cases, bookings, vouchers, banners, categories, blogs, lawyers, and law firms.

---

## Table of Contents
1. [Authentication & Session](#1-authentication--session)
2. [Admin Dashboard](#2-admin-dashboard)
3. [Manage Cases](#3-manage-cases)
4. [Manage Bookings](#4-manage-bookings)
5. [Manage Vouchers](#5-manage-vouchers)
6. [Assign Vouchers to Users](#6-assign-vouchers-to-users)
7. [Manage Banners](#7-manage-banners)
8. [Manage Categories](#8-manage-categories)
9. [Manage Blogs](#9-manage-blogs)
10. [Manage Lawyers](#10-manage-lawyers)
11. [Manage Law Firms](#11-manage-law-firms)
12. [Admin Chat](#12-admin-chat)
13. [Profile & Settings](#13-profile--settings)
14. [Notifications](#14-notifications)

---

## 1. Authentication & Session

### 1.1 Admin Login

| Test ID | Test Case | Preconditions | Test Steps | Expected Result | Priority |
|---------|-----------|---------------|------------|-----------------|----------|
| ADMIN-AUTH-001 | Successful login as Admin | Verified admin account | 1. Enter valid email<br>2. Enter valid password<br>3. Tap "Login" | Logged in with Admin role, redirect to Admin Dashboard | High |
| ADMIN-AUTH-002 | Login shows Admin-specific tabs | Logged in as Admin | 1. View bottom tab bar | Shows: Home, Chat, Manage Bookings, Edit Profile (tabs may vary) | High |
| ADMIN-AUTH-003 | Dashboard shows admin quick actions | Logged in as Admin | 1. View Dashboard | Admin-only quick actions visible: Manage Vouchers, Manage Cases, Manage Blogs, etc. | High |
| ADMIN-AUTH-004 | Token contains Admin role | Login successful | 1. Check JWT token | ActiveRole = "Admin" in token claims | High |
| ADMIN-AUTH-005 | Can access all admin screens | Logged in as Admin | 1. Navigate to any admin screen | All admin screens accessible | High |

### 1.2 Role-Specific Access Control

| Test ID | Test Case | Preconditions | Test Steps | Expected Result | Priority |
|---------|-----------|---------------|------------|-----------------|----------|
| ADMIN-AUTH-006 | Can access Manage Vouchers | Logged in as Admin | 1. Navigate to Manage Vouchers | Voucher management screen displays | High |
| ADMIN-AUTH-007 | Can access Manage Banners | Logged in as Admin | 1. Navigate to Manage Banners | Banner management screen displays | High |
| ADMIN-AUTH-008 | Can access Manage Categories | Logged in as Admin | 1. Navigate to Manage Categories | Category management screen displays | High |
| ADMIN-AUTH-009 | Can access Manage Blogs | Logged in as Admin | 1. Navigate to Manage Blogs | Blog management screen displays | High |
| ADMIN-AUTH-010 | Can access Manage Lawyers | Logged in as Admin | 1. Navigate to Manage Lawyers | Lawyer management screen displays | High |
| ADMIN-AUTH-011 | Can access Manage Law Firms | Logged in as Admin | 1. Navigate to Manage Law Firms | Law Firm management screen displays | High |
| ADMIN-AUTH-012 | Can access Admin Chat | Logged in as Admin | 1. Navigate to Admin Chat | Admin chat screen displays | High |
| ADMIN-AUTH-013 | Role persists after app restart | Logged in as Admin, close app | 1. Reopen app | User remains logged in as Admin with correct tabs | High |
| ADMIN-AUTH-014 | Admin has full case management | Logged in as Admin | 1. View any case | Can edit, assign, and manage all cases | High |
| ADMIN-AUTH-015 | Admin can assign lawyers and law firms | Logged in as Admin | 1. Open case details<br>2. Assign lawyer/law firm | Assignment successful | High |

---

## 2. Admin Dashboard

### 2.1 Dashboard Display

| Test ID | Test Case | Preconditions | Test Steps | Expected Result | Priority |
|---------|-----------|---------------|------------|-----------------|----------|
| ADMIN-DASH-001 | Dashboard loads correctly | Admin logged in | 1. Navigate to Dashboard | Admin Dashboard displays with logo, avatar, stats, quick actions | High |
| ADMIN-DASH-002 | Logo and Avatar displayed | Admin logged in | 1. View Dashboard header | LetLink logo on left, Admin avatar on right | High |
| ADMIN-DASH-003 | Avatar tap opens profile menu | Admin logged in | 1. Tap on avatar | Profile menu modal opens | Medium |
| ADMIN-DASH-004 | Statistics cards display | Admin logged in | 1. View Dashboard | Stats cards show: Total Users, Total Cases, Total Bookings, Total Vouchers, Pending Cases, Active Bookings | High |
| ADMIN-DASH-005 | Statistics loading state | First load | 1. View Dashboard | Loading indicator while fetching stats | Medium |
| ADMIN-DASH-006 | Pull to refresh | On Dashboard | 1. Pull down to refresh | Statistics and data refreshed | Medium |

### 2.2 Quick Actions

| Test ID | Test Case | Preconditions | Test Steps | Expected Result | Priority |
|---------|-----------|---------------|------------|-----------------|----------|
| ADMIN-DASH-007 | Manage Vouchers action | On Admin Dashboard | 1. Tap "Manage Vouchers" | Navigate to Voucher Management screen | High |
| ADMIN-DASH-008 | Manage Cases action | On Admin Dashboard | 1. Tap "Manage Cases" | Navigate to Case Management screen | High |
| ADMIN-DASH-009 | Manage Blogs action | On Admin Dashboard | 1. Tap "Manage Blogs" | Navigate to Blog Management screen | High |
| ADMIN-DASH-010 | Admin Chat action | On Admin Dashboard | 1. Tap "Admin Chat" | Navigate to Admin Chat screen | High |
| ADMIN-DASH-011 | Manage Banners action | On Admin Dashboard | 1. Tap "Manage Banners" | Navigate to Banner Management screen | High |
| ADMIN-DASH-012 | Manage Categories action | On Admin Dashboard | 1. Tap "Manage Categories" | Navigate to Category Management screen | High |
| ADMIN-DASH-013 | Manage Lawyers action | On Admin Dashboard | 1. Tap "Manage Lawyers" | Navigate to Lawyer Management screen | High |
| ADMIN-DASH-014 | Manage Law Firms action | On Admin Dashboard | 1. Tap "Manage Law Firms" | Navigate to Law Firm Management screen | High |
| ADMIN-DASH-015 | Quick action cards display | On Admin Dashboard | 1. View quick actions | Each action shows icon, title, and appropriate color | Medium |

---

## 3. Manage Cases

### 3.1 Case Management Screen

| Test ID | Test Case | Preconditions | Test Steps | Expected Result | Priority |
|---------|-----------|---------------|------------|-----------------|----------|
| ADMIN-CASE-001 | Access Case Management | Admin logged in | 1. Navigate to Manage Cases | Case Management screen displays with tabs | High |
| ADMIN-CASE-002 | Loading state | First load | 1. View screen | Shows loading indicator "Loading available cases..." | Medium |
| ADMIN-CASE-003 | Cases list displays | Cases exist | 1. View screen after loading | List of all cases displayed as cards | High |
| ADMIN-CASE-004 | Empty state | No cases | 1. View screen | Shows "No Cases Found" message | Medium |
| ADMIN-CASE-005 | Pull to refresh | On case list | 1. Pull down to refresh | Cases list refreshed | High |
| ADMIN-CASE-006 | Error state | API error | 1. View screen with error | Error card with "Retry" button | Medium |

### 3.2 Case Tabs

| Test ID | Test Case | Preconditions | Test Steps | Expected Result | Priority |
|---------|-----------|---------------|------------|-----------------|----------|
| ADMIN-CASE-007 | All tab | On Case Management | 1. Tap "All" tab | All cases shown regardless of status | High |
| ADMIN-CASE-008 | Draft tab | On Case Management | 1. Tap "Draft" tab | Only draft cases shown | Medium |
| ADMIN-CASE-009 | Pending tab | On Case Management | 1. Tap "Pending" tab | Only pending cases shown | High |
| ADMIN-CASE-010 | Confirmed tab | On Case Management | 1. Tap "Confirmed" tab | Only confirmed/in-progress cases shown | High |
| ADMIN-CASE-011 | Completed tab | On Case Management | 1. Tap "Completed" tab | Only completed cases shown | Medium |
| ADMIN-CASE-012 | Cancelled tab | On Case Management | 1. Tap "Cancelled" tab | Only cancelled cases shown | Medium |
| ADMIN-CASE-013 | My Applications tab hidden for Admin | Logged in as Admin | 1. View tabs | "My Applications" tab NOT visible (only for Lawyer/LawFirm) | Medium |

### 3.3 Case Search and Filter

| Test ID | Test Case | Preconditions | Test Steps | Expected Result | Priority |
|---------|-----------|---------------|------------|-----------------|----------|
| ADMIN-CASE-014 | Search bar visible | On Case Management | 1. View screen | Search bar with placeholder displayed | High |
| ADMIN-CASE-015 | Search by case number | On Case Management | 1. Enter case number | Matching cases displayed | High |
| ADMIN-CASE-016 | Search by title | On Case Management | 1. Enter case title keyword | Matching cases displayed | High |
| ADMIN-CASE-017 | Search by client name | On Case Management | 1. Enter client name | Matching cases displayed | Medium |
| ADMIN-CASE-018 | Search with no results | On Case Management | 1. Enter gibberish text | "No Cases Found" message | Medium |

### 3.4 Case Card

| Test ID | Test Case | Preconditions | Test Steps | Expected Result | Priority |
|---------|-----------|---------------|------------|-----------------|----------|
| ADMIN-CASE-019 | Case card displays | Cases exist | 1. View case card | Shows: Case No, status badge, title, client name, category, priority, date | High |
| ADMIN-CASE-020 | Status badge colors | Various cases | 1. View cases | Pending=amber, Confirmed=blue, Completed=green, Cancelled=red, Draft=grey | Medium |
| ADMIN-CASE-021 | Priority badge - Urgent | Urgent case | 1. View case card | Red priority badge "Urgent" | Medium |
| ADMIN-CASE-022 | View Details button | On case card | 1. Tap "View Details" | Navigate to Case Details screen | High |

### 3.5 Case Details (Admin View)

| Test ID | Test Case | Preconditions | Test Steps | Expected Result | Priority |
|---------|-----------|---------------|------------|-----------------|----------|
| ADMIN-CASE-023 | View case details | Case exists | 1. Tap on case card | Case details screen opens | High |
| ADMIN-CASE-024 | Case header info | On case details | 1. View header | Shows: Title, Case No, Status chip, Category chip, Priority chip | High |
| ADMIN-CASE-025 | Case description card | On case details | 1. View description card | Full case description shown | High |
| ADMIN-CASE-026 | Budget Range card | On case details | 1. View budget card | Shows min-max price range | High |
| ADMIN-CASE-027 | Assigned Price (editable) | On case details | 1. View assigned price | Admin can edit assigned price | High |
| ADMIN-CASE-028 | Location card | On case details | 1. View location card | Shows case location | Medium |
| ADMIN-CASE-029 | IC Number card | On case details | 1. View IC Number card | Shows client IC number | Medium |
| ADMIN-CASE-030 | Client Information card | On case details | 1. View client section | Client name, email, phone visible | High |
| ADMIN-CASE-031 | Assigned Lawyer/Law Firm card | On case details | 1. View assigned section | Shows assigned lawyer and/or law firm | High |
| ADMIN-CASE-032 | Case Status History | On case details | 1. View status history | Shows all status changes with timestamps | Medium |

### 3.6 Assign Lawyer/Law Firm

| Test ID | Test Case | Preconditions | Test Steps | Expected Result | Priority |
|---------|-----------|---------------|------------|-----------------|----------|
| ADMIN-CASE-033 | Assign to Lawyer button | On case details | 1. Tap "Assign to Lawyer" | Assign modal opens | High |
| ADMIN-CASE-034 | Assign modal displays | Modal open | 1. View modal | Shows law firm picker and lawyer picker | High |
| ADMIN-CASE-035 | Select Law Firm | In assign modal | 1. Open law firm picker<br>2. Select law firm | Law firm selected, lawyers filtered by firm | High |
| ADMIN-CASE-036 | Select Lawyer | Law firm selected | 1. Open lawyer picker<br>2. Select lawyer | Lawyer selected | High |
| ADMIN-CASE-037 | Confirm assignment | Both selected | 1. Tap "Assign" | Loading state, then success | High |
| ADMIN-CASE-038 | Assignment success | Assignment confirmed | 1. Complete assignment | Success message, case details updated | High |
| ADMIN-CASE-039 | Cancel assignment | Modal open | 1. Tap "Cancel" | Modal closes, no changes | Medium |

### 3.7 Case Actions

| Test ID | Test Case | Preconditions | Test Steps | Expected Result | Priority |
|---------|-----------|---------------|------------|-----------------|----------|
| ADMIN-CASE-040 | Update case status | On case details | 1. Tap status update option | Status update modal appears | High |
| ADMIN-CASE-041 | Change to In Progress | Pending case | 1. Update status to "In Progress" | Status changed, history updated | High |
| ADMIN-CASE-042 | Complete case | In Progress case | 1. Update status to "Completed" | Status changed, history updated | High |
| ADMIN-CASE-043 | Cancel case | Active case | 1. Update status to "Cancelled" | Confirmation dialog, then cancelled | High |
| ADMIN-CASE-044 | Edit assigned price | On case details | 1. Edit price field<br>2. Save | Price updated | Medium |
| ADMIN-CASE-045 | Contact client | On case details | 1. Tap "Contact Client" | Navigate to chat with client | High |

---

## 4. Manage Bookings

### 4.1 Booking Management Screen

| Test ID | Test Case | Preconditions | Test Steps | Expected Result | Priority |
|---------|-----------|---------------|------------|-----------------|----------|
| ADMIN-BOOK-001 | Access Booking Management | Admin logged in | 1. Navigate to Manage Bookings | Booking Management screen displays | High |
| ADMIN-BOOK-002 | Loading state | First load | 1. View screen | Shows loading indicator | Medium |
| ADMIN-BOOK-003 | Bookings list displays | Bookings exist | 1. View screen after loading | List of all bookings displayed | High |
| ADMIN-BOOK-004 | Empty state | No bookings | 1. View screen | Shows "No Bookings Found" message | Medium |
| ADMIN-BOOK-005 | Pull to refresh | On booking list | 1. Pull down to refresh | Bookings list refreshed | High |

### 4.2 Booking Tabs

| Test ID | Test Case | Preconditions | Test Steps | Expected Result | Priority |
|---------|-----------|---------------|------------|-----------------|----------|
| ADMIN-BOOK-006 | All tab | On Booking Management | 1. Tap "All" tab | All bookings shown | High |
| ADMIN-BOOK-007 | Pending tab | On Booking Management | 1. Tap "Pending" tab | Only pending bookings shown | High |
| ADMIN-BOOK-008 | Confirmed tab | On Booking Management | 1. Tap "Confirmed" tab | Only confirmed bookings shown | High |
| ADMIN-BOOK-009 | Completed tab | On Booking Management | 1. Tap "Completed" tab | Only completed bookings shown | Medium |
| ADMIN-BOOK-010 | Cancelled tab | On Booking Management | 1. Tap "Cancelled" tab | Only cancelled bookings shown | Medium |

### 4.3 Booking Card and Details

| Test ID | Test Case | Preconditions | Test Steps | Expected Result | Priority |
|---------|-----------|---------------|------------|-----------------|----------|
| ADMIN-BOOK-011 | Booking card displays | Bookings exist | 1. View booking card | Shows: Booking No, status, client name, lawyer name, date/time | High |
| ADMIN-BOOK-012 | View booking details | On booking card | 1. Tap on card | Booking details screen opens | High |
| ADMIN-BOOK-013 | Booking actions | On booking details | 1. View actions | Can confirm, reschedule, or cancel booking | High |
| ADMIN-BOOK-014 | Confirm booking | Pending booking | 1. Tap "Confirm" | Booking confirmed | High |
| ADMIN-BOOK-015 | Cancel booking | Active booking | 1. Tap "Cancel"<br>2. Confirm | Booking cancelled | High |

---

## 5. Manage Vouchers

### 5.1 Voucher Management Screen

| Test ID | Test Case | Preconditions | Test Steps | Expected Result | Priority |
|---------|-----------|---------------|------------|-----------------|----------|
| ADMIN-VOUCH-001 | Access Voucher Management | Admin logged in | 1. Navigate to Manage Vouchers | Voucher Management screen displays | High |
| ADMIN-VOUCH-002 | Access denied for non-Admin | Logged in as Lawyer | 1. Try to access Manage Vouchers | Shows "Access Denied" message | High |
| ADMIN-VOUCH-003 | Loading state | First load | 1. View screen | Shows loading indicator | Medium |
| ADMIN-VOUCH-004 | Vouchers list displays | Vouchers exist | 1. View screen after loading | List of all vouchers displayed as cards | High |
| ADMIN-VOUCH-005 | Empty state | No vouchers | 1. View screen | Shows "No Vouchers Found" message | Medium |
| ADMIN-VOUCH-006 | Pull to refresh | On voucher list | 1. Pull down to refresh | Vouchers list refreshed | High |

### 5.2 Voucher Search

| Test ID | Test Case | Preconditions | Test Steps | Expected Result | Priority |
|---------|-----------|---------------|------------|-----------------|----------|
| ADMIN-VOUCH-007 | Search bar visible | On Voucher Management | 1. View screen | Search bar with placeholder displayed | High |
| ADMIN-VOUCH-008 | Search by voucher name | On Voucher Management | 1. Enter voucher name | Matching vouchers displayed | High |
| ADMIN-VOUCH-009 | Search with no results | On Voucher Management | 1. Enter gibberish text | "No Vouchers Found" message | Medium |

### 5.3 Voucher Card

| Test ID | Test Case | Preconditions | Test Steps | Expected Result | Priority |
|---------|-----------|---------------|------------|-----------------|----------|
| ADMIN-VOUCH-010 | Voucher card displays | Vouchers exist | 1. View voucher card | Shows: Name, currency, price, expiry date, status | High |
| ADMIN-VOUCH-011 | Status badge - Active | Active voucher | 1. View voucher card | Green status badge | Medium |
| ADMIN-VOUCH-012 | Status badge - Expired | Expired voucher | 1. View voucher card | Red status badge | Medium |
| ADMIN-VOUCH-013 | Edit button | On voucher card | 1. Tap edit icon | Navigate to Edit Voucher screen | High |
| ADMIN-VOUCH-014 | Delete button | On voucher card | 1. Tap delete icon | Delete confirmation dialog opens | High |

### 5.4 Create Voucher

| Test ID | Test Case | Preconditions | Test Steps | Expected Result | Priority |
|---------|-----------|---------------|------------|-----------------|----------|
| ADMIN-VOUCH-015 | FAB button visible | On Voucher Management | 1. View screen | Floating Action Button (+) visible | High |
| ADMIN-VOUCH-016 | Tap FAB opens create screen | On Voucher Management | 1. Tap FAB | Navigate to Create Voucher screen | High |
| ADMIN-VOUCH-017 | Create form displays | On Create Voucher | 1. View form | Fields: Name, Currency, Price, Expiry Date, Description, Terms, No Expiry toggle | High |
| ADMIN-VOUCH-018 | Enter voucher name (Required) | On Create Voucher | 1. Enter voucher name | Name accepted | High |
| ADMIN-VOUCH-019 | Name validation - empty | On Create Voucher | 1. Leave name empty<br>2. Submit | Error: "Name is required" | High |
| ADMIN-VOUCH-020 | Select currency | On Create Voucher | 1. Tap currency picker<br>2. Select currency | Currency selected (MYR, USD, etc.) | High |
| ADMIN-VOUCH-021 | Enter price (Required) | On Create Voucher | 1. Enter price amount | Price accepted, numeric keyboard | High |
| ADMIN-VOUCH-022 | Select expiry date | On Create Voucher | 1. Tap date picker<br>2. Select date | Date selected | High |
| ADMIN-VOUCH-023 | No Expiry toggle | On Create Voucher | 1. Toggle "No Expiry" on | Expiry date field disabled | Medium |
| ADMIN-VOUCH-024 | Enter description | On Create Voucher | 1. Enter description | Text accepted | Medium |
| ADMIN-VOUCH-025 | Enter terms | On Create Voucher | 1. Enter terms and conditions | Text accepted | Medium |
| ADMIN-VOUCH-026 | Submit create form | All fields valid | 1. Fill all required fields<br>2. Tap "Create Voucher" | Loading state, then success | High |
| ADMIN-VOUCH-027 | Create success | Voucher created | 1. Complete creation | Success snackbar, navigate back, voucher in list | High |
| ADMIN-VOUCH-028 | Cancel create | On Create Voucher | 1. Tap "Cancel" or back | Navigate back without creating | Medium |

### 5.5 Edit Voucher

| Test ID | Test Case | Preconditions | Test Steps | Expected Result | Priority |
|---------|-----------|---------------|------------|-----------------|----------|
| ADMIN-VOUCH-029 | Edit screen displays | Tap edit on voucher | 1. View Edit Voucher | Form pre-filled with existing voucher data | High |
| ADMIN-VOUCH-030 | Update voucher name | On Edit Voucher | 1. Change name<br>2. Save | Name updated | High |
| ADMIN-VOUCH-031 | Update voucher price | On Edit Voucher | 1. Change price<br>2. Save | Price updated | High |
| ADMIN-VOUCH-032 | Update expiry date | On Edit Voucher | 1. Change date<br>2. Save | Date updated | Medium |
| ADMIN-VOUCH-033 | Save changes | Changes made | 1. Tap "Save Changes" | Loading state, then success | High |
| ADMIN-VOUCH-034 | Edit success | Changes saved | 1. Complete edit | Success snackbar, navigate back | High |

### 5.6 Delete Voucher

| Test ID | Test Case | Preconditions | Test Steps | Expected Result | Priority |
|---------|-----------|---------------|------------|-----------------|----------|
| ADMIN-VOUCH-035 | Delete confirmation dialog | Tap delete on voucher | 1. View dialog | Shows voucher name, "Cancel" and "Delete" buttons | High |
| ADMIN-VOUCH-036 | Cancel delete | Dialog open | 1. Tap "Cancel" | Dialog closes, voucher not deleted | Medium |
| ADMIN-VOUCH-037 | Confirm delete | Dialog open | 1. Tap "Delete" | Loading state, voucher deleted | High |
| ADMIN-VOUCH-038 | Delete success | Voucher deleted | 1. Complete deletion | Success snackbar, voucher removed from list | High |

---

## 6. Assign Vouchers to Users

### 6.1 User Voucher Management Screen

| Test ID | Test Case | Preconditions | Test Steps | Expected Result | Priority |
|---------|-----------|---------------|------------|-----------------|----------|
| ADMIN-UVOUCH-001 | Access User Vouchers Management | Admin logged in | 1. Navigate to Manage User Vouchers | User Vouchers screen displays | High |
| ADMIN-UVOUCH-002 | Loading state | First load | 1. View screen | Shows loading indicator | Medium |
| ADMIN-UVOUCH-003 | User vouchers list displays | Vouchers assigned | 1. View screen after loading | List of user voucher assignments | High |
| ADMIN-UVOUCH-004 | Empty state | No assignments | 1. View screen | Shows "No User Vouchers" message | Medium |

### 6.2 Assign Voucher to User

| Test ID | Test Case | Preconditions | Test Steps | Expected Result | Priority |
|---------|-----------|---------------|------------|-----------------|----------|
| ADMIN-UVOUCH-005 | Open assign dialog | On User Vouchers | 1. Tap "Assign Voucher" | Assign voucher dialog opens | High |
| ADMIN-UVOUCH-006 | Search for user | Dialog open | 1. Enter user email/name<br>2. Search | Matching users displayed | High |
| ADMIN-UVOUCH-007 | Select user | Users displayed | 1. Tap on user | User selected | High |
| ADMIN-UVOUCH-008 | Select voucher | User selected | 1. Tap voucher picker<br>2. Select voucher | Voucher selected | High |
| ADMIN-UVOUCH-009 | Confirm assignment | User and voucher selected | 1. Tap "Assign" | Loading state, then success | High |
| ADMIN-UVOUCH-010 | Assignment success | Assignment confirmed | 1. Complete assignment | Success message, assignment appears in list | High |
| ADMIN-UVOUCH-011 | Cancel assignment | Dialog open | 1. Tap "Cancel" | Dialog closes, no assignment | Medium |

### 6.3 Revoke User Voucher

| Test ID | Test Case | Preconditions | Test Steps | Expected Result | Priority |
|---------|-----------|---------------|------------|-----------------|----------|
| ADMIN-UVOUCH-012 | Revoke button | On user voucher card | 1. Tap "Revoke" | Revoke confirmation dialog | High |
| ADMIN-UVOUCH-013 | Confirm revoke | Dialog open | 1. Tap "Confirm" | Voucher revoked from user | High |
| ADMIN-UVOUCH-014 | Cancel revoke | Dialog open | 1. Tap "Cancel" | Dialog closes, voucher not revoked | Medium |

---

## 7. Manage Banners

### 7.1 Banner Management Screen

| Test ID | Test Case | Preconditions | Test Steps | Expected Result | Priority |
|---------|-----------|---------------|------------|-----------------|----------|
| ADMIN-BANNER-001 | Access Banner Management | Admin logged in | 1. Navigate to Manage Banners | Banner Management screen displays | High |
| ADMIN-BANNER-002 | Loading state | First load | 1. View screen | Shows loading indicator | Medium |
| ADMIN-BANNER-003 | Banners list displays | Banners exist | 1. View screen after loading | List of all banners displayed | High |
| ADMIN-BANNER-004 | Empty state | No banners | 1. View screen | Shows "No Banners Found" message | Medium |
| ADMIN-BANNER-005 | Pull to refresh | On banner list | 1. Pull down to refresh | Banners list refreshed | High |

### 7.2 Banner Tabs

| Test ID | Test Case | Preconditions | Test Steps | Expected Result | Priority |
|---------|-----------|---------------|------------|-----------------|----------|
| ADMIN-BANNER-006 | All tab | On Banner Management | 1. Tap "All" tab | All banners shown | High |
| ADMIN-BANNER-007 | Active tab | On Banner Management | 1. Tap "Active" tab | Only active banners shown | High |
| ADMIN-BANNER-008 | Inactive tab | On Banner Management | 1. Tap "Inactive" tab | Only inactive banners shown | Medium |

### 7.3 Banner Card

| Test ID | Test Case | Preconditions | Test Steps | Expected Result | Priority |
|---------|-----------|---------------|------------|-----------------|----------|
| ADMIN-BANNER-009 | Banner card displays | Banners exist | 1. View banner card | Shows: Banner image, title, status badge, action buttons | High |
| ADMIN-BANNER-010 | Status badge - Active | Active banner | 1. View banner card | Green status badge "Active" | Medium |
| ADMIN-BANNER-011 | Status badge - Inactive | Inactive banner | 1. View banner card | Grey status badge "Inactive" | Medium |
| ADMIN-BANNER-012 | Edit button | On banner card | 1. Tap edit icon | Edit banner modal/screen opens | High |
| ADMIN-BANNER-013 | Delete button | On banner card | 1. Tap delete icon | Delete confirmation dialog opens | High |
| ADMIN-BANNER-014 | Toggle active status | On banner card | 1. Tap toggle button | Banner status toggled | High |

### 7.4 Create Banner

| Test ID | Test Case | Preconditions | Test Steps | Expected Result | Priority |
|---------|-----------|---------------|------------|-----------------|----------|
| ADMIN-BANNER-015 | Create banner button | On Banner Management | 1. Tap create button/FAB | Create banner form opens | High |
| ADMIN-BANNER-016 | Upload banner image | On Create Banner | 1. Tap image upload<br>2. Select image | Image uploaded, preview shown | High |
| ADMIN-BANNER-017 | Enter banner title | On Create Banner | 1. Enter title | Title accepted | High |
| ADMIN-BANNER-018 | Enter banner link (Optional) | On Create Banner | 1. Enter URL | URL accepted | Medium |
| ADMIN-BANNER-019 | Set active status | On Create Banner | 1. Toggle active switch | Status set | Medium |
| ADMIN-BANNER-020 | Submit banner | All fields valid | 1. Tap "Create" | Banner created, appears in list | High |
| ADMIN-BANNER-021 | Image required validation | No image uploaded | 1. Submit without image | Error: "Banner image is required" | High |

### 7.5 Edit Banner

| Test ID | Test Case | Preconditions | Test Steps | Expected Result | Priority |
|---------|-----------|---------------|------------|-----------------|----------|
| ADMIN-BANNER-022 | Edit banner form | Tap edit on banner | 1. View form | Form pre-filled with existing data | High |
| ADMIN-BANNER-023 | Update banner image | On Edit Banner | 1. Upload new image<br>2. Save | Image updated | High |
| ADMIN-BANNER-024 | Update banner title | On Edit Banner | 1. Change title<br>2. Save | Title updated | High |
| ADMIN-BANNER-025 | Save banner changes | Changes made | 1. Tap "Save" | Changes saved, success message | High |

### 7.6 Delete Banner

| Test ID | Test Case | Preconditions | Test Steps | Expected Result | Priority |
|---------|-----------|---------------|------------|-----------------|----------|
| ADMIN-BANNER-026 | Delete confirmation | Tap delete on banner | 1. View dialog | Confirmation dialog appears | High |
| ADMIN-BANNER-027 | Confirm delete | Dialog open | 1. Tap "Delete" | Banner deleted, removed from list | High |
| ADMIN-BANNER-028 | Cancel delete | Dialog open | 1. Tap "Cancel" | Dialog closes, banner not deleted | Medium |

---

## 8. Manage Categories

### 8.1 Category Management Screen

| Test ID | Test Case | Preconditions | Test Steps | Expected Result | Priority |
|---------|-----------|---------------|------------|-----------------|----------|
| ADMIN-CAT-001 | Access Category Management | Admin logged in | 1. Navigate to Manage Categories | Category Management screen displays | High |
| ADMIN-CAT-002 | Access denied for non-Admin | Logged in as Lawyer | 1. Try to access | Shows "Access Denied" message | High |
| ADMIN-CAT-003 | Loading state | First load | 1. View screen | Shows loading indicator | Medium |
| ADMIN-CAT-004 | Categories list displays | Categories exist | 1. View screen after loading | List of all categories displayed | High |
| ADMIN-CAT-005 | Empty state | No categories | 1. View screen | Shows "No Categories Found" message | Medium |
| ADMIN-CAT-006 | Pull to refresh | On category list | 1. Pull down to refresh | Categories list refreshed | High |

### 8.2 Category Tabs

| Test ID | Test Case | Preconditions | Test Steps | Expected Result | Priority |
|---------|-----------|---------------|------------|-----------------|----------|
| ADMIN-CAT-007 | All tab | On Category Management | 1. Tap "All" tab | All categories shown | High |
| ADMIN-CAT-008 | Active tab | On Category Management | 1. Tap "Active" tab | Only active categories shown | High |
| ADMIN-CAT-009 | Inactive tab | On Category Management | 1. Tap "Inactive" tab | Only inactive categories shown | Medium |

### 8.3 Category Search

| Test ID | Test Case | Preconditions | Test Steps | Expected Result | Priority |
|---------|-----------|---------------|------------|-----------------|----------|
| ADMIN-CAT-010 | Search bar visible | On Category Management | 1. View screen | Search bar displayed | High |
| ADMIN-CAT-011 | Search by category name | On Category Management | 1. Enter category name | Matching categories displayed | High |
| ADMIN-CAT-012 | Search with no results | On Category Management | 1. Enter gibberish text | "No Categories Found" message | Medium |

### 8.4 Category Card

| Test ID | Test Case | Preconditions | Test Steps | Expected Result | Priority |
|---------|-----------|---------------|------------|-----------------|----------|
| ADMIN-CAT-013 | Category card displays | Categories exist | 1. View category card | Shows: Emoji, name, price, status badge, action buttons | High |
| ADMIN-CAT-014 | Status badge - Active | Active category | 1. View category card | Green status badge "Active" | Medium |
| ADMIN-CAT-015 | Status badge - Inactive | Inactive category | 1. View category card | Grey status badge "Inactive" | Medium |
| ADMIN-CAT-016 | Edit button | On category card | 1. Tap edit icon | Edit category dialog opens | High |
| ADMIN-CAT-017 | Delete button | On category card | 1. Tap delete icon | Delete confirmation dialog opens | High |

### 8.5 Create Category

| Test ID | Test Case | Preconditions | Test Steps | Expected Result | Priority |
|---------|-----------|---------------|------------|-----------------|----------|
| ADMIN-CAT-018 | Create button visible | On Category Management | 1. View screen | "Add Category" button visible | High |
| ADMIN-CAT-019 | Create dialog opens | Tap create button | 1. View dialog | Create category dialog with form | High |
| ADMIN-CAT-020 | Enter category name (Required) | On Create Category | 1. Enter category name | Name accepted | High |
| ADMIN-CAT-021 | Name validation - empty | On Create Category | 1. Leave name empty<br>2. Submit | Error: "Category name is required" | High |
| ADMIN-CAT-022 | Enter emoji (Optional) | On Create Category | 1. Enter emoji | Emoji accepted | Medium |
| ADMIN-CAT-023 | Enter price (Optional) | On Create Category | 1. Enter price | Price accepted | Medium |
| ADMIN-CAT-024 | Toggle active status | On Create Category | 1. Toggle active switch | Status set (default: active) | Medium |
| ADMIN-CAT-025 | Submit create form | All valid | 1. Fill required fields<br>2. Tap "Create" | Loading state, category created | High |
| ADMIN-CAT-026 | Create success | Category created | 1. Complete creation | Dialog closes, category in list | High |
| ADMIN-CAT-027 | Cancel create | Dialog open | 1. Tap "Cancel" | Dialog closes, no category created | Medium |

### 8.6 Edit Category

| Test ID | Test Case | Preconditions | Test Steps | Expected Result | Priority |
|---------|-----------|---------------|------------|-----------------|----------|
| ADMIN-CAT-028 | Edit dialog displays | Tap edit on category | 1. View dialog | Form pre-filled with existing data | High |
| ADMIN-CAT-029 | Update category name | On Edit Category | 1. Change name<br>2. Save | Name updated | High |
| ADMIN-CAT-030 | Update emoji | On Edit Category | 1. Change emoji<br>2. Save | Emoji updated | Medium |
| ADMIN-CAT-031 | Update price | On Edit Category | 1. Change price<br>2. Save | Price updated | Medium |
| ADMIN-CAT-032 | Toggle active status | On Edit Category | 1. Toggle active<br>2. Save | Status changed | High |
| ADMIN-CAT-033 | Save changes | Changes made | 1. Tap "Save" | Changes saved, dialog closes | High |

### 8.7 Delete Category

| Test ID | Test Case | Preconditions | Test Steps | Expected Result | Priority |
|---------|-----------|---------------|------------|-----------------|----------|
| ADMIN-CAT-034 | Delete confirmation | Tap delete on category | 1. View dialog | Shows category name, confirmation message | High |
| ADMIN-CAT-035 | Confirm delete | Dialog open | 1. Tap "Delete" | Category deleted | High |
| ADMIN-CAT-036 | Cancel delete | Dialog open | 1. Tap "Cancel" | Dialog closes, category not deleted | Medium |
| ADMIN-CAT-037 | Delete category with services | Category has linked services | 1. Try to delete | Error: "Cannot delete category with existing services" | Medium |

---

## 9. Manage Blogs

### 9.1 Blog Management Screen

| Test ID | Test Case | Preconditions | Test Steps | Expected Result | Priority |
|---------|-----------|---------------|------------|-----------------|----------|
| ADMIN-BLOG-001 | Access Blog Management | Admin logged in | 1. Navigate to Manage Blogs | Blog Management screen displays | High |
| ADMIN-BLOG-002 | Loading state | First load | 1. View screen | Shows loading indicator | Medium |
| ADMIN-BLOG-003 | Blogs list displays | Blogs exist | 1. View screen after loading | List of all blog posts displayed | High |
| ADMIN-BLOG-004 | Empty state | No blogs | 1. View screen | Shows "No Blogs Found" message | Medium |
| ADMIN-BLOG-005 | Pull to refresh | On blog list | 1. Pull down to refresh | Blogs list refreshed | High |

### 9.2 Blog Card

| Test ID | Test Case | Preconditions | Test Steps | Expected Result | Priority |
|---------|-----------|---------------|------------|-----------------|----------|
| ADMIN-BLOG-006 | Blog card displays | Blogs exist | 1. View blog card | Shows: Image, title, excerpt, date, status | High |
| ADMIN-BLOG-007 | Edit button | On blog card | 1. Tap edit icon | Edit blog screen opens | High |
| ADMIN-BLOG-008 | Delete button | On blog card | 1. Tap delete icon | Delete confirmation dialog | High |
| ADMIN-BLOG-009 | View button | On blog card | 1. Tap view icon | Blog preview opens | Medium |

### 9.3 Create Blog

| Test ID | Test Case | Preconditions | Test Steps | Expected Result | Priority |
|---------|-----------|---------------|------------|-----------------|----------|
| ADMIN-BLOG-010 | Create button visible | On Blog Management | 1. View screen | Create blog button/FAB visible | High |
| ADMIN-BLOG-011 | Create screen opens | Tap create | 1. View Create Blog | Blog creation form displayed | High |
| ADMIN-BLOG-012 | Enter blog title (Required) | On Create Blog | 1. Enter title | Title accepted | High |
| ADMIN-BLOG-013 | Upload featured image | On Create Blog | 1. Tap image upload<br>2. Select image | Image uploaded | High |
| ADMIN-BLOG-014 | Enter blog content | On Create Blog | 1. Enter content | Content accepted (rich text/markdown) | High |
| ADMIN-BLOG-015 | Enter excerpt | On Create Blog | 1. Enter short excerpt | Excerpt accepted | Medium |
| ADMIN-BLOG-016 | Set publish status | On Create Blog | 1. Toggle publish | Published or draft status set | High |
| ADMIN-BLOG-017 | Submit blog | All fields valid | 1. Tap "Publish" or "Save Draft" | Blog created | High |

### 9.4 Edit Blog

| Test ID | Test Case | Preconditions | Test Steps | Expected Result | Priority |
|---------|-----------|---------------|------------|-----------------|----------|
| ADMIN-BLOG-018 | Edit screen displays | Tap edit on blog | 1. View Edit Blog | Form pre-filled with existing data | High |
| ADMIN-BLOG-019 | Update blog title | On Edit Blog | 1. Change title<br>2. Save | Title updated | High |
| ADMIN-BLOG-020 | Update blog content | On Edit Blog | 1. Change content<br>2. Save | Content updated | High |
| ADMIN-BLOG-021 | Update featured image | On Edit Blog | 1. Upload new image<br>2. Save | Image updated | Medium |
| ADMIN-BLOG-022 | Toggle publish status | On Edit Blog | 1. Toggle publish<br>2. Save | Status changed (draft/published) | High |
| ADMIN-BLOG-023 | Save changes | Changes made | 1. Tap "Save" | Changes saved, success message | High |

### 9.5 Delete Blog

| Test ID | Test Case | Preconditions | Test Steps | Expected Result | Priority |
|---------|-----------|---------------|------------|-----------------|----------|
| ADMIN-BLOG-024 | Delete confirmation | Tap delete on blog | 1. View dialog | Confirmation dialog appears | High |
| ADMIN-BLOG-025 | Confirm delete | Dialog open | 1. Tap "Delete" | Blog deleted, removed from list | High |
| ADMIN-BLOG-026 | Cancel delete | Dialog open | 1. Tap "Cancel" | Dialog closes, blog not deleted | Medium |

---

## 10. Manage Lawyers

### 10.1 Lawyer Management Screen

| Test ID | Test Case | Preconditions | Test Steps | Expected Result | Priority |
|---------|-----------|---------------|------------|-----------------|----------|
| ADMIN-LAW-001 | Access Lawyer Management | Admin logged in | 1. Navigate to Manage Lawyers | Lawyer Management screen displays | High |
| ADMIN-LAW-002 | Loading state | First load | 1. View screen | Shows loading indicator | Medium |
| ADMIN-LAW-003 | Lawyers list displays | Lawyers exist | 1. View screen after loading | List of all lawyers displayed | High |
| ADMIN-LAW-004 | Empty state | No lawyers | 1. View screen | Shows "No Lawyers Found" message | Medium |
| ADMIN-LAW-005 | Pull to refresh | On lawyer list | 1. Pull down to refresh | Lawyers list refreshed | High |

### 10.2 Lawyer Tabs

| Test ID | Test Case | Preconditions | Test Steps | Expected Result | Priority |
|---------|-----------|---------------|------------|-----------------|----------|
| ADMIN-LAW-006 | All tab | On Lawyer Management | 1. Tap "All" tab | All lawyers shown | High |
| ADMIN-LAW-007 | Pending tab | On Lawyer Management | 1. Tap "Pending" tab | Only pending approval lawyers shown | High |
| ADMIN-LAW-008 | Approved tab | On Lawyer Management | 1. Tap "Approved" tab | Only approved lawyers shown | High |
| ADMIN-LAW-009 | Rejected tab | On Lawyer Management | 1. Tap "Rejected" tab | Only rejected lawyers shown | Medium |

### 10.3 Lawyer Search

| Test ID | Test Case | Preconditions | Test Steps | Expected Result | Priority |
|---------|-----------|---------------|------------|-----------------|----------|
| ADMIN-LAW-010 | Search bar visible | On Lawyer Management | 1. View screen | Search bar displayed | High |
| ADMIN-LAW-011 | Search by lawyer name | On Lawyer Management | 1. Enter lawyer name | Matching lawyers displayed | High |
| ADMIN-LAW-012 | Search by license number | On Lawyer Management | 1. Enter license number | Matching lawyer displayed | Medium |
| ADMIN-LAW-013 | Search with no results | On Lawyer Management | 1. Enter gibberish text | "No Lawyers Found" message | Medium |

### 10.4 Lawyer Card

| Test ID | Test Case | Preconditions | Test Steps | Expected Result | Priority |
|---------|-----------|---------------|------------|-----------------|----------|
| ADMIN-LAW-014 | Lawyer card displays | Lawyers exist | 1. View lawyer card | Shows: Avatar, name, license, specializations, status badge | High |
| ADMIN-LAW-015 | Status badge - Pending | Pending lawyer | 1. View lawyer card | Yellow status badge "Pending" | Medium |
| ADMIN-LAW-016 | Status badge - Approved | Approved lawyer | 1. View lawyer card | Green status badge "Approved" | Medium |
| ADMIN-LAW-017 | Status badge - Rejected | Rejected lawyer | 1. View lawyer card | Red status badge "Rejected" | Medium |
| ADMIN-LAW-018 | View details button | On lawyer card | 1. Tap "View Details" | Lawyer details screen opens | High |

### 10.5 Lawyer Details (Admin View)

| Test ID | Test Case | Preconditions | Test Steps | Expected Result | Priority |
|---------|-----------|---------------|------------|-----------------|----------|
| ADMIN-LAW-019 | Lawyer details screen | Tap on lawyer | 1. View details | Full lawyer profile displayed | High |
| ADMIN-LAW-020 | Personal info displayed | On lawyer details | 1. View personal section | Name, email, phone, photo | High |
| ADMIN-LAW-021 | Professional info | On lawyer details | 1. View professional section | License, experience, specializations | High |
| ADMIN-LAW-022 | Uploaded documents | On lawyer details | 1. View documents section | Registration documents visible | High |
| ADMIN-LAW-023 | View document | Document available | 1. Tap on document | Document preview/download | Medium |

### 10.6 Lawyer Approval Actions

| Test ID | Test Case | Preconditions | Test Steps | Expected Result | Priority |
|---------|-----------|---------------|------------|-----------------|----------|
| ADMIN-LAW-024 | Approve button | Pending lawyer | 1. View action buttons | "Approve" button visible | High |
| ADMIN-LAW-025 | Approve lawyer | Pending lawyer | 1. Tap "Approve"<br>2. Confirm | Lawyer approved, status updated | High |
| ADMIN-LAW-026 | Approve confirmation | Tapping approve | 1. View confirmation | Confirmation dialog appears | Medium |
| ADMIN-LAW-027 | Reject button | Pending lawyer | 1. View action buttons | "Reject" button visible | High |
| ADMIN-LAW-028 | Reject lawyer | Pending lawyer | 1. Tap "Reject"<br>2. Enter reason (optional)<br>3. Confirm | Lawyer rejected, status updated | High |
| ADMIN-LAW-029 | Rejection reason | Rejecting lawyer | 1. View rejection form | Optional reason field | Medium |
| ADMIN-LAW-030 | Suspend lawyer | Approved lawyer | 1. Tap "Suspend"<br>2. Confirm | Lawyer suspended | Medium |

---

## 11. Manage Law Firms

### 11.1 Law Firm Management Screen

| Test ID | Test Case | Preconditions | Test Steps | Expected Result | Priority |
|---------|-----------|---------------|------------|-----------------|----------|
| ADMIN-FIRM-001 | Access Law Firm Management | Admin logged in | 1. Navigate to Manage Law Firms | Law Firm Management screen displays | High |
| ADMIN-FIRM-002 | Loading state | First load | 1. View screen | Shows loading indicator | Medium |
| ADMIN-FIRM-003 | Law firms list displays | Law firms exist | 1. View screen after loading | List of all law firms displayed | High |
| ADMIN-FIRM-004 | Empty state | No law firms | 1. View screen | Shows "No Law Firms Found" message | Medium |
| ADMIN-FIRM-005 | Pull to refresh | On law firm list | 1. Pull down to refresh | Law firms list refreshed | High |

### 11.2 Law Firm Tabs

| Test ID | Test Case | Preconditions | Test Steps | Expected Result | Priority |
|---------|-----------|---------------|------------|-----------------|----------|
| ADMIN-FIRM-006 | All tab | On Law Firm Management | 1. Tap "All" tab | All law firms shown | High |
| ADMIN-FIRM-007 | Pending tab | On Law Firm Management | 1. Tap "Pending" tab | Only pending approval firms shown | High |
| ADMIN-FIRM-008 | Approved tab | On Law Firm Management | 1. Tap "Approved" tab | Only approved firms shown | High |
| ADMIN-FIRM-009 | Rejected tab | On Law Firm Management | 1. Tap "Rejected" tab | Only rejected firms shown | Medium |

### 11.3 Law Firm Card

| Test ID | Test Case | Preconditions | Test Steps | Expected Result | Priority |
|---------|-----------|---------------|------------|-----------------|----------|
| ADMIN-FIRM-010 | Law firm card displays | Firms exist | 1. View firm card | Shows: Logo, name, registration number, location, status badge | High |
| ADMIN-FIRM-011 | Status badge - Pending | Pending firm | 1. View firm card | Yellow status badge "Pending" | Medium |
| ADMIN-FIRM-012 | Status badge - Approved | Approved firm | 1. View firm card | Green status badge "Approved" | Medium |
| ADMIN-FIRM-013 | View details button | On firm card | 1. Tap "View Details" | Law firm details screen opens | High |

### 11.4 Law Firm Details (Admin View)

| Test ID | Test Case | Preconditions | Test Steps | Expected Result | Priority |
|---------|-----------|---------------|------------|-----------------|----------|
| ADMIN-FIRM-014 | Law firm details screen | Tap on firm | 1. View details | Full law firm profile displayed | High |
| ADMIN-FIRM-015 | Firm info displayed | On firm details | 1. View firm section | Name, logo, slogan, registration number | High |
| ADMIN-FIRM-016 | Representative info | On firm details | 1. View representative section | Representative name, license, email | High |
| ADMIN-FIRM-017 | Members list | On firm details | 1. View members section | List of firm members | Medium |
| ADMIN-FIRM-018 | Uploaded documents | On firm details | 1. View documents section | Registration documents visible | High |

### 11.5 Law Firm Approval Actions

| Test ID | Test Case | Preconditions | Test Steps | Expected Result | Priority |
|---------|-----------|---------------|------------|-----------------|----------|
| ADMIN-FIRM-019 | Approve button | Pending firm | 1. View action buttons | "Approve" button visible | High |
| ADMIN-FIRM-020 | Approve law firm | Pending firm | 1. Tap "Approve"<br>2. Confirm | Firm approved, status updated | High |
| ADMIN-FIRM-021 | Reject button | Pending firm | 1. View action buttons | "Reject" button visible | High |
| ADMIN-FIRM-022 | Reject law firm | Pending firm | 1. Tap "Reject"<br>2. Enter reason<br>3. Confirm | Firm rejected, status updated | High |
| ADMIN-FIRM-023 | Suspend law firm | Approved firm | 1. Tap "Suspend"<br>2. Confirm | Firm suspended | Medium |

---

## 12. Admin Chat

### 12.1 Admin Chat Screen

| Test ID | Test Case | Preconditions | Test Steps | Expected Result | Priority |
|---------|-----------|---------------|------------|-----------------|----------|
| ADMIN-CHAT-001 | Access Admin Chat | Admin logged in | 1. Navigate to Admin Chat | Admin Chat screen displays | High |
| ADMIN-CHAT-002 | All conversations visible | Conversations exist | 1. View chat list | All user conversations visible to admin | High |
| ADMIN-CHAT-003 | Search conversations | On Admin Chat | 1. Enter search term | Filtered conversations shown | Medium |
| ADMIN-CHAT-004 | Empty state | No conversations | 1. View Admin Chat | "No conversations" message | Medium |

### 12.2 Admin Chat Features

| Test ID | Test Case | Preconditions | Test Steps | Expected Result | Priority |
|---------|-----------|---------------|------------|-----------------|----------|
| ADMIN-CHAT-005 | View any conversation | On Admin Chat | 1. Tap on conversation | Conversation history displayed | High |
| ADMIN-CHAT-006 | Send message as Admin | In conversation | 1. Type message<br>2. Send | Message sent with Admin badge | High |
| ADMIN-CHAT-007 | View user info | In conversation | 1. Tap user name | User profile/info displayed | Medium |
| ADMIN-CHAT-008 | Filter by user type | On Admin Chat | 1. Filter by User/Lawyer/LawFirm | Filtered conversations shown | Medium |

---

## 13. Profile & Settings

### 13.1 Admin Profile

| Test ID | Test Case | Preconditions | Test Steps | Expected Result | Priority |
|---------|-----------|---------------|------------|-----------------|----------|
| ADMIN-PROF-001 | Access profile | Admin logged in | 1. Navigate to Profile | Profile screen displayed | High |
| ADMIN-PROF-002 | Profile info displayed | On profile | 1. View profile | Admin name, email, role displayed | High |
| ADMIN-PROF-003 | Edit profile | On profile | 1. Tap "Edit Profile" | Edit form opens | High |
| ADMIN-PROF-004 | Change avatar | Editing profile | 1. Tap avatar<br>2. Select new image | Avatar updated | Medium |
| ADMIN-PROF-005 | Save profile changes | Changes made | 1. Tap "Save" | Changes saved | High |

### 13.2 Account Settings

| Test ID | Test Case | Preconditions | Test Steps | Expected Result | Priority |
|---------|-----------|---------------|------------|-----------------|----------|
| ADMIN-SET-001 | Access settings | Admin logged in | 1. Navigate to Settings | Settings screen displayed | High |
| ADMIN-SET-002 | Change password | In settings | 1. Tap "Change Password"<br>2. Enter old/new password<br>3. Save | Password changed | High |
| ADMIN-SET-003 | Enable 2FA | In settings | 1. Tap "Enable 2FA"<br>2. Follow setup | 2FA enabled | High |
| ADMIN-SET-004 | Disable 2FA | 2FA enabled | 1. Tap "Disable 2FA"<br>2. Confirm | 2FA disabled | Medium |
| ADMIN-SET-005 | Notification settings | In settings | 1. Tap "Notifications" | Notification preferences shown | Medium |
| ADMIN-SET-006 | Logout | In settings | 1. Tap "Logout"<br>2. Confirm | Logged out, redirect to login | High |

---

## 14. Notifications

### 14.1 Admin Notifications

| Test ID | Test Case | Preconditions | Test Steps | Expected Result | Priority |
|---------|-----------|---------------|------------|-----------------|----------|
| ADMIN-NOTIF-001 | New lawyer registration | App in background | 1. Lawyer submits registration | Push notification: "New lawyer registration pending" | High |
| ADMIN-NOTIF-002 | New law firm registration | App in background | 1. Law firm submits registration | Push notification: "New law firm registration pending" | High |
| ADMIN-NOTIF-003 | New case posted | App in background | 1. User posts new case | Push notification: "New case posted" | Medium |
| ADMIN-NOTIF-004 | Support message | App in background | 1. User sends support message | Push notification received | High |
| ADMIN-NOTIF-005 | Notification center | Admin logged in | 1. Tap notification bell | Notification list opens | High |
| ADMIN-NOTIF-006 | Mark as read | Unread notification | 1. Tap notification | Marked as read | Medium |
| ADMIN-NOTIF-007 | Mark all as read | Multiple unread | 1. Tap "Mark all read" | All marked read | Medium |
| ADMIN-NOTIF-008 | Tap notification opens screen | Notification received | 1. Tap notification | Navigates to relevant admin screen | High |

---

## Test Execution Summary Template

```
Test Execution Report
=====================
Date: _______________
Tester: _____________
Build Version: ______
Device: _____________
OS Version: _________

Total Test Cases: 250+
Passed: ____
Failed: ____
Blocked: ____
Not Executed: ____

Pass Rate: ____%

Critical Issues Found:
1. ________________
2. ________________
3. ________________
```

---

## Defect Report Template

```
Defect ID: ADMIN-DEF-XXX
Test Case ID: ADMIN-XXX-XXX
Severity: Critical / High / Medium / Low
Priority: P1 / P2 / P3 / P4

Summary: _________________

Steps to Reproduce:
1. _______________
2. _______________
3. _______________

Expected Result: __________
Actual Result: ___________

Device: __________________
OS Version: ______________
Build Version: ___________

Attachments:
- Screenshot
- Video
- Logs
```

---

*Total Test Cases for Admin Role: **250+***

*Document Version: 1.0*
*Last Updated: December 2024*

---

## Change Log

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Dec 2024 | Initial version with comprehensive test cases for Admin role |


