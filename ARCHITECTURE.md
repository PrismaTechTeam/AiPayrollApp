# LetLink Mobile App - Architecture Documentation

## 🏛️ Architecture Overview

This React Native app follows a **Feature-Driven, Layer-Based Architecture** optimized for mobile development.

## 📐 Architecture Principles

### 1. **Layer-Based Architecture**

```
┌─────────────────────────────────────────┐
│     Presentation Layer (UI)             │
│  - Screens, Components                  │
│  - React Native Paper + NativeWind      │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│     Business Logic Layer                │
│  - Hooks, Redux Store                   │
│  - Feature-specific logic               │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│     Service Layer                       │
│  - API Client, WebSocket                │
│  - Storage, Authentication              │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│     Data Layer                          │
│  - Redux Store, React Query Cache       │
│  - SecureStore, AsyncStorage            │
└─────────────────────────────────────────┘
```

### 2. **Feature-Driven Structure**

Each feature is self-contained with:
- **Components**: Feature-specific UI
- **Hooks**: Feature-specific logic
- **Screens**: Feature's main views
- **Services**: Feature's API calls

```
features/
  ├── auth/
  │   ├── components/    # LoginForm, RegisterForm
  │   ├── hooks/         # useLogin, useRegister
  │   ├── screens/       # LoginScreen, RegisterScreen
  │   └── services/      # authService.ts
  ├── chat/
  ├── cases/
  └── lawyers/
```

### 3. **Single Responsibility Principle**

- Each file has ONE clear purpose
- Components are small and focused
- Services handle only API/data operations
- Hooks encapsulate reusable logic

## 🎯 Key Differences: Web vs Mobile

| Aspect | Web (LawGoWebApp) | Mobile (LetLinkApp) |
|--------|-------------------|---------------------|
| **Routing** | React Router | React Navigation |
| **Layout** | Sidebar + Header | Bottom Tabs + Stack |
| **Styling** | MUI + TailwindCSS | React Native Paper + NativeWind |
| **State** | Redux Toolkit | Redux Toolkit (same) |
| **Server State** | React Query | React Query (same) |
| **Auth Storage** | LocalStorage | SecureStore (encrypted) |
| **Navigation** | Browser-based | Native stack/tab navigators |
| **Gestures** | Mouse/Touch events | react-native-gesture-handler |
| **Safe Areas** | CSS viewport | SafeAreaProvider |

## 🔄 Data Flow

### Authentication Flow

```
┌──────────────┐
│ LoginScreen  │
└──────┬───────┘
       │ submit credentials
       ↓
┌──────────────┐
│  useAuth()   │ ← Context hook
└──────┬───────┘
       │ call API
       ↓
┌──────────────┐
│ authService  │ ← API service
└──────┬───────┘
       │ axios request
       ↓
┌──────────────┐
│ apiClient    │ ← Axios instance
└──────┬───────┘
       │ HTTP request
       ↓
┌──────────────┐
│   Backend    │
└──────┬───────┘
       │ JWT token
       ↓
┌──────────────┐
│ SecureStore  │ ← Encrypted storage
└──────┬───────┘
       │ token saved
       ↓
┌──────────────┐
│ AuthContext  │ ← Update state
└──────┬───────┘
       │ navigate
       ↓
┌──────────────┐
│ MainNavigator│
└──────────────┘
```

### API Request Flow

```
Component
   │
   ├─→ React Query (useQuery/useMutation)
   │        │
   │        └─→ Service Function
   │                  │
   │                  └─→ apiClient (Axios)
   │                           │
   │                           ├─→ Request Interceptor
   │                           │     - Add auth token
   │                           │     - Add headers
   │                           │
   │                           └─→ Backend API
   │                                    │
   │                           ┌────────┘
   │                           │
   │                           ├─→ Response Interceptor
   │                           │     - Handle errors
   │                           │     - Refresh token
   │                           │
   │                           └─→ Return data
   │
   └─→ Update UI
```

## 🎨 UI Architecture

### Component Hierarchy

```
App (index.ts)
  └─→ AppRoot (src/app/index.tsx)
        ├─→ ErrorBoundary
        ├─→ Providers
        │     ├─→ GestureHandlerRootView
        │     ├─→ SafeAreaProvider
        │     ├─→ ReduxProvider
        │     ├─→ QueryClientProvider
        │     ├─→ PaperProvider (Theme)
        │     └─→ AuthProvider
        │
        └─→ AppNavigator
              ├─→ AuthNavigator (if not logged in)
              │     ├─→ LoginScreen
              │     ├─→ RegisterScreen
              │     └─→ ForgotPasswordScreen
              │
              └─→ MainNavigator (if logged in)
                    └─→ BottomTabNavigator
                          ├─→ Dashboard Stack
                          ├─→ Cases Stack
                          ├─→ Chat Stack
                          ├─→ Lawyers Stack
                          └─→ Profile Stack
```

### Mobile Navigation Pattern

**Bottom Tabs (Primary Navigation)**
- Dashboard: Overview & quick actions
- Cases: Manage legal cases
- Chat: Real-time messaging
- Lawyers: Find & book lawyers
- Profile: User settings

**Stack Navigation (Secondary Navigation)**
- Each tab has its own stack
- Deep linking support
- Gesture-based navigation
- Native transitions

## 🔐 Security Architecture

### Secure Data Storage

```
┌────────────────────────────────────┐
│   Sensitive Data                   │
│   - Auth tokens                    │
│   - User credentials               │
│   - Payment info                   │
└────────────┬───────────────────────┘
             │
             ↓
┌────────────────────────────────────┐
│   expo-secure-store                │
│   - Hardware-backed encryption     │
│   - Keychain (iOS)                 │
│   - Keystore (Android)             │
└────────────────────────────────────┘

┌────────────────────────────────────┐
│   Non-Sensitive Data               │
│   - User preferences               │
│   - Cache                          │
│   - App settings                   │
└────────────┬───────────────────────┘
             │
             ↓
┌────────────────────────────────────┐
│   AsyncStorage                     │
│   - Unencrypted storage            │
│   - Faster access                  │
└────────────────────────────────────┘
```

### API Security

1. **JWT Token Authentication**
   - Access token (short-lived)
   - Refresh token (long-lived)
   - Automatic token refresh

2. **Request Interceptors**
   - Add auth headers
   - Add device info
   - Add request ID

3. **Response Interceptors**
   - Handle 401 (refresh token)
   - Handle errors
   - Log requests

## 🎯 State Management Strategy

### Local State (useState)
- Component-specific data
- Form inputs
- UI toggles

### Global State (Redux)
- User session
- App configuration
- UI state (theme, language)

### Server State (React Query)
- API data
- Cached responses
- Background refetch
- Optimistic updates

### Secure State (SecureStore)
- Auth tokens
- Sensitive user data

## 📱 Mobile-Specific Considerations

### 1. **Performance Optimization**
- Lazy loading screens
- Image optimization
- List virtualization (FlatList)
- Memoization (useMemo, memo)

### 2. **Offline Support** (Future)
- Offline-first architecture
- Queue failed requests
- Sync when online

### 3. **Native Features**
- Biometric authentication
- Push notifications
- Deep linking
- Camera/Gallery access

### 4. **Platform Differences**
```typescript
// Platform-specific code
import { Platform } from 'react-native';

const styles = Platform.select({
  ios: { paddingTop: 20 },
  android: { paddingTop: 0 },
});
```

### 5. **Responsive Design**
```typescript
// Mobile-first, different screen sizes
import { Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');
const isTablet = width >= 768;
```

## 🚀 Build & Deployment

### Development
```bash
npm start          # Start Expo dev server
npm run ios        # Run on iOS simulator
npm run android    # Run on Android emulator
```

### Production Build
```bash
eas build --platform ios        # iOS build
eas build --platform android    # Android build
```

### Distribution
- **iOS**: TestFlight → App Store
- **Android**: Internal Testing → Google Play

## 📊 Monitoring & Analytics (Future)

- **Error Tracking**: Sentry
- **Analytics**: Firebase Analytics
- **Performance**: React Native Performance
- **Crash Reports**: Crashlytics

## 🧪 Testing Strategy (Future)

- **Unit Tests**: Jest
- **Component Tests**: React Native Testing Library
- **E2E Tests**: Detox
- **API Tests**: MSW (Mock Service Worker)

## 📚 Best Practices

### 1. **Component Design**
- Small, focused components
- Reusable UI components in `components/common`
- Feature-specific components in `features/*/components`

### 2. **Code Organization**
- One component per file
- Barrel exports (index.ts)
- Logical file naming

### 3. **Type Safety**
- Strong TypeScript usage
- Proper type definitions
- No `any` types

### 4. **Performance**
- Avoid unnecessary re-renders
- Use FlatList for long lists
- Optimize images
- Code splitting

### 5. **Security**
- Never log sensitive data
- Use SecureStore for tokens
- Validate all inputs
- HTTPS only

## 🎓 Learning Resources

- **React Native**: https://reactnative.dev
- **Expo**: https://docs.expo.dev
- **React Navigation**: https://reactnavigation.org
- **React Native Paper**: https://reactnativepaper.com
- **NativeWind**: https://www.nativewind.dev

---

This architecture is designed to be:
- ✅ **Scalable**: Easy to add new features
- ✅ **Maintainable**: Clear structure and patterns
- ✅ **Performant**: Optimized for mobile
- ✅ **Secure**: Best security practices
- ✅ **Testable**: Easy to unit test

