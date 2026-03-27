# 👤 User Role - Detailed Test Cases

## Overview
This document contains comprehensive test cases for the **User** role in the LetLink mobile app. Users are regular clients who can post cases, find lawyers, book consultations, and manage their legal matters.

---

## Table of Contents
1. [Authentication & Session](#1-authentication--session)
2. [User Onboarding](#2-user-onboarding)
3. [Dashboard & Home](#3-dashboard--home)
4. [Case Management](#4-case-management)
5. [Find Lawyer](#5-find-lawyer)
6. [Consultation Booking](#6-consultation-booking)
7. [Vouchers](#7-vouchers)
8. [Chat & Communication](#8-chat--communication)
9. [Profile & Settings](#9-profile--settings)
10. [Tools & Calculators](#10-tools--calculators)
11. [Notifications](#11-notifications)
12. [Referrals](#12-referrals)

---

## 1. Authentication & Session

### 1.1 Email/Password Login

| Test ID | Test Case | Preconditions | Test Steps | Expected Result | Priority |
|---------|-----------|---------------|------------|-----------------|----------|
| USER-AUTH-001 | Successful login with valid email and password | User account exists, email verified | 1. Open app<br>2. Enter valid email<br>3. Enter valid password<br>4. Tap "Login" | User is redirected to Dashboard, token stored in SecureStore | High |
| USER-AUTH-002 | Login with invalid email format | None | 1. Enter "invalid-email"<br>2. Enter any password<br>3. Tap "Login" | Error message: "Please enter a valid email address" | High |
| USER-AUTH-003 | Login with wrong password | User account exists | 1. Enter valid email<br>2. Enter wrong password<br>3. Tap "Login" | Error message: "Invalid email or password" | High |
| USER-AUTH-004 | Login with unverified email | User registered but email not verified | 1. Enter email<br>2. Enter password<br>3. Tap "Login" | Redirect to email verification screen with message | High |
| USER-AUTH-005 | Login with empty email field | None | 1. Leave email empty<br>2. Enter password<br>3. Tap "Login" | Error: "Email is required" | Medium |
| USER-AUTH-006 | Login with empty password field | None | 1. Enter email<br>2. Leave password empty<br>3. Tap "Login" | Error: "Password is required" | Medium |
| USER-AUTH-007 | Login shows loading indicator | User account exists | 1. Enter credentials<br>2. Tap "Login" | Loading spinner appears during API call | Medium |
| USER-AUTH-008 | Login with network error | No internet connection | 1. Disconnect internet<br>2. Attempt login | Error: "Network error. Please check your connection" | High |

### 1.2 Phone OTP Login

| Test ID | Test Case | Preconditions | Test Steps | Expected Result | Priority |
|---------|-----------|---------------|------------|-----------------|----------|
| USER-AUTH-009 | Send OTP to valid phone number | Phone number registered | 1. Switch to phone login tab<br>2. Select country code<br>3. Enter valid phone number<br>4. Tap "Send OTP" | OTP sent, navigate to OTP input screen | High |
| USER-AUTH-010 | Send OTP to unregistered phone | Phone not in system | 1. Enter unregistered phone<br>2. Tap "Send OTP" | New user flow initiated or error based on backend logic | Medium |
| USER-AUTH-011 | Verify correct 6-digit OTP | OTP received | 1. Enter correct 6-digit OTP<br>2. Tap "Verify" | Login successful, redirect to Dashboard | High |
| USER-AUTH-012 | Verify incorrect OTP | OTP received | 1. Enter wrong OTP<br>2. Tap "Verify" | Error: "Invalid OTP. Please try again" | High |
| USER-AUTH-013 | OTP expires after 5 minutes | OTP sent | 1. Wait 5+ minutes<br>2. Enter OTP<br>3. Tap "Verify" | Error: "OTP expired. Please request a new one" | Medium |
| USER-AUTH-014 | Resend OTP | Previous OTP expired | 1. Tap "Resend OTP"<br>2. Wait for success | New OTP sent, timer resets | Medium |
| USER-AUTH-015 | Resend OTP rate limiting | Multiple resend attempts | 1. Tap "Resend OTP" 3+ times rapidly | Error: "Too many attempts. Please wait X seconds" | Medium |
| USER-AUTH-016 | Invalid phone format | None | 1. Enter "abc123"<br>2. Tap "Send OTP" | Error: "Please enter a valid phone number" | Medium |

### 1.3 Google Sign-In

| Test ID | Test Case | Preconditions | Test Steps | Expected Result | Priority |
|---------|-----------|---------------|------------|-----------------|----------|
| USER-AUTH-017 | Google sign-in success (existing user) | Google account linked | 1. Tap "Continue with Google"<br>2. Select Google account<br>3. Authorize | Login successful, redirect to Dashboard | High |
| USER-AUTH-018 | Google sign-in success (new user) | Google account not in system | 1. Tap "Continue with Google"<br>2. Select Google account | New account created, redirect to onboarding | High |
| USER-AUTH-019 | Google sign-in cancelled | None | 1. Tap "Continue with Google"<br>2. Cancel on Google prompt | Return to login screen, no error | Medium |
| USER-AUTH-020 | Google sign-in with 2FA required | 2FA enabled for account | 1. Complete Google sign-in | Redirect to 2FA verification screen | High |
| USER-AUTH-021 | Google sign-in network error | No internet | 1. Disconnect internet<br>2. Tap "Continue with Google" | Error: "Network error" | Medium |

### 1.4 Two-Factor Authentication

| Test ID | Test Case | Preconditions | Test Steps | Expected Result | Priority |
|---------|-----------|---------------|------------|-----------------|----------|
| USER-AUTH-022 | 2FA screen displays correctly | 2FA required after login | 1. Login with email/password | 2FA screen shows with 6-digit input | High |
| USER-AUTH-023 | Verify valid 2FA code | On 2FA screen | 1. Enter correct 6-digit code<br>2. Tap "Verify" | Login successful, redirect to Dashboard | High |
| USER-AUTH-024 | Verify invalid 2FA code | On 2FA screen | 1. Enter wrong code<br>2. Tap "Verify" | Error: "Invalid verification code" | High |
| USER-AUTH-025 | 2FA code expiration | On 2FA screen | 1. Wait for code to expire<br>2. Enter code | Error: "Code expired. Please try again" | Medium |
| USER-AUTH-026 | Request new 2FA code | On 2FA screen | 1. Tap "Resend Code" | New code sent, confirmation shown | Medium |

### 1.5 Registration

| Test ID | Test Case | Preconditions | Test Steps | Expected Result | Priority |
|---------|-----------|---------------|------------|-----------------|----------|
| USER-AUTH-027 | Successful registration | None | 1. Tap "Create Account"<br>2. Enter first name, last name<br>3. Enter valid email<br>4. Enter strong password<br>5. Tap "Register" | Success, redirect to email verification | High |
| USER-AUTH-028 | Register with existing email | Email already registered | 1. Enter existing email<br>2. Complete form<br>3. Tap "Register" | Error: "Email already exists" | High |
| USER-AUTH-029 | Register with weak password | None | 1. Enter password "123"<br>2. Tap "Register" | Error: "Password must be at least 8 characters with uppercase, lowercase, number" | High |
| USER-AUTH-030 | Register with mismatched passwords | If confirm password field exists | 1. Enter different passwords<br>2. Tap "Register" | Error: "Passwords do not match" | Medium |
| USER-AUTH-031 | Register validates all required fields | None | 1. Leave all fields empty<br>2. Tap "Register" | Errors shown for all required fields | Medium |
| USER-AUTH-032 | Registration terms and conditions | None | 1. Fill form without accepting T&C<br>2. Tap "Register" | Error: "Please accept terms and conditions" | Medium |

### 1.6 Session Management

| Test ID | Test Case | Preconditions | Test Steps | Expected Result | Priority |
|---------|-----------|---------------|------------|-----------------|----------|
| USER-AUTH-033 | Session persists on app restart | User logged in | 1. Close app completely<br>2. Reopen app | User still logged in, Dashboard shown | High |
| USER-AUTH-034 | Session expires after token expiry | Token expired | 1. Wait for token to expire<br>2. Make API request | Redirect to login with message | High |
| USER-AUTH-035 | Logout clears session | User logged in | 1. Go to Settings<br>2. Tap "Logout" | All data cleared, redirect to login | High |
| USER-AUTH-036 | Logout clears SecureStore | User logged in | 1. Logout | authToken, temp2FAToken cleared from SecureStore | High |
| USER-AUTH-037 | Token auto-renewal | Token near expiry | 1. Make API request near expiry | Token renewed automatically | Medium |

### 1.7 Password Reset

| Test ID | Test Case | Preconditions | Test Steps | Expected Result | Priority |
|---------|-----------|---------------|------------|-----------------|----------|
| USER-AUTH-038 | Forgot password sends email | Account exists | 1. Tap "Forgot Password"<br>2. Enter email<br>3. Tap "Send Reset Link" | Success: "Reset link sent to your email" | High |
| USER-AUTH-039 | Forgot password - unregistered email | Email not in system | 1. Enter unregistered email<br>2. Tap "Send Reset Link" | Error or generic success (security) | Medium |
| USER-AUTH-040 | Reset password with valid link | Reset email received | 1. Click link in email<br>2. Enter new password<br>3. Confirm password<br>4. Submit | Password changed, redirect to login | High |
| USER-AUTH-041 | Reset password - expired link | Link older than 24h | 1. Click expired link | Error: "Reset link has expired" | Medium |
| USER-AUTH-042 | Reset password validation | On reset page | 1. Enter weak password | Error: Password requirements shown | Medium |

---

## 2. User Onboarding

### 2.1 New User Detection

| Test ID | Test Case | Preconditions | Test Steps | Expected Result | Priority |
|---------|-----------|---------------|------------|-----------------|----------|
| USER-ONB-001 | New user redirected to onboarding | isNewUser=true in JWT | 1. Login/register as new user | Redirect to onboarding flow, not Dashboard | High |
| USER-ONB-002 | Existing user skips onboarding | isNewUser=false in JWT | 1. Login as existing user | Redirect directly to Dashboard | High |
| USER-ONB-003 | Onboarding flag updated after completion | Onboarding complete | 1. Complete onboarding<br>2. Logout<br>3. Login again | Dashboard shown, not onboarding | High |

### 2.2 Profile Completion

| Test ID | Test Case | Preconditions | Test Steps | Expected Result | Priority |
|---------|-----------|---------------|------------|-----------------|----------|
| USER-ONB-004 | Complete profile with all fields | On onboarding | 1. Enter full name<br>2. Enter phone<br>3. Select location<br>4. Submit | Profile saved, proceed to next step | High |
| USER-ONB-005 | Skip optional fields | On onboarding | 1. Enter only required fields<br>2. Submit | Profile saved with partial data | Medium |
| USER-ONB-006 | Validation on required fields | On onboarding | 1. Leave name empty<br>2. Submit | Error: "Name is required" | Medium |
| USER-ONB-007 | Phone number validation | On onboarding | 1. Enter invalid phone format<br>2. Submit | Error: "Invalid phone number" | Medium |

---

## 3. Dashboard & Home

### 3.1 Dashboard Display

| Test ID | Test Case | Preconditions | Test Steps | Expected Result | Priority |
|---------|-----------|---------------|------------|-----------------|----------|
| USER-DASH-001 | Dashboard loads correctly | User logged in (User role) | 1. Navigate to Dashboard | All sections load: Logo, Avatar, Search bar, Banner carousel, Action buttons, Tools | High |
| USER-DASH-002 | Logo and Avatar displayed in header | User logged in | 1. View Dashboard header | LetLink logo on left, User avatar on right | High |
| USER-DASH-003 | Avatar tap opens profile menu | User logged in | 1. Tap on avatar | Profile menu modal opens | Medium |
| USER-DASH-004 | Banner carousel displays | Banners exist in system | 1. View Dashboard | Banner carousel shows, auto-rotates | Medium |
| USER-DASH-005 | Banner tap navigates correctly | Banner has link | 1. Tap on banner | Navigate to linked content | Medium |
| USER-DASH-006 | "Get Your Services Now" button | User on Dashboard (User role) | 1. Tap "⚡ Get Your Services Now" button | Navigate to "Get Your Lawyer Now" screen | High |
| USER-DASH-007 | "Get Your Services Now" description | User on Dashboard | 1. View button | Description shows: "Tell us Your Problems, and Lawyers will contact you with Offers" | Medium |
| USER-DASH-008 | "Find Your Legal Talent" button | User on Dashboard (User role) | 1. Tap "🔍 Find Your Legal Talent" button | Navigate to Find Lawyer screen | High |
| USER-DASH-009 | "Find Your Legal Talent" description | User on Dashboard | 1. View button | Description shows: "Look through Lawyers and Book the one you want right away." | Medium |
| USER-DASH-010 | Tools section displays | User on Dashboard | 1. View Tools section | Shows 4 calculator buttons: Property Stamp 🏠, Legal Fee ⚖️, Loan 💰, View More 📜 | Medium |
| USER-DASH-011 | Property Stamp calculator | User on Dashboard | 1. Tap "Property Stamp" | Navigate to Property Stamp Calculator | Medium |
| USER-DASH-012 | Legal Fee calculator | User on Dashboard | 1. Tap "Legal Fee" | Navigate to Legal Fee Calculator | Medium |
| USER-DASH-013 | Loan calculator | User on Dashboard | 1. Tap "Loan" | Navigate to Loan Calculator | Medium |
| USER-DASH-014 | View More calculators | User on Dashboard | 1. Tap "View More" | Navigate to Tools Page | Medium |
| USER-DASH-015 | Pull to refresh | On Dashboard | 1. Pull down to refresh | Data reloaded (banners, blogs, services), loading indicator shown | Medium |
| USER-DASH-016 | Action buttons hidden for Admin | User logged in as Admin | 1. View Dashboard | "Get Your Services Now" and "Find Your Legal Talent" buttons are hidden | Medium |
| USER-DASH-017 | Search bar hidden for Admin | User logged in as Admin | 1. View Dashboard | Search bar is not displayed | Low |

### 3.2 Search Functionality

| Test ID | Test Case | Preconditions | Test Steps | Expected Result | Priority |
|---------|-----------|---------------|------------|-----------------|----------|
| USER-DASH-018 | Search bar visible on Dashboard | User role logged in | 1. View Dashboard | Search bar with placeholder "Search lawyers or services" displayed | High |
| USER-DASH-019 | Search bar focus navigates to SearchScreen | On Dashboard | 1. Tap on search bar | Immediately navigates to full SearchScreen | High |
| USER-DASH-020 | Live search dropdown | Typing in search bar | 1. Type text in search bar | Dropdown appears with filtered services (max 8 results) | Medium |
| USER-DASH-021 | Search dropdown result tap | Dropdown visible | 1. Tap on a service result | Service detail dialog opens | Medium |
| USER-DASH-022 | Service detail dialog | Result tapped | 1. View dialog | Shows service details with "Book Appointment" option | Medium |
| USER-DASH-023 | Search lawyers by name | On Search screen | 1. Select "Lawyers" tab<br>2. Enter lawyer name | Matching lawyers displayed | High |
| USER-DASH-024 | Search law firms | On Search screen | 1. Select "Law Firms" tab<br>2. Enter firm name | Matching firms displayed | High |
| USER-DASH-025 | Search categories | On Search screen | 1. Select "Categories" tab<br>2. Browse/search | Categories displayed with emojis | Medium |
| USER-DASH-026 | Search with no results | On Search screen | 1. Enter gibberish text | "No results found" message | Medium |
| USER-DASH-027 | Category tap navigates to Post Case | On Search screen | 1. Tap on a category | Navigate to "Get Your Lawyer Now" with category pre-selected | High |
| USER-DASH-028 | Search spam prevention | On Dashboard | 1. Submit search rapidly multiple times | Alert: "Please wait a moment before searching again" (1 second cooldown) | Low |
| USER-DASH-029 | Empty search validation | On Dashboard | 1. Submit with empty search | Alert: "Please enter something to search" | Low |

---

## 4. Case Management

### 4.1 Get Your Lawyer Now (Post Case)

> **Note:** The screen is titled "Get Your Lawyer Now" and is accessed via the "Get Your Services Now" button on Dashboard.

#### Required Fields
| Test ID | Test Case | Preconditions | Test Steps | Expected Result | Priority |
|---------|-----------|---------------|------------|-----------------|----------|
| USER-CASE-001 | Access "Get Your Lawyer Now" screen | User logged in | 1. Tap "Get Your Services Now" from Dashboard | "Get Your Lawyer Now" form displayed with header subtitle: "Tell us about your legal matter and get professional help from qualified lawyers" | High |
| USER-CASE-002 | Select case category (Required) | On Get Your Lawyer Now | 1. Tap "Select Category" dropdown<br>2. Modal opens with categories from API<br>3. Select a category | Category selected, modal closes, field shows selected category | High |
| USER-CASE-003 | Select "Other" category | On Get Your Lawyer Now | 1. Tap category dropdown<br>2. Select "Other" | Additional text field appears: "Please specify category *" | High |
| USER-CASE-004 | Enter Phone Number (Required) | On Get Your Lawyer Now | 1. Enter phone number in format +60123456789 | Phone number accepted | High |
| USER-CASE-005 | Phone number validation | On Get Your Lawyer Now | 1. Leave phone empty<br>2. Tap "Submit Case" | Error: "Please fill in all required fields (Name, Phone, Category, and IC Number)" | High |
| USER-CASE-006 | Enter IC Number (Required) | On Get Your Lawyer Now | 1. Enter IC number in format 123456-12-1234 | IC number accepted, helper text shows: "Required for legal documentation and case processing" | High |
| USER-CASE-007 | IC Number validation | On Get Your Lawyer Now | 1. Leave IC Number empty<br>2. Tap "Submit Case" | Error message displayed | High |

#### Optional Fields (Collapsible Section)
| Test ID | Test Case | Preconditions | Test Steps | Expected Result | Priority |
|---------|-----------|---------------|------------|-----------------|----------|
| USER-CASE-008 | Expand optional fields section | On Get Your Lawyer Now | 1. Tap "Additional Information (Optional)" header | Section expands showing: Name, Email, Description, Priority, Location, Voucher fields | Medium |
| USER-CASE-009 | Collapse optional fields section | Optional section expanded | 1. Tap "Additional Information (Optional)" header again | Section collapses, only chevron visible | Medium |
| USER-CASE-010 | Enter Name (Optional) | Optional section expanded | 1. Enter full name | Name accepted, pre-filled from user profile if available | Medium |
| USER-CASE-011 | Enter Email (Optional) | Optional section expanded | 1. Enter email address | Email accepted, pre-filled from user profile if available | Medium |
| USER-CASE-012 | Enter Description (Optional) | Optional section expanded | 1. Enter detailed description<br>2. Max 2000 characters | Description accepted, character counter shows "{count}/2000 characters" | Medium |
| USER-CASE-013 | Select Priority - Normal | Optional section expanded | 1. Tap "Normal" priority card | Card selected with checkmark, shows "Response within 48 hours" | Medium |
| USER-CASE-014 | Select Priority - Urgent | Optional section expanded | 1. Tap "Urgent" priority card | Card selected with checkmark, shows "Priority response within 24 hours" | Medium |
| USER-CASE-015 | Enter Location manually | Optional section expanded | 1. Enter location in text field<br>e.g., "Kuala Lumpur, Selangor" | Location saved | Medium |
| USER-CASE-016 | Use My Location button | Optional section expanded | 1. Tap "Use My Location" button<br>2. Grant location permission | Button shows loading, then auto-fills location with detected district/region | Medium |
| USER-CASE-017 | Use My Location - Permission denied | Optional section expanded | 1. Tap "Use My Location"<br>2. Deny permission | Error: "Location permission denied. Please enable location access in your device settings." | Medium |
| USER-CASE-018 | Apply Voucher | Optional section expanded, valid voucher available | 1. Tap "Select Voucher" button<br>2. Voucher dialog opens<br>3. Select a voucher | Voucher card appears showing: voucher name, price, with "Change" and "Remove" buttons | High |
| USER-CASE-019 | Change selected voucher | Voucher already selected | 1. Tap "Change" button on voucher card<br>2. Select different voucher | New voucher replaces old one | Medium |
| USER-CASE-020 | Remove selected voucher | Voucher already selected | 1. Tap "Remove" button on voucher card | Voucher removed, "Select Voucher" button reappears | Medium |

#### Form Submission
| Test ID | Test Case | Preconditions | Test Steps | Expected Result | Priority |
|---------|-----------|---------------|------------|-----------------|----------|
| USER-CASE-021 | Submit case successfully | All required fields filled (Category, Phone, IC Number) | 1. Fill required fields<br>2. Tap "Submit Case" | Success modal appears with:<br>- Green checkmark<br>- "Case Submitted Successfully"<br>- Case reference number<br>- "View My Cases" and "Post Another Case" buttons | High |
| USER-CASE-022 | Submit case - validation error | Required fields missing | 1. Leave Category empty<br>2. Tap "Submit Case" | Error shown: "Please fill in all required fields (Name, Phone, Category, and IC Number)" | High |
| USER-CASE-023 | Submit case - Other category without specification | Category = "Other", specification empty | 1. Select "Other" category<br>2. Leave specification empty<br>3. Submit | Error: "Please specify the legal category" | High |
| USER-CASE-024 | View My Cases after submit | Success modal visible | 1. Tap "View My Cases" button | Navigate to My Cases screen, modal closes | High |
| USER-CASE-025 | Post Another Case after submit | Success modal visible | 1. Tap "Post Another Case" button | Form resets, modal closes, ready for new case | High |
| USER-CASE-026 | Submit button loading state | Submitting case | 1. Tap "Submit Case" | Button shows loading spinner, disabled during API call | Medium |
| USER-CASE-027 | Submit case with network error | No internet connection | 1. Fill form<br>2. Disconnect internet<br>3. Submit | Error message displayed in red card | Medium |
| USER-CASE-028 | Pre-selected category from search | Navigate from SearchScreen category | 1. Tap category in Search<br>2. View Get Your Lawyer Now | Category pre-filled from navigation params | Medium |

#### Category Picker Modal
| Test ID | Test Case | Preconditions | Test Steps | Expected Result | Priority |
|---------|-----------|---------------|------------|-----------------|----------|
| USER-CASE-029 | Category picker opens | On Get Your Lawyer Now | 1. Tap category field | Modal opens with "Select Category" header and close button | High |
| USER-CASE-030 | Category picker loading | First load | 1. Open category picker | Shows loading indicator while fetching categories from API | Medium |
| USER-CASE-031 | Category picker displays categories | Categories loaded | 1. View picker | Shows list of categories with emoji icons (if available) | Medium |
| USER-CASE-032 | Select category in picker | Picker open | 1. Tap on a category | Category selected (shows checkmark), picker closes | High |
| USER-CASE-033 | Close category picker | Picker open | 1. Tap X button | Picker closes without selection change | Medium |
| USER-CASE-034 | Category shows "Other" option | Picker open | 1. Scroll to bottom of picker | "Other" option available at end of list | Medium |

### 4.2 My Cases List

| Test ID | Test Case | Preconditions | Test Steps | Expected Result | Priority |
|---------|-----------|---------------|------------|-----------------|----------|
| USER-CASE-020 | View My Cases list | Has cases | 1. Navigate to My Cases | List of user's cases displayed | High |
| USER-CASE-021 | Cases sorted by date | Multiple cases | 1. View My Cases | Most recent cases first | Medium |
| USER-CASE-022 | Filter by status - All | On My Cases | 1. Select "All" tab | All cases shown | Medium |
| USER-CASE-023 | Filter by status - Pending | On My Cases | 1. Select "Pending" tab | Only pending cases shown | Medium |
| USER-CASE-024 | Filter by status - In Progress | On My Cases | 1. Select "In Progress" tab | Only active cases shown | Medium |
| USER-CASE-025 | Filter by status - Completed | On My Cases | 1. Select "Completed" tab | Only completed cases shown | Medium |
| USER-CASE-026 | Filter by status - Cancelled | On My Cases | 1. Select "Cancelled" tab | Only cancelled cases shown | Medium |
| USER-CASE-027 | Filter by status - Draft | On My Cases | 1. Select "Draft" tab | Only draft cases shown | Medium |
| USER-CASE-028 | Search cases | On My Cases | 1. Enter search term | Cases matching title/number shown | Medium |
| USER-CASE-029 | Empty state - no cases | New user | 1. View My Cases | "No cases yet" with CTA to post case | Medium |
| USER-CASE-030 | Pull to refresh | On My Cases | 1. Pull down | Cases list refreshed | Medium |
| USER-CASE-031 | Case card shows key info | Has cases | 1. View case card | Shows: case no, title, status, date, lawyer name | High |
| USER-CASE-032 | Status badge colors | Has various cases | 1. View cases | Pending=yellow, Active=blue, Completed=green, Cancelled=red | Low |

### 4.3 Case Details

| Test ID | Test Case | Preconditions | Test Steps | Expected Result | Priority |
|---------|-----------|---------------|------------|-----------------|----------|
| USER-CASE-033 | View case details | Case exists | 1. Tap on case card | Case details screen opens | High |
| USER-CASE-034 | All case info displayed | On case details | 1. View details | Title, description, category, service, budget, location, status shown | High |
| USER-CASE-035 | Client info displayed | On case details | 1. Scroll to client section | Client name, email, phone shown | Medium |
| USER-CASE-036 | Attached documents visible | Case has documents | 1. View documents section | List of attachments shown | Medium |
| USER-CASE-037 | Download document | Documents attached | 1. Tap on document | Document downloads/opens | Medium |
| USER-CASE-038 | View assigned lawyer | Case has lawyer | 1. View lawyer section | Lawyer name, rating, contact shown | High |
| USER-CASE-039 | Contact assigned lawyer | Case has lawyer | 1. Tap "Contact Lawyer" | Navigate to chat | High |
| USER-CASE-040 | Case timeline/history | Case has activity | 1. View timeline section | Status changes, dates shown | Medium |

### 4.4 Case Applications (From Lawyers)

| Test ID | Test Case | Preconditions | Test Steps | Expected Result | Priority |
|---------|-----------|---------------|------------|-----------------|----------|
| USER-CASE-041 | View applications count | Case has applications | 1. View case card/details | "X applications" badge shown | High |
| USER-CASE-042 | View application list | Case has applications | 1. Tap "View Applications" | List of lawyer applications shown | High |
| USER-CASE-043 | Application card info | On applications list | 1. View application | Lawyer name, photo, rating, proposed fee, message shown | High |
| USER-CASE-044 | Accept application | Application pending | 1. Tap "Accept"<br>2. Confirm | Application accepted, lawyer assigned, status updates | High |
| USER-CASE-045 | Accept confirmation dialog | Tapping accept | 1. Tap "Accept" | Confirmation dialog appears | Medium |
| USER-CASE-046 | Reject application | Application pending | 1. Tap "Reject"<br>2. Confirm | Application rejected, removed from list | High |
| USER-CASE-047 | View lawyer profile from application | On applications | 1. Tap lawyer name/photo | Navigate to lawyer profile | Medium |
| USER-CASE-048 | Empty applications state | No applications | 1. View applications | "No applications yet" message | Medium |
| USER-CASE-049 | Cannot accept after accepting one | One already accepted | 1. Try to accept another | Other applications auto-rejected or hidden | Medium |

### 4.5 Update/Edit Case

| Test ID | Test Case | Preconditions | Test Steps | Expected Result | Priority |
|---------|-----------|---------------|------------|-----------------|----------|
| USER-CASE-050 | Edit draft case | Draft case exists | 1. Open draft case<br>2. Tap "Edit" | Edit form with existing data | High |
| USER-CASE-051 | Update case title | Editing case | 1. Change title<br>2. Save | Title updated | Medium |
| USER-CASE-052 | Update case description | Editing case | 1. Change description<br>2. Save | Description updated | Medium |
| USER-CASE-053 | Submit draft case | Editing draft | 1. Tap "Submit Case" | Case status changes to Pending | High |
| USER-CASE-054 | Cannot edit active case | Case in progress | 1. Open active case | Edit button hidden/disabled | Medium |
| USER-CASE-055 | Add notes to case | Case exists | 1. Add case notes<br>2. Save | Notes saved and visible | Medium |

### 4.6 Cancel Case

| Test ID | Test Case | Preconditions | Test Steps | Expected Result | Priority |
|---------|-----------|---------------|------------|-----------------|----------|
| USER-CASE-056 | Cancel pending case | Case is pending | 1. Open case<br>2. Tap "Cancel Case"<br>3. Confirm | Case cancelled, status updated | High |
| USER-CASE-057 | Cancel confirmation | Tapping cancel | 1. Tap "Cancel Case" | Warning dialog: "Are you sure?" | High |
| USER-CASE-058 | Cannot cancel in-progress case | Case has assigned lawyer | 1. Open active case | Cancel button hidden or shows warning | Medium |
| USER-CASE-059 | Delete draft case | Draft exists | 1. Tap "Delete Draft"<br>2. Confirm | Draft permanently deleted | Medium |
| USER-CASE-060 | Cancellation reason | Cancelling case | 1. Cancel case | Optional reason prompt | Low |

---

## 5. Find Lawyer

### 5.1 Lawyer Listing

| Test ID | Test Case | Preconditions | Test Steps | Expected Result | Priority |
|---------|-----------|---------------|------------|-----------------|----------|
| USER-LAWYER-001 | Access Find Lawyer | User logged in | 1. Tap "Find Lawyer" | Lawyer listing page displayed | High |
| USER-LAWYER-002 | Lawyer cards display | Lawyers exist | 1. View listing | Cards show: photo, name, specialization, rating, location | High |
| USER-LAWYER-003 | Filter by category | On lawyer listing | 1. Tap filter<br>2. Select "Criminal Law" | Only matching lawyers shown | High |
| USER-LAWYER-004 | Filter by location | On lawyer listing | 1. Tap filter<br>2. Select state/district | Location-filtered results | High |
| USER-LAWYER-005 | Sort by rating | On lawyer listing | 1. Sort by "Highest Rated" | Lawyers sorted by rating desc | Medium |
| USER-LAWYER-006 | Sort by experience | On lawyer listing | 1. Sort by "Most Experienced" | Lawyers sorted by experience | Medium |
| USER-LAWYER-007 | Search lawyers by name | On lawyer listing | 1. Enter name in search<br>2. Search | Matching lawyers shown | High |
| USER-LAWYER-008 | Pagination/load more | Many lawyers | 1. Scroll to bottom | More lawyers loaded | Medium |
| USER-LAWYER-009 | Pull to refresh | On lawyer listing | 1. Pull down | List refreshed | Medium |
| USER-LAWYER-010 | Empty state | No matching lawyers | 1. Apply impossible filter | "No lawyers found" message | Medium |

### 5.2 Lawyer Details

| Test ID | Test Case | Preconditions | Test Steps | Expected Result | Priority |
|---------|-----------|---------------|------------|-----------------|----------|
| USER-LAWYER-011 | View lawyer profile | On lawyer listing | 1. Tap on lawyer card | Lawyer details page opens | High |
| USER-LAWYER-012 | Profile photo displayed | On lawyer details | 1. View profile | Large profile photo shown | Medium |
| USER-LAWYER-013 | Bio/description shown | On lawyer details | 1. View bio section | Lawyer's bio displayed | Medium |
| USER-LAWYER-014 | Specializations listed | On lawyer details | 1. View specializations | List of practice areas | Medium |
| USER-LAWYER-015 | Experience displayed | On lawyer details | 1. View experience | Years of experience, bar number | Medium |
| USER-LAWYER-016 | Rating and reviews | On lawyer details | 1. View reviews section | Average rating, review count, reviews | High |
| USER-LAWYER-017 | Individual review cards | Has reviews | 1. View reviews | Each review shows: rating, comment, date, user | Medium |
| USER-LAWYER-018 | Contact information | On lawyer details | 1. View contact section | Email, phone displayed | Medium |
| USER-LAWYER-019 | Office location | On lawyer details | 1. View location | Address/location shown | Low |
| USER-LAWYER-020 | Consultation fee | On lawyer details | 1. View fees section | Consultation rate displayed | Medium |

### 5.3 Lawyer Actions

| Test ID | Test Case | Preconditions | Test Steps | Expected Result | Priority |
|---------|-----------|---------------|------------|-----------------|----------|
| USER-LAWYER-021 | Book consultation button | On lawyer details | 1. Tap "Book Consultation" | Navigate to booking screen | High |
| USER-LAWYER-022 | Chat with lawyer | On lawyer details | 1. Tap "Chat" | Navigate to chat with lawyer | High |
| USER-LAWYER-023 | Call lawyer | Phone number available | 1. Tap phone icon | Phone dialer opens | Medium |
| USER-LAWYER-024 | Share lawyer profile | On lawyer details | 1. Tap share icon | Share sheet opens | Low |
| USER-LAWYER-025 | View lawyer's law firm | Lawyer belongs to firm | 1. Tap law firm name | Navigate to firm profile | Medium |

---

## 6. Consultation Booking (Book Appointment)

> **Note:** The mobile app uses a "Request Consultation" model where users submit a case/request to a specific lawyer or law firm. This creates a case with `mode: 'ConsultationBooking'` rather than a time-slot based booking system.

### 6.1 Access Booking Screen

| Test ID | Test Case | Preconditions | Test Steps | Expected Result | Priority |
|---------|-----------|---------------|------------|-----------------|----------|
| USER-BOOK-001 | Access from Lawyer Details | On Lawyer Details screen | 1. Tap "Book Appointment" button | Navigate to "Book Appointment" screen with lawyer info pre-filled | High |
| USER-BOOK-002 | Access from Law Firm Details | On Law Firm Details screen | 1. Tap "Book Appointment" button | Navigate to "Book Appointment" screen with law firm info pre-filled | High |
| USER-BOOK-003 | Booking summary card displays | On Book Appointment screen | 1. View top of screen | Shows "Booking With" card with:<br>- Subject name (lawyer/law firm)<br>- Type chip ("Lawyer" or "Law Firm") | High |

### 6.2 Contact Information Section

| Test ID | Test Case | Preconditions | Test Steps | Expected Result | Priority |
|---------|-----------|---------------|------------|-----------------|----------|
| USER-BOOK-004 | Contact fields pre-filled | On Book Appointment | 1. View Contact Information section | Name and Email pre-filled from user profile if available | Medium |
| USER-BOOK-005 | Enter Full Name (Required) | On Book Appointment | 1. Enter name in "Full Name *" field | Name accepted (min 2 characters) | High |
| USER-BOOK-006 | Full Name validation | On Book Appointment | 1. Enter 1 character<br>2. Submit | Error: "Name must be at least 2 characters" | Medium |
| USER-BOOK-007 | Enter Phone Number (Required) | On Book Appointment | 1. Enter phone in "Phone Number *" field | Phone number accepted | High |
| USER-BOOK-008 | Phone Number validation | On Book Appointment | 1. Leave phone empty<br>2. Submit | Error: "Phone number is required" | High |
| USER-BOOK-009 | Enter Email (Required) | On Book Appointment | 1. Enter email in "Email Address *" field | Email accepted | High |
| USER-BOOK-010 | Email validation | On Book Appointment | 1. Enter "invalid-email"<br>2. Submit | Error: "Valid email is required" | High |

### 6.3 Case Details Section

| Test ID | Test Case | Preconditions | Test Steps | Expected Result | Priority |
|---------|-----------|---------------|------------|-----------------|----------|
| USER-BOOK-011 | Select Category (Required) | On Book Appointment | 1. Tap "Select Category *" button | Category selection modal opens | High |
| USER-BOOK-012 | Category modal displays | Modal open | 1. View modal | Shows "Select Category" header, list of categories with emojis, Cancel button | High |
| USER-BOOK-013 | Category loading state | Modal open, first load | 1. Open category modal | Shows loading indicator while fetching categories from API | Medium |
| USER-BOOK-014 | Select a category | Modal open, categories loaded | 1. Tap on a category | Category selected (shows checkmark), modal closes, button shows category name with emoji | High |
| USER-BOOK-015 | Category shows service count | Modal open | 1. View category items | Each category shows "X services available" subtitle | Low |
| USER-BOOK-016 | Close category modal | Modal open | 1. Tap X or "Cancel" | Modal closes without selection | Medium |
| USER-BOOK-017 | Category validation | Category not selected | 1. Submit without category | Error: "Please select a category" | High |
| USER-BOOK-018 | Enter Case Description (Required) | On Book Appointment | 1. Enter description (min 50 chars) | Description accepted, character counter shows "{count}/2000" | High |
| USER-BOOK-019 | Case Description validation | On Book Appointment | 1. Enter less than 50 characters<br>2. Submit | Error: "Description must be at least 50 characters" | High |
| USER-BOOK-020 | Case Description character limit | On Book Appointment | 1. Enter description | Character counter shows current/max (e.g., "150/2000") | Medium |

### 6.4 Priority Section

| Test ID | Test Case | Preconditions | Test Steps | Expected Result | Priority |
|---------|-----------|---------------|------------|-----------------|----------|
| USER-BOOK-021 | Priority section displays | On Book Appointment | 1. View Priority section | Shows "⚡ Priority" header with Normal and Urgent radio options | Medium |
| USER-BOOK-022 | Select Normal priority | On Book Appointment | 1. Tap "Normal" radio button | Normal selected (default) | Medium |
| USER-BOOK-023 | Select Urgent priority | On Book Appointment | 1. Tap "Urgent" radio button | Urgent selected | Medium |

### 6.5 Voucher Section (Optional)

| Test ID | Test Case | Preconditions | Test Steps | Expected Result | Priority |
|---------|-----------|---------------|------------|-----------------|----------|
| USER-BOOK-024 | Voucher section displays | On Book Appointment | 1. View Voucher section | Shows "🎟️ Voucher (Optional)" header with "Select Voucher" button | Medium |
| USER-BOOK-025 | Open voucher selection | On Book Appointment | 1. Tap "Select Voucher" button | Voucher selection dialog opens | High |
| USER-BOOK-026 | Select a voucher | Voucher dialog open | 1. Select a valid voucher | Voucher card appears showing:<br>- 🎟️ icon<br>- "Voucher Applied" label<br>- Voucher name<br>- Price/value<br>- "Change" and "Remove" buttons | High |
| USER-BOOK-027 | Change selected voucher | Voucher selected | 1. Tap "Change" button<br>2. Select different voucher | New voucher replaces old | Medium |
| USER-BOOK-028 | Remove selected voucher | Voucher selected | 1. Tap "Remove" button | Voucher removed, "Select Voucher" button reappears | Medium |

### 6.6 Form Submission

| Test ID | Test Case | Preconditions | Test Steps | Expected Result | Priority |
|---------|-----------|---------------|------------|-----------------|----------|
| USER-BOOK-029 | Cancel button | On Book Appointment | 1. Tap "Cancel" button | Navigate back to previous screen (lawyer/law firm details) | High |
| USER-BOOK-030 | Submit with all required fields | All fields valid | 1. Fill Name, Phone, Email, Category, Description (50+ chars)<br>2. Tap "Confirm Booking" | Loading state on button ("Submitting..."), then success dialog | High |
| USER-BOOK-031 | Submit button loading state | Submitting | 1. Tap "Confirm Booking" | Button shows loading spinner, disabled, text changes to "Submitting..." | Medium |
| USER-BOOK-032 | Submit validation - missing fields | Required fields empty | 1. Leave required fields empty<br>2. Tap "Confirm Booking" | Error messages appear below each invalid field | High |
| USER-BOOK-033 | Success dialog displays | Booking successful | 1. Submit valid booking | Success dialog shows:<br>- ✅ icon<br>- "Booking Confirmed!"<br>- "Your consultation has been booked successfully."<br>- Reference number (Case No) | High |
| USER-BOOK-034 | Auto-navigate after success | Success dialog visible | 1. Wait 2 seconds | Dialog closes, navigates back to previous screen | Medium |
| USER-BOOK-035 | Submit error handling | API error | 1. Submit with network error | Error card appears with error message | High |
| USER-BOOK-036 | Booking creates case | Booking successful | 1. Submit booking<br>2. Check My Cases | New case created with status, lawyer/law firm assigned | High |
| USER-BOOK-037 | Booking for lawyer | From Lawyer Details | 1. Complete booking | Case created with `lawyerId` and `lawyerUserId` assigned | High |
| USER-BOOK-038 | Booking for law firm | From Law Firm Details | 1. Complete booking | Case created with `lawFirmId` and `lawFirmUserId` assigned | High |

### 6.7 My Bookings (Via My Cases)

> **Note:** Bookings in the mobile app are managed through My Cases since consultation bookings create cases with `mode: 'ConsultationBooking'`.

| Test ID | Test Case | Preconditions | Test Steps | Expected Result | Priority |
|---------|-----------|---------------|------------|-----------------|----------|
| USER-BOOK-039 | View consultation bookings | Has bookings | 1. Navigate to My Cases | Cases with assigned lawyers (from bookings) visible in list | High |
| USER-BOOK-040 | Booking case shows lawyer info | Booking exists | 1. View case card | Shows assigned lawyer/law firm name | High |
| USER-BOOK-041 | View booking case details | Booking case exists | 1. Tap on case | Case details show booking information, assigned lawyer | High |
| USER-BOOK-042 | Cancel consultation case | Case is pending | 1. Open case<br>2. Tap "Cancel" | Case cancelled | High |
| USER-BOOK-043 | Contact assigned lawyer | Case has lawyer | 1. Open case details<br>2. Tap "Contact Lawyer" | Navigate to chat | High |

---

## 7. Vouchers

> **Note:** Vouchers are assigned to users by Admin. Users can view their vouchers, filter by status, and redeem valid vouchers to get a voucher code.

### 7.1 My Vouchers Screen

| Test ID | Test Case | Preconditions | Test Steps | Expected Result | Priority |
|---------|-----------|---------------|------------|-----------------|----------|
| USER-VOUCHER-001 | Access My Vouchers | User logged in | 1. Navigate to Vouchers | "My Vouchers" screen displayed with header and back button | High |
| USER-VOUCHER-002 | Loading state | On My Vouchers | 1. View while loading | Shows "Loading vouchers..." with spinner | Medium |
| USER-VOUCHER-003 | Vouchers fetched from API | On My Vouchers | 1. View voucher list | Fetches all vouchers grouped by status (VALID, REDEEMED, EXPIRED, USED) in single API call | High |
| USER-VOUCHER-004 | Pull to refresh | On My Vouchers | 1. Pull down to refresh | Voucher list refreshed from API | Medium |
| USER-VOUCHER-005 | Error state | API error | 1. View My Vouchers with error | Shows error card with "Oops!" message and "Try Again" button | Medium |
| USER-VOUCHER-006 | Retry after error | Error displayed | 1. Tap "Try Again" | Vouchers refetched from API | Medium |

### 7.2 Filter Chips

| Test ID | Test Case | Preconditions | Test Steps | Expected Result | Priority |
|---------|-----------|---------------|------------|-----------------|----------|
| USER-VOUCHER-007 | Filter chips display | On My Vouchers | 1. View filter section | Shows horizontal scroll with chips: All, Valid, Redeemed, Expired, Used (with icons) | High |
| USER-VOUCHER-008 | Filter chip shows count | Has vouchers | 1. View filter chips | Each chip shows count in parentheses, e.g., "Valid (3)" | Medium |
| USER-VOUCHER-009 | Filter by All | Has vouchers | 1. Tap "All" chip | All vouchers displayed regardless of status | High |
| USER-VOUCHER-010 | Filter by Valid | Has valid vouchers | 1. Tap "Valid" chip | Only VALID status vouchers shown | High |
| USER-VOUCHER-011 | Filter by Redeemed | Has redeemed vouchers | 1. Tap "Redeemed" chip | Only REDEEMED status vouchers shown | Medium |
| USER-VOUCHER-012 | Filter by Expired | Has expired vouchers | 1. Tap "Expired" chip | Only EXPIRED status vouchers shown | Medium |
| USER-VOUCHER-013 | Filter by Used | Has used vouchers | 1. Tap "Used" chip | Only USED status vouchers shown | Medium |
| USER-VOUCHER-014 | Empty filter state | No vouchers matching filter | 1. Select filter with no matches | Shows "No Vouchers Found" with message "No {filter} vouchers available." | Medium |
| USER-VOUCHER-015 | Empty state - no vouchers | New user, no vouchers | 1. View My Vouchers | Shows "No Vouchers Found" with "You don't have any vouchers yet." | Medium |

### 7.3 Voucher Card (Ticket Design)

| Test ID | Test Case | Preconditions | Test Steps | Expected Result | Priority |
|---------|-----------|---------------|------------|-----------------|----------|
| USER-VOUCHER-016 | Voucher card layout | Has vouchers | 1. View voucher card | Ticket-shaped card with:<br>- Left: Currency + Price (large)<br>- Perforated divider<br>- Right: Voucher name, status badge, expiry date | High |
| USER-VOUCHER-017 | Status badge - Valid | Valid voucher | 1. View voucher card | Green status badge "Valid" | Medium |
| USER-VOUCHER-018 | Status badge - Redeemed | Redeemed voucher | 1. View voucher card | Yellow/amber status badge "Redeemed" | Medium |
| USER-VOUCHER-019 | Status badge - Expired | Expired voucher | 1. View voucher card | Red status badge "Expired" | Medium |
| USER-VOUCHER-020 | Status badge - Used | Used voucher | 1. View voucher card | Blue status badge "Used" | Medium |
| USER-VOUCHER-021 | Expiry date display | Has voucher | 1. View voucher card | Shows "Valid until: {formatted date}" with calendar icon | Medium |
| USER-VOUCHER-022 | No expiry date | Voucher has noExpired=true | 1. View voucher card | Shows "Valid until: No Expiry" | Low |
| USER-VOUCHER-023 | Tap voucher card | Has vouchers | 1. Tap on voucher card | Opens Voucher Details modal | High |

### 7.4 Voucher Details Modal

| Test ID | Test Case | Preconditions | Test Steps | Expected Result | Priority |
|---------|-----------|---------------|------------|-----------------|----------|
| USER-VOUCHER-024 | Modal opens | Voucher card tapped | 1. Tap voucher | Modal opens with "Voucher Details" header and X close button | High |
| USER-VOUCHER-025 | Modal header info | Modal open | 1. View modal | Shows voucher name, expiry date, status badge | High |
| USER-VOUCHER-026 | Voucher value display | Modal open | 1. View value section | Shows "Voucher Value" label with currency + price prominently displayed | High |
| USER-VOUCHER-027 | Description section | Voucher has description | 1. View modal | Shows "Description" section with voucher description | Medium |
| USER-VOUCHER-028 | Terms section | Voucher has terms | 1. View modal | Shows "Terms & Conditions" section | Medium |
| USER-VOUCHER-029 | Close modal - X button | Modal open | 1. Tap X button | Modal closes | High |
| USER-VOUCHER-030 | Close modal - backdrop | Modal open | 1. Tap outside modal | Modal closes | Medium |

### 7.5 Redeem Voucher

| Test ID | Test Case | Preconditions | Test Steps | Expected Result | Priority |
|---------|-----------|---------------|------------|-----------------|----------|
| USER-VOUCHER-031 | Redeem button visible | Valid voucher selected | 1. Open modal for VALID voucher | Shows "Redeem Voucher" button with ticket icon | High |
| USER-VOUCHER-032 | Tap redeem button | On valid voucher modal | 1. Tap "Redeem Voucher" | Confirmation alert: "Are you sure you want to redeem this voucher for {currency} {price}?" with Cancel/Redeem buttons | High |
| USER-VOUCHER-033 | Cancel redemption | Confirmation shown | 1. Tap "Cancel" | Alert dismissed, nothing happens | Medium |
| USER-VOUCHER-034 | Confirm redemption | Confirmation shown | 1. Tap "Redeem" | Loading state, then success alert with voucher code | High |
| USER-VOUCHER-035 | Redemption success | Redemption confirmed | 1. Complete redemption | Shows "Success! 🎉" alert with voucher code, status updates to REDEEMED | High |
| USER-VOUCHER-036 | View redeemed code | REDEEMED voucher | 1. Open modal for redeemed voucher | Shows voucher code with copy button (no Redeem button) | High |
| USER-VOUCHER-037 | Redeem button loading | Redeeming in progress | 1. View during redemption | Button shows loading spinner, text "Redeeming...", disabled | Medium |
| USER-VOUCHER-038 | Cannot redeem expired | Expired voucher | 1. Tap expired voucher | Shows "Expired" badge in red instead of code/redeem button | Medium |
| USER-VOUCHER-039 | Cannot redeem already redeemed | Redeemed voucher | 1. Try to redeem again | Alert: "Already Redeemed - This voucher has already been redeemed" | Medium |
| USER-VOUCHER-040 | Redemption error | API error | 1. Attempt redemption with error | Error alert with details | Medium |

### 7.6 Copy Voucher Code

| Test ID | Test Case | Preconditions | Test Steps | Expected Result | Priority |
|---------|-----------|---------------|------------|-----------------|----------|
| USER-VOUCHER-041 | Copy button visible | Redeemed voucher modal open | 1. View code section | Copy icon button displayed next to voucher code | High |
| USER-VOUCHER-042 | Copy voucher code | Copy button visible | 1. Tap copy button | Code copied to clipboard, icon changes to checkmark ✓ | High |
| USER-VOUCHER-043 | Copy feedback | Code copied | 1. View copy button | Checkmark icon shown briefly (2 seconds), then reverts to copy icon | Low |
| USER-VOUCHER-044 | Copy error | Copy fails | 1. Copy with error | Alert: "Error - Failed to copy voucher code" | Low |

---

## 8. Chat & Communication

### 8.1 Chat List

| Test ID | Test Case | Preconditions | Test Steps | Expected Result | Priority |
|---------|-----------|---------------|------------|-----------------|----------|
| USER-CHAT-001 | Access chat list | User logged in | 1. Navigate to Chat tab | Chat list displayed | High |
| USER-CHAT-002 | Chat conversations shown | Has chats | 1. View chat list | Conversations with lawyers shown | High |
| USER-CHAT-003 | Unread message indicator | Has unread messages | 1. View chat list | Unread badge/indicator shown | High |
| USER-CHAT-004 | Last message preview | Has chats | 1. View chat card | Last message text and time shown | Medium |
| USER-CHAT-005 | Empty chat state | No conversations | 1. View chat list | "No conversations" message | Medium |
| USER-CHAT-006 | Search conversations | Has chats | 1. Search by name | Filtered conversations shown | Medium |

### 8.2 Chat Conversation

| Test ID | Test Case | Preconditions | Test Steps | Expected Result | Priority |
|---------|-----------|---------------|------------|-----------------|----------|
| USER-CHAT-007 | Open conversation | Has conversation | 1. Tap on chat | Conversation opens | High |
| USER-CHAT-008 | Messages displayed | Has messages | 1. View conversation | Messages shown in chronological order | High |
| USER-CHAT-009 | Send text message | In conversation | 1. Type message<br>2. Tap send | Message sent, appears in chat | High |
| USER-CHAT-010 | Message delivery status | Message sent | 1. View sent message | Sent/Delivered/Read indicator | Medium |
| USER-CHAT-011 | Receive real-time message | In conversation | 1. Other party sends message | Message appears instantly | High |
| USER-CHAT-012 | Send image | In conversation | 1. Tap attachment<br>2. Select image<br>3. Send | Image sent | Medium |
| USER-CHAT-013 | Send document | In conversation | 1. Tap attachment<br>2. Select document<br>3. Send | Document sent | Medium |
| USER-CHAT-014 | View sent image | Image in chat | 1. Tap on image | Image opens full screen | Medium |
| USER-CHAT-015 | Download attachment | Attachment in chat | 1. Tap download | File downloaded | Medium |
| USER-CHAT-016 | Load older messages | Long conversation | 1. Scroll up | Older messages loaded | Medium |
| USER-CHAT-017 | Typing indicator | Other party typing | 1. View conversation | "Typing..." indicator shown | Low |
| USER-CHAT-018 | Online status | In conversation | 1. View header | "Online" or "Last seen" shown | Low |

---

## 9. Profile & Settings

### 9.1 View Profile

| Test ID | Test Case | Preconditions | Test Steps | Expected Result | Priority |
|---------|-----------|---------------|------------|-----------------|----------|
| USER-PROFILE-001 | Access profile | User logged in | 1. Navigate to Account/Profile | Profile screen displayed | High |
| USER-PROFILE-002 | Profile info displayed | Has profile data | 1. View profile | Name, email, phone, avatar shown | High |
| USER-PROFILE-003 | Profile picture shown | Has avatar | 1. View profile | Avatar displayed | Medium |
| USER-PROFILE-004 | Default avatar | No avatar set | 1. View profile | Placeholder/initials avatar | Low |

### 9.2 Edit Profile

| Test ID | Test Case | Preconditions | Test Steps | Expected Result | Priority |
|---------|-----------|---------------|------------|-----------------|----------|
| USER-PROFILE-005 | Edit profile button | On profile | 1. Tap "Edit Profile" | Edit form opens | High |
| USER-PROFILE-006 | Update display name | Editing profile | 1. Change name<br>2. Save | Name updated | High |
| USER-PROFILE-007 | Update phone number | Editing profile | 1. Change phone<br>2. Verify OTP<br>3. Save | Phone updated | Medium |
| USER-PROFILE-008 | Change profile picture | Editing profile | 1. Tap avatar<br>2. Select new image | Picture updated | Medium |
| USER-PROFILE-009 | Take new photo | Changing avatar | 1. Select "Take Photo" | Camera opens | Medium |
| USER-PROFILE-010 | Choose from gallery | Changing avatar | 1. Select "Choose from Gallery" | Gallery opens | Medium |
| USER-PROFILE-011 | Remove profile picture | Has avatar | 1. Tap "Remove Photo" | Avatar removed | Low |
| USER-PROFILE-012 | Cancel edit | Editing profile | 1. Tap "Cancel" | Changes discarded | Medium |
| USER-PROFILE-013 | Validation on save | Invalid data entered | 1. Enter invalid email<br>2. Save | Validation error shown | Medium |

### 9.3 Account Settings

| Test ID | Test Case | Preconditions | Test Steps | Expected Result | Priority |
|---------|-----------|---------------|------------|-----------------|----------|
| USER-SETTINGS-001 | Access settings | User logged in | 1. Navigate to Settings | Settings screen displayed | High |
| USER-SETTINGS-002 | Change password | In settings | 1. Tap "Change Password"<br>2. Enter current password<br>3. Enter new password<br>4. Confirm | Password changed | High |
| USER-SETTINGS-003 | Enable 2FA | 2FA disabled | 1. Tap "Enable 2FA"<br>2. Follow setup | 2FA enabled | High |
| USER-SETTINGS-004 | Disable 2FA | 2FA enabled | 1. Tap "Disable 2FA"<br>2. Confirm with password | 2FA disabled | High |
| USER-SETTINGS-005 | Notification settings | In settings | 1. Tap "Notifications" | Notification preferences shown | Medium |
| USER-SETTINGS-006 | Toggle push notifications | In notification settings | 1. Toggle "Push Notifications" | Setting saved | Medium |
| USER-SETTINGS-007 | Language settings | In settings | 1. Tap "Language"<br>2. Select language | App language changes | Low |
| USER-SETTINGS-008 | Delete account | In settings | 1. Tap "Delete Account"<br>2. Confirm with password | Account deleted, logged out | Medium |
| USER-SETTINGS-009 | Logout from settings | In settings | 1. Tap "Logout"<br>2. Confirm | Logged out, redirect to login | High |
| USER-SETTINGS-010 | Privacy policy link | In settings | 1. Tap "Privacy Policy" | Opens privacy policy | Low |
| USER-SETTINGS-011 | Terms of service link | In settings | 1. Tap "Terms of Service" | Opens terms page | Low |
| USER-SETTINGS-012 | App version displayed | In settings | 1. View settings | Version number shown | Low |

---

## 10. Tools & Calculators

### 10.1 Property Stamp Calculator

| Test ID | Test Case | Preconditions | Test Steps | Expected Result | Priority |
|---------|-----------|---------------|------------|-----------------|----------|
| USER-TOOLS-001 | Access stamp calculator | User logged in | 1. Navigate to Tools<br>2. Tap "Stamp Calculator" | Calculator form displayed | High |
| USER-TOOLS-002 | Calculate stamp duty | On calculator | 1. Enter property value<br>2. Select property type<br>3. Calculate | Stamp duty amount shown | High |
| USER-TOOLS-003 | Different property types | On calculator | 1. Calculate for residential<br>2. Calculate for commercial | Different rates applied | Medium |
| USER-TOOLS-004 | First-time buyer discount | On calculator | 1. Toggle "First-time buyer"<br>2. Calculate | Discount applied | Medium |
| USER-TOOLS-005 | Reset calculator | After calculation | 1. Tap "Reset" | All fields cleared | Low |
| USER-TOOLS-006 | Invalid input handling | On calculator | 1. Enter negative value | Error or auto-correct | Medium |

### 10.2 Legal Fee Calculator

| Test ID | Test Case | Preconditions | Test Steps | Expected Result | Priority |
|---------|-----------|---------------|------------|-----------------|----------|
| USER-TOOLS-007 | Access fee calculator | User logged in | 1. Navigate to Legal Fee Calculator | Calculator displayed | High |
| USER-TOOLS-008 | Calculate legal fees | On calculator | 1. Enter transaction value<br>2. Select transaction type<br>3. Calculate | Fee breakdown shown | High |
| USER-TOOLS-009 | View fee breakdown | After calculation | 1. View results | Detailed breakdown of fees | Medium |

### 10.3 Loan Calculator

| Test ID | Test Case | Preconditions | Test Steps | Expected Result | Priority |
|---------|-----------|---------------|------------|-----------------|----------|
| USER-TOOLS-010 | Access loan calculator | User logged in | 1. Navigate to Loan Calculator | Calculator displayed | High |
| USER-TOOLS-011 | Calculate loan | On calculator | 1. Enter principal<br>2. Enter interest rate<br>3. Enter tenure<br>4. Calculate | Monthly payment shown | High |
| USER-TOOLS-012 | View amortization | After calculation | 1. View schedule | Full amortization table | Medium |

---

## 11. Notifications

### 11.1 Push Notifications

| Test ID | Test Case | Preconditions | Test Steps | Expected Result | Priority |
|---------|-----------|---------------|------------|-----------------|----------|
| USER-NOTIF-001 | Request push permission | First app launch | 1. Complete onboarding | Push permission prompt shown | High |
| USER-NOTIF-002 | Grant push permission | Permission prompt | 1. Tap "Allow" | Push notifications enabled | High |
| USER-NOTIF-003 | Deny push permission | Permission prompt | 1. Tap "Don't Allow" | App works, notifications disabled | Medium |
| USER-NOTIF-004 | Receive new message notification | App in background | 1. Receive chat message | Push notification appears | High |
| USER-NOTIF-005 | Receive case update notification | App in background | 1. Lawyer applies to case | Push notification appears | High |
| USER-NOTIF-006 | Tap notification opens app | Notification received | 1. Tap notification | App opens to relevant screen | High |
| USER-NOTIF-007 | Notification sound | Notification received | 1. Receive notification | Sound plays | Medium |

### 11.2 In-App Notifications

| Test ID | Test Case | Preconditions | Test Steps | Expected Result | Priority |
|---------|-----------|---------------|------------|-----------------|----------|
| USER-NOTIF-008 | View notification center | User logged in | 1. Tap notification bell | Notification list opens | High |
| USER-NOTIF-009 | Notification count badge | Has unread | 1. View tab bar | Badge shows count | High |
| USER-NOTIF-010 | Mark as read | Unread notification | 1. Tap notification | Marked as read | Medium |
| USER-NOTIF-011 | Mark all as read | Multiple unread | 1. Tap "Mark all read" | All marked read | Medium |
| USER-NOTIF-012 | Empty notifications | No notifications | 1. View notification center | "No notifications" message | Medium |

---

## 12. Referrals

### 12.1 Referral Program

| Test ID | Test Case | Preconditions | Test Steps | Expected Result | Priority |
|---------|-----------|---------------|------------|-----------------|----------|
| USER-REF-001 | Access referral section | User logged in | 1. Navigate to Referrals | Referral page displayed | High |
| USER-REF-002 | View referral code | On referral page | 1. View code | Unique referral code shown | High |
| USER-REF-003 | Copy referral code | On referral page | 1. Tap "Copy" | Code copied, toast shown | High |
| USER-REF-004 | Share referral link | On referral page | 1. Tap "Share" | Share sheet with link opens | High |
| USER-REF-005 | View referral stats | Has referrals | 1. View stats | Total referrals, rewards shown | Medium |
| USER-REF-006 | View referral history | Has referrals | 1. Tap "History" | List of referred users | Medium |
| USER-REF-007 | Referral reward credited | Referred user signs up | 1. Check vouchers | Referral voucher added | High |

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

Total Test Cases: 190+
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
Defect ID: USER-DEF-XXX
Test Case ID: USER-XXX-XXX
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

*Total Test Cases for User Role: **240+***

*Document Version: 1.3*
*Last Updated: November 2024*

---

## Change Log

| Version | Date | Changes |
|---------|------|---------|
| 1.3 | Nov 2024 | Updated Vouchers section to match current implementation:<br>- Screen title: "My Vouchers" with back button<br>- Fetches grouped vouchers from API (VALID, REDEEMED, EXPIRED, USED)<br>- Filter chips: All, Valid, Redeemed, Expired, Used (with counts)<br>- Ticket-shaped voucher cards with price, name, status badge, expiry<br>- Status colors: Valid=green, Redeemed=yellow, Expired=red, Used=blue<br>- Voucher Details modal with name, value, description, terms<br>- Redeem flow: Confirmation alert → API call → Success with code<br>- Copy voucher code with visual feedback<br>- Removed "Enter voucher code" (vouchers assigned by admin) |
| 1.2 | Nov 2024 | Updated Consultation Booking section to match current "Book Appointment" implementation:<br>- Screen title: "Book Appointment"<br>- Access from Lawyer/Law Firm Details via "Book Appointment" button<br>- Shows "Booking With" summary card<br>- Contact Info (Required): Full Name, Phone Number, Email Address<br>- Case Details (Required): Category (modal picker), Case Description (min 50 chars)<br>- Priority: Normal/Urgent radio buttons<br>- Voucher: Optional selection with Change/Remove<br>- Success creates case with `mode: 'ConsultationBooking'`<br>- My Bookings managed through My Cases |
| 1.1 | Nov 2024 | Updated Dashboard & Post Case sections to match current implementation:<br>- Dashboard button: "Get Your Services Now" (not "Post Case")<br>- Screen title: "Get Your Lawyer Now"<br>- Required fields: Category, Phone, IC Number<br>- Optional fields: Name, Email, Description, Priority, Location, Voucher (collapsible) |
| 1.0 | Nov 2024 | Initial version |

