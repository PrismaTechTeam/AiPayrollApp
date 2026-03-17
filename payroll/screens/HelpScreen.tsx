/**
 * Help & Support Screen
 * FAQ with expandable accordion items
 */

import React, { useState } from 'react';
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

interface FAQItem {
  id: string;
  question: string;
  answer: string;
}

const FAQ_DATA: FAQItem[] = [
  {
    id: '1',
    question: 'How do I submit a leave request?',
    answer: 'To submit a leave request, go to the Home screen, tap on "Leave Application" card, fill in the leave type, start date, end date, and any additional notes. Then tap the "Submit Leave Request" button. Your HR/Owner will be notified and can approve or reject your request.',
  },
  {
    id: '2',
    question: 'How can I check my attendance?',
    answer: 'Tap on the "Attendance" card from the Home screen. You\'ll see a scrollable date selector at the top showing the current week. Select any date to view attendance records for that day. Tap on any member card to see detailed check-in and check-out times.',
  },
  {
    id: '3',
    question: 'How do I view my payslip?',
    answer: 'If you\'re an employee, tap on "My Payslip" from the Home screen to view your latest payslip details. If you\'re an owner/HR, you can access "Payslip Management" to view and manage all employee payslips.',
  },
  {
    id: '4',
    question: 'How do I switch between Employee and Owner roles?',
    answer: 'Tap the hamburger menu (☰) at the top left of the screen. Under the "SWITCH ROLE" section, tap on the role button showing your current role. A modal will appear with available roles. Select the role you want to switch to, and the app will update to show features specific to that role.',
  },
  {
    id: '5',
    question: 'How can I submit a request?',
    answer: 'From the Home screen, tap on "Request Application" (for employees) or "Request Approval" (for owners/HR). If you\'re an employee, tap the "+" button to create a new request. Select the request type, enter dates, add notes, and submit. Your HR/Owner will receive the request for approval.',
  },
  {
    id: '6',
    question: 'How do I approve or reject requests?',
    answer: 'As an owner/HR, go to "Request Approval" or "Leave Approval" from the Home screen. You\'ll see a list of pending requests. Tap the green checkmark (✓) to approve or the red X (✗) to reject any request. You can also tap on a request card to view full details before making a decision.',
  },
  {
    id: '7',
    question: 'How can I change my password?',
    answer: 'Go to the hamburger menu (☰) → Settings → Change Password. Enter your current password, then your new password twice to confirm. Tap "Update Password" to save the changes.',
  },
  {
    id: '8',
    question: 'What should I do if I forgot my password?',
    answer: 'On the login screen, tap "Forgot Password?" below the password field. Enter your registered email address, and you\'ll receive a password reset link. Follow the instructions in the email to create a new password.',
  },
  {
    id: '9',
    question: 'How do I update my profile information?',
    answer: 'Tap the hamburger menu (☰) → Profile. Here you can view your profile information, current role, and email. To update details, tap the "Edit Profile" button and make your changes, then save.',
  },
  {
    id: '10',
    question: 'Who can I contact for technical support?',
    answer: 'For technical support or questions not covered in this FAQ, please email support@payroll.com or call our helpdesk at 1-800-PAYROLL (1-800-729-7655) during business hours (9 AM - 6 PM, Monday to Friday).',
  },
];

export const HelpScreen: React.FC = () => {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const [expandedId, setExpandedId] = useState<string | null>('1'); // First item expanded by default

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />
      
      {/* Header */}
      <SafeAreaView style={styles.safeAreaTop} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Help & Support</Text>
          <View style={{ width: 40 }} />
        </View>
      </SafeAreaView>

      {/* FAQ List */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {FAQ_DATA.map((item) => {
          const isExpanded = expandedId === item.id;
          
          return (
            <View key={item.id} style={styles.faqCard}>
              <TouchableOpacity
                style={styles.faqHeader}
                onPress={() => toggleExpand(item.id)}
                activeOpacity={0.7}
              >
                <Text style={styles.question}>{item.question}</Text>
                <View style={styles.iconButton}>
                  <MaterialCommunityIcons
                    name={isExpanded ? 'chevron-down' : 'chevron-right'}
                    size={24}
                    color="#FFFFFF"
                  />
                </View>
              </TouchableOpacity>

              {isExpanded && (
                <View style={styles.answerContainer}>
                  <Text style={styles.answer}>{item.answer}</Text>
                </View>
              )}
            </View>
          );
        })}

        {/* Contact Section */}
        <View style={styles.contactSection}>
          <MaterialCommunityIcons name="help-circle-outline" size={48} color={colors.primary} />
          <Text style={styles.contactTitle}>Still need help?</Text>
          <Text style={styles.contactText}>
            Get in touch with us through any of the following channels.
          </Text>

          {/* Contact Dealer */}
          <TouchableOpacity style={styles.contactCard}>
            <View style={[styles.contactIconContainer, { backgroundColor: colors.primary }]}>
              <MaterialCommunityIcons name="phone-outline" size={24} color="#FFFFFF" />
            </View>
            <View style={styles.contactInfo}>
              <Text style={styles.contactLabel}>Contact Your Dealer</Text>
              <Text style={styles.contactValue}>+1 (800) 123-4567</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={24} color={colors.textTertiary} />
          </TouchableOpacity>

          {/* Contact HR */}
          <TouchableOpacity style={styles.contactCard}>
            <View style={[styles.contactIconContainer, { backgroundColor: '#34A853' }]}>
              <MaterialCommunityIcons name="account-tie-outline" size={24} color="#FFFFFF" />
            </View>
            <View style={styles.contactInfo}>
              <Text style={styles.contactLabel}>Contact Your HR</Text>
              <Text style={styles.contactValue}>+1 (800) 765-4321</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={24} color={colors.textTertiary} />
          </TouchableOpacity>

          {/* Email Support */}
          <TouchableOpacity style={styles.contactCard}>
            <View style={[styles.contactIconContainer, { backgroundColor: '#EA4335' }]}>
              <MaterialCommunityIcons name="email-outline" size={24} color="#FFFFFF" />
            </View>
            <View style={styles.contactInfo}>
              <Text style={styles.contactLabel}>Email Support</Text>
              <Text style={styles.contactValue}>support@payroll.com</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={24} color={colors.textTertiary} />
          </TouchableOpacity>
        </View>
      </ScrollView>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  faqCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
  },
  faqHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  question: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginRight: 12,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  answerContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 0,
  },
  answer: {
    fontSize: 14,
    lineHeight: 22,
    color: colors.textSecondary,
  },
  contactSection: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 24,
    marginTop: 12,
    alignItems: 'center',
  },
  contactTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  contactText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9F9F9',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 12,
    width: '100%',
  },
  contactIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  contactInfo: {
    flex: 1,
  },
  contactLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  contactValue: {
    fontSize: 14,
    color: colors.textSecondary,
  },
});

export default HelpScreen;
