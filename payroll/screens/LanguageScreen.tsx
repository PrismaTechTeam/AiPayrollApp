/**
 * Language Screen
 * Allows users to change app language
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { useLanguage, Language, LanguageCode } from '../context/LanguageContext';

export const LanguageScreen: React.FC = () => {
  const navigation = useNavigation();
  const { language, currentLanguage, setLanguage, availableLanguages } = useLanguage();

  const handleLanguageSelect = (selectedLanguage: LanguageCode) => {
    setLanguage(selectedLanguage);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Header */}
      <SafeAreaView style={styles.safeAreaTop} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <MaterialCommunityIcons name="arrow-left" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Language</Text>
          <View style={{ width: 40 }} />
        </View>
      </SafeAreaView>

      {/* Content */}
      <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Info Section */}
          <View style={styles.infoSection}>
            <MaterialCommunityIcons name="translate" size={32} color="#4285F4" />
            <Text style={styles.infoTitle}>Choose Your Language</Text>
            <Text style={styles.infoDescription}>
              Select your preferred language for the app interface. Your choice will be saved automatically.
            </Text>
          </View>

          {/* Current Language Banner */}
          <View style={styles.currentLanguageBanner}>
            <View style={styles.currentLanguageLeft}>
              <Text style={styles.currentLanguageFlag}>{currentLanguage.flag}</Text>
              <View>
                <Text style={styles.currentLanguageLabel}>Current Language</Text>
                <Text style={styles.currentLanguageName}>
                  {currentLanguage.nativeName} ({currentLanguage.name})
                </Text>
              </View>
            </View>
            <MaterialCommunityIcons name="check-circle" size={24} color="#4CAF50" />
          </View>

          {/* Language Options */}
          <View style={styles.languagesSection}>
            <Text style={styles.sectionTitle}>Available Languages</Text>
            
            {availableLanguages.map((lang) => {
              const isSelected = language === lang.code;
              
              return (
                <TouchableOpacity
                  key={lang.code}
                  style={[
                    styles.languageCard,
                    isSelected && styles.languageCardSelected,
                  ]}
                  onPress={() => handleLanguageSelect(lang.code)}
                  activeOpacity={0.7}
                >
                  {/* Flag */}
                  <Text style={styles.flag}>{lang.flag}</Text>

                  {/* Language Info */}
                  <View style={styles.languageInfo}>
                    <Text style={styles.languageName}>{lang.name}</Text>
                    <Text style={styles.languageNativeName}>{lang.nativeName}</Text>
                  </View>

                  {/* Selected Indicator */}
                  {isSelected && (
                    <View style={styles.selectedIndicator}>
                      <MaterialCommunityIcons name="check-circle" size={24} color="#4285F4" />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Info Note */}
          <View style={styles.noteSection}>
            <MaterialCommunityIcons name="information-outline" size={20} color="#666" />
            <View style={styles.noteContent}>
              <Text style={styles.noteTitle}>Note</Text>
              <Text style={styles.noteText}>
                Language changes will be applied immediately. Some content may require an app restart to fully update.
              </Text>
            </View>
          </View>

          <View style={{ height: 20 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  safeAreaTop: {
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 20,
  },
  infoSection: {
    backgroundColor: '#FFFFFF',
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
  },
  infoTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
    marginTop: 12,
    marginBottom: 8,
  },
  infoDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  currentLanguageBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#E8F5E9',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  currentLanguageLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  currentLanguageFlag: {
    fontSize: 32,
    marginRight: 12,
  },
  currentLanguageLabel: {
    fontSize: 12,
    color: '#2E7D32',
    fontWeight: '600',
    marginBottom: 2,
  },
  currentLanguageName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1B5E20',
  },
  languagesSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  languageCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  languageCardSelected: {
    borderColor: '#4285F4',
    backgroundColor: '#F0F8FF',
  },
  flag: {
    fontSize: 40,
    marginRight: 16,
  },
  languageInfo: {
    flex: 1,
  },
  languageName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    marginBottom: 4,
  },
  languageNativeName: {
    fontSize: 14,
    color: '#666',
  },
  selectedIndicator: {
    marginLeft: 12,
  },
  noteSection: {
    flexDirection: 'row',
    backgroundColor: '#FFF9E6',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#FFB300',
  },
  noteContent: {
    flex: 1,
    marginLeft: 12,
  },
  noteTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000',
    marginBottom: 4,
  },
  noteText: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
});

export default LanguageScreen;
