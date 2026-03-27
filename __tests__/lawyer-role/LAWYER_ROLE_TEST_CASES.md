# ⚖️ Lawyer Role - Detailed Test Cases

## Overview
This document contains comprehensive test cases for the **Lawyer** role in the LetLink mobile app. Lawyers are legal professionals who can browse available cases, apply to cases, manage their profiles, join law firms, and communicate with clients.

---

## Table of Contents
1. [Authentication & Session](#1-authentication--session)
2. [Lawyer Registration & Onboarding](#2-lawyer-registration--onboarding)
3. [Dashboard & Home](#3-dashboard--home)
4. [Available Cases](#4-available-cases)
5. [Case Applications](#5-case-applications)
6. [My Cases (Assigned/Working)](#6-my-cases-assignedworking)
7. [Edit Lawyer Profile](#7-edit-lawyer-profile)
8. [My Law Firm](#8-my-law-firm)
9. [Join Law Firm](#9-join-law-firm)
10. [Chat & Communication](#10-chat--communication)
11. [Vouchers](#11-vouchers)
12. [Profile & Settings](#12-profile--settings)
13. [Notifications](#13-notifications)
14. [Referrals](#14-referrals)

---

## 1. Authentication & Session

> **Note:** Authentication flows are similar to User role. Below are lawyer-specific scenarios.

### 1.1 Lawyer Login

| Test ID | Test Case | Preconditions | Test Steps | Expected Result | Priority |
|---------|-----------|---------------|------------|-----------------|----------|
| LAW-AUTH-001 | Successful login as Lawyer | Verified lawyer account | 1. Enter valid email<br>2. Enter valid password<br>3. Tap "Login" | Logged in with Lawyer role, redirect to Dashboard with Lawyer-specific tabs | High |
| LAW-AUTH-002 | Login shows Lawyer-specific tabs | Logged in as Lawyer | 1. View bottom tab bar | Shows: Home, Available Cases, Edit Profile, My Law Firm (if applicable), Vouchers, Chat | High |
| LAW-AUTH-003 | Dashboard hides User-only buttons | Logged in as Lawyer | 1. View Dashboard | "Get Your Services Now" and "Find Your Legal Talent" buttons are hidden | Medium |
| LAW-AUTH-004 | Token contains Lawyer role | Login successful | 1. Check JWT token | ActiveRole = "Lawyer" in token claims | High |
| LAW-AUTH-005 | Login with pending verification | Registration pending admin approval | 1. Login with credentials | Redirect to verification pending screen | High |

### 1.2 Role-Specific Access Control

| Test ID | Test Case | Preconditions | Test Steps | Expected Result | Priority |
|---------|-----------|---------------|------------|-----------------|----------|
| LAW-AUTH-006 | Cannot access User "Post My Case" | Logged in as Lawyer | 1. Try to navigate to PostMyCaseScreen | Screen not accessible or hidden from navigation | Medium |
| LAW-AUTH-007 | Can access Available Cases tab | Logged in as Lawyer | 1. Tap "Available Cases" tab | Available Cases screen displays | High |
| LAW-AUTH-008 | Cannot access Admin tabs | Logged in as Lawyer | 1. View navigation | Admin-only tabs (Manage Vouchers, etc.) are hidden | Medium |
| LAW-AUTH-009 | Role persists after app restart | Logged in as Lawyer, close app | 1. Reopen app | User remains logged in as Lawyer with correct tabs | High |

---

## 2. Lawyer Registration & Onboarding

### 2.1 Access Registration

| Test ID | Test Case | Preconditions | Test Steps | Expected Result | Priority |
|---------|-----------|---------------|------------|-----------------|----------|
| LAW-REG-001 | Access registration type selection | Logged in as new User | 1. Navigate to registration type selection | Options shown: "Register as Lawyer" and "Register as Law Firm" | High |
| LAW-REG-002 | Select Lawyer registration | On registration type screen | 1. Tap "Register as Lawyer" | Navigate to Lawyer Registration form | High |
| LAW-REG-003 | Registration screen displays | On Lawyer Registration | 1. View screen | Header shows "Lawyer Registration" with "Provide your professional information" subtitle | High |

### 2.2 Personal Information Section

| Test ID | Test Case | Preconditions | Test Steps | Expected Result | Priority |
|---------|-----------|---------------|------------|-----------------|----------|
| LAW-REG-004 | Enter Full Name (Required) | On Lawyer Registration | 1. Enter full name in "Full Name *" field | Name accepted | High |
| LAW-REG-005 | Full Name validation - empty | On Lawyer Registration | 1. Leave full name empty<br>2. Tap "Submit" | Error: "Full name is required" | High |
| LAW-REG-006 | Enter Email (Optional) | On Lawyer Registration | 1. Enter email | Email accepted | Medium |
| LAW-REG-007 | Enter Phone Number (Optional) | On Lawyer Registration | 1. Enter phone number | Phone accepted, shows phone keypad | Medium |
| LAW-REG-008 | Select Gender (Optional) | On Lawyer Registration | 1. Tap gender field<br>2. Select "Male" or "Female" | Gender selected, dropdown closes | Medium |
| LAW-REG-009 | Select Date of Birth (Optional) | On Lawyer Registration | 1. Tap date field<br>2. Select date from picker | Date selected, format: MM/DD/YYYY | Medium |
| LAW-REG-010 | Date of Birth - future date blocked | On Lawyer Registration | 1. Try to select future date | Future dates are not selectable (maximumDate = today) | Low |

### 2.3 Professional Information Section

| Test ID | Test Case | Preconditions | Test Steps | Expected Result | Priority |
|---------|-----------|---------------|------------|-----------------|----------|
| LAW-REG-011 | Enter License Number (Required) | On Lawyer Registration | 1. Enter license number in "License Number *" field | License number accepted | High |
| LAW-REG-012 | License Number validation - empty | On Lawyer Registration | 1. Leave license number empty<br>2. Tap "Submit" | Error: "License number is required" | High |
| LAW-REG-013 | Select Practice Areas | On Lawyer Registration | 1. Tap practice area chips | Selected areas show checkmark, chip style changes | High |
| LAW-REG-014 | Practice areas list | On Lawyer Registration | 1. View practice areas | Shows: Corporate Law, Criminal Law, Family Law, Property Law, Intellectual Property, Employment Law, Other | Medium |
| LAW-REG-015 | Select "Other" practice area | On Lawyer Registration | 1. Tap "Other" chip | Additional text field appears for "Other Specialization *" | High |
| LAW-REG-016 | Other Specialization validation | "Other" selected | 1. Leave other specialization empty<br>2. Submit | Error: "Please specify other specialization" | High |
| LAW-REG-017 | Multiple practice areas | On Lawyer Registration | 1. Select multiple practice areas | All selected areas show checkmarks | Medium |

### 2.4 Document Upload Section

| Test ID | Test Case | Preconditions | Test Steps | Expected Result | Priority |
|---------|-----------|---------------|------------|-----------------|----------|
| LAW-REG-018 | Document info box displays | On Lawyer Registration | 1. View Documents section | Info box shows required documents: IC Front/Back, Professional Certificate, Bar Council Certificate | High |
| LAW-REG-019 | Upload document - single file | On Lawyer Registration | 1. Tap "Browse Files"<br>2. Select PDF file | File added to list, shows filename, size, and delete button | High |
| LAW-REG-020 | Upload document - multiple files | On Lawyer Registration | 1. Tap "Browse Files"<br>2. Select multiple files | All files added (up to 6 max) | High |
| LAW-REG-021 | Maximum 6 files limit | 5 files already uploaded | 1. Try to upload 2 more files | Alert: "Maximum 6 files allowed", only 1 more file added | High |
| LAW-REG-022 | File size limit - 3MB | On Lawyer Registration | 1. Try to upload file > 3MB | Alert: "File exceeds 3 MB limit" | High |
| LAW-REG-023 | Allowed file types only | On Lawyer Registration | 1. Try to upload .docx file | Alert: "Please upload files in PDF, JPG, or PNG format only" | High |
| LAW-REG-024 | Delete uploaded file | File uploaded | 1. Tap delete button on file card | File removed, success alert shown | Medium |
| LAW-REG-025 | Duplicate file detection | File already uploaded | 1. Try to upload same file again | Alert: "File already exists" | Medium |
| LAW-REG-026 | No documents validation | On Lawyer Registration | 1. No files uploaded<br>2. Tap "Submit" | Error: "Please upload at least one document" | High |
| LAW-REG-027 | File card displays info | Files uploaded | 1. View file cards | Each card shows: file icon (PDF/Image), extension badge, filename, file size, delete button | Medium |

### 2.5 Form Submission

| Test ID | Test Case | Preconditions | Test Steps | Expected Result | Priority |
|---------|-----------|---------------|------------|-----------------|----------|
| LAW-REG-028 | Submit registration successfully | All required fields filled, files uploaded | 1. Fill Full Name, License No<br>2. Upload documents<br>3. Tap "Submit Registration" | Success alert, navigate to Verification Pending screen | High |
| LAW-REG-029 | Submit button loading state | Submitting registration | 1. Tap "Submit Registration" | Button shows loading spinner, text: "Submitting...", button disabled | Medium |
| LAW-REG-030 | Submit button disabled - invalid | Required fields missing | 1. View Submit button | Button disabled until all required fields filled | Medium |
| LAW-REG-031 | Upload warning displayed | No files uploaded | 1. View form | Shows: "Please upload at least one document to submit" in red | Medium |
| LAW-REG-032 | Token renewed after submission | Registration submitted | 1. Submit registration | JWT token renewed to update isNewUser flag | High |
| LAW-REG-033 | Redux updated after submission | Registration submitted | 1. Submit registration | Redux registrationSlice updated with hasRegistration=true, status=PENDING | Medium |
| LAW-REG-034 | Network error handling | No internet | 1. Submit registration | Error alert with message | High |

### 2.6 Verification Pending Screen

| Test ID | Test Case | Preconditions | Test Steps | Expected Result | Priority |
|---------|-----------|---------------|------------|-----------------|----------|
| LAW-REG-035 | Verification pending screen displays | Registration submitted | 1. View screen after submission | Shows pending verification message | High |
| LAW-REG-036 | Track registration button | On pending screen | 1. Tap track registration | Shows registration status | Medium |
| LAW-REG-037 | Return to dashboard | On pending screen | 1. Tap home/dashboard button | Navigate to dashboard | Medium |

---

## 3. Lawyer Home & Navigation

> **Important Note:** Lawyers do NOT have a "Home/Dashboard" tab. Their first tab is "Available Cases" which serves as their landing page after login.

### 3.1 Lawyer Landing Screen (Available Cases)

| Test ID | Test Case | Preconditions | Test Steps | Expected Result | Priority |
|---------|-----------|---------------|------------|-----------------|----------|
| LAW-DASH-001 | Available Cases is first tab | Logged in as Lawyer | 1. Login as Lawyer | Lands on Available Cases screen (first tab) | High |
| LAW-DASH-002 | No Home/Dashboard tab | Logged in as Lawyer | 1. View bottom tab bar | Home/Dashboard tab is NOT visible for Lawyers | High |
| LAW-DASH-003 | Available Cases header | On Available Cases | 1. View screen header | Shows "Available Cases" title with search and filter options | High |
| LAW-DASH-004 | Page title section | On Available Cases | 1. View header section | Shows "Available Cases" title with subtitle "Browse and apply for available legal cases" | High |
| LAW-DASH-005 | Pull to refresh | On Available Cases | 1. Pull down to refresh | Cases list refreshed, loading indicator shown | Medium |

### 3.2 Bottom Tab Navigation

| Test ID | Test Case | Preconditions | Test Steps | Expected Result | Priority |
|---------|-----------|---------------|------------|-----------------|----------|
| LAW-DASH-006 | Tab bar displays correct tabs | Logged in as Lawyer | 1. View bottom tab bar | Shows: Available Cases, Chat, Manage Bookings, Edit Lawyer Profile, My Law Firm (if applicable) | High |
| LAW-DASH-007 | Available Cases tab active by default | Just logged in | 1. View tab bar | Available Cases tab is highlighted/active (first tab) | High |
| LAW-DASH-008 | Chat tab | On any screen | 1. Tap "Chat" tab | Navigate to Chat screen | High |
| LAW-DASH-009 | Manage Bookings tab | On any screen | 1. Tap "Manage Bookings" tab | Navigate to case/booking management screen | High |
| LAW-DASH-010 | Edit Lawyer Profile tab | On any screen | 1. Tap "Edit Lawyer Profile" tab | Navigate to Edit Lawyer Profile screen | High |
| LAW-DASH-011 | My Law Firm tab visible | Lawyer has LawFirmId or uid | 1. View tab bar | "My Law Firm" tab is visible | Medium |
| LAW-DASH-012 | My Law Firm tab navigation | My Law Firm tab visible | 1. Tap "My Law Firm" tab | Navigate to My Law Firm screen | Medium |
| LAW-DASH-013 | No Vouchers tab for Lawyers | Logged in as Lawyer | 1. View tab bar | "Vouchers" tab is NOT visible (only for User role) | Medium |
| LAW-DASH-014 | No Home tab for Lawyers | Logged in as Lawyer | 1. View tab bar | "Home" tab is NOT visible (only for Admin and User roles) | Medium |

### 3.3 Tab Icons

| Test ID | Test Case | Preconditions | Test Steps | Expected Result | Priority |
|---------|-----------|---------------|------------|-----------------|----------|
| LAW-DASH-015 | Available Cases icon | On tab bar | 1. View Available Cases tab | Shows briefcase-check icon | Low |
| LAW-DASH-016 | Chat icon | On tab bar | 1. View Chat tab | Shows chat icon | Low |
| LAW-DASH-017 | Manage Bookings icon | On tab bar | 1. View Manage Bookings tab | Shows calendar-check icon | Low |
| LAW-DASH-018 | Edit Lawyer Profile icon | On tab bar | 1. View Edit Profile tab | Shows account-edit icon | Low |
| LAW-DASH-019 | My Law Firm icon | On tab bar | 1. View My Law Firm tab | Shows office-building icon | Low |
| LAW-DASH-020 | Active tab color | Tap any tab | 1. Tap on tab | Active tab turns blue (#1976D2), inactive tabs are grey (#757575) | Low |

---

## 4. Available Cases

### 4.1 Available Cases Screen

| Test ID | Test Case | Preconditions | Test Steps | Expected Result | Priority |
|---------|-----------|---------------|------------|-----------------|----------|
| LAW-CASES-001 | Access Available Cases screen | Logged in as Lawyer | 1. Tap "Available Cases" tab | Available Cases screen displays with header and case list | High |
| LAW-CASES-002 | Page title section | On Available Cases | 1. View header section | Shows "Available Cases" title with subtitle "Browse and apply for available legal cases" | High |
| LAW-CASES-003 | Loading state | First load | 1. View screen while loading | Shows loading indicator and "Loading available cases..." | Medium |
| LAW-CASES-004 | Cases list displays | Cases available | 1. View screen after loading | List of pending cases displayed as cards | High |
| LAW-CASES-005 | Empty state - no cases | No available cases | 1. View screen | Shows "No Cases Found" with message | Medium |
| LAW-CASES-006 | Pull to refresh | On Available Cases | 1. Pull down to refresh | Cases list refreshed | High |
| LAW-CASES-007 | Error state | API error | 1. View screen with error | Error card with "Retry" button | Medium |

### 4.2 Search and Filters

| Test ID | Test Case | Preconditions | Test Steps | Expected Result | Priority |
|---------|-----------|---------------|------------|-----------------|----------|
| LAW-CASES-008 | Search bar visible | On Available Cases | 1. View screen | Search bar with placeholder "Search by case number, title, description, category or location..." | High |
| LAW-CASES-009 | Search by case number | On Available Cases | 1. Enter case number in search | Matching cases displayed | High |
| LAW-CASES-010 | Search by title | On Available Cases | 1. Enter case title keyword | Matching cases displayed | High |
| LAW-CASES-011 | Search by category | On Available Cases | 1. Enter category name | Matching cases displayed | Medium |
| LAW-CASES-012 | Search by location | On Available Cases | 1. Enter location | Matching cases displayed | Medium |
| LAW-CASES-013 | Search with no results | On Available Cases | 1. Enter gibberish text | "No Cases Found" with message about filters | Medium |

### 4.3 Filter Options

| Test ID | Test Case | Preconditions | Test Steps | Expected Result | Priority |
|---------|-----------|---------------|------------|-----------------|----------|
| LAW-CASES-014 | Time filter - All | On Available Cases | 1. Tap "All" time filter | All cases shown regardless of date | High |
| LAW-CASES-015 | Time filter - Today | On Available Cases | 1. Tap "Today" time filter | Only cases from today shown | Medium |
| LAW-CASES-016 | Time filter - This Week | Via more options | 1. Filter by this week | Only cases from last 7 days | Medium |
| LAW-CASES-017 | Time filter - This Month | Via more options | 1. Filter by this month | Only cases from last 30 days | Medium |
| LAW-CASES-018 | Category filter dropdown | On Available Cases | 1. Tap category filter | Dropdown menu with categories appears | High |
| LAW-CASES-019 | Select category filter | Dropdown open | 1. Select a category | Cases filtered by category, chip shows "(1)" | High |
| LAW-CASES-020 | Clear category filter | Category selected | 1. Select "All Categories" | Category filter cleared | Medium |

### 4.4 Sort Options

| Test ID | Test Case | Preconditions | Test Steps | Expected Result | Priority |
|---------|-----------|---------------|------------|-----------------|----------|
| LAW-CASES-021 | Sort dropdown | On Available Cases | 1. Tap sort button | Dropdown with sort options | High |
| LAW-CASES-022 | Sort by Newest First | On Available Cases | 1. Select "Newest First" | Cases sorted by date descending | High |
| LAW-CASES-023 | Sort by Oldest First | On Available Cases | 1. Select "Oldest First" | Cases sorted by date ascending | Medium |
| LAW-CASES-024 | Sort by Highest Budget | On Available Cases | 1. Select "Highest Budget" | Cases sorted by maxPrice descending | Medium |
| LAW-CASES-025 | Sort by Lowest Budget | On Available Cases | 1. Select "Lowest Budget" | Cases sorted by minPrice ascending | Medium |

### 4.5 Active Filters and Reset

| Test ID | Test Case | Preconditions | Test Steps | Expected Result | Priority |
|---------|-----------|---------------|------------|-----------------|----------|
| LAW-CASES-026 | Active filters display | Filters applied | 1. View Active Filters section | Shows chips for each active filter with close icon | Medium |
| LAW-CASES-027 | Remove individual filter | Filter chip visible | 1. Tap close on filter chip | That filter removed, cases updated | Medium |
| LAW-CASES-028 | Reset all filters | Filters applied | 1. Tap "Reset" button | All filters cleared, all cases shown | High |
| LAW-CASES-029 | Results count | Cases loaded | 1. View results summary | Shows "Found X cases" | Low |

### 4.6 Available Case Card

| Test ID | Test Case | Preconditions | Test Steps | Expected Result | Priority |
|---------|-----------|---------------|------------|-----------------|----------|
| LAW-CASES-030 | Case card displays | Cases available | 1. View case card | Shows: Case No, time posted, priority badge, title, category chip, description, budget, location | High |
| LAW-CASES-031 | Priority badge - Urgent | Case has urgent priority | 1. View case card | Red priority badge "Urgent" | Medium |
| LAW-CASES-032 | Priority badge - Normal | Case has normal priority | 1. View case card | Blue priority badge "Normal" | Medium |
| LAW-CASES-033 | Case description truncated | Long description | 1. View case card | Description truncated to 3 lines | Low |
| LAW-CASES-034 | View Details button | On case card | 1. Tap "View Details" | Navigate to Case Details screen | High |
| LAW-CASES-035 | Apply button | On case card | 1. Tap "Apply" | Opens Lawyer Application Modal | High |

---

## 5. Case Applications

### 5.1 Lawyer Application Modal

| Test ID | Test Case | Preconditions | Test Steps | Expected Result | Priority |
|---------|-----------|---------------|------------|-----------------|----------|
| LAW-APP-001 | Modal opens | Tap Apply on case card | 1. Tap "Apply" button | Application modal opens | High |
| LAW-APP-002 | Modal header | Modal open | 1. View modal | Shows case number and title in header | Medium |
| LAW-APP-003 | Proposed fee field | Modal open | 1. View form | Proposed fee input field visible | High |
| LAW-APP-004 | Enter proposed fee | Modal open | 1. Enter proposed fee amount | Fee accepted, numeric keyboard | High |
| LAW-APP-005 | Cover letter/message field | Modal open | 1. View form | Message/cover letter textarea visible | High |
| LAW-APP-006 | Enter cover letter | Modal open | 1. Enter message text | Text accepted | High |
| LAW-APP-007 | Submit application | All fields filled | 1. Fill proposed fee and message<br>2. Tap "Submit Application" | Loading state, then success | High |
| LAW-APP-008 | Submit success | Application submitted | 1. Complete submission | Success message, modal closes, cases refresh | High |
| LAW-APP-009 | Cancel application | Modal open | 1. Tap "Cancel" or outside modal | Modal closes, no action taken | Medium |
| LAW-APP-010 | Validation - empty fee | Fee empty | 1. Submit without fee | Error: "Proposed fee is required" | High |
| LAW-APP-011 | Submit button loading | Submitting | 1. View button during submission | Button shows loading, disabled | Medium |
| LAW-APP-012 | Network error | No internet | 1. Submit application | Error message displayed | High |
| LAW-APP-013 | Already applied detection | Already applied to case | 1. Try to apply again | Error: "You have already applied" or similar | Medium |

### 5.2 Application Tracking

| Test ID | Test Case | Preconditions | Test Steps | Expected Result | Priority |
|---------|-----------|---------------|------------|-----------------|----------|
| LAW-APP-014 | View my applications | Has submitted applications | 1. Navigate to My Cases | See list of cases with application status | High |
| LAW-APP-015 | Application status - Pending | Application submitted | 1. View case card | Shows "Application Pending" or similar status | High |
| LAW-APP-016 | Application status - Accepted | Client accepted | 1. View case card | Shows "Accepted" status, case now assigned | High |
| LAW-APP-017 | Application status - Rejected | Client rejected | 1. View case card | Shows "Rejected" status | Medium |
| LAW-APP-018 | Withdraw application | Application pending | 1. Open application<br>2. Tap "Withdraw" | Application withdrawn | Medium |

---

## 6. My Cases (Assigned/Working)

### 6.1 My Cases Screen

| Test ID | Test Case | Preconditions | Test Steps | Expected Result | Priority |
|---------|-----------|---------------|------------|-----------------|----------|
| LAW-MYCASE-001 | Access My Cases | Logged in as Lawyer | 1. Navigate to My Cases | Cases list displayed | High |
| LAW-MYCASE-002 | Assigned cases display | Has assigned cases | 1. View My Cases | Cases where lawyer is assigned shown | High |
| LAW-MYCASE-003 | Applied cases display | Has applications | 1. View My Cases | Cases with pending applications shown | High |
| LAW-MYCASE-004 | Empty state | No cases | 1. View My Cases | "No cases" message | Medium |
| LAW-MYCASE-005 | Filter by status | On My Cases | 1. Select status filter | Cases filtered by status | Medium |

### 6.2 Case Details (Lawyer View)

| Test ID | Test Case | Preconditions | Test Steps | Expected Result | Priority |
|---------|-----------|---------------|------------|-----------------|----------|
| LAW-MYCASE-006 | View case details | Has case | 1. Tap on case card | Case details screen opens | High |
| LAW-MYCASE-007 | Client info displayed | On case details | 1. View client section | Client name, email, phone visible (if assigned) | High |
| LAW-MYCASE-008 | Case description | On case details | 1. View details | Full case description shown | High |
| LAW-MYCASE-009 | Case documents | Case has documents | 1. View documents section | Attached documents listed | Medium |
| LAW-MYCASE-010 | Contact client button | Assigned to case | 1. Tap "Contact Client" | Navigate to chat with client | High |
| LAW-MYCASE-011 | Update case status | Assigned to case | 1. Tap status update option | Status update options available | Medium |

---

## 7. Edit Lawyer Profile

### 7.1 Profile Screen Access

| Test ID | Test Case | Preconditions | Test Steps | Expected Result | Priority |
|---------|-----------|---------------|------------|-----------------|----------|
| LAW-PROF-001 | Access Edit Profile | Logged in as Lawyer | 1. Tap "Edit Lawyer Profile" tab | Edit Lawyer Profile screen displays | High |
| LAW-PROF-002 | Loading state | First load | 1. View screen | Loading indicator with "Loading profile..." | Medium |
| LAW-PROF-003 | Profile data loaded | Profile exists | 1. View screen after loading | Form populated with existing data | High |
| LAW-PROF-004 | New profile (empty form) | No profile exists | 1. View screen | Empty form displayed for new profile setup | Medium |
| LAW-PROF-005 | Header displays | On Edit Profile | 1. View header | Shows "Edit Lawyer Profile" with back button | High |

### 7.2 Basic Information Section

| Test ID | Test Case | Preconditions | Test Steps | Expected Result | Priority |
|---------|-----------|---------------|------------|-----------------|----------|
| LAW-PROF-006 | Avatar upload button | On Edit Profile | 1. View avatar section | Avatar with camera button overlay | High |
| LAW-PROF-007 | Upload new avatar | On Edit Profile | 1. Tap camera button<br>2. Select image from gallery | Image uploaded, preview updates | High |
| LAW-PROF-008 | Avatar size limit | On Edit Profile | 1. Try to upload image > 5MB | Alert: "Image size should not exceed 5MB" | Medium |
| LAW-PROF-009 | Avatar upload loading | Uploading avatar | 1. Select image | Camera button shows loading spinner | Medium |
| LAW-PROF-010 | Avatar upload success | Upload complete | 1. Complete upload | Success message, avatar updated | High |
| LAW-PROF-011 | Edit Full Name | On Edit Profile | 1. Change full name | Name field updates | High |
| LAW-PROF-012 | Full Name validation | On Edit Profile | 1. Clear full name<br>2. Save | Error: "Full name is required" | High |
| LAW-PROF-013 | Edit Professional Title | On Edit Profile | 1. Enter/change title | Title field updates (e.g., "Senior Corporate Lawyer") | High |
| LAW-PROF-014 | Title validation | On Edit Profile | 1. Clear title<br>2. Save | Error: "Professional title is required" | High |
| LAW-PROF-015 | Years of Experience | On Edit Profile | 1. Enter years | Numeric keyboard, value accepted | High |
| LAW-PROF-016 | Experience validation | On Edit Profile | 1. Enter negative number | Auto-corrects to 0 or shows error | Medium |
| LAW-PROF-017 | Select Base Location | On Edit Profile | 1. Tap base location field | Location picker modal opens | High |
| LAW-PROF-018 | Location picker options | Picker open | 1. View options | Shows Malaysian states: Kuala Lumpur, Selangor, Penang, etc. | Medium |
| LAW-PROF-019 | Select location | Picker open | 1. Tap on a state | State selected, picker closes, field updates | High |
| LAW-PROF-020 | Operating Hours | On Edit Profile | 1. Enter operating hours | Text accepted (e.g., "Mon - Fri: 9AM - 6PM") | Medium |

### 7.3 Serve Locations Section

| Test ID | Test Case | Preconditions | Test Steps | Expected Result | Priority |
|---------|-----------|---------------|------------|-----------------|----------|
| LAW-PROF-021 | Serve Locations chips | On Edit Profile | 1. View serve locations section | Chips for all Malaysian states displayed | High |
| LAW-PROF-022 | Select serve location | On Edit Profile | 1. Tap on a state chip | Chip turns selected (different style), added to list | High |
| LAW-PROF-023 | Deselect serve location | Location selected | 1. Tap on selected chip | Chip reverts to unselected, removed from list | High |
| LAW-PROF-024 | Multiple serve locations | On Edit Profile | 1. Select multiple states | All selected states highlighted | High |
| LAW-PROF-025 | Serve locations validation | On Edit Profile | 1. Deselect all<br>2. Save | Error: "At least one service location is required" | High |

### 7.4 Languages Section

| Test ID | Test Case | Preconditions | Test Steps | Expected Result | Priority |
|---------|-----------|---------------|------------|-----------------|----------|
| LAW-PROF-026 | Languages chips | On Edit Profile | 1. View languages section | Chips: English, Bahasa Malaysia, Chinese, Tamil, Hindi, Arabic | High |
| LAW-PROF-027 | Select language | On Edit Profile | 1. Tap on language chip | Chip turns selected, language added | High |
| LAW-PROF-028 | Deselect language | Language selected | 1. Tap on selected chip | Chip reverts, language removed | High |
| LAW-PROF-029 | Languages validation | On Edit Profile | 1. Deselect all<br>2. Save | Error: "At least one language is required" | High |

### 7.5 About Section

| Test ID | Test Case | Preconditions | Test Steps | Expected Result | Priority |
|---------|-----------|---------------|------------|-----------------|----------|
| LAW-PROF-030 | About textarea | On Edit Profile | 1. View About section | Multiline text area with placeholder | High |
| LAW-PROF-031 | Enter about text | On Edit Profile | 1. Enter text about yourself | Text accepted | High |
| LAW-PROF-032 | Character counter | On Edit Profile | 1. Enter text | Counter shows "{count} characters" | Medium |
| LAW-PROF-033 | About validation | On Edit Profile | 1. Leave about empty<br>2. Save | Error: "About section is required" | High |

### 7.6 Specializations Section

| Test ID | Test Case | Preconditions | Test Steps | Expected Result | Priority |
|---------|-----------|---------------|------------|-----------------|----------|
| LAW-PROF-034 | Add specialization input | On Edit Profile | 1. View Specializations section | Text input with "Add" button | High |
| LAW-PROF-035 | Add specialization | On Edit Profile | 1. Type specialization<br>2. Tap "Add" | Chip added to list, input cleared | High |
| LAW-PROF-036 | Add button disabled | Input empty | 1. View Add button | Button disabled when input empty | Medium |
| LAW-PROF-037 | Remove specialization | Has specializations | 1. Tap close on chip | Specialization removed | High |
| LAW-PROF-038 | Specializations validation | On Edit Profile | 1. Remove all<br>2. Save | Error: "At least one specialization is required" | High |
| LAW-PROF-039 | Empty state message | No specializations | 1. View section | Shows "No specializations added yet. Please add at least one." | Medium |

### 7.7 Services Section

| Test ID | Test Case | Preconditions | Test Steps | Expected Result | Priority |
|---------|-----------|---------------|------------|-----------------|----------|
| LAW-PROF-040 | Add service input | On Edit Profile | 1. View Services section | Text input with "Add" button | High |
| LAW-PROF-041 | Add service | On Edit Profile | 1. Type service<br>2. Tap "Add" | Chip added to list | High |
| LAW-PROF-042 | Remove service | Has services | 1. Tap close on chip | Service removed | High |
| LAW-PROF-043 | Services validation | On Edit Profile | 1. Remove all<br>2. Save | Error: "At least one service is required" | High |

### 7.8 Form Submission

| Test ID | Test Case | Preconditions | Test Steps | Expected Result | Priority |
|---------|-----------|---------------|------------|-----------------|----------|
| LAW-PROF-044 | Save profile button | On Edit Profile | 1. View action buttons | "Save Profile" button visible | High |
| LAW-PROF-045 | Save profile success | All valid data | 1. Fill all required fields<br>2. Tap "Save Profile" | Success message: "Profile updated successfully!" | High |
| LAW-PROF-046 | Save button loading | Saving profile | 1. Tap "Save Profile" | Button shows "Saving...", disabled | Medium |
| LAW-PROF-047 | Cancel button | On Edit Profile | 1. Tap "Cancel" | Form reset or navigate back | Medium |
| LAW-PROF-048 | Validation errors display | Invalid data | 1. Submit with errors | Error card appears with message | High |
| LAW-PROF-049 | Success message auto-hide | Save successful | 1. View success message | Message disappears after 3 seconds | Low |

---

## 8. My Law Firm

### 8.1 My Law Firm Screen Access

| Test ID | Test Case | Preconditions | Test Steps | Expected Result | Priority |
|---------|-----------|---------------|------------|-----------------|----------|
| LAW-FIRM-001 | Access My Law Firm | Logged in as Lawyer with law firm | 1. Tap "My Law Firm" tab | My Law Firm screen displays | High |
| LAW-FIRM-002 | Loading state | First load | 1. View screen | Shows "Loading law firm details..." | Medium |
| LAW-FIRM-003 | Screen header | On My Law Firm | 1. View header | Shows "My Law Firm" title with back and refresh buttons | High |
| LAW-FIRM-004 | Tab navigation | On My Law Firm | 1. View tabs | Shows "Law Firm Details" and "Members" tabs | High |

### 8.2 Not Associated State

| Test ID | Test Case | Preconditions | Test Steps | Expected Result | Priority |
|---------|-----------|---------------|------------|-----------------|----------|
| LAW-FIRM-005 | Not associated card | Lawyer not in any law firm | 1. View My Law Firm | Error card: "Error: Not Associated with Law Firm" | High |
| LAW-FIRM-006 | Not associated message | Not associated | 1. View error card | Message: "You are not yet associated with any law firm..." | Medium |
| LAW-FIRM-007 | Refresh on not associated | On error card | 1. Tap refresh button | Attempts to reload law firm data | Medium |
| LAW-FIRM-008 | Pull to refresh | On error card | 1. Pull down | Refresh attempted | Medium |

### 8.3 Law Firm Details Tab

| Test ID | Test Case | Preconditions | Test Steps | Expected Result | Priority |
|---------|-----------|---------------|------------|-----------------|----------|
| LAW-FIRM-009 | Law Firm Details tab active | On My Law Firm | 1. View default tab | "Law Firm Details" tab is active | High |
| LAW-FIRM-010 | Law firm info displayed | Associated with law firm | 1. View details | Shows: Firm name, logo, slogan, location, about, services, specializations | High |
| LAW-FIRM-011 | Lawyer's info in firm | Associated | 1. View details | Shows lawyer's role/position in firm | Medium |
| LAW-FIRM-012 | Case permission displayed | Associated | 1. View details | Shows case permission level | Medium |
| LAW-FIRM-013 | Pull to refresh details | On details tab | 1. Pull down | Law firm details refreshed | Medium |

### 8.4 Members Tab

| Test ID | Test Case | Preconditions | Test Steps | Expected Result | Priority |
|---------|-----------|---------------|------------|-----------------|----------|
| LAW-FIRM-014 | Switch to Members tab | On My Law Firm | 1. Tap "Members" tab | Members tab content displays | High |
| LAW-FIRM-015 | Members list displayed | Law firm has members | 1. View Members tab | List of law firm members shown | High |
| LAW-FIRM-016 | Member card info | On Members tab | 1. View member card | Shows: Name, role, email, status | Medium |
| LAW-FIRM-017 | Empty members state | No other members | 1. View Members tab | Shows appropriate message | Low |

---

## 9. Join Law Firm

### 9.1 Join Law Firm Screen (Via Invitation Link)

| Test ID | Test Case | Preconditions | Test Steps | Expected Result | Priority |
|---------|-----------|---------------|------------|-----------------|----------|
| LAW-JOIN-001 | Open invitation link | Received invitation email | 1. Click invitation link in email | App opens to Join Law Firm screen | High |
| LAW-JOIN-002 | Invitation details loading | On Join screen with token | 1. View screen | Shows loading indicator | Medium |
| LAW-JOIN-003 | Invitation details displayed | Token valid | 1. View screen after loading | Shows: Law firm name, inviter name, inviter email, number of members | High |
| LAW-JOIN-004 | Invalid/expired token | Invalid token | 1. View screen | Error: "Invitation not found or has expired" | High |
| LAW-JOIN-005 | Missing token | No token in URL | 1. View screen | Error: "Invalid invitation link. Token is missing." | High |

### 9.2 Accept/Decline Invitation

| Test ID | Test Case | Preconditions | Test Steps | Expected Result | Priority |
|---------|-----------|---------------|------------|-----------------|----------|
| LAW-JOIN-006 | Accept invite - logged in | Logged in as Lawyer, valid invitation | 1. View invitation<br>2. Tap "Accept Invite" | Loading state, then success | High |
| LAW-JOIN-007 | Accept invite - not logged in | Not logged in, valid invitation | 1. View invitation<br>2. Tap "Login to Accept Invite" | Navigate to login, token saved | High |
| LAW-JOIN-008 | Join success | Invite accepted | 1. Complete acceptance | Success alert: "You have successfully joined [Law Firm Name]!", navigate to dashboard | High |
| LAW-JOIN-009 | Decline invite | On invitation screen | 1. Tap "Decline" | Navigate back, no action taken | Medium |
| LAW-JOIN-010 | Token refreshed after join | Successfully joined | 1. Complete join | JWT token refreshed with new LawFirmId | High |
| LAW-JOIN-011 | User info displayed | Logged in | 1. View screen | Shows "Signed in as: [email]" | Low |
| LAW-JOIN-012 | Not logged in info | Not logged in | 1. View screen | Shows "Please login to accept this invitation" | Low |

### 9.3 Error Handling

| Test ID | Test Case | Preconditions | Test Steps | Expected Result | Priority |
|---------|-----------|---------------|------------|-----------------|----------|
| LAW-JOIN-013 | Session expired during accept | Token expired | 1. Try to accept | Alert: "Session Expired", redirect to login | High |
| LAW-JOIN-014 | Network error | No internet | 1. Try to accept | Error alert with message | High |
| LAW-JOIN-015 | Already member | Already in law firm | 1. Try to accept | Error: Already a member or appropriate message | Medium |
| LAW-JOIN-016 | Invitation already used | Token already used | 1. Try to accept | Error message displayed | Medium |

---

## 10. Chat & Communication

### 10.1 Chat List

| Test ID | Test Case | Preconditions | Test Steps | Expected Result | Priority |
|---------|-----------|---------------|------------|-----------------|----------|
| LAW-CHAT-001 | Access chat list | Logged in as Lawyer | 1. Navigate to Chat | Chat list displayed | High |
| LAW-CHAT-002 | Client conversations shown | Has chats with clients | 1. View chat list | Conversations with clients shown | High |
| LAW-CHAT-003 | Unread message indicator | Has unread messages | 1. View chat list | Unread badge/indicator shown | High |
| LAW-CHAT-004 | Empty chat state | No conversations | 1. View chat list | "No conversations" message | Medium |
| LAW-CHAT-005 | Last message preview | Has chats | 1. View chat card | Last message text and time shown | Medium |

### 10.2 Chat Conversation

| Test ID | Test Case | Preconditions | Test Steps | Expected Result | Priority |
|---------|-----------|---------------|------------|-----------------|----------|
| LAW-CHAT-006 | Open conversation | Has conversation | 1. Tap on chat | Conversation opens | High |
| LAW-CHAT-007 | Send text message | In conversation | 1. Type message<br>2. Tap send | Message sent, appears in chat | High |
| LAW-CHAT-008 | Receive real-time message | In conversation | 1. Client sends message | Message appears instantly | High |
| LAW-CHAT-009 | Send document/image | In conversation | 1. Attach and send file | File sent successfully | Medium |
| LAW-CHAT-010 | Chat from case | On assigned case | 1. Tap "Contact Client" | Opens chat with specific client | High |

---

## 11. Vouchers

> **Note:** Voucher functionality is similar to User role. Lawyers can view and redeem vouchers assigned by Admin.

| Test ID | Test Case | Preconditions | Test Steps | Expected Result | Priority |
|---------|-----------|---------------|------------|-----------------|----------|
| LAW-VOUCH-001 | Access My Vouchers | Logged in as Lawyer | 1. Navigate to Vouchers | My Vouchers screen displayed | High |
| LAW-VOUCH-002 | View vouchers list | Has vouchers | 1. View screen | Voucher cards displayed | High |
| LAW-VOUCH-003 | Filter vouchers | Has vouchers | 1. Use filter chips | Vouchers filtered by status | Medium |
| LAW-VOUCH-004 | Redeem voucher | Valid voucher | 1. Tap voucher<br>2. Tap "Redeem" | Voucher redeemed, code shown | High |
| LAW-VOUCH-005 | Copy voucher code | Redeemed voucher | 1. Tap copy button | Code copied to clipboard | High |

---

## 12. Profile & Settings

### 12.1 Account Settings

| Test ID | Test Case | Preconditions | Test Steps | Expected Result | Priority |
|---------|-----------|---------------|------------|-----------------|----------|
| LAW-SET-001 | Access settings | Logged in as Lawyer | 1. Navigate to Settings | Settings screen displayed | High |
| LAW-SET-002 | Change password | In settings | 1. Tap "Change Password"<br>2. Follow flow | Password changed | High |
| LAW-SET-003 | Enable/Disable 2FA | In settings | 1. Toggle 2FA | 2FA status changed | High |
| LAW-SET-004 | Notification settings | In settings | 1. Tap "Notifications" | Notification preferences shown | Medium |
| LAW-SET-005 | Logout | In settings | 1. Tap "Logout"<br>2. Confirm | Logged out, redirect to login | High |
| LAW-SET-006 | Delete account | In settings | 1. Tap "Delete Account"<br>2. Confirm | Account deletion initiated | Medium |

---

## 13. Notifications

| Test ID | Test Case | Preconditions | Test Steps | Expected Result | Priority |
|---------|-----------|---------------|------------|-----------------|----------|
| LAW-NOTIF-001 | New case notification | App in background | 1. New case posted matching criteria | Push notification received | High |
| LAW-NOTIF-002 | Application accepted notification | Application accepted | 1. Client accepts application | Push notification received | High |
| LAW-NOTIF-003 | Application rejected notification | Application rejected | 1. Client rejects application | Push notification received | High |
| LAW-NOTIF-004 | New message notification | App in background | 1. Client sends message | Push notification received | High |
| LAW-NOTIF-005 | Law firm invitation notification | Invitation sent | 1. Receive invitation | Push notification received | High |
| LAW-NOTIF-006 | Tap notification opens app | Notification received | 1. Tap notification | App opens to relevant screen | High |
| LAW-NOTIF-007 | Notification center | Logged in | 1. Tap notification bell | Notification list opens | High |
| LAW-NOTIF-008 | Mark notifications as read | Has unread | 1. Tap notification | Marked as read | Medium |

---

## 14. Referrals

| Test ID | Test Case | Preconditions | Test Steps | Expected Result | Priority |
|---------|-----------|---------------|------------|-----------------|----------|
| LAW-REF-001 | Access referral section | Logged in as Lawyer | 1. Navigate to Referrals | Referral page displayed | High |
| LAW-REF-002 | View referral code | On referral page | 1. View code | Unique referral code shown | High |
| LAW-REF-003 | Copy referral code | On referral page | 1. Tap "Copy" | Code copied, toast shown | High |
| LAW-REF-004 | Share referral link | On referral page | 1. Tap "Share" | Share sheet opens | High |
| LAW-REF-005 | View referral stats | Has referrals | 1. View stats | Total referrals, rewards shown | Medium |
| LAW-REF-006 | Referral reward | Referred user signs up | 1. Check vouchers | Referral voucher added | High |

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

Total Test Cases: 180+
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
Defect ID: LAW-DEF-XXX
Test Case ID: LAW-XXX-XXX
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

*Total Test Cases for Lawyer Role: **180+***

*Document Version: 1.0*
*Last Updated: December 2024*

---

## Change Log

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Dec 2024 | Initial version with comprehensive test cases for Lawyer role |

