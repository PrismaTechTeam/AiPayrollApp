# 🏢 Law Firm Role - Detailed Test Cases

## Overview
This document contains comprehensive test cases for the **Law Firm** role in the LetLink mobile app. Law Firms are registered legal entities that can browse available cases, apply to cases on behalf of the firm, manage their firm profile, invite and manage member lawyers, and communicate with clients.

---

## Table of Contents
1. [Authentication & Session](#1-authentication--session)
2. [Law Firm Registration & Onboarding](#2-law-firm-registration--onboarding)
3. [Landing Screen & Navigation](#3-landing-screen--navigation)
4. [Available Cases](#4-available-cases)
5. [Case Applications](#5-case-applications)
6. [My Cases (Firm Cases)](#6-my-cases-firm-cases)
7. [Edit Law Firm Profile](#7-edit-law-firm-profile)
8. [Manage Law Firm](#8-manage-law-firm)
9. [Chat & Communication](#9-chat--communication)
10. [Vouchers](#10-vouchers) *(Not available for LawFirm role)*
11. [Profile & Settings](#11-profile--settings)
12. [Notifications](#12-notifications)
13. [Referrals](#13-referrals)

---

## 1. Authentication & Session

> **Note:** Authentication flows are similar to User role. Below are law firm-specific scenarios.

### 1.1 Law Firm Login

| Test ID | Test Case | Preconditions | Test Steps | Expected Result | Priority |
|---------|-----------|---------------|------------|-----------------|----------|
| FIRM-AUTH-001 | Successful login as Law Firm | Verified law firm account | 1. Enter valid email<br>2. Enter valid password<br>3. Tap "Login" | Logged in with LawFirm role, redirect to Available Cases (first tab for LawFirm) | High |
| FIRM-AUTH-002 | Login shows LawFirm-specific tabs | Logged in as LawFirm | 1. View bottom tab bar | Shows exactly 5 tabs: Available Cases, Chat, Manage Bookings, Edit Profile, Manage Law Firm | High |
| FIRM-AUTH-003 | No Home/Dashboard tab | Logged in as LawFirm | 1. View bottom tab bar | "Home" tab is NOT visible (only Admin and User have Home access) | High |
| FIRM-AUTH-004 | No Vouchers tab | Logged in as LawFirm | 1. View bottom tab bar | "Vouchers" tab is NOT visible (only User role has Vouchers) | High |
| FIRM-AUTH-005 | No Cases tab | Logged in as LawFirm | 1. View bottom tab bar | "Cases" tab is NOT visible (only User role has Cases tab for their own cases) | High |
| FIRM-AUTH-006 | Token contains LawFirm role | Login successful | 1. Check JWT token | ActiveRole = "LawFirm" in token claims | High |
| FIRM-AUTH-007 | Login with pending verification | Registration pending admin approval | 1. Login with credentials | Redirect to verification pending screen | High |

### 1.2 Role-Specific Access Control

| Test ID | Test Case | Preconditions | Test Steps | Expected Result | Priority |
|---------|-----------|---------------|------------|-----------------|----------|
| FIRM-AUTH-008 | Cannot access User "Post My Case" | Logged in as LawFirm | 1. Try to navigate to PostMyCaseScreen | Screen not accessible or hidden | Medium |
| FIRM-AUTH-009 | Can access Available Cases tab | Logged in as LawFirm | 1. Tap "Available Cases" tab | Available Cases screen displays | High |
| FIRM-AUTH-010 | Can access Manage Law Firm tab | Logged in as LawFirm | 1. Tap "Manage Law Firm" tab | Manage Law Firm screen displays | High |
| FIRM-AUTH-011 | Can access Manage Bookings tab | Logged in as LawFirm | 1. Tap "Manage Bookings" tab | Manage Bookings screen displays (shows cases assigned to firm) | High |
| FIRM-AUTH-012 | Can access Edit Profile tab | Logged in as LawFirm | 1. Tap "Edit Profile" tab | Edit Law Firm Profile screen displays | High |
| FIRM-AUTH-013 | Can access Chat tab | Logged in as LawFirm | 1. Tap "Chat" tab | Chat screen displays | High |
| FIRM-AUTH-014 | Cannot access Admin tabs | Logged in as LawFirm | 1. View navigation | Admin-only tabs (Manage Vouchers, Manage Lawyers, Manage Banners, Manage Categories, Manage Blog) are hidden | Medium |
| FIRM-AUTH-015 | Role persists after app restart | Logged in as LawFirm, close app | 1. Reopen app | User remains logged in as LawFirm with correct tabs | High |

---

## 2. Law Firm Registration & Onboarding

### 2.1 Access Registration

| Test ID | Test Case | Preconditions | Test Steps | Expected Result | Priority |
|---------|-----------|---------------|------------|-----------------|----------|
| FIRM-REG-001 | Access registration type selection | Logged in as new User | 1. Navigate to registration type selection | Options shown: "Register as Lawyer" and "Register as Law Firm" | High |
| FIRM-REG-002 | Select Law Firm registration | On registration type screen | 1. Tap "Register as Law Firm" | Navigate to Law Firm Registration form | High |
| FIRM-REG-003 | Registration screen displays | On Law Firm Registration | 1. View screen | Header shows "Law Firm Registration" with "Provide your law firm information" subtitle | High |

### 2.2 Firm Information Section

| Test ID | Test Case | Preconditions | Test Steps | Expected Result | Priority |
|---------|-----------|---------------|------------|-----------------|----------|
| FIRM-REG-004 | Enter Firm Name (Required) | On Law Firm Registration | 1. Enter firm name in "Firm Name *" field | Name accepted | High |
| FIRM-REG-005 | Firm Name validation - empty | On Law Firm Registration | 1. Leave firm name empty<br>2. Tap "Submit" | Error: "Firm name is required" | High |
| FIRM-REG-006 | Enter Official Email (Required) | On Law Firm Registration | 1. Enter email in "Official Email *" field | Email accepted | High |
| FIRM-REG-007 | Official Email validation - empty | On Law Firm Registration | 1. Leave email empty<br>2. Submit | Error: "Official email is required" | High |
| FIRM-REG-008 | Enter Office Phone (Required) | On Law Firm Registration | 1. Enter phone in "Office Phone *" field | Phone accepted, phone keyboard | High |
| FIRM-REG-009 | Office Phone validation - empty | On Law Firm Registration | 1. Leave phone empty<br>2. Submit | Error: "Office phone is required" | High |
| FIRM-REG-010 | Enter Registration Number/SSM (Required) | On Law Firm Registration | 1. Enter SSM number in "Registration Number/SSM No. *" field | Number accepted | High |
| FIRM-REG-011 | Registration Number validation - empty | On Law Firm Registration | 1. Leave registration number empty<br>2. Submit | Error: "Registration number is required" | High |
| FIRM-REG-012 | Enter Office Address (Required) | On Law Firm Registration | 1. Enter address in "Office Address *" field | Address accepted (multiline) | High |
| FIRM-REG-013 | Office Address validation - empty | On Law Firm Registration | 1. Leave address empty<br>2. Submit | Error: "Office address is required" | High |

### 2.3 Representative Information Section

| Test ID | Test Case | Preconditions | Test Steps | Expected Result | Priority |
|---------|-----------|---------------|------------|-----------------|----------|
| FIRM-REG-014 | Enter Representative Name (Required) | On Law Firm Registration | 1. Enter name in "Representative Lawyer Name *" field | Name accepted | High |
| FIRM-REG-015 | Representative Name validation - empty | On Law Firm Registration | 1. Leave name empty<br>2. Submit | Error: "Representative name is required" | High |
| FIRM-REG-016 | Select Representative Gender | On Law Firm Registration | 1. Tap gender field<br>2. Select "Male" or "Female" | Gender selected | Medium |
| FIRM-REG-017 | Enter Representative License (Required) | On Law Firm Registration | 1. Enter license in "Representative License Number *" field | License accepted | High |
| FIRM-REG-018 | Representative License validation - empty | On Law Firm Registration | 1. Leave license empty<br>2. Submit | Error: "Representative license is required" | High |
| FIRM-REG-019 | Enter Representative Email (Required) | On Law Firm Registration | 1. Enter email in "Representative Contact Email *" field | Email accepted | High |
| FIRM-REG-020 | Representative Email validation - empty | On Law Firm Registration | 1. Leave email empty<br>2. Submit | Error: "Representative email is required" | High |

### 2.4 Additional Information Section

| Test ID | Test Case | Preconditions | Test Steps | Expected Result | Priority |
|---------|-----------|---------------|------------|-----------------|----------|
| FIRM-REG-021 | Enter Firm Website (Optional) | On Law Firm Registration | 1. Enter URL in "Firm Website" field | URL accepted | Medium |
| FIRM-REG-022 | Select Number of Lawyers | On Law Firm Registration | 1. Tap number of lawyers field<br>2. Select from dropdown | Options: 1-5, 6-20, 21-50, 50+ | Medium |
| FIRM-REG-023 | Select Practice Areas | On Law Firm Registration | 1. Tap practice area chips | Selected areas show checkmark | Medium |
| FIRM-REG-024 | Practice areas list | On Law Firm Registration | 1. View practice areas | Shows: Corporate Law, Criminal Law, Family Law, Property Law, Intellectual Property, Employment Law, Other | Medium |
| FIRM-REG-025 | Select "Other" practice area | On Law Firm Registration | 1. Tap "Other" chip | Additional text field appears for "Other Specialization *" | High |
| FIRM-REG-026 | Other Specialization validation | "Other" selected | 1. Leave other specialization empty<br>2. Submit | Error: "Please specify other specialization" | High |

### 2.5 Document Upload Section

| Test ID | Test Case | Preconditions | Test Steps | Expected Result | Priority |
|---------|-----------|---------------|------------|-----------------|----------|
| FIRM-REG-027 | Document info box displays | On Law Firm Registration | 1. View Documents section | Info box shows required documents: SSM Certificate, Representative IC, Firm License | High |
| FIRM-REG-028 | Upload document - single file | On Law Firm Registration | 1. Tap "Browse Files"<br>2. Select PDF file | File added to list | High |
| FIRM-REG-029 | Upload document - multiple files | On Law Firm Registration | 1. Tap "Browse Files"<br>2. Select multiple files | All files added (up to 6 max) | High |
| FIRM-REG-030 | Maximum 6 files limit | 5 files already uploaded | 1. Try to upload 2 more files | Alert: "Maximum 6 files allowed" | High |
| FIRM-REG-031 | File size limit - 3MB | On Law Firm Registration | 1. Try to upload file > 3MB | Alert: "File exceeds 3 MB limit" | High |
| FIRM-REG-032 | Allowed file types only | On Law Firm Registration | 1. Try to upload .docx file | Alert: "Please upload files in PDF, JPG, or PNG format only" | High |
| FIRM-REG-033 | Delete uploaded file | File uploaded | 1. Tap delete button on file card | File removed, success alert | Medium |
| FIRM-REG-034 | No documents validation | On Law Firm Registration | 1. No files uploaded<br>2. Tap "Submit" | Error: "Please upload at least one document" | High |

### 2.6 Form Submission

| Test ID | Test Case | Preconditions | Test Steps | Expected Result | Priority |
|---------|-----------|---------------|------------|-----------------|----------|
| FIRM-REG-035 | Submit registration successfully | All required fields filled, files uploaded | 1. Fill all required fields<br>2. Upload documents<br>3. Tap "Submit Registration" | Success alert, navigate to Verification Pending screen | High |
| FIRM-REG-036 | Submit button loading state | Submitting registration | 1. Tap "Submit Registration" | Button shows loading spinner, text: "Submitting...", button disabled | Medium |
| FIRM-REG-037 | Submit button disabled - invalid | Required fields missing | 1. View Submit button | Button disabled until all required fields filled | Medium |
| FIRM-REG-038 | Token renewed after submission | Registration submitted | 1. Submit registration | JWT token renewed | High |
| FIRM-REG-039 | Redux updated after submission | Registration submitted | 1. Submit registration | Redux registrationSlice updated with hasRegistration=true, registrationType=lawfirm | Medium |

### 2.7 Verification Pending Screen

| Test ID | Test Case | Preconditions | Test Steps | Expected Result | Priority |
|---------|-----------|---------------|------------|-----------------|----------|
| FIRM-REG-040 | Verification pending screen displays | Registration submitted | 1. View screen after submission | Shows pending verification message | High |
| FIRM-REG-041 | Track registration button | On pending screen | 1. Tap track registration | Shows registration status | Medium |
| FIRM-REG-042 | Return to dashboard | On pending screen | 1. Tap home/dashboard button | Navigate to dashboard | Medium |

---

## 3. Landing Screen & Navigation

> **Note:** Law Firm role does NOT have a Dashboard/Home tab. The first tab is "Available Cases" which serves as the landing screen.

### 3.1 Law Firm Landing Screen

| Test ID | Test Case | Preconditions | Test Steps | Expected Result | Priority |
|---------|-----------|---------------|------------|-----------------|----------|
| FIRM-LAND-001 | Available Cases is first tab | Logged in as LawFirm | 1. Login as LawFirm | Available Cases screen displays as landing/first screen | High |
| FIRM-LAND-002 | No Dashboard/Home access | Logged in as LawFirm | 1. View navigation | Home/Dashboard tab is NOT available (only for Admin and User roles) | High |

### 3.2 Bottom Tab Navigation

| Test ID | Test Case | Preconditions | Test Steps | Expected Result | Priority |
|---------|-----------|---------------|------------|-----------------|----------|
| FIRM-NAV-001 | Tab bar displays correct tabs | Logged in as LawFirm | 1. View bottom tab bar | Shows exactly 5 tabs in order: Available Cases, Chat, Manage Bookings, Edit Profile, Manage Law Firm | High |
| FIRM-NAV-002 | Available Cases tab active | After login | 1. View tab bar | "Available Cases" tab is highlighted/active (first tab) | High |
| FIRM-NAV-003 | Navigate to Chat | On any screen | 1. Tap "Chat" tab | Navigate to Chat screen | High |
| FIRM-NAV-004 | Navigate to Manage Bookings | On any screen | 1. Tap "Manage Bookings" tab | Navigate to Manage Bookings screen (shows assigned cases) | High |
| FIRM-NAV-005 | Navigate to Edit Profile | On any screen | 1. Tap "Edit Profile" tab | Navigate to Edit Law Firm Profile screen | High |
| FIRM-NAV-006 | Navigate to Manage Law Firm | On any screen | 1. Tap "Manage Law Firm" tab | Navigate to Manage Law Firm screen | High |
| FIRM-NAV-007 | Tab icons display correctly | On any screen | 1. View tab bar | Icons: briefcase-check, chat, calendar-check, account-edit, account-group | Medium |

---

## 4. Available Cases

### 4.1 Available Cases Screen

| Test ID | Test Case | Preconditions | Test Steps | Expected Result | Priority |
|---------|-----------|---------------|------------|-----------------|----------|
| FIRM-CASES-001 | Access Available Cases screen | Logged in as LawFirm | 1. Tap "Available Cases" tab | Available Cases screen displays | High |
| FIRM-CASES-002 | Page title section | On Available Cases | 1. View header section | Shows "Available Cases" title with appropriate subtitle | High |
| FIRM-CASES-003 | Loading state | First load | 1. View screen while loading | Shows loading indicator | Medium |
| FIRM-CASES-004 | Cases list displays | Cases available | 1. View screen after loading | List of pending cases displayed as cards | High |
| FIRM-CASES-005 | Empty state - no cases | No available cases | 1. View screen | Shows "No Cases Found" message | Medium |
| FIRM-CASES-006 | Pull to refresh | On Available Cases | 1. Pull down to refresh | Cases list refreshed | High |

### 4.2 Search and Filters

| Test ID | Test Case | Preconditions | Test Steps | Expected Result | Priority |
|---------|-----------|---------------|------------|-----------------|----------|
| FIRM-CASES-007 | Search bar visible | On Available Cases | 1. View screen | Search bar with placeholder displayed | High |
| FIRM-CASES-008 | Search by case number | On Available Cases | 1. Enter case number in search | Matching cases displayed | High |
| FIRM-CASES-009 | Search by title | On Available Cases | 1. Enter case title keyword | Matching cases displayed | High |
| FIRM-CASES-010 | Search by category | On Available Cases | 1. Enter category name | Matching cases displayed | Medium |
| FIRM-CASES-011 | Time filter - All | On Available Cases | 1. Tap "All" time filter | All cases shown | High |
| FIRM-CASES-012 | Time filter - Today | On Available Cases | 1. Tap "Today" time filter | Only cases from today shown | Medium |
| FIRM-CASES-013 | Category filter dropdown | On Available Cases | 1. Tap category filter | Dropdown menu with categories appears | High |
| FIRM-CASES-014 | Sort by options | On Available Cases | 1. Tap sort button | Dropdown with sort options (Newest, Oldest, Highest Budget, Lowest Budget) | High |
| FIRM-CASES-015 | Reset all filters | Filters applied | 1. Tap "Reset" button | All filters cleared | High |

### 4.3 Available Case Card

| Test ID | Test Case | Preconditions | Test Steps | Expected Result | Priority |
|---------|-----------|---------------|------------|-----------------|----------|
| FIRM-CASES-016 | Case card displays | Cases available | 1. View case card | Shows: Case No, time posted, priority badge, title, category, description, budget, location | High |
| FIRM-CASES-017 | Priority badge - Urgent | Case has urgent priority | 1. View case card | Red priority badge "Urgent" | Medium |
| FIRM-CASES-018 | View Details button | On case card | 1. Tap "View Details" | Navigate to Case Details screen | High |
| FIRM-CASES-019 | Apply button | On case card | 1. Tap "Apply" | Opens Application Modal | High |

---

## 5. Case Applications

### 5.1 Law Firm Application Modal

| Test ID | Test Case | Preconditions | Test Steps | Expected Result | Priority |
|---------|-----------|---------------|------------|-----------------|----------|
| FIRM-APP-001 | Modal opens | Tap Apply on case card | 1. Tap "Apply" button | Application modal opens | High |
| FIRM-APP-002 | Modal header | Modal open | 1. View modal | Shows case number and title in header | Medium |
| FIRM-APP-003 | Proposed fee field | Modal open | 1. View form | Proposed fee input field visible | High |
| FIRM-APP-004 | Enter proposed fee | Modal open | 1. Enter proposed fee amount | Fee accepted | High |
| FIRM-APP-005 | Cover letter/message field | Modal open | 1. View form | Message textarea visible | High |
| FIRM-APP-006 | Submit application | All fields filled | 1. Fill proposed fee and message<br>2. Tap "Submit" | Loading state, then success | High |
| FIRM-APP-007 | Submit success | Application submitted | 1. Complete submission | Success message, modal closes, cases refresh | High |
| FIRM-APP-008 | Cancel application | Modal open | 1. Tap "Cancel" | Modal closes, no action | Medium |
| FIRM-APP-009 | Validation - empty fee | Fee empty | 1. Submit without fee | Error: "Proposed fee is required" | High |
| FIRM-APP-010 | Network error | No internet | 1. Submit application | Error message displayed | High |

### 5.2 Application on Behalf of Firm

| Test ID | Test Case | Preconditions | Test Steps | Expected Result | Priority |
|---------|-----------|---------------|------------|-----------------|----------|
| FIRM-APP-011 | Application associated with firm | Submit application | 1. Complete application | Application linked to lawFirmId, not individual lawyer | High |
| FIRM-APP-012 | Firm info in application | Application submitted | 1. View application on client side | Shows law firm name, not individual lawyer | Medium |
| FIRM-APP-013 | Firm members can view | Application submitted | 1. Firm member views applications | Application visible to all firm members | Medium |

---

## 6. My Cases (Firm Cases)

### 6.1 My Cases Screen

| Test ID | Test Case | Preconditions | Test Steps | Expected Result | Priority |
|---------|-----------|---------------|------------|-----------------|----------|
| FIRM-MYCASE-001 | Access My Cases | Logged in as LawFirm | 1. Navigate to My Cases | Cases list displayed | High |
| FIRM-MYCASE-002 | Assigned cases display | Firm has assigned cases | 1. View My Cases | Cases where firm is assigned shown | High |
| FIRM-MYCASE-003 | Applied cases display | Firm has applications | 1. View My Cases | Cases with pending applications shown | High |
| FIRM-MYCASE-004 | Empty state | No cases | 1. View My Cases | "No cases" message | Medium |
| FIRM-MYCASE-005 | Filter by status | On My Cases | 1. Select status filter | Cases filtered by status | Medium |

### 6.2 Case Details (Law Firm View)

| Test ID | Test Case | Preconditions | Test Steps | Expected Result | Priority |
|---------|-----------|---------------|------------|-----------------|----------|
| FIRM-MYCASE-006 | View case details | Has case | 1. Tap on case card | Case details screen opens | High |
| FIRM-MYCASE-007 | Client info displayed | Assigned to case | 1. View client section | Client name, email, phone visible | High |
| FIRM-MYCASE-008 | Case description | On case details | 1. View details | Full case description shown | High |
| FIRM-MYCASE-009 | Contact client button | Assigned to case | 1. Tap "Contact Client" | Navigate to chat with client | High |
| FIRM-MYCASE-010 | Assign to member | Firm assigned to case | 1. Tap "Assign to Member" | Shows list of firm members to assign | Medium |

---

## 7. Edit Law Firm Profile

### 7.1 Profile Screen Access

| Test ID | Test Case | Preconditions | Test Steps | Expected Result | Priority |
|---------|-----------|---------------|------------|-----------------|----------|
| FIRM-PROF-001 | Access Edit Profile | Logged in as LawFirm | 1. Tap "Edit Profile" tab | Edit Law Firm Profile screen displays | High |
| FIRM-PROF-002 | Loading state | First load | 1. View screen | Loading indicator with "Loading profile..." | Medium |
| FIRM-PROF-003 | Profile data loaded | Profile exists | 1. View screen after loading | Form populated with existing data | High |
| FIRM-PROF-004 | New profile (empty form) | No profile exists | 1. View screen | Empty form displayed for new profile setup | Medium |
| FIRM-PROF-005 | Header displays | On Edit Profile | 1. View header | Shows "Edit Law Firm Profile" with back button | High |

### 7.2 Basic Information Section

| Test ID | Test Case | Preconditions | Test Steps | Expected Result | Priority |
|---------|-----------|---------------|------------|-----------------|----------|
| FIRM-PROF-006 | Logo upload button | On Edit Profile | 1. View logo section | Logo with camera button overlay | High |
| FIRM-PROF-007 | Upload new logo | On Edit Profile | 1. Tap camera button<br>2. Select image from gallery | Image uploaded, preview updates | High |
| FIRM-PROF-008 | Logo size limit | On Edit Profile | 1. Try to upload image > 5MB | Alert: "Image size should not exceed 5MB" | Medium |
| FIRM-PROF-009 | Logo upload loading | Uploading logo | 1. Select image | Camera button shows loading spinner | Medium |
| FIRM-PROF-010 | Logo upload success | Upload complete | 1. Complete upload | Success message: "Logo uploaded successfully!", logo updated | High |
| FIRM-PROF-011 | Edit Law Firm Name | On Edit Profile | 1. Change firm name | Name field updates | High |
| FIRM-PROF-012 | Firm Name validation | On Edit Profile | 1. Clear name<br>2. Save | Error: "Law firm name is required" | High |
| FIRM-PROF-013 | Edit Slogan | On Edit Profile | 1. Enter/change slogan | Slogan field updates (e.g., "Your trusted legal partner") | High |
| FIRM-PROF-014 | Slogan validation | On Edit Profile | 1. Clear slogan<br>2. Save | Error: "Slogan is required" | High |
| FIRM-PROF-015 | Select Base Location | On Edit Profile | 1. Tap base location field | Location picker modal opens | High |
| FIRM-PROF-016 | Location picker options | Picker open | 1. View options | Shows Malaysian states: Kuala Lumpur, Selangor, Penang, etc. | Medium |
| FIRM-PROF-017 | Select location | Picker open | 1. Tap on a state | State selected, picker closes, field updates | High |
| FIRM-PROF-018 | Base Location validation | On Edit Profile | 1. Clear location<br>2. Save | Error: "Base location is required" | High |
| FIRM-PROF-019 | Operating Hours | On Edit Profile | 1. Enter operating hours | Text accepted (e.g., "Monday - Friday: 9:00 AM - 6:00 PM") | Medium |

### 7.3 Serve Locations Section

| Test ID | Test Case | Preconditions | Test Steps | Expected Result | Priority |
|---------|-----------|---------------|------------|-----------------|----------|
| FIRM-PROF-020 | Serve Locations chips | On Edit Profile | 1. View serve locations section | Chips for all Malaysian states displayed | High |
| FIRM-PROF-021 | Select serve location | On Edit Profile | 1. Tap on a state chip | Chip turns selected, added to list | High |
| FIRM-PROF-022 | Deselect serve location | Location selected | 1. Tap on selected chip | Chip reverts, removed from list | High |
| FIRM-PROF-023 | Multiple serve locations | On Edit Profile | 1. Select multiple states | All selected states highlighted | High |
| FIRM-PROF-024 | Serve locations validation | On Edit Profile | 1. Deselect all<br>2. Save | Error: "At least one service location is required" | High |

### 7.4 Languages Section

| Test ID | Test Case | Preconditions | Test Steps | Expected Result | Priority |
|---------|-----------|---------------|------------|-----------------|----------|
| FIRM-PROF-025 | Languages chips | On Edit Profile | 1. View languages section | Chips: English, Bahasa Malaysia, Chinese, Tamil, Hindi, Arabic | High |
| FIRM-PROF-026 | Select language | On Edit Profile | 1. Tap on language chip | Chip turns selected | High |
| FIRM-PROF-027 | Deselect language | Language selected | 1. Tap on selected chip | Chip reverts, language removed | High |
| FIRM-PROF-028 | Languages validation | On Edit Profile | 1. Deselect all<br>2. Save | Error: "At least one language is required" | High |

### 7.5 About Section

| Test ID | Test Case | Preconditions | Test Steps | Expected Result | Priority |
|---------|-----------|---------------|------------|-----------------|----------|
| FIRM-PROF-029 | About textarea | On Edit Profile | 1. View About section | Multiline text area with placeholder | High |
| FIRM-PROF-030 | Enter about text | On Edit Profile | 1. Enter text about firm | Text accepted | High |
| FIRM-PROF-031 | Character counter | On Edit Profile | 1. Enter text | Counter shows "{count} characters" | Medium |
| FIRM-PROF-032 | About validation | On Edit Profile | 1. Leave about empty<br>2. Save | Error: "About section is required" | High |

### 7.6 Specializations Section

| Test ID | Test Case | Preconditions | Test Steps | Expected Result | Priority |
|---------|-----------|---------------|------------|-----------------|----------|
| FIRM-PROF-033 | Add specialization input | On Edit Profile | 1. View Specializations section | Text input with "Add" button | High |
| FIRM-PROF-034 | Add specialization | On Edit Profile | 1. Type specialization<br>2. Tap "Add" | Chip added to list, input cleared | High |
| FIRM-PROF-035 | Add button disabled | Input empty | 1. View Add button | Button disabled when input empty | Medium |
| FIRM-PROF-036 | Remove specialization | Has specializations | 1. Tap close on chip | Specialization removed | High |
| FIRM-PROF-037 | Specializations validation | On Edit Profile | 1. Remove all<br>2. Save | Error: "At least one specialization is required" | High |
| FIRM-PROF-038 | Empty state message | No specializations | 1. View section | Shows "No specializations added yet. Please add at least one." | Medium |

### 7.7 Services Section

| Test ID | Test Case | Preconditions | Test Steps | Expected Result | Priority |
|---------|-----------|---------------|------------|-----------------|----------|
| FIRM-PROF-039 | Add service input | On Edit Profile | 1. View Services section | Text input with "Add" button | High |
| FIRM-PROF-040 | Add service | On Edit Profile | 1. Type service<br>2. Tap "Add" | Chip added to list | High |
| FIRM-PROF-041 | Remove service | Has services | 1. Tap close on chip | Service removed | High |
| FIRM-PROF-042 | Services validation | On Edit Profile | 1. Remove all<br>2. Save | Error: "At least one service is required" | High |

### 7.8 Form Submission

| Test ID | Test Case | Preconditions | Test Steps | Expected Result | Priority |
|---------|-----------|---------------|------------|-----------------|----------|
| FIRM-PROF-043 | Save profile button | On Edit Profile | 1. View action buttons | "Save Profile" button visible | High |
| FIRM-PROF-044 | Save profile success | All valid data | 1. Fill all required fields<br>2. Tap "Save Profile" | Success message: "Profile updated successfully!" | High |
| FIRM-PROF-045 | Save button loading | Saving profile | 1. Tap "Save Profile" | Button shows "Saving...", disabled | Medium |
| FIRM-PROF-046 | Cancel button | On Edit Profile | 1. Tap "Cancel" | Navigate back or reset form | Medium |
| FIRM-PROF-047 | Validation errors display | Invalid data | 1. Submit with errors | Error card appears with message | High |

---

## 8. Manage Law Firm

### 8.1 Manage Law Firm Screen Access

| Test ID | Test Case | Preconditions | Test Steps | Expected Result | Priority |
|---------|-----------|---------------|------------|-----------------|----------|
| FIRM-MANAGE-001 | Access Manage Law Firm | Logged in as LawFirm | 1. Tap "Manage Law Firm" tab | Manage Law Firm screen displays | High |
| FIRM-MANAGE-002 | Loading state | First load | 1. View screen | Shows "Loading..." indicator | Medium |
| FIRM-MANAGE-003 | Screen header | On Manage Law Firm | 1. View header | Shows "Manage Law Firm" title with back button and info button | High |
| FIRM-MANAGE-004 | Info button | On Manage Law Firm | 1. Tap info button | Navigate to Law Firm Details screen | Medium |
| FIRM-MANAGE-005 | Tab navigation | On Manage Law Firm | 1. View tabs | Shows "Members" and "Invitation" tabs | High |

### 8.2 Members Tab

| Test ID | Test Case | Preconditions | Test Steps | Expected Result | Priority |
|---------|-----------|---------------|------------|-----------------|----------|
| FIRM-MANAGE-006 | Members tab active | On Manage Law Firm | 1. View default tab | "Members" tab is active | High |
| FIRM-MANAGE-007 | Members list displayed | Firm has members | 1. View Members tab | List of law firm members shown | High |
| FIRM-MANAGE-008 | Member card info | On Members tab | 1. View member card | Shows: Name, role, email, status, avatar | High |
| FIRM-MANAGE-009 | Empty members state | No members | 1. View Members tab | Shows appropriate message | Medium |
| FIRM-MANAGE-010 | Refresh members button | On Members tab | 1. Tap refresh icon | Members list refreshed | Medium |
| FIRM-MANAGE-011 | Pull to refresh | On Members tab | 1. Pull down to refresh | Members list refreshed | Medium |
| FIRM-MANAGE-012 | Invite Members button | On Members tab | 1. Tap "Invite Members" | Invite form appears | High |
| FIRM-MANAGE-013 | Member actions menu | On member card | 1. Tap actions/more button | Shows options: Remove, Change Role, etc. | Medium |
| FIRM-MANAGE-014 | Remove member | On member card | 1. Tap Remove<br>2. Confirm | Member removed from firm | High |

### 8.3 Invite Members

| Test ID | Test Case | Preconditions | Test Steps | Expected Result | Priority |
|---------|-----------|---------------|------------|-----------------|----------|
| FIRM-MANAGE-015 | Invite form opens | Tap "Invite Members" | 1. View form | Invite form displayed | High |
| FIRM-MANAGE-016 | Enter email to invite | Form open | 1. Enter email address | Email accepted | High |
| FIRM-MANAGE-017 | Multiple emails | Form open | 1. Enter multiple emails | Multiple emails can be added | Medium |
| FIRM-MANAGE-018 | Invalid email validation | Form open | 1. Enter invalid email<br>2. Submit | Error: "Invalid email format" | High |
| FIRM-MANAGE-019 | Send invitation | Valid email entered | 1. Tap "Send Invitation" | Loading state, then success | High |
| FIRM-MANAGE-020 | Invitation sent success | Invitation sent | 1. Complete invitation | Success message, form closes or resets | High |
| FIRM-MANAGE-021 | Cancel invite form | Form open | 1. Tap X or cancel | Form closes, no action | Medium |
| FIRM-MANAGE-022 | Already member error | Email is member | 1. Try to invite existing member | Error: "Already a member" or similar | Medium |
| FIRM-MANAGE-023 | Network error | No internet | 1. Send invitation | Error message displayed | High |

### 8.4 Invitation Tab

| Test ID | Test Case | Preconditions | Test Steps | Expected Result | Priority |
|---------|-----------|---------------|------------|-----------------|----------|
| FIRM-MANAGE-024 | Switch to Invitation tab | On Manage Law Firm | 1. Tap "Invitation" tab | Invitation tab content displays | High |
| FIRM-MANAGE-025 | Invitation list displayed | Has pending invitations | 1. View Invitation tab | List of pending/sent invitations shown | High |
| FIRM-MANAGE-026 | Invitation card info | On Invitation tab | 1. View invitation card | Shows: Email, status (Pending/Accepted/Expired), sent date | High |
| FIRM-MANAGE-027 | Empty invitations state | No invitations | 1. View Invitation tab | Shows "No pending invitations" message | Medium |
| FIRM-MANAGE-028 | Resend invitation | Pending invitation | 1. Tap "Resend" on invitation | Invitation resent | Medium |
| FIRM-MANAGE-029 | Cancel invitation | Pending invitation | 1. Tap "Cancel"<br>2. Confirm | Invitation cancelled | Medium |
| FIRM-MANAGE-030 | Invite from invitation tab | On Invitation tab | 1. Tap "Invite Members" | Invite form appears | High |
| FIRM-MANAGE-031 | Invitation status - Pending | Sent invitation | 1. View invitation | Status shows "Pending" | Low |
| FIRM-MANAGE-032 | Invitation status - Accepted | Invitation accepted | 1. View invitation | Status shows "Accepted" | Low |
| FIRM-MANAGE-033 | Invitation status - Expired | Invitation expired | 1. View invitation | Status shows "Expired" | Low |

---

## 9. Chat & Communication

### 9.1 Chat List

| Test ID | Test Case | Preconditions | Test Steps | Expected Result | Priority |
|---------|-----------|---------------|------------|-----------------|----------|
| FIRM-CHAT-001 | Access chat list | Logged in as LawFirm | 1. Navigate to Chat | Chat list displayed | High |
| FIRM-CHAT-002 | Client conversations shown | Has chats with clients | 1. View chat list | Conversations with clients shown | High |
| FIRM-CHAT-003 | Unread message indicator | Has unread messages | 1. View chat list | Unread badge/indicator shown | High |
| FIRM-CHAT-004 | Empty chat state | No conversations | 1. View chat list | "No conversations" message | Medium |
| FIRM-CHAT-005 | Last message preview | Has chats | 1. View chat card | Last message text and time shown | Medium |

### 9.2 Chat Conversation

| Test ID | Test Case | Preconditions | Test Steps | Expected Result | Priority |
|---------|-----------|---------------|------------|-----------------|----------|
| FIRM-CHAT-006 | Open conversation | Has conversation | 1. Tap on chat | Conversation opens | High |
| FIRM-CHAT-007 | Send text message | In conversation | 1. Type message<br>2. Tap send | Message sent, appears in chat | High |
| FIRM-CHAT-008 | Receive real-time message | In conversation | 1. Client sends message | Message appears instantly | High |
| FIRM-CHAT-009 | Send document/image | In conversation | 1. Attach and send file | File sent successfully | Medium |
| FIRM-CHAT-010 | Chat from case | On assigned case | 1. Tap "Contact Client" | Opens chat with specific client | High |

---

## 10. Vouchers

> **Note:** Law Firm role does NOT have access to the Vouchers tab. Vouchers are only available for the User role.

| Test ID | Test Case | Preconditions | Test Steps | Expected Result | Priority |
|---------|-----------|---------------|------------|-----------------|----------|
| FIRM-VOUCH-001 | No Vouchers tab | Logged in as LawFirm | 1. View bottom tab bar | "Vouchers" tab is NOT visible | High |
| FIRM-VOUCH-002 | Cannot navigate to Vouchers | Logged in as LawFirm | 1. Try to access Vouchers screen programmatically | Screen not accessible | Medium |

---

## 11. Profile & Settings

### 11.1 Account Settings

| Test ID | Test Case | Preconditions | Test Steps | Expected Result | Priority |
|---------|-----------|---------------|------------|-----------------|----------|
| FIRM-SET-001 | Access settings | Logged in as LawFirm | 1. Navigate to Settings | Settings screen displayed | High |
| FIRM-SET-002 | Change password | In settings | 1. Tap "Change Password"<br>2. Follow flow | Password changed | High |
| FIRM-SET-003 | Enable/Disable 2FA | In settings | 1. Toggle 2FA | 2FA status changed | High |
| FIRM-SET-004 | Notification settings | In settings | 1. Tap "Notifications" | Notification preferences shown | Medium |
| FIRM-SET-005 | Logout | In settings | 1. Tap "Logout"<br>2. Confirm | Logged out, redirect to login | High |
| FIRM-SET-006 | Delete account | In settings | 1. Tap "Delete Account"<br>2. Confirm | Account deletion initiated (with confirmation for firm account) | Medium |

---

## 12. Notifications

| Test ID | Test Case | Preconditions | Test Steps | Expected Result | Priority |
|---------|-----------|---------------|------------|-----------------|----------|
| FIRM-NOTIF-001 | New case notification | App in background | 1. New case posted matching criteria | Push notification received | High |
| FIRM-NOTIF-002 | Application accepted notification | Application accepted | 1. Client accepts application | Push notification received | High |
| FIRM-NOTIF-003 | Application rejected notification | Application rejected | 1. Client rejects application | Push notification received | High |
| FIRM-NOTIF-004 | New message notification | App in background | 1. Client sends message | Push notification received | High |
| FIRM-NOTIF-005 | New member joined notification | Invitation accepted | 1. Lawyer accepts invitation | Push notification: "New member joined your firm" | High |
| FIRM-NOTIF-006 | Tap notification opens app | Notification received | 1. Tap notification | App opens to relevant screen | High |
| FIRM-NOTIF-007 | Notification center | Logged in | 1. Tap notification bell | Notification list opens | High |
| FIRM-NOTIF-008 | Mark notifications as read | Has unread | 1. Tap notification | Marked as read | Medium |

---

## 13. Referrals

| Test ID | Test Case | Preconditions | Test Steps | Expected Result | Priority |
|---------|-----------|---------------|------------|-----------------|----------|
| FIRM-REF-001 | Access referral section | Logged in as LawFirm | 1. Navigate to Referrals | Referral page displayed | High |
| FIRM-REF-002 | View referral code | On referral page | 1. View code | Unique referral code shown | High |
| FIRM-REF-003 | Copy referral code | On referral page | 1. Tap "Copy" | Code copied, toast shown | High |
| FIRM-REF-004 | Share referral link | On referral page | 1. Tap "Share" | Share sheet opens | High |
| FIRM-REF-005 | View referral stats | Has referrals | 1. View stats | Total referrals, rewards shown | Medium |
| FIRM-REF-006 | Referral reward | Referred user signs up | 1. Check vouchers | Referral voucher added | High |

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

Total Test Cases: 160+
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
Defect ID: FIRM-DEF-XXX
Test Case ID: FIRM-XXX-XXX
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

*Total Test Cases for Law Firm Role: **160+***

*Document Version: 1.1*
*Last Updated: December 2024*

---

## Change Log

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Dec 2024 | Initial version with comprehensive test cases for Law Firm role |
| 1.1 | Dec 2024 | Updated to match current implementation: Law Firm has NO Home/Dashboard tab, NO Vouchers tab, NO Cases tab. Tab bar shows: Available Cases, Chat, Manage Bookings, Edit Profile, Manage Law Firm |

