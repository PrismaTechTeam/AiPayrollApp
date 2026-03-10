/**
 * About Screen
 * App information, version, and credits
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Image,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';

export const AboutScreen: React.FC = () => {
  const navigation = useNavigation();

  const handleOpenLink = (url: string) => {
    Linking.openURL(url).catch(err => console.error('Failed to open URL:', err));
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
          <Text style={styles.headerTitle}>About</Text>
          <View style={{ width: 40 }} />
        </View>
      </SafeAreaView>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* App Logo & Name */}
        <View style={styles.logoSection}>
          <View style={styles.logoContainer}>
            <MaterialCommunityIcons name="briefcase-outline" size={80} color="#4285F4" />
          </View>
          <Text style={styles.appName}>Payroll Mobile App</Text>
          <View style={styles.versionBadge}>
            <Text style={styles.versionText}>Version 1.0.0</Text>
          </View>
          <Text style={styles.tagline}>Employee Management Made Simple</Text>
        </View>

        {/* App Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About This App</Text>
          <Text style={styles.description}>
            Payroll Mobile App is a comprehensive employee management solution designed to streamline 
            your workplace operations. Manage leave requests, track attendance, view payslips, and 
            stay connected with your team—all in one place.
          </Text>
        </View>

        {/* Features */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Key Features</Text>
          <View style={styles.featuresList}>
            <View style={styles.featureItem}>
              <MaterialCommunityIcons name="check-circle" size={20} color="#34A853" />
              <Text style={styles.featureText}>Leave Management & Approval</Text>
            </View>
            <View style={styles.featureItem}>
              <MaterialCommunityIcons name="check-circle" size={20} color="#34A853" />
              <Text style={styles.featureText}>Request Submission & Tracking</Text>
            </View>
            <View style={styles.featureItem}>
              <MaterialCommunityIcons name="check-circle" size={20} color="#34A853" />
              <Text style={styles.featureText}>Payslip Access & Download</Text>
            </View>
            <View style={styles.featureItem}>
              <MaterialCommunityIcons name="check-circle" size={20} color="#34A853" />
              <Text style={styles.featureText}>Attendance Monitoring</Text>
            </View>
            <View style={styles.featureItem}>
              <MaterialCommunityIcons name="check-circle" size={20} color="#34A853" />
              <Text style={styles.featureText}>Role-Based Access Control</Text>
            </View>
            <View style={styles.featureItem}>
              <MaterialCommunityIcons name="check-circle" size={20} color="#34A853" />
              <Text style={styles.featureText}>Multi-Language Support</Text>
            </View>
            <View style={styles.featureItem}>
              <MaterialCommunityIcons name="check-circle" size={20} color="#34A853" />
              <Text style={styles.featureText}>Theme Customization</Text>
            </View>
          </View>
        </View>

        {/* App Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Application Information</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Version</Text>
              <Text style={styles.infoValue}>1.0.0 (Build 100)</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Release Date</Text>
              <Text style={styles.infoValue}>January 2026</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Platform</Text>
              <Text style={styles.infoValue}>iOS & Android</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Size</Text>
              <Text style={styles.infoValue}>45.2 MB</Text>
            </View>
          </View>
        </View>

        {/* Developer Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Developer</Text>
          <View style={styles.developerCard}>
            <View style={styles.developerHeader}>
              <View style={styles.developerIcon}>
                <MaterialCommunityIcons name="account-group" size={32} color="#FFFFFF" />
              </View>
              <View style={styles.developerInfo}>
                <Text style={styles.developerName}>Prisma Tech</Text>
                <Text style={styles.developerRole}>Software Development Company</Text>
              </View>
            </View>
            <Text style={styles.developerDescription}>
              Building innovative solutions for modern workplaces. Committed to excellence 
              in employee management and workplace productivity.
            </Text>
          </View>
        </View>

        {/* Contact Links */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Get In Touch</Text>
          
          <TouchableOpacity
            style={styles.linkCard}
            onPress={() => handleOpenLink('https://www.prismatech.com')}
          >
            <View style={[styles.linkIcon, { backgroundColor: '#4285F4' }]}>
              <MaterialCommunityIcons name="web" size={24} color="#FFFFFF" />
            </View>
            <View style={styles.linkInfo}>
              <Text style={styles.linkLabel}>Website</Text>
              <Text style={styles.linkValue}>www.prismatech.com</Text>
            </View>
            <MaterialCommunityIcons name="open-in-new" size={20} color="#999" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.linkCard}
            onPress={() => handleOpenLink('mailto:support@prismatech.com')}
          >
            <View style={[styles.linkIcon, { backgroundColor: '#EA4335' }]}>
              <MaterialCommunityIcons name="email-outline" size={24} color="#FFFFFF" />
            </View>
            <View style={styles.linkInfo}>
              <Text style={styles.linkLabel}>Email</Text>
              <Text style={styles.linkValue}>support@prismatech.com</Text>
            </View>
            <MaterialCommunityIcons name="open-in-new" size={20} color="#999" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.linkCard}
            onPress={() => handleOpenLink('tel:+18001234567')}
          >
            <View style={[styles.linkIcon, { backgroundColor: '#34A853' }]}>
              <MaterialCommunityIcons name="phone-outline" size={24} color="#FFFFFF" />
            </View>
            <View style={styles.linkInfo}>
              <Text style={styles.linkLabel}>Phone</Text>
              <Text style={styles.linkValue}>+1 (800) 123-4567</Text>
            </View>
            <MaterialCommunityIcons name="open-in-new" size={20} color="#999" />
          </TouchableOpacity>
        </View>

        {/* Legal */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Legal</Text>
          <TouchableOpacity
            style={styles.legalItem}
            onPress={() => navigation.navigate('PrivacyPolicy' as never)}
          >
            <MaterialCommunityIcons name="file-document-outline" size={20} color="#666" />
            <Text style={styles.legalText}>Privacy Policy</Text>
            <MaterialCommunityIcons name="chevron-right" size={20} color="#999" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.legalItem}>
            <MaterialCommunityIcons name="shield-check-outline" size={20} color="#666" />
            <Text style={styles.legalText}>Terms of Service</Text>
            <MaterialCommunityIcons name="chevron-right" size={20} color="#999" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.legalItem}>
            <MaterialCommunityIcons name="license" size={20} color="#666" />
            <Text style={styles.legalText}>Licenses</Text>
            <MaterialCommunityIcons name="chevron-right" size={20} color="#999" />
          </TouchableOpacity>
        </View>

        {/* Copyright */}
        <View style={styles.footer}>
          <Text style={styles.copyright}>© 2026 Prisma Tech</Text>
          <Text style={styles.copyright}>All rights reserved</Text>
        </View>

        <SafeAreaView edges={['bottom']} style={{ paddingBottom: 20 }} />
      </ScrollView>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  logoSection: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 32,
    marginBottom: 20,
  },
  logoContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#E8F0FE',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  appName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
    marginBottom: 12,
  },
  versionBadge: {
    backgroundColor: '#E8F0FE',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 8,
  },
  versionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4285F4',
  },
  tagline: {
    fontSize: 14,
    color: '#666',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    marginBottom: 12,
  },
  description: {
    fontSize: 15,
    lineHeight: 24,
    color: '#666',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
  },
  featuresList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureText: {
    fontSize: 15,
    color: '#333',
    marginLeft: 12,
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  infoLabel: {
    fontSize: 15,
    color: '#666',
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
  },
  divider: {
    height: 1,
    backgroundColor: '#F0F0F0',
  },
  developerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
  },
  developerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  developerIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#4285F4',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  developerInfo: {
    flex: 1,
  },
  developerName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    marginBottom: 4,
  },
  developerRole: {
    fontSize: 14,
    color: '#666',
  },
  developerDescription: {
    fontSize: 14,
    lineHeight: 22,
    color: '#666',
  },
  linkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  linkIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  linkInfo: {
    flex: 1,
  },
  linkLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  linkValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
  },
  legalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  legalText: {
    flex: 1,
    fontSize: 15,
    color: '#333',
    marginLeft: 12,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 20,
    marginTop: 8,
  },
  copyright: {
    fontSize: 13,
    color: '#999',
    marginBottom: 4,
  },
});

export default AboutScreen;
