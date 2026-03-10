/**
 * Payroll Authentication Context
 * Simplified auth for payroll app with role switching
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';

export interface PayrollUser {
  uid: string;
  name: string;
  email: string;
  role: string; // Current active role
  availableRoles?: string[]; // Roles user can switch to
  company: string; // Current active company
  availableCompanies?: string[]; // Companies user can switch to
}

interface PayrollAuthContextType {
  user: PayrollUser | null;
  isLoading: boolean;
  currentRole: string | null;
  availableRoles: string[];
  currentCompany: string | null;
  availableCompanies: string[];
  switchRole: (newRole: string) => Promise<void>;
  switchCompany: (newCompany: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const PayrollAuthContext = createContext<PayrollAuthContextType | undefined>(undefined);

export const PayrollAuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<PayrollUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize - check for stored user
  useEffect(() => {
    checkStoredAuth();
  }, []);

  const checkStoredAuth = async () => {
    try {
      const storedUser = await SecureStore.getItemAsync('payroll_user');
      if (storedUser) {
        const userData = JSON.parse(storedUser);
        setUser(userData);
        console.log('✅ Loaded stored user:', userData.name, 'Role:', userData.role);
      }
       // No else block - user must login
    } catch (error) {
      console.error('Error checking stored auth:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      // Dummy users for testing
      const DUMMY_USERS = [
        {
          email: 'employee@test.com',
          password: '123456',
          uid: 'emp-001',
          name: 'John Employee',
          role: 'Employee',
          availableRoles: ['Employee'],
          company: 'Prisma Tech',
          availableCompanies: ['Prisma Tech', 'Jian Sin Plastic Industries'], // Can switch companies
        },
        {
          email: 'manager@test.com',
          password: '123456',
          uid: 'mgr-001',
          name: 'Sarah Manager',
          role: 'Manager',
          availableRoles: ['Manager'],
          company: 'Jian Sin Plastic Industries',
          availableCompanies: ['Prisma Tech', 'Jian Sin Plastic Industries'], // Can switch companies
        },
        {
          email: 'admin@test.com',
          password: '123456',
          uid: 'adm-001',
          name: 'Alex Smith',
          role: 'Employee', // Can switch to Manager
          availableRoles: ['Employee', 'Manager'],
          company: 'Prisma Tech', // Can switch companies
          availableCompanies: ['Prisma Tech', 'Jian Sin Plastic Industries'],
        },
      ];

      // Find matching user
      const matchedUser = DUMMY_USERS.find(
        (u) => u.email === email && u.password === password
      );

      if (!matchedUser) {
        throw new Error('Invalid email or password');
      }

      // Create user object
      const mockUser: PayrollUser = {
        uid: matchedUser.uid,
        name: matchedUser.name,
        email: matchedUser.email,
        role: matchedUser.role,
        availableRoles: matchedUser.availableRoles,
        company: matchedUser.company,
        availableCompanies: matchedUser.availableCompanies,
      };

      await SecureStore.setItemAsync('payroll_user', JSON.stringify(mockUser));
      setUser(mockUser);
      console.log('✅ User logged in:', mockUser.name);
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await SecureStore.deleteItemAsync('payroll_user');
      setUser(null);
      console.log('✅ User logged out');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const switchRole = async (newRole: string) => {
    if (!user || !user.availableRoles?.includes(newRole)) {
      throw new Error('Invalid role or user not authorized');
    }

    try {
      const updatedUser = { ...user, role: newRole };
      await SecureStore.setItemAsync('payroll_user', JSON.stringify(updatedUser));
      setUser(updatedUser);
      console.log(`✅ Role switched to: ${newRole}`);
    } catch (error) {
      console.error('Error switching role:', error);
      throw error;
    }
  };

  const switchCompany = async (newCompany: string) => {
    if (!user || !user.availableCompanies?.includes(newCompany)) {
      throw new Error('Invalid company or user not authorized');
    }

    try {
      const updatedUser = { ...user, company: newCompany };
      await SecureStore.setItemAsync('payroll_user', JSON.stringify(updatedUser));
      setUser(updatedUser);
      console.log(`✅ Company switched to: ${newCompany}`);
    } catch (error) {
      console.error('Error switching company:', error);
      throw error;
    }
  };

  const value = {
    user,
    isLoading,
    currentRole: user?.role || null,
    availableRoles: user?.availableRoles || [],
    currentCompany: user?.company || null,
    availableCompanies: user?.availableCompanies || [],
    switchRole,
    switchCompany,
    login,
    logout,
  };

  return <PayrollAuthContext.Provider value={value}>{children}</PayrollAuthContext.Provider>;
};

export const usePayrollAuth = () => {
  const context = useContext(PayrollAuthContext);
  if (!context) {
    throw new Error('usePayrollAuth must be used within PayrollAuthProvider');
  }
  return context;
};
