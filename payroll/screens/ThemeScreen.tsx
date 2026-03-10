/**
 * Theme Screen
 * Allows users to change app theme
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
import { useTheme, ThemeMode } from '../context/ThemeContext';

interface ThemeOption {
  id: ThemeMode;
  title: string;
  description: string;
  icon: string;
  previewColors: {
    background: string;
    surface: string;
    primary: string;
    text: string;
  };
}

const THEME_OPTIONS: ThemeOption[] = [
  {
    id: 'light',
    title: 'Light Mode',
    description: 'Classic bright appearance with light backgrounds',
    icon: 'white-balance-sunny',
    previewColors: {
      background: '#F5F5F5',
      surface: '#FFFFFF',
      primary: '#4285F4',
      text: '#000000',
    },
  },
  {
    id: 'dark',
    title: 'Dark Mode',
    description: 'Easy on the eyes in low-light environments',
    icon: 'weather-night',
    previewColors: {
      background: '#121212',
      surface: '#1E1E1E',
      primary: '#64B5F6',
      text: '#FFFFFF',
    },
  },
  {
    id: 'contrast',
    title: 'High Contrast',
    description: 'Maximum readability with enhanced contrast',
    icon: 'circle-half-full',
    previewColors: {
      background: '#000000',
      surface: '#1A1A1A',
      primary: '#FFEB3B',
      text: '#FFFFFF',
    },
  },
];

export const ThemeScreen: React.FC = () => {
  const navigation = useNavigation();
  const { theme, setTheme, colors } = useTheme();

  const handleThemeSelect = (selectedTheme: ThemeMode) => {
    setTheme(selectedTheme);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar
        barStyle={colors.statusBarStyle}
        backgroundColor={colors.statusBarColor}
      />
      
      {/* Header */}
      <SafeAreaView style={[styles.safeAreaTop, { backgroundColor: colors.surface }]} edges={['top']}>
        <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.borderLight }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Theme</Text>
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
          <View style={[styles.infoSection, { backgroundColor: colors.surface }]}>
            <MaterialCommunityIcons name="palette-outline" size={32} color={colors.primary} />
            <Text style={[styles.infoTitle, { color: colors.text }]}>Choose Your Theme</Text>
            <Text style={[styles.infoDescription, { color: colors.textSecondary }]}>
              Customize the appearance of the app to suit your preference and environment.
            </Text>
          </View>

          {/* Theme Options */}
          {THEME_OPTIONS.map((option) => {
            const isSelected = theme === option.id;
            
            return (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.themeCard,
                  { backgroundColor: colors.card, borderColor: colors.border },
                  isSelected && { borderColor: colors.primary, borderWidth: 2 },
                ]}
                onPress={() => handleThemeSelect(option.id)}
                activeOpacity={0.7}
              >
                {/* Theme Icon and Info */}
                <View style={styles.themeHeader}>
                  <View
                    style={[
                      styles.iconContainer,
                      { backgroundColor: isSelected ? colors.primary + '20' : colors.background },
                    ]}
                  >
                    <MaterialCommunityIcons
                      name={option.icon as any}
                      size={32}
                      color={isSelected ? colors.primary : colors.icon}
                    />
                  </View>

                  <View style={styles.themeInfo}>
                    <View style={styles.themeTitleRow}>
                      <Text style={[styles.themeTitle, { color: colors.text }]}>
                        {option.title}
                      </Text>
                      {isSelected && (
                        <View style={[styles.selectedBadge, { backgroundColor: colors.primary }]}>
                          <MaterialCommunityIcons name="check" size={16} color="#FFFFFF" />
                        </View>
                      )}
                    </View>
                    <Text style={[styles.themeDescription, { color: colors.textSecondary }]}>
                      {option.description}
                    </Text>
                  </View>
                </View>

                {/* Color Preview */}
                <View style={styles.previewContainer}>
                  <Text style={[styles.previewLabel, { color: colors.textTertiary }]}>
                    Preview:
                  </Text>
                  <View style={styles.colorPreviews}>
                    <View style={styles.colorPreviewItem}>
                      <View
                        style={[
                          styles.colorBox,
                          { backgroundColor: option.previewColors.background },
                        ]}
                      />
                      <Text style={[styles.colorLabel, { color: colors.textTertiary }]}>BG</Text>
                    </View>
                    <View style={styles.colorPreviewItem}>
                      <View
                        style={[
                          styles.colorBox,
                          { backgroundColor: option.previewColors.surface },
                        ]}
                      />
                      <Text style={[styles.colorLabel, { color: colors.textTertiary }]}>
                        Surface
                      </Text>
                    </View>
                    <View style={styles.colorPreviewItem}>
                      <View
                        style={[
                          styles.colorBox,
                          { backgroundColor: option.previewColors.primary },
                        ]}
                      />
                      <Text style={[styles.colorLabel, { color: colors.textTertiary }]}>
                        Primary
                      </Text>
                    </View>
                    <View style={styles.colorPreviewItem}>
                      <View
                        style={[
                          styles.colorBox,
                          { backgroundColor: option.previewColors.text },
                        ]}
                      />
                      <Text style={[styles.colorLabel, { color: colors.textTertiary }]}>Text</Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}

          {/* Additional Info */}
          <View style={[styles.tipSection, { backgroundColor: colors.surface }]}>
            <MaterialCommunityIcons name="lightbulb-outline" size={20} color={colors.warning} />
            <View style={styles.tipContent}>
              <Text style={[styles.tipTitle, { color: colors.text }]}>Tip</Text>
              <Text style={[styles.tipText, { color: colors.textSecondary }]}>
                Your theme preference is saved automatically and will be applied across the app.
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
  },
  safeAreaTop: {},
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
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
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 20,
  },
  infoSection: {
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 24,
  },
  infoTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 12,
    marginBottom: 8,
  },
  infoDescription: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  themeCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
  },
  themeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  themeInfo: {
    flex: 1,
  },
  themeTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  themeTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  selectedBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  themeDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  previewContainer: {
    marginTop: 8,
  },
  previewLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  colorPreviews: {
    flexDirection: 'row',
    gap: 12,
  },
  colorPreviewItem: {
    alignItems: 'center',
  },
  colorBox: {
    width: 48,
    height: 48,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  colorLabel: {
    fontSize: 10,
    marginTop: 4,
  },
  tipSection: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  tipContent: {
    flex: 1,
    marginLeft: 12,
  },
  tipTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  tipText: {
    fontSize: 13,
    lineHeight: 18,
  },
});

export default ThemeScreen;
