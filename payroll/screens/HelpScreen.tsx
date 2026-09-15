/**
 * Help and Support.
 *
 * Rebuilt from the Material prototype, which was wrong twice over. It printed a
 * support address and a helpdesk number that belong to nobody -- a person in
 * trouble would have written to a dead mailbox and waited. And its answers
 * described a hamburger menu, a Settings page and an Edit Profile button that
 * no longer exist, so following them led nowhere.
 *
 * There is no support desk to name, so this page does not invent one. Payroll
 * questions are answered by the employer's own HR, and that is what it says.
 * The answers below describe the navigation the app actually has today: a
 * bottom bar, a quick-access grid, and the person icon for account settings.
 */
import React, { useState } from 'react';
import { LayoutAnimation, Platform, StyleSheet, Text, TouchableOpacity, UIManager, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { AUTH_COLORS as C } from '../components/auth/AuthBackdrop';
import { AccountPage, Card, SectionHeader } from '../components/account/AccountUi';

// Android opts out of layout animation by default; without this the accordion
// snaps open instead of growing.
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface FAQItem {
  id: string;
  question: string;
  answer: string;
}

const FAQ: FAQItem[] = [
  {
    id: 'punch',
    question: 'How do I clock in and out?',
    answer:
      'Tap the round fingerprint button in the middle of the bottom bar. It is the same button for both: if you are not clocked in yet it starts your day, and if you already are it ends it. The Attendance tile on Home shows the month you have built up so far.',
  },
  {
    id: 'leave',
    question: 'How do I apply for leave?',
    answer:
      'Tap Leave in the bottom bar, then the add button to start an application. Pick the leave type, the dates and a reason, and send it. The same screen lists everything you have applied for and how much of each entitlement you have left.',
  },
  {
    id: 'leave-status',
    question: 'How do I know whether my leave was approved?',
    answer:
      'Open Leave from the bottom bar and tap the application. Its status is on the row, and the detail page shows who has approved it so far and who it is waiting on. You also get a notification when a decision is made.',
  },
  {
    id: 'request',
    question: 'How do I submit a request?',
    answer:
      'Tap Requests in the bottom bar, then the add button. Choose the request type, fill in the dates and notes, and attach a file if the type asks for one. Your approver is notified straight away.',
  },
  {
    id: 'payslip',
    question: 'Where is my payslip?',
    answer:
      'Home, then the My Payslip tile. It lists every pay run you have been paid in, newest first; tapping one opens the full payslip, which you can download.',
  },
  {
    id: 'claims',
    question: 'How do I claim an expense?',
    answer:
      'Home, then the My Claims tile. Create a claim, pick the claim type, enter the amount and attach the receipt. Claims without a receipt are usually sent back, so add it before submitting.',
  },
  {
    id: 'documents',
    question: 'What does "needs you" mean on My Documents?',
    answer:
      'It is the number of documents HR is still waiting on from you, or that were sent back or have expired. Open My Documents and the ones you have to act on are grouped at the top.',
  },
  {
    id: 'training',
    question: 'How do I see the training I am required to do?',
    answer:
      'Home, then the My Training tile. It lists every course required of your role, what you have completed, what is outstanding and anything about to expire. Where a session recorded proof of attendance, you can open your certificate from the course.',
  },
  {
    id: 'account',
    question: 'How do I change my password or my details?',
    answer:
      'Tap the person icon at the top right of Home to open Settings. Profile changes your photo and name; Change Password takes your current password and the new one twice. Two-Factor Authentication and the list of devices you are signed in on are on the same page.',
  },
  {
    id: 'forgot',
    question: 'I forgot my password. What now?',
    answer:
      'On the sign-in screen tap "Forgot Password" under the password field and enter your registered email. A reset link is sent to that address. If it does not arrive, check your spam folder before asking for another.',
  },
  {
    id: 'company',
    question: 'How do I switch between companies?',
    answer:
      'Tap the company name at the top of Home. The sheet lists every company you belong to; picking one switches the whole app to it. "Manage companies" at the bottom of that sheet opens the full list, where you can also join another company.',
  },
  {
    id: 'wrong',
    question: 'Something in my payslip or attendance looks wrong.',
    answer:
      'The app shows what your employer has recorded; it cannot change it. Anything that looks wrong -- hours, deductions, leave balance, a missing payslip -- has to be corrected by your own HR or payroll team, who can amend the record at source.',
  },
];

export const HelpScreen: React.FC = () => {
  const [openId, setOpenId] = useState<string | null>(FAQ[0].id);

  const toggle = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpenId(openId === id ? null : id);
  };

  return (
    <AccountPage title="Help" subtitle="Answers to the usual questions">
      <SectionHeader title="Frequently asked" description="Tap a question to read the answer." />

      <Card padded={false}>
        {FAQ.map((item, index) => {
          const open = openId === item.id;
          const last = index === FAQ.length - 1;
          return (
            <View key={item.id} style={!last && styles.divider}>
              <TouchableOpacity
                style={styles.question}
                onPress={() => toggle(item.id)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityState={{ expanded: open }}
              >
                <Text style={[styles.questionText, open && styles.questionTextOpen]}>{item.question}</Text>
                <MaterialCommunityIcons
                  name={open ? 'chevron-up' : 'chevron-down'}
                  size={22}
                  color={open ? C.blue : C.muted}
                />
              </TouchableOpacity>
              {open ? (
                <View style={styles.answer}>
                  <Text style={styles.answerText}>{item.answer}</Text>
                </View>
              ) : null}
            </View>
          );
        })}
      </Card>

      <SectionHeader title="Still stuck?" />
      <Card>
        <View style={styles.helpRow}>
          <View style={styles.helpIcon}>
            <MaterialCommunityIcons name="account-tie-outline" size={22} color={C.blue} />
          </View>
          <View style={styles.flex}>
            <Text style={styles.helpTitle}>Ask your HR team</Text>
            {/* No support address is printed here on purpose. The app is used by
                many employers and none of them share a helpdesk, so any number
                shown would be wrong for almost everyone reading it. */}
            <Text style={styles.helpBody}>
              Your employer holds your payroll records and is the only one who can change them. For anything about your
              pay, leave balance, attendance or documents, speak to whoever handles HR where you work.
            </Text>
          </View>
        </View>
      </Card>
    </AccountPage>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },

  divider: { borderBottomWidth: 1, borderBottomColor: C.line },
  question: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  questionText: { flex: 1, fontSize: 15, fontWeight: '700', color: C.ink, lineHeight: 21 },
  questionTextOpen: { color: C.blue },
  answer: { paddingHorizontal: 18, paddingBottom: 16, marginTop: -2 },
  answerText: { fontSize: 14, lineHeight: 21, color: C.body },

  helpRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  helpIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#E6EEFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  helpTitle: { fontSize: 16, fontWeight: '800', color: C.ink },
  helpBody: { fontSize: 14, lineHeight: 21, color: C.body, marginTop: 6 },
});

export default HelpScreen;
