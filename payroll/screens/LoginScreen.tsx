/**
 * Login Screen
 * Simple login with dummy data for testing
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { usePayrollAuth } from '../context/PayrollAuthContext';

// Dummy users for testing
const DUMMY_USERS = [
  {
    email: 'employee@test.com',
    password: '123456',
    uid: 'emp-001',
    name: 'John Employee',
    role: 'Employee',
    availableRoles: ['Employee'],
  },
  {
    email: 'manager@test.com',
    password: '123456',
    uid: 'mgr-001',
    name: 'Sarah Manager',
    role: 'Manager',
    availableRoles: ['Manager'],
  },
  {
    email: 'admin@test.com',
    password: '123456',
    uid: 'adm-001',
    name: 'Alex Smith',
    role: 'Employee', // Can switch to Manager
    availableRoles: ['Employee', 'Manager'],
  },
];

export const LoginScreen: React.FC = () => {
  const { login } = usePayrollAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }

    setLoading(true);
    try {
      await login(email, password);
    } catch (error: any) {
      Alert.alert('Login Failed', error.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  const fillCredentials = (userEmail: string, userPassword: string) => {
    setEmail(userEmail);
    setPassword(userPassword);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#4285F4" />
      
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          {/* Header */}
          <View style={styles.header}>
            <MaterialCommunityIcons name="briefcase-account" size={80} color="#FFFFFF" />
            <Text style={styles.title}>Payroll App</Text>
            <Text style={styles.subtitle}>Employee Management System</Text>
          </View>

          {/* Login Form */}
          <View style={styles.formContainer}>
            <Text style={styles.welcomeText}>Welcome Back!</Text>
            <Text style={styles.instructionText}>Sign in to continue</Text>

            {/* Email Input */}
            <View style={styles.inputContainer}>
              <MaterialCommunityIcons name="email-outline" size={20} color="#666" />
              <TextInput
                style={styles.input}
                placeholder="Email"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
              />
            </View>

            {/* Password Input */}
            <View style={styles.inputContainer}>
              <MaterialCommunityIcons name="lock-outline" size={20} color="#666" />
              <TextInput
                style={styles.input}
                placeholder="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <MaterialCommunityIcons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color="#666"
                />
              </TouchableOpacity>
            </View>

            {/* Login Button */}
            <TouchableOpacity
              style={[styles.loginButton, loading && styles.loginButtonDisabled]}
              onPress={handleLogin}
              disabled={loading}
            >
              <Text style={styles.loginButtonText}>
                {loading ? 'Signing in...' : 'Sign In'}
              </Text>
            </TouchableOpacity>

            {/* Test Users Section */}
            <View style={styles.testUsersContainer}>
              <Text style={styles.testUsersTitle}>Test Users (Dummy Data):</Text>
              
              <TouchableOpacity
                style={styles.testUserButton}
                onPress={() => fillCredentials('employee@test.com', '123456')}
              >
                <View style={[styles.testUserIcon, { backgroundColor: '#4285F420' }]}>
                  <MaterialCommunityIcons name="account" size={24} color="#4285F4" />
                </View>
                <View style={styles.testUserInfo}>
                  <Text style={styles.testUserName}>John Employee</Text>
                  <Text style={styles.testUserEmail}>employee@test.com</Text>
                  <Text style={styles.testUserRole}>Role: Employee only</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.testUserButton}
                onPress={() => fillCredentials('manager@test.com', '123456')}
              >
                <View style={[styles.testUserIcon, { backgroundColor: '#FF572220' }]}>
                  <MaterialCommunityIcons name="shield-account" size={24} color="#FF5722" />
                </View>
                <View style={styles.testUserInfo}>
                  <Text style={styles.testUserName}>Sarah Manager</Text>
                  <Text style={styles.testUserEmail}>manager@test.com</Text>
                  <Text style={styles.testUserRole}>Role: Manager only</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.testUserButton}
                onPress={() => fillCredentials('admin@test.com', '123456')}
              >
                <View style={[styles.testUserIcon, { backgroundColor: '#4CAF5020' }]}>
                  <MaterialCommunityIcons name="account-star" size={24} color="#4CAF50" />
                </View>
                <View style={styles.testUserInfo}>
                  <Text style={styles.testUserName}>Alex Smith (Both Roles)</Text>
                  <Text style={styles.testUserEmail}>admin@test.com</Text>
                  <Text style={styles.testUserRole}>Role: Employee + Manager</Text>
                </View>
              </TouchableOpacity>

              <Text style={styles.passwordHint}>All passwords: 123456</Text>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#4285F4',
  },
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 16,
  },
  subtitle: {
    fontSize: 16,
    color: '#FFFFFF',
    opacity: 0.9,
    marginTop: 8,
  },
  formContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 24,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
    marginBottom: 8,
  },
  instructionText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 32,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
    height: 56,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#000',
    marginLeft: 12,
  },
  loginButton: {
    backgroundColor: '#4285F4',
    borderRadius: 12,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  testUsersContainer: {
    marginTop: 32,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  testUsersTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#666',
    marginBottom: 16,
    textAlign: 'center',
  },
  testUserButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9F9F9',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  testUserIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  testUserInfo: {
    flex: 1,
  },
  testUserName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000',
    marginBottom: 2,
  },
  testUserEmail: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  testUserRole: {
    fontSize: 11,
    color: '#999',
  },
  passwordHint: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
});

export default LoginScreen;
