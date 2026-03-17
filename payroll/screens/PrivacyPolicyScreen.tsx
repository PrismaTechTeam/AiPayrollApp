/**
 * Privacy Policy Screen
 * Displays the app's privacy policy
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
import { useTheme } from '../context/ThemeContext';

export const PrivacyPolicyScreen: React.FC = () => {
  const navigation = useNavigation();
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />
      
      {/* Header */}
      <SafeAreaView style={styles.safeAreaTop} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Privacy Policy</Text>
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
          {/* Last Updated */}
          <View style={styles.updateBanner}>
            <MaterialCommunityIcons name="calendar-clock" size={20} color={colors.icon} />
            <Text style={styles.updateText}>Last Updated: January 17, 2026</Text>
          </View>

          {/* Introduction */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Introduction</Text>
            <Text style={styles.paragraph}>
              This Privacy Policy describes how Payroll App ("we," "us," or "our") collects, uses, and shares your personal information when you use our mobile application.
            </Text>
            <Text style={styles.paragraph}>
              We are committed to protecting your privacy and ensuring you have a positive experience on our application. This policy outlines our data practices and your rights regarding your personal information.
            </Text>
          </View>

          {/* Information We Collect */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>1. Information We Collect</Text>
            
            <Text style={styles.subsectionTitle}>1.1 Personal Information</Text>
            <Text style={styles.paragraph}>
              We collect information that you provide directly to us, including:
            </Text>
            <View style={styles.bulletList}>
              <Text style={styles.bulletItem}>• Name and contact information</Text>
              <Text style={styles.bulletItem}>• Employee ID and department</Text>
              <Text style={styles.bulletItem}>• Email address and phone number</Text>
              <Text style={styles.bulletItem}>• Employment details and job title</Text>
              <Text style={styles.bulletItem}>• Bank account information for payroll</Text>
              <Text style={styles.bulletItem}>• Tax identification numbers</Text>
            </View>

            <Text style={styles.subsectionTitle}>1.2 Automatically Collected Information</Text>
            <Text style={styles.paragraph}>
              When you use our app, we automatically collect certain information, including:
            </Text>
            <View style={styles.bulletList}>
              <Text style={styles.bulletItem}>• Device information (model, OS version)</Text>
              <Text style={styles.bulletItem}>• IP address and location data</Text>
              <Text style={styles.bulletItem}>• App usage statistics</Text>
              <Text style={styles.bulletItem}>• Log data and crash reports</Text>
            </View>
          </View>

          {/* How We Use Your Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>2. How We Use Your Information</Text>
            <Text style={styles.paragraph}>
              We use the information we collect to:
            </Text>
            <View style={styles.bulletList}>
              <Text style={styles.bulletItem}>• Process payroll and benefits</Text>
              <Text style={styles.bulletItem}>• Manage leave and attendance requests</Text>
              <Text style={styles.bulletItem}>• Communicate important updates</Text>
              <Text style={styles.bulletItem}>• Improve our services and user experience</Text>
              <Text style={styles.bulletItem}>• Comply with legal obligations</Text>
              <Text style={styles.bulletItem}>• Prevent fraud and ensure security</Text>
            </View>
          </View>

          {/* Information Sharing */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>3. Information Sharing and Disclosure</Text>
            <Text style={styles.paragraph}>
              We do not sell your personal information. We may share your information with:
            </Text>
            <View style={styles.bulletList}>
              <Text style={styles.bulletItem}>• Your employer for payroll processing</Text>
              <Text style={styles.bulletItem}>• Service providers who assist us</Text>
              <Text style={styles.bulletItem}>• Government agencies as required by law</Text>
              <Text style={styles.bulletItem}>• Professional advisors (lawyers, auditors)</Text>
            </View>
          </View>

          {/* Data Security */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>4. Data Security</Text>
            <Text style={styles.paragraph}>
              We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction.
            </Text>
            <Text style={styles.paragraph}>
              These measures include:
            </Text>
            <View style={styles.bulletList}>
              <Text style={styles.bulletItem}>• Encryption of sensitive data</Text>
              <Text style={styles.bulletItem}>• Secure authentication protocols</Text>
              <Text style={styles.bulletItem}>• Regular security assessments</Text>
              <Text style={styles.bulletItem}>• Access controls and monitoring</Text>
            </View>
          </View>

          {/* Data Retention */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>5. Data Retention</Text>
            <Text style={styles.paragraph}>
              We retain your personal information for as long as necessary to fulfill the purposes outlined in this Privacy Policy, unless a longer retention period is required or permitted by law.
            </Text>
          </View>

          {/* Your Rights */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>6. Your Rights</Text>
            <Text style={styles.paragraph}>
              Depending on your location, you may have the following rights:
            </Text>
            <View style={styles.bulletList}>
              <Text style={styles.bulletItem}>• Access your personal information</Text>
              <Text style={styles.bulletItem}>• Correct inaccurate information</Text>
              <Text style={styles.bulletItem}>• Request deletion of your data</Text>
              <Text style={styles.bulletItem}>• Object to processing</Text>
              <Text style={styles.bulletItem}>• Request data portability</Text>
              <Text style={styles.bulletItem}>• Withdraw consent</Text>
            </View>
          </View>

          {/* Cookies and Tracking */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>7. Cookies and Tracking Technologies</Text>
            <Text style={styles.paragraph}>
              We use cookies and similar tracking technologies to track activity on our app and store certain information. You can control cookies through your device settings.
            </Text>
          </View>

          {/* Children's Privacy */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>8. Children's Privacy</Text>
            <Text style={styles.paragraph}>
              Our app is not intended for children under the age of 18. We do not knowingly collect personal information from children under 18. If you become aware that a child has provided us with personal information, please contact us.
            </Text>
          </View>

          {/* Changes to Policy */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>9. Changes to This Privacy Policy</Text>
            <Text style={styles.paragraph}>
              We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last Updated" date.
            </Text>
          </View>

          {/* Contact Us */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>10. Contact Us</Text>
            <Text style={styles.paragraph}>
              If you have any questions about this Privacy Policy, please contact us:
            </Text>
            <View style={styles.contactCard}>
              <View style={styles.contactItem}>
                <MaterialCommunityIcons name="email-outline" size={20} color={colors.primary} />
                <Text style={styles.contactText}>privacy@payrollapp.com</Text>
              </View>
              <View style={styles.contactItem}>
                <MaterialCommunityIcons name="phone-outline" size={20} color={colors.primary} />
                <Text style={styles.contactText}>+1 (555) 123-4567</Text>
              </View>
              <View style={styles.contactItem}>
                <MaterialCommunityIcons name="map-marker-outline" size={20} color={colors.primary} />
                <Text style={styles.contactText}>
                  123 Business Street{'\n'}Tech City, TC 12345{'\n'}United States
                </Text>
              </View>
            </View>
          </View>

          {/* Consent */}
          <View style={styles.consentSection}>
            <MaterialCommunityIcons name="shield-check" size={24} color={colors.success} />
            <View style={styles.consentContent}>
              <Text style={styles.consentTitle}>Your Consent</Text>
              <Text style={styles.consentText}>
                By using our app, you consent to the collection and use of information as described in this Privacy Policy.
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
    backgroundColor: colors.background,
  },
  safeAreaTop: {
    backgroundColor: colors.surface,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
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
    color: colors.text,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 20,
  },
  updateBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF9E6',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    gap: 8,
  },
  updateText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  section: {
    backgroundColor: colors.surface,
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  subsectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginTop: 12,
    marginBottom: 8,
  },
  paragraph: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: 12,
  },
  bulletList: {
    marginTop: 8,
    marginBottom: 8,
  },
  bulletItem: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 24,
    paddingLeft: 8,
  },
  contactCard: {
    backgroundColor: '#F8F9FA',
    padding: 16,
    borderRadius: 8,
    marginTop: 12,
    gap: 12,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  contactText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
    flex: 1,
  },
  consentSection: {
    flexDirection: 'row',
    backgroundColor: '#E8F5E9',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  consentContent: {
    flex: 1,
    marginLeft: 12,
  },
  consentTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1B5E20',
    marginBottom: 4,
  },
  consentText: {
    fontSize: 14,
    color: '#2E7D32',
    lineHeight: 20,
  },
});

export default PrivacyPolicyScreen;
