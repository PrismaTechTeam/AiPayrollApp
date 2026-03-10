# LetLink Mobile App

React Native mobile application for LetLink - Legal Services Platform

## 🏗️ Architecture

This project follows a **feature-driven, layer-based architecture** for scalability and maintainability.

### Folder Structure

```
src/
├── app/                    # App initialization & providers
├── assets/                 # Static assets (images, fonts, icons)
├── components/             # Reusable UI components
│   ├── common/            # Generic components (buttons, cards, forms)
│   └── ui/                # UI-specific components (layouts, feedback)
├── config/                # App configuration & env variables
├── constants/             # Constants & enums
├── features/              # Feature modules (domain-driven)
│   ├── auth/
│   ├── chat/
│   ├── cases/
│   ├── lawyers/
│   ├── booking/
│   ├── profile/
│   ├── subscription/
│   └── dashboard/
├── hooks/                 # Custom hooks
├── navigation/            # Navigation configuration
├── services/              # External services (API, storage, websocket)
├── store/                 # Redux state management
├── theme/                 # Theme configuration (colors, fonts, spacing)
├── types/                 # TypeScript types
└── utils/                 # Utility functions
```

## 🚀 Tech Stack

- **Framework**: React Native (Expo)
- **UI Library**: React Native Paper (Material Design 3)
- **Styling**: NativeWind (TailwindCSS for React Native)
- **Navigation**: React Navigation v7
- **State Management**: Redux Toolkit
- **Server State**: TanStack Query (React Query)
- **API Client**: Axios
- **Language**: TypeScript

## 📦 Installation

```bash
# Install dependencies
npm install

# Start the development server
npm start

# Run on iOS
npm run ios

# Run on Android
npm run android
```

## 🎨 Design System

### Colors
- Primary: `#1976D2` (Blue)
- Secondary: `#DC004E` (Pink)
- Success: `#4CAF50`
- Warning: `#FF9800`
- Error: `#F44336`

### Spacing
Base unit: 8px
- xs: 4px
- sm: 8px
- md: 16px
- lg: 24px
- xl: 32px
- xxl: 48px

### Typography
Using system fonts (San Francisco on iOS, Roboto on Android)

## 🔐 Authentication

Authentication is handled through:
- **Context**: `AuthContext` provides auth state
- **Storage**: Secure token storage using `expo-secure-store`
- **API**: Axios interceptors handle token refresh

### 📱 Phone OTP Authentication (NEW!)

Complete phone number authentication with SMS OTP verification:

#### Features
- ✅ Country code picker with auto-detection
- ✅ SMS OTP verification (6-digit code)
- ✅ Resend OTP functionality (max 5 attempts)
- ✅ 60-second countdown timer
- ✅ Auto-focus between OTP inputs
- ✅ Paste support for OTP codes
- ✅ Secure JWT token storage
- ✅ New user detection

#### Quick Start
```bash
# 1. Start backend API at http://localhost:7133
cd LawyerApp/LawyerApp
dotnet run

# 2. Start mobile app
cd LetLinkApp
npm start

# 3. Test phone login flow
# - Enter phone number with country code
# - Receive SMS with OTP
# - Enter 6-digit code
# - Authenticated! ✅
```

#### API Endpoints
- **Send OTP**: `POST /auth/send-sms-otp`
- **Verify OTP**: `POST /auth/phone-auth`

#### Documentation
For detailed implementation docs, see:
- 📖 [PHONE_OTP_IMPLEMENTATION.md](./PHONE_OTP_IMPLEMENTATION.md) - Complete implementation details
- 🚀 [PHONE_OTP_QUICK_START.md](./PHONE_OTP_QUICK_START.md) - Quick start guide
- 🧪 [TEST_PHONE_OTP_API.md](./TEST_PHONE_OTP_API.md) - API testing guide
- 📋 [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md) - Implementation summary

## 🧭 Navigation

### Auth Flow
- Login
- Register
- Forgot Password

### Main Flow (Bottom Tabs)
- Dashboard
- Cases
- Chat
- Lawyers
- Profile

## 🌐 API Configuration

API endpoints are configured in `src/config/endpoint.ts`:
- **Development**: `http://localhost:7133`
  - iOS Simulator: `http://localhost:7133` ✅
  - Android Emulator: `http://10.0.2.2:7133`
  - Physical Device: `http://192.168.x.x:7133` (your computer's IP)
- **Staging**: `https://staging-api.letlink.com`
- **Production**: `https://api.letlink.com`

> **Note**: For Android emulator or physical device, update the base URL in `src/config/endpoint.ts` accordingly.

## 📱 Features

### Authentication
- ✅ Email & Password Login
- ✅ **Phone OTP Authentication (NEW!)**
- ✅ Google OAuth Integration
- ✅ Facebook Login
- ✅ Two-Factor Authentication (2FA)
- ✅ JWT Token Management
- ✅ Secure Storage (SecureStore)

### Core Features
- ✅ Case Management
- ✅ Real-time Chat
- ✅ Lawyer Directory
- ✅ Booking System
- ✅ User Profile
- ✅ Subscription Management

### Coming Soon
- 🔄 Push Notifications
- 🔄 Offline Support
- 🔄 Biometric Authentication

## 🧪 Development

### Code Style
- ESLint for linting
- Prettier for formatting
- TypeScript for type safety

### Best Practices
- Feature-based organization
- Single Responsibility Principle
- Reusable components
- Type-safe with TypeScript
- Proper error handling
- Secure data storage

## 📄 License

Private - All rights reserved

