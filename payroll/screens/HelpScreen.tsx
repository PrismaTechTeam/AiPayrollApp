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
 *
 * The questions follow what this person's app actually shows, which depends on
 * two separate things:
 *  - approval rights make someone HR: Home gets the Approvals tiles;
 *  - an employee record makes someone an employee: Punch, their own requests,
 *    leave, payslips and claims. HR linked to a record has both, and Requests
 *    and Leave in the bottom bar open their OWN lists. HR without a record (an
 *    owner added straight to the company) has no Punch and nothing to apply as,
 *    and those two tabs open the approval lists instead.
 * A department approver is an employee who also approves leave, and someone not
 * yet in a company has no bottom bar at all. One list for everyone sent each of
 * them looking for things they do not have.
 *
 * Grouped under short headings, because a linked HR user gets both the HR and
 * the employee questions and one long run of them was hard to scan.
 */
import React, { useMemo, useState } from 'react';
import { LayoutAnimation, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { usePayrollAuth } from '../context/PayrollAuthContext';
import { useApproverAccess } from '../hooks/useApproverAccess';
import { useDepartmentApprover } from '../hooks/useDepartmentApprover';
import { AUTH_COLORS as C } from '../components/auth/AuthBackdrop';
import { AccountPage, Card, SectionLabel } from '../components/account/AccountUi';

interface FAQItem {
  id: string;
  question: string;
  answer: string;
}

interface FAQGroup {
  title: string;
  items: FAQItem[];
}

// In a company the account menu is the Profile tab; before one, it is the
// person icon on the first page. Each answer names the way in this person has.
const ACCOUNT_IN_COMPANY: FAQItem = {
  id: 'account',
  question: 'How do I change my password or photo?',
  answer:
    'Tap Profile in the bottom bar, then your name to change your photo and name. Change Password and Two-Factor are under Security.',
};

const ACCOUNT_NO_COMPANY: FAQItem = {
  id: 'account',
  question: 'How do I change my password or photo?',
  answer:
    'Tap the person icon at the top right of the first page, then your name to change your photo and name. Change Password and Two-Factor are under Security.',
};

const LOST_PHONE: FAQItem = {
  id: 'lost-phone',
  question: 'I lost my phone. What do I do?',
  answer:
    'Sign in on another phone and open Profile > Change Password. After the new password is saved, choose Sign out everywhere; that signs the lost phone out too. Profile > Devices has the same button.',
};

const FORGOT: FAQItem = {
  id: 'forgot',
  question: 'I forgot my password. What now?',
  answer:
    'On the sign-in screen tap Forgot password and enter your registered email. A reset link is sent to that address. If it does not arrive, check your spam folder before asking for another.',
};

const NOTIFICATIONS: FAQItem = {
  id: 'notifications',
  question: 'Where are my notifications?',
  answer:
    'The bell at the top right of Home. A red dot means something is unread, and tapping a notification opens the request, leave or claim it is about.',
};

const COMPANY: FAQItem = {
  id: 'company',
  question: 'How do I switch between companies?',
  answer:
    'Tap the company name at the top of Home. The sheet lists every company you belong to; picking one switches the whole app to it. "Manage companies" at the bottom of that sheet, or the company under Profile, opens the full list, where you can also join another company.',
};

const NO_RECORD: FAQItem = {
  id: 'no-record',
  question: 'Why can I not punch or apply for leave?',
  answer:
    'Your account is not linked to an employee record in this company, so there is nobody to clock in or apply as. Ask your administrator to link it.',
};

const EMPLOYEE: FAQItem[] = [
  {
    id: 'punch',
    question: 'How do I clock in and out?',
    answer:
      'Tap Punch, the round fingerprint button in the middle of the bottom bar. The same button starts your day and ends it. My Attendance on Home shows the month so far.',
  },
  {
    id: 'missed-punch',
    question: 'I forgot to clock in or out.',
    answer:
      'Open My Attendance on Home and tap "Missed a punch? Ask HR". Pick the day and the time you started or finished. HR adds the punch when they approve it.',
  },
  {
    id: 'leave',
    question: 'How do I apply for leave?',
    answer:
      'Tap Leave in the bottom bar, then Apply for Leave. Pick the leave type, the dates and a reason, and send it. The same page shows how much of each type you have left. Tap an application to see who has approved it so far; while it is pending you can withdraw it there.',
  },
  {
    id: 'request',
    question: 'How do I send a request?',
    answer:
      'Tap Requests in the bottom bar, then New request. Choose the type, fill in the details and attach a file if the type asks for one. Your approver is notified straight away.',
  },
  {
    id: 'payslip',
    question: 'Where is my payslip?',
    answer: 'Home, then My Payslip. Tap a month to open the full payslip, which you can download.',
  },
  {
    id: 'claims',
    question: 'How do I claim an expense?',
    answer:
      'Home, then My Claims, then Make a claim. Pick the claim type, enter the amount and attach the receipt. Claims without a receipt are usually sent back.',
  },
  {
    id: 'documents',
    question: 'What does "need you" mean on My Documents?',
    answer:
      'The number of documents HR is still waiting on from you, or that were sent back or have expired. Open My Documents; the ones you have to act on are at the top.',
  },
  {
    id: 'training',
    question: 'Where is my training?',
    answer:
      'Home, then View All, then My Training. It lists the courses your role needs, what you have completed and anything about to expire.',
  },
];

const DEPARTMENT_APPROVER: FAQItem = {
  id: 'dept-approve',
  question: "How do I approve my department's leave?",
  answer:
    'Home shows a Leave Approval row with how many are waiting for you. Open an application and tap Approve or Reject. You decide only the steps that belong to your department, and never your own leave.',
};

const WRONG: FAQItem = {
  id: 'wrong',
  question: 'My payslip or attendance looks wrong.',
  answer:
    'The app shows what your employer has recorded; it cannot change it. Hours, deductions, leave balance or a missing payslip have to be corrected by your HR or payroll team.',
};

/** The HR questions. Without an employee record the Requests and Leave tabs open these same lists. */
function hrItems(linked: boolean): FAQItem[] {
  return [
    {
      id: 'approve',
      question: 'How do I approve or reject?',
      answer:
        'Home shows your approvals (Requests, Leave, Claims) with how many are waiting; you see the ones your role allows. Tap one, then Approve or Reject; rejecting asks for a reason, which the employee sees.' +
        (linked ? '' : ' The Requests and Leave tabs open the same lists.'),
    },
    {
      id: 'behalf',
      question: 'Can I approve for another approver?',
      answer: 'Yes. Tapping Approve on a step that is waiting for another approver approves it on their behalf.',
    },
    {
      id: 'own',
      question: 'Why can I not approve my own request?',
      answer: 'Nobody can approve or reject their own request, leave or claim. Another approver has to decide it.',
    },
    {
      // Employees ask from the app, but the decision is made on the web only.
      id: 'punch-requests',
      question: 'Where do I decide forgotten punches?',
      answer: 'On the web: Attendance > Daily > Punch Requests.',
    },
  ];
}

const NO_COMPANY: FAQItem[] = [
  {
    id: 'join',
    question: 'How do I join my company?',
    answer:
      'On the first page after sign-in, tap Join a company and enter the invitation code from your HR, or scan their QR code. HR then approves your request, and the full app opens once they do.',
  },
  {
    id: 'waiting',
    question: 'My request is still waiting.',
    answer:
      'Only your HR can approve it. The request page checks for a decision every 30 seconds. You can cancel it there and ask another company instead.',
  },
];

export const HelpScreen: React.FC = () => {
  const { authStatus, user } = usePayrollAuth();
  const access = useApproverAccess();
  const { isDepartmentApprover } = useDepartmentApprover();
  const inCompany = authStatus === 'authenticated';
  const hr = inCompany && access.any;
  const linked = !!user?.employeeId;
  // With the company-wide leave right the Leave tile already covers their department.
  const deptApprover = linked && isDepartmentApprover && !access.leave;

  const groups = useMemo<FAQGroup[]>(() => {
    if (!inCompany) {
      return [
        { title: 'Getting started', items: NO_COMPANY },
        { title: 'Account', items: [ACCOUNT_NO_COMPANY, FORGOT] },
      ];
    }
    const ownWork: FAQItem[] = linked
      ? [...EMPLOYEE, ...(deptApprover ? [DEPARTMENT_APPROVER] : []), WRONG]
      : [NO_RECORD];
    const account: FAQItem[] = [NOTIFICATIONS, COMPANY, ACCOUNT_IN_COMPANY, LOST_PHONE, FORGOT];
    if (hr) {
      return [
        { title: 'Approvals', items: hrItems(linked) },
        // Linked HR are employees too; unlinked HR get the one answer why they are not.
        linked ? { title: 'Your own work', items: ownWork } : null,
        { title: 'Account', items: linked ? account : [NO_RECORD, ...account] },
      ].filter((g): g is FAQGroup => g !== null);
    }
    return [
      { title: 'Your work', items: ownWork },
      { title: 'Account', items: account },
    ];
  }, [inCompany, hr, linked, deptApprover]);

  // All closed at first, so as many questions as possible are on one screen.
  const [openId, setOpenId] = useState<string | null>(null);

  const toggle = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpenId(openId === id ? null : id);
  };

  return (
    <AccountPage title="Help">
      {groups.map((group) => (
        <View key={group.title}>
          <SectionLabel>{group.title}</SectionLabel>
          <Card padded={false}>
            {group.items.map((item, index) => {
              const open = openId === item.id;
              const last = index === group.items.length - 1;
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
                      size={20}
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
        </View>
      ))}

      {/* No support address is printed here on purpose. The app is used by
          many employers and none of them share a helpdesk, so any number
          shown would be wrong for almost everyone reading it. HR are the
          people an employee is sent to, so they are pointed one step up. */}
      <View style={styles.helpRow}>
        <MaterialCommunityIcons name="account-tie-outline" size={20} color={C.body} />
        <Text style={styles.helpText}>
          {hr
            ? 'Still stuck? Ask whoever manages AiPayroll for your company.'
            : 'Still stuck? Your HR team holds your records and can help.'}
        </Text>
      </View>
    </AccountPage>
  );
};

const styles = StyleSheet.create({
  divider: { borderBottomWidth: 1, borderBottomColor: C.line },
  question: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 48,
  },
  questionText: { flex: 1, fontSize: 14, fontWeight: '600', color: C.ink, lineHeight: 19 },
  questionTextOpen: { color: C.blue },
  answer: { paddingHorizontal: 16, paddingBottom: 14, marginTop: -2 },
  answerText: { fontSize: 14, lineHeight: 20, color: C.body },

  helpRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 8, paddingVertical: 6 },
  helpText: { flex: 1, fontSize: 13, lineHeight: 18, color: C.body },
});

export default HelpScreen;
