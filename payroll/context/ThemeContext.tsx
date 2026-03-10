/**
 * Theme Context
 * Manages app theme (Light, Dark, Contrast)
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeMode = 'light' | 'dark' | 'contrast';

export interface ThemeColors {
  // Background colors
  background: string;
  surface: string;
  card: string;
  
  // Text colors
  text: string;
  textSecondary: string;
  textTertiary: string;
  
  // Primary colors
  primary: string;
  primaryLight: string;
  primaryDark: string;
  
  // Status colors
  success: string;
  warning: string;
  error: string;
  info: string;
  
  // Border colors
  border: string;
  borderLight: string;
  
  // Icon colors
  icon: string;
  iconActive: string;
  
  // Status bar
  statusBarStyle: 'light-content' | 'dark-content';
  statusBarColor: string;
}

interface ThemeContextType {
  theme: ThemeMode;
  colors: ThemeColors;
  setTheme: (theme: ThemeMode) => void;
}

// Light Theme
const lightTheme: ThemeColors = {
  background: '#F5F5F5',
  surface: '#FFFFFF',
  card: '#FFFFFF',
  
  text: '#000000',
  textSecondary: '#666666',
  textTertiary: '#999999',
  
  primary: '#4285F4',
  primaryLight: '#64B5F6',
  primaryDark: '#1976D2',
  
  success: '#4CAF50',
  warning: '#FF9800',
  error: '#FF5252',
  info: '#2196F3',
  
  border: '#E0E0E0',
  borderLight: '#F0F0F0',
  
  icon: '#666666',
  iconActive: '#4285F4',
  
  statusBarStyle: 'dark-content',
  statusBarColor: '#FFFFFF',
};

// Dark Theme
const darkTheme: ThemeColors = {
  background: '#121212',
  surface: '#1E1E1E',
  card: '#2C2C2C',
  
  text: '#FFFFFF',
  textSecondary: '#B3B3B3',
  textTertiary: '#808080',
  
  primary: '#64B5F6',
  primaryLight: '#90CAF9',
  primaryDark: '#42A5F5',
  
  success: '#66BB6A',
  warning: '#FFA726',
  error: '#EF5350',
  info: '#42A5F5',
  
  border: '#404040',
  borderLight: '#2C2C2C',
  
  icon: '#B3B3B3',
  iconActive: '#64B5F6',
  
  statusBarStyle: 'light-content',
  statusBarColor: '#1E1E1E',
};

// High Contrast Theme
const contrastTheme: ThemeColors = {
  background: '#000000',
  surface: '#000000',
  card: '#1A1A1A',
  
  text: '#FFFFFF',
  textSecondary: '#FFFFFF',
  textTertiary: '#E0E0E0',
  
  primary: '#FFEB3B',
  primaryLight: '#FFF176',
  primaryDark: '#FDD835',
  
  success: '#00FF00',
  warning: '#FFA500',
  error: '#FF0000',
  info: '#00FFFF',
  
  border: '#FFFFFF',
  borderLight: '#808080',
  
  icon: '#FFFFFF',
  iconActive: '#FFEB3B',
  
  statusBarStyle: 'light-content',
  statusBarColor: '#000000',
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = '@payroll_theme';

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeMode>('light');

  // Load theme from storage on mount
  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      if (savedTheme && (savedTheme === 'light' || savedTheme === 'dark' || savedTheme === 'contrast')) {
        setThemeState(savedTheme);
      }
    } catch (error) {
      console.error('Failed to load theme:', error);
    }
  };

  const setTheme = async (newTheme: ThemeMode) => {
    try {
      setThemeState(newTheme);
      await AsyncStorage.setItem(THEME_STORAGE_KEY, newTheme);
    } catch (error) {
      console.error('Failed to save theme:', error);
    }
  };

  const getColors = (): ThemeColors => {
    switch (theme) {
      case 'dark':
        return darkTheme;
      case 'contrast':
        return contrastTheme;
      case 'light':
      default:
        return lightTheme;
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, colors: getColors(), setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
