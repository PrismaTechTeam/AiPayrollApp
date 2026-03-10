/**
 * Language Context
 * Manages app language preference
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type LanguageCode = 'en' | 'es' | 'fr' | 'de' | 'zh' | 'ja' | 'ar' | 'hi';

export interface Language {
  code: LanguageCode;
  name: string;
  nativeName: string;
  flag: string;
}

export const AVAILABLE_LANGUAGES: Language[] = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
  { code: 'zh', name: 'Chinese', nativeName: '中文', flag: '🇨🇳' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳' },
];

interface LanguageContextType {
  language: LanguageCode;
  currentLanguage: Language;
  setLanguage: (language: LanguageCode) => void;
  availableLanguages: Language[];
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const LANGUAGE_STORAGE_KEY = '@payroll_language';

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<LanguageCode>('en');

  // Load language from storage on mount
  useEffect(() => {
    loadLanguage();
  }, []);

  const loadLanguage = async () => {
    try {
      const savedLanguage = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
      if (savedLanguage && isValidLanguageCode(savedLanguage)) {
        setLanguageState(savedLanguage as LanguageCode);
      }
    } catch (error) {
      console.error('Failed to load language:', error);
    }
  };

  const isValidLanguageCode = (code: string): boolean => {
    return AVAILABLE_LANGUAGES.some((lang) => lang.code === code);
  };

  const setLanguage = async (newLanguage: LanguageCode) => {
    try {
      setLanguageState(newLanguage);
      await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, newLanguage);
    } catch (error) {
      console.error('Failed to save language:', error);
    }
  };

  const getCurrentLanguage = (): Language => {
    return AVAILABLE_LANGUAGES.find((lang) => lang.code === language) || AVAILABLE_LANGUAGES[0];
  };

  return (
    <LanguageContext.Provider
      value={{
        language,
        currentLanguage: getCurrentLanguage(),
        setLanguage,
        availableLanguages: AVAILABLE_LANGUAGES,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
