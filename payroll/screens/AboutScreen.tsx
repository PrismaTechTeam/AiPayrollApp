/**
 * About.
 *
 * Rebuilt from the Material prototype. Every number on the old page was typed
 * in by hand: "Version 1.0.0 (Build 100)" when the build number was 1, a
 * release date, and an install size of "45.2 MB" that nobody measured. A
 * version string that disagrees with the binary is worse than none at all --
 * it is the first thing anyone reports a bug with. Everything here now comes
 * from the manifest the app was actually built with.
 *
 * The feature list lost "Multi-Language Support" and "Theme Customization"
 * along with the two screens that claimed them.
 */
import React from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import Constants from 'expo-constants';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { AUTH_COLORS as C } from '../components/auth/AuthBackdrop';
import { AccountPage, Card, MenuRow, SectionHeader } from '../components/account/AccountUi';
import { useDialog } from '../components/ui/AppDialog';
import type { IconName } from '../components/auth/PrimaryButton';

const FEATURES: { icon: IconName; label: string }[] = [
  { icon: 'fingerprint', label: 'Clock in and out from your phone' },
  { icon: 'calendar-clock-outline', label: 'Leave applications and balances' },
  { icon: 'text-box-outline', label: 'Requests and approvals' },
  { icon: 'wallet-outline', label: 'Payslips you can open and download' },
  { icon: 'receipt-text-outline', label: 'Expense claims with receipts' },
  { icon: 'file-document-outline', label: 'Your document checklist' },
  { icon: 'school-outline', label: 'Training records and certificates' },
];

/**
 * The manifest the running bundle was built from. In Expo Go and in a dev
 * client this is the config being served, which is exactly what you want when
 * someone reports a bug against a build you cannot see.
 */
function buildInfo(): { version: string; build: string; runtime: string } {
  const config = Constants.expoConfig;
  const android = config?.android?.versionCode;
  const ios = config?.ios?.buildNumber;
  return {
    version: config?.version ?? 'unknown',
    build: String(android ?? ios ?? '—'),
    runtime: config?.sdkVersion ?? Constants.expoVersion ?? '—',
  };
}

export const AboutScreen: React.FC = () => {
  const navigation = useNavigation();
  const dialog = useDialog();
  const { version, build, runtime } = buildInfo();

  const open = async (url: string, what: string) => {
    try {
      const can = await Linking.canOpenURL(url);
      if (!can) throw new Error('no handler');
      await Linking.openURL(url);
    } catch {
      await dialog.notify({
        title: `Could not open ${what}`,
        message: 'This phone has nothing set up to open that link.',
        tone: 'warning',
      });
    }
  };

  return (
    <AccountPage title="About" subtitle="What this app is, and which build you have">
      <Card>
        <View style={styles.hero}>
          <View style={styles.logo}>
            <MaterialCommunityIcons name="briefcase-check-outline" size={38} color={C.blue} />
          </View>
          <Text style={styles.name}>
            <Text style={styles.nameAccent}>Ai</Text>Payroll
          </Text>
          <Text style={styles.tagline}>Your workplace, in your pocket</Text>
          <View style={styles.versionPill}>
            <Text style={styles.versionPillText}>
              Version {version} · Build {build}
            </Text>
          </View>
        </View>
      </Card>

      <SectionHeader title="What it does" description="Everything you can do from this app today." />
      <Card>
        {FEATURES.map((f) => (
          <View key={f.label} style={styles.featureRow}>
            <MaterialCommunityIcons name={f.icon} size={20} color={C.blue} />
            <Text style={styles.featureText}>{f.label}</Text>
          </View>
        ))}
      </Card>

      <SectionHeader title="This build" description="Quote these if you report a problem." />
      <Card>
        <Fact label="Version" value={version} />
        <Fact label="Build" value={build} />
        <Fact label="Expo SDK" value={runtime} />
        <Fact label="Package" value={Constants.expoConfig?.android?.package ?? Constants.expoConfig?.ios?.bundleIdentifier ?? '—'} last />
      </Card>

      <SectionHeader title="Who made it" />
      <Card padded={false}>
        <MenuRow
          icon="domain"
          title="Prisma Technology"
          subtitle="prismatechnology.com.my"
          onPress={() => { void open('https://prismatechnology.com.my', 'the website'); }}
        />
        <MenuRow icon="file-lock-outline" title="Privacy Policy" onPress={() => navigation.navigate('PrivacyPolicy')} last />
      </Card>

      <Text style={styles.copyright}>© {new Date().getFullYear()} Prisma Technology</Text>
    </AccountPage>
  );
};

const Fact: React.FC<{ label: string; value: string; last?: boolean }> = ({ label, value, last = false }) => (
  <View style={[styles.fact, !last && styles.factDivider]}>
    <Text style={styles.factLabel}>{label}</Text>
    <Text style={styles.factValue} numberOfLines={1}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  hero: { alignItems: 'center', paddingVertical: 8 },
  logo: {
    width: 76,
    height: 76,
    borderRadius: 24,
    backgroundColor: '#E8F0FE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  name: { fontSize: 24, fontWeight: '800', color: C.ink, marginTop: 14, letterSpacing: -0.4 },
  nameAccent: { color: C.blue },
  tagline: { fontSize: 14, color: C.body, marginTop: 4 },
  versionPill: {
    marginTop: 14,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#EEF3FF',
  },
  versionPillText: { fontSize: 13, fontWeight: '700', color: C.blue },

  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  featureText: { flex: 1, fontSize: 14, color: C.ink },

  fact: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16, paddingVertical: 11 },
  factDivider: { borderBottomWidth: 1, borderBottomColor: C.line },
  factLabel: { fontSize: 14, color: C.body },
  factValue: { flex: 1, fontSize: 14, fontWeight: '700', color: C.ink, textAlign: 'right' },

  copyright: { fontSize: 12, color: C.muted, textAlign: 'center', marginTop: 6, marginBottom: 10 },
});

export default AboutScreen;
