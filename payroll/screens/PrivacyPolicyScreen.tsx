/**
 * Privacy Policy.
 *
 * Restyled from the Material prototype onto the app's own surface. The policy
 * text is the employer's legal wording and is reproduced as it stood; only the
 * presentation changed -- numbered sections on white cards instead of a wall of
 * grey paragraphs, so a person looking for one clause can find it.
 *
 * The prototype's contact block named an address, a phone number and a street
 * that belong to nobody. A privacy policy whose "contact us" is invented is the
 * one lie on the page that actually costs someone something -- it is the route
 * a data-subject request has to travel. It has been replaced by the honest
 * answer: the employer is the data controller and is who to write to.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { AUTH_COLORS as C } from '../components/auth/AuthBackdrop';
import { AccountPage, Card } from '../components/account/AccountUi';

interface Section {
  n: string;
  title: string;
  body?: string[];
  bullets?: string[];
  sub?: { title: string; body?: string; bullets?: string[] }[];
}

const SECTIONS: Section[] = [
  {
    n: '',
    title: 'Introduction',
    body: [
      'This Privacy Policy describes how the AiPayroll app collects, uses and shares your personal information when you use it.',
      'Your employer decides what is recorded about you and why. AiPayroll processes that information on their behalf, which makes your employer the data controller and the first place to raise any question about your records.',
    ],
  },
  {
    n: '1',
    title: 'Information We Collect',
    sub: [
      {
        title: 'Personal information',
        body: 'Information provided by you or by your employer, including:',
        bullets: [
          'Name and contact information',
          'Employee ID and department',
          'Email address and phone number',
          'Employment details and job title',
          'Bank account information for payroll',
          'Tax identification numbers',
        ],
      },
      {
        title: 'Collected automatically',
        body: 'When you use the app we also collect:',
        bullets: [
          'Device information (model, OS version)',
          'IP address, and location when you record attendance',
          'App usage statistics',
          'Log data and crash reports',
        ],
      },
    ],
  },
  {
    n: '2',
    title: 'How We Use Your Information',
    body: ['We use the information we collect to:'],
    bullets: [
      'Process payroll and benefits',
      'Manage leave, attendance and claims',
      'Communicate important updates',
      'Improve the service and the experience of using it',
      'Comply with legal obligations',
      'Prevent fraud and keep accounts secure',
    ],
  },
  {
    n: '3',
    title: 'Information Sharing and Disclosure',
    body: ['We do not sell your personal information. We may share it with:'],
    bullets: [
      'Your employer, for payroll processing',
      'Service providers who operate parts of the service for us',
      'Government agencies where the law requires it',
      'Professional advisers such as auditors',
    ],
  },
  {
    n: '4',
    title: 'Data Security',
    body: [
      'We use appropriate technical and organisational measures to protect your information against unauthorised access, alteration, disclosure or destruction. These include:',
    ],
    bullets: [
      'Encryption of sensitive data',
      'Secure authentication, including optional two-factor sign-in',
      'Regular security assessments',
      'Access controls and monitoring',
    ],
  },
  {
    n: '5',
    title: 'Data Retention',
    body: [
      'We keep your personal information for as long as it is needed for the purposes described here, unless a longer period is required or permitted by law. Employment records are commonly kept for a statutory minimum after employment ends.',
    ],
  },
  {
    n: '6',
    title: 'Your Rights',
    body: ['Depending on where you live, you may have the right to:'],
    bullets: [
      'Access your personal information',
      'Correct information that is wrong',
      'Ask for your data to be deleted',
      'Object to certain processing',
      'Ask for your data in a portable form',
      'Withdraw consent you previously gave',
    ],
  },
  {
    n: '7',
    title: 'Cookies and Tracking',
    body: [
      'The app stores a small amount of data on your device so you stay signed in and your preferences survive a restart. It does not use advertising trackers.',
    ],
  },
  {
    n: '8',
    title: "Children's Privacy",
    body: [
      'The app is not intended for anyone under 18 and we do not knowingly collect information from children. If you believe a child has provided us with personal information, tell your employer so it can be removed.',
    ],
  },
  {
    n: '9',
    title: 'Changes to This Policy',
    body: [
      'We may update this policy from time to time. Changes are published on this page, and continuing to use the app after a change means the updated policy applies.',
    ],
  },
];

export const PrivacyPolicyScreen: React.FC = () => (
  <AccountPage title="Privacy Policy" subtitle="What is collected, and why">
    {SECTIONS.map((section) => (
      <Card key={section.title}>
        <View style={styles.head}>
          {section.n ? (
            <View style={styles.number}>
              <Text style={styles.numberText}>{section.n}</Text>
            </View>
          ) : null}
          <Text style={styles.title}>{section.title}</Text>
        </View>

        {section.body?.map((p) => (
          <Text key={p} style={styles.paragraph}>{p}</Text>
        ))}

        {section.bullets ? <Bullets items={section.bullets} /> : null}

        {section.sub?.map((sub) => (
          <View key={sub.title} style={styles.sub}>
            <Text style={styles.subTitle}>{sub.title}</Text>
            {sub.body ? <Text style={styles.paragraph}>{sub.body}</Text> : null}
            {sub.bullets ? <Bullets items={sub.bullets} /> : null}
          </View>
        ))}
      </Card>
    ))}

    <Card>
      <View style={styles.head}>
        <View style={styles.number}>
          <Text style={styles.numberText}>10</Text>
        </View>
        <Text style={styles.title}>Contact</Text>
      </View>
      {/* The employer is the data controller, so a request sent anywhere else
          has to be forwarded to them anyway. Naming a generic mailbox here
          would only add a hop -- and the one the prototype named did not exist. */}
      <Text style={styles.paragraph}>
        Your employer holds and controls your records. Address any question about this policy, any request to see or
        correct your data, and any complaint to whoever handles HR or data protection where you work.
      </Text>
    </Card>

    <View style={styles.consent}>
      <MaterialCommunityIcons name="shield-check-outline" size={22} color="#15803D" />
      <View style={styles.flex}>
        <Text style={styles.consentTitle}>Your consent</Text>
        <Text style={styles.consentText}>
          By using this app you agree to your information being collected and used as described above.
        </Text>
      </View>
    </View>
  </AccountPage>
);

const Bullets: React.FC<{ items: string[] }> = ({ items }) => (
  <View style={styles.bullets}>
    {items.map((item) => (
      <View key={item} style={styles.bulletRow}>
        <View style={styles.dot} />
        <Text style={styles.bulletText}>{item}</Text>
      </View>
    ))}
  </View>
);

const styles = StyleSheet.create({
  flex: { flex: 1 },

  head: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  number: {
    minWidth: 28,
    height: 28,
    paddingHorizontal: 6,
    borderRadius: 10,
    backgroundColor: '#E8F0FE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  numberText: { fontSize: 13, fontWeight: '800', color: C.blue },
  title: { flex: 1, fontSize: 17, fontWeight: '800', color: C.ink },

  paragraph: { fontSize: 14, lineHeight: 22, color: C.body, marginBottom: 8 },

  sub: { marginTop: 8 },
  subTitle: { fontSize: 14, fontWeight: '700', color: C.ink, marginBottom: 6 },

  bullets: { marginTop: 2, marginBottom: 4, gap: 7 },
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: C.blue, marginTop: 8 },
  bulletText: { flex: 1, fontSize: 14, lineHeight: 21, color: C.body },

  consent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#F0FBF4',
    borderWidth: 1,
    borderColor: '#CBEFD8',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  consentTitle: { fontSize: 15, fontWeight: '800', color: '#15803D' },
  consentText: { fontSize: 13, lineHeight: 20, color: '#2F6B47', marginTop: 3 },
});

export default PrivacyPolicyScreen;
