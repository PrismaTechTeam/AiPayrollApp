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
 * One screen, no scrolling: the name and version on one row (no hero block),
 * what the app does, and who made it. The SDK and package id are for
 * developers and are gone; the version line is selectable for bug reports.
 *
 * The feature list lost "Multi-Language Support" and "Theme Customization"
 * along with the two screens that claimed them.
 *
 * Icons are plain grey line icons: blue is for things you can tap, and none
 * of the features listed here is a button.
 */
import React from 'react';
import { Linking, Platform, StyleSheet, Text, View } from 'react-native';
import Constants from 'expo-constants';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { AUTH_COLORS as C } from '../components/auth/AuthBackdrop';
import { AccountPage, Card, MenuRow, SectionLabel } from '../components/account/AccountUi';
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
 * someone reports a bug against a build you cannot see. The build number is
 * the one for the platform in hand: an iPhone reporting Android's versionCode
 * would point at the wrong binary.
 */
function buildInfo(): { version: string; build: string } {
  const config = Constants.expoConfig;
  const build = Platform.OS === 'ios' ? config?.ios?.buildNumber : config?.android?.versionCode;
  return {
    version: config?.version ?? 'unknown',
    build: build != null && String(build) !== '' ? String(build) : '—',
  };
}

export const AboutScreen: React.FC = () => {
  const navigation = useNavigation();
  const dialog = useDialog();
  const { version, build } = buildInfo();

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
    <AccountPage title="About">
      <Card>
        <View style={styles.identity}>
          <View style={styles.logo}>
            <MaterialCommunityIcons name="briefcase-check-outline" size={24} color={C.ink} />
          </View>
          <View style={styles.flex}>
            <Text style={styles.name}>
              <Text style={styles.nameAccent}>Ai</Text>Payroll
            </Text>
            <Text style={styles.version} selectable>
              Version {version} (build {build})
            </Text>
          </View>
        </View>
      </Card>

      <SectionLabel>What it does</SectionLabel>
      <Card>
        {FEATURES.map((f) => (
          <View key={f.label} style={styles.featureRow}>
            <MaterialCommunityIcons name={f.icon} size={18} color={C.body} />
            <Text style={styles.featureText}>{f.label}</Text>
          </View>
        ))}
      </Card>

      <SectionLabel>Who made it</SectionLabel>
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

const styles = StyleSheet.create({
  flex: { flex: 1 },
  identity: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  logo: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  name: { fontSize: 18, fontWeight: '700', color: C.ink, letterSpacing: -0.3 },
  nameAccent: { color: C.blue },
  version: { fontSize: 13, color: C.body, marginTop: 1 },

  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 5 },
  featureText: { flex: 1, fontSize: 14, color: C.ink },

  copyright: { fontSize: 12, color: C.muted, textAlign: 'center', marginTop: 4, marginBottom: 6 },
});

export default AboutScreen;
