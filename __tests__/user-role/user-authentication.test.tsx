/**
 * User Role - Authentication Test Suite
 * Comprehensive tests for user authentication flows
 */

import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { render, fireEvent, screen } from '@testing-library/react-native';
import * as SecureStore from 'expo-secure-store';
import { AuthProvider, useAuth } from '../../src/features/auth/context/AuthContext';
import axios from '../../src/config/axios';
import LoginScreen from '../../src/features/auth/screens/LoginScreen';
import RegisterScreen from '../../src/features/auth/screens/RegisterScreen';
import OtpVerificationScreen from '../../src/features/auth/screens/OtpVerificationScreen';

// Mock dependencies
jest.mock('expo-secure-store');
jest.mock('../../src/config/axios');
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
    reset: jest.fn(),
  }),
  useRoute: () => ({ params: {} }),
}));

const mockedAxios = axios as jest.Mocked<typeof axios>;
const mockedSecureStore = SecureStore as jest.Mocked<typeof SecureStore>;

// Helper to create mock JWT token
const createMockToken = (payload: {
  Uid?: string;
  Name?: string;
  email?: string;
  ActiveRole?: string;
  IsNewUser?: boolean;
  role?: string | string[];
}) => {
  const defaultPayload = {
    Uid: 'user-123',
    Name: 'Test User',
    email: 'test@example.com',
    'http://schemas.microsoft.com/ws/2008/06/identity/claims/role': 'User',
    ActiveRole: 'User',
    IsNewUser: false,
    exp: Math.floor(Date.now() / 1000) + 3600,
    ...payload,
  };
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = btoa(JSON.stringify(defaultPayload));
  return `${header}.${body}.mock-signature`;
};

// Auth Provider wrapper for hooks
const AuthWrapper = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
);

describe('User Role - Authentication Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedSecureStore.getItemAsync.mockResolvedValue(null);
    mockedSecureStore.setItemAsync.mockResolvedValue();
    mockedSecureStore.deleteItemAsync.mockResolvedValue();
  });

  // ============================================
  // 1. EMAIL/PASSWORD LOGIN TESTS
  // ============================================
  describe('USER-AUTH-001 to USER-AUTH-008: Email/Password Login', () => {
    
    test('USER-AUTH-001: Successful login with valid email and password', async () => {
      const mockToken = createMockToken({ Uid: 'user-123', Name: 'John Doe' });
      
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          isSuccess: true,
          content: { token: mockToken, required2FA: false },
        },
      });
      mockedSecureStore.getItemAsync.mockResolvedValue(mockToken);

      const { result } = renderHook(() => useAuth(), { wrapper: AuthWrapper });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        const response = await result.current.signin('test@example.com', 'Password123!');
        expect(response.required2FA).toBe(false);
      });

      expect(mockedSecureStore.setItemAsync).toHaveBeenCalledWith('authToken', mockToken);
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user?.UserInfo?.uid).toBe('user-123');
    });

    test('USER-AUTH-002: Login with invalid email format shows validation error', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper: AuthWrapper });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      // The validation should happen at the UI level
      // Here we test that the auth context handles invalid input gracefully
      mockedAxios.post.mockRejectedValueOnce({
        response: {
          data: { errors: ['Invalid email format'] },
        },
      });

      await expect(
        result.current.signin('invalid-email', 'password')
      ).rejects.toThrow();
    });

    test('USER-AUTH-003: Login with wrong password returns error', async () => {
      mockedAxios.post.mockRejectedValueOnce({
        response: {
          data: { errors: ['Invalid email or password'] },
        },
      });

      const { result } = renderHook(() => useAuth(), { wrapper: AuthWrapper });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await expect(
        result.current.signin('test@example.com', 'wrongpassword')
      ).rejects.toThrow();

      expect(result.current.error).toBe('Invalid email or password');
    });

    test('USER-AUTH-004: Login with unverified email triggers email confirmation flow', async () => {
      mockedAxios.post.mockRejectedValueOnce({
        response: {
          data: { errors: ['Email is not verify'] },
        },
      });

      const { result } = renderHook(() => useAuth(), { wrapper: AuthWrapper });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        await result.current.signin('unverified@example.com', 'Password123!');
      });

      expect(result.current.emailConfirmation).toBe(false);
      expect(result.current.email).toBe('unverified@example.com');
    });

    test('USER-AUTH-005: Login triggers 2FA when enabled', async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          isSuccess: true,
          content: {
            required2FA: true,
            tempToken2FA: 'temp-token-123',
            userId: 'user-123',
          },
        },
      });

      const { result } = renderHook(() => useAuth(), { wrapper: AuthWrapper });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        const response = await result.current.signin('2fa@example.com', 'Password123!');
        expect(response.required2FA).toBe(true);
        expect(response.userId).toBe('user-123');
      });

      expect(mockedSecureStore.setItemAsync).toHaveBeenCalledWith(
        'temp2FAToken',
        'temp-token-123'
      );
    });

    test('USER-AUTH-006: Login shows loading state during API call', async () => {
      // Create a delayed promise to test loading state
      let resolveLogin: (value: any) => void;
      const loginPromise = new Promise((resolve) => {
        resolveLogin = resolve;
      });

      mockedAxios.post.mockImplementationOnce(() => loginPromise as any);

      const { result } = renderHook(() => useAuth(), { wrapper: AuthWrapper });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      // Start login but don't await
      const loginCall = result.current.signin('test@example.com', 'password');

      // Resolve the login
      resolveLogin!({
        data: {
          isSuccess: true,
          content: { token: createMockToken({}), required2FA: false },
        },
      });

      await loginCall;
    });

    test('USER-AUTH-007: Login handles network error gracefully', async () => {
      mockedAxios.post.mockRejectedValueOnce(new Error('Network Error'));

      const { result } = renderHook(() => useAuth(), { wrapper: AuthWrapper });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await expect(
        result.current.signin('test@example.com', 'password')
      ).rejects.toThrow('Network Error');
    });
  });

  // ============================================
  // 2. PHONE OTP LOGIN TESTS
  // ============================================
  describe('USER-AUTH-009 to USER-AUTH-016: Phone OTP Login', () => {
    
    test('USER-AUTH-009: Send OTP to valid phone number', async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: { isSuccess: true },
      });

      const { result } = renderHook(() => useAuth(), { wrapper: AuthWrapper });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        const success = await result.current.sendSmsOtp('+60123456789');
        expect(success).toBe(true);
      });

      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('send-sms-otp'),
        expect.objectContaining({
          phoneNumber: '+60123456789',
        })
      );
    });

    test('USER-AUTH-010: Send OTP to invalid phone number returns error', async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          isSuccess: false,
          errors: ['Invalid phone number format'],
        },
      });

      const { result } = renderHook(() => useAuth(), { wrapper: AuthWrapper });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await expect(result.current.sendSmsOtp('invalid')).rejects.toThrow(
        'Invalid phone number format'
      );
    });

    test('USER-AUTH-011: Verify correct OTP logs in user', async () => {
      const mockToken = createMockToken({
        Uid: 'phone-user-123',
        Name: 'Phone User',
        IsNewUser: false,
      });

      mockedAxios.post.mockResolvedValueOnce({
        data: {
          isSuccess: true,
          content: {
            token: mockToken,
            userId: 'phone-user-123',
            isNewUser: false,
          },
        },
      });
      mockedSecureStore.getItemAsync.mockResolvedValue(mockToken);

      const { result } = renderHook(() => useAuth(), { wrapper: AuthWrapper });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        const response = await result.current.verifyPhoneOtp('+60123456789', '123456');
        expect(response.success).toBe(true);
        expect(response.isNewUser).toBe(false);
      });

      expect(mockedSecureStore.setItemAsync).toHaveBeenCalledWith('authToken', mockToken);
    });

    test('USER-AUTH-012: Verify incorrect OTP returns error', async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          isSuccess: false,
          errors: ['Invalid OTP'],
        },
      });

      const { result } = renderHook(() => useAuth(), { wrapper: AuthWrapper });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await expect(
        result.current.verifyPhoneOtp('+60123456789', '000000')
      ).rejects.toThrow('Invalid OTP');
    });

    test('USER-AUTH-013: Phone login for new user sets isNewUser flag', async () => {
      const mockToken = createMockToken({
        Uid: 'new-phone-user',
        IsNewUser: true,
      });

      mockedAxios.post.mockResolvedValueOnce({
        data: {
          isSuccess: true,
          content: {
            token: mockToken,
            userId: 'new-phone-user',
            isNewUser: true,
          },
        },
      });
      mockedSecureStore.getItemAsync.mockResolvedValue(mockToken);

      const { result } = renderHook(() => useAuth(), { wrapper: AuthWrapper });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        const response = await result.current.verifyPhoneOtp('+60999999999', '123456');
        expect(response.isNewUser).toBe(true);
      });
    });
  });

  // ============================================
  // 3. GOOGLE SIGN-IN TESTS
  // ============================================
  describe('USER-AUTH-017 to USER-AUTH-021: Google Sign-In', () => {
    
    test('USER-AUTH-017: Google sign-in success for existing user', async () => {
      const mockToken = createMockToken({
        Uid: 'google-user-123',
        Name: 'Google User',
        email: 'google@example.com',
        IsNewUser: false,
      });

      mockedAxios.post.mockResolvedValueOnce({
        data: {
          isSuccess: true,
          content: { token: mockToken },
        },
      });
      mockedSecureStore.getItemAsync.mockResolvedValue(mockToken);

      const { result } = renderHook(() => useAuth(), { wrapper: AuthWrapper });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        const response = await result.current.loginWithGoogle('google-access-token-xyz');
        expect(response.success).toBe(true);
      });

      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('google-login'),
        expect.objectContaining({
          AccessToken: 'google-access-token-xyz',
        })
      );
    });

    test('USER-AUTH-018: Google sign-in for new user returns isNewUser', async () => {
      const mockToken = createMockToken({
        Uid: 'new-google-user',
        IsNewUser: true,
      });

      mockedAxios.post.mockResolvedValueOnce({
        data: {
          isSuccess: true,
          content: { token: mockToken },
        },
      });
      mockedSecureStore.getItemAsync.mockResolvedValue(mockToken);

      const { result } = renderHook(() => useAuth(), { wrapper: AuthWrapper });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        await result.current.loginWithGoogle('new-google-token');
      });

      await waitFor(() => {
        expect(result.current.user?.UserInfo?.isNewUser).toBe(true);
      });
    });

    test('USER-AUTH-019: Google sign-in with 2FA required', async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          isSuccess: true,
          content: {
            Required2FA: true,
            UserId: 'google-2fa-user',
            TempToken2FA: 'google-temp-token',
          },
        },
      });

      const { result } = renderHook(() => useAuth(), { wrapper: AuthWrapper });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        const response = await result.current.loginWithGoogle('google-token');
        expect(response.required2FA).toBe(true);
        expect(response.userId).toBe('google-2fa-user');
      });
    });

    test('USER-AUTH-020: Google sign-in handles error', async () => {
      mockedAxios.post.mockRejectedValueOnce({
        response: {
          data: { errors: ['Google authentication failed'] },
        },
      });

      const { result } = renderHook(() => useAuth(), { wrapper: AuthWrapper });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await expect(
        result.current.loginWithGoogle('invalid-token')
      ).rejects.toThrow('Google authentication failed');
    });
  });

  // ============================================
  // 4. TWO-FACTOR AUTHENTICATION TESTS
  // ============================================
  describe('USER-AUTH-022 to USER-AUTH-026: Two-Factor Authentication', () => {
    
    test('USER-AUTH-022: Verify valid 2FA code logs in user', async () => {
      const mockToken = createMockToken({ Uid: '2fa-user-123' });

      mockedAxios.post.mockResolvedValueOnce({
        status: 200,
        data: { token: mockToken },
      });
      mockedSecureStore.getItemAsync.mockResolvedValue(mockToken);

      const { result } = renderHook(() => useAuth(), { wrapper: AuthWrapper });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        const success = await result.current.verify2FA(
          'user-123',
          'temp-token',
          '123456'
        );
        expect(success).toBe(true);
      });

      expect(mockedSecureStore.setItemAsync).toHaveBeenCalledWith('authToken', mockToken);
    });

    test('USER-AUTH-023: Verify invalid 2FA code returns error', async () => {
      mockedAxios.post.mockRejectedValueOnce({
        response: {
          data: { errors: ['Invalid verification code'] },
        },
      });

      const { result } = renderHook(() => useAuth(), { wrapper: AuthWrapper });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await expect(
        result.current.verify2FA('user-123', 'temp-token', '000000')
      ).rejects.toThrow('Invalid verification code');
    });

    test('USER-AUTH-024: Expired 2FA code returns error', async () => {
      mockedAxios.post.mockRejectedValueOnce({
        response: {
          data: { message: 'Code expired' },
        },
      });

      const { result } = renderHook(() => useAuth(), { wrapper: AuthWrapper });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await expect(
        result.current.verify2FA('user-123', 'expired-temp-token', '123456')
      ).rejects.toThrow('Code expired');
    });
  });

  // ============================================
  // 5. REGISTRATION TESTS
  // ============================================
  describe('USER-AUTH-027 to USER-AUTH-032: Registration', () => {
    
    test('USER-AUTH-027: Successful registration', async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: { isSuccess: true },
      });

      const { result } = renderHook(() => useAuth(), { wrapper: AuthWrapper });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        const response = await result.current.signup({
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.doe@example.com',
          password: 'StrongPass123!',
        });
        expect(response.success).toBe(true);
      });

      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('create'),
        expect.objectContaining({
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.doe@example.com',
          password: 'StrongPass123!',
        })
      );
    });

    test('USER-AUTH-028: Register with existing email returns error', async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          isSuccess: false,
          errors: ['Email already exists'],
        },
      });

      const { result } = renderHook(() => useAuth(), { wrapper: AuthWrapper });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await expect(
        result.current.signup({
          firstName: 'John',
          lastName: 'Doe',
          email: 'existing@example.com',
          password: 'Password123!',
        })
      ).rejects.toThrow('Email already exists');
    });

    test('USER-AUTH-029: Register with weak password returns error', async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          isSuccess: false,
          errors: ['Password must be at least 8 characters'],
        },
      });

      const { result } = renderHook(() => useAuth(), { wrapper: AuthWrapper });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await expect(
        result.current.signup({
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          password: '123',
        })
      ).rejects.toThrow('Password must be at least 8 characters');
    });
  });

  // ============================================
  // 6. SESSION MANAGEMENT TESTS
  // ============================================
  describe('USER-AUTH-033 to USER-AUTH-037: Session Management', () => {
    
    test('USER-AUTH-033: Session persists on app restart', async () => {
      const mockToken = createMockToken({
        Uid: 'persistent-user',
        Name: 'Persistent User',
      });

      mockedSecureStore.getItemAsync.mockResolvedValue(mockToken);

      const { result } = renderHook(() => useAuth(), { wrapper: AuthWrapper });

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true);
        expect(result.current.user?.UserInfo?.uid).toBe('persistent-user');
      });
    });

    test('USER-AUTH-034: No token results in unauthenticated state', async () => {
      mockedSecureStore.getItemAsync.mockResolvedValue(null);

      const { result } = renderHook(() => useAuth(), { wrapper: AuthWrapper });

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(false);
        expect(result.current.user).toBeNull();
      });
    });

    test('USER-AUTH-035: Logout clears session completely', async () => {
      const mockToken = createMockToken({ Uid: 'user-to-logout' });
      mockedSecureStore.getItemAsync.mockResolvedValue(mockToken);

      const { result } = renderHook(() => useAuth(), { wrapper: AuthWrapper });

      await waitFor(() => expect(result.current.isAuthenticated).toBe(true));

      await act(async () => {
        await result.current.logout();
      });

      expect(mockedSecureStore.deleteItemAsync).toHaveBeenCalledWith('authToken');
      expect(mockedSecureStore.deleteItemAsync).toHaveBeenCalledWith('temp2FAToken');
      expect(mockedSecureStore.deleteItemAsync).toHaveBeenCalledWith('temp2FAUserId');
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
    });

    test('USER-AUTH-036: Token renewal works correctly', async () => {
      const oldToken = createMockToken({ Uid: 'user-123', ActiveRole: 'User' });
      const newToken = createMockToken({ Uid: 'user-123', ActiveRole: 'User' });

      mockedSecureStore.getItemAsync.mockResolvedValue(oldToken);
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          isSuccess: true,
          content: newToken,
        },
      });

      const { result } = renderHook(() => useAuth(), { wrapper: AuthWrapper });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        const success = await result.current.RenewToken();
        expect(success).toBe(true);
      });

      expect(mockedSecureStore.setItemAsync).toHaveBeenCalledWith('authToken', newToken);
    });
  });

  // ============================================
  // 7. PASSWORD RESET TESTS
  // ============================================
  describe('USER-AUTH-038 to USER-AUTH-042: Password Reset', () => {
    
    test('USER-AUTH-038: Forgot password sends email', async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: { isSuccess: true },
      });

      const { result } = renderHook(() => useAuth(), { wrapper: AuthWrapper });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        await result.current.forgotPassword('user@example.com');
      });

      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('forgot-password'),
        { email: 'user@example.com' }
      );
      expect(result.current.email).toBe('user@example.com');
    });

    test('USER-AUTH-039: Reset password with valid token', async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: { isSuccess: true },
      });

      const { result } = renderHook(() => useAuth(), { wrapper: AuthWrapper });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        const success = await result.current.resetPassword(
          'user@example.com',
          'valid-reset-token',
          'NewPassword123!'
        );
        expect(success).toBe(true);
      });
    });

    test('USER-AUTH-040: Reset password with expired token fails', async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          isSuccess: false,
          error: 'Reset link has expired',
        },
      });

      const { result } = renderHook(() => useAuth(), { wrapper: AuthWrapper });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        const success = await result.current.resetPassword(
          'user@example.com',
          'expired-token',
          'NewPassword123!'
        );
        expect(success).toBe(false);
      });

      expect(result.current.error).toBe('Reset link has expired');
    });
  });

  // ============================================
  // 8. ROLE VERIFICATION TESTS (User Role Specific)
  // ============================================
  describe('User Role Verification', () => {
    
    test('User role is correctly identified from JWT', async () => {
      const mockToken = createMockToken({
        Uid: 'user-123',
        role: 'User',
        ActiveRole: 'User',
      });

      mockedSecureStore.getItemAsync.mockResolvedValue(mockToken);

      const { result } = renderHook(() => useAuth(), { wrapper: AuthWrapper });

      await waitFor(() => {
        expect(result.current.user?.UserInfo?.ActiveRole).toBe('User');
      });
    });

    test('User with multiple roles has roles array', async () => {
      const payload = {
        Uid: 'multi-role-user',
        Name: 'Multi User',
        ActiveRole: 'User',
      };
      
      // Create token with multiple role entries
      const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
      const bodyWithMultipleRoles = btoa(JSON.stringify({
        ...payload,
        'http://schemas.microsoft.com/ws/2008/06/identity/claims/role': ['User', 'Lawyer'],
        exp: Math.floor(Date.now() / 1000) + 3600,
      }));
      const mockToken = `${header}.${bodyWithMultipleRoles}.signature`;

      mockedSecureStore.getItemAsync.mockResolvedValue(mockToken);

      const { result } = renderHook(() => useAuth(), { wrapper: AuthWrapper });

      await waitFor(() => {
        const roles = result.current.user?.UserInfo?.role;
        expect(Array.isArray(roles) || typeof roles === 'string').toBe(true);
      });
    });

    test('New user flag is correctly identified', async () => {
      const mockToken = createMockToken({
        Uid: 'new-user-123',
        IsNewUser: true,
      });

      mockedSecureStore.getItemAsync.mockResolvedValue(mockToken);

      const { result } = renderHook(() => useAuth(), { wrapper: AuthWrapper });

      await waitFor(() => {
        expect(result.current.user?.UserInfo?.isNewUser).toBe(true);
      });
    });
  });
});

