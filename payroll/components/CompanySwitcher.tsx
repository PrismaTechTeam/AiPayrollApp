/**
 * Company Switcher
 * The pill in the top bar naming the current company. Tapping it lists every
 * company the person belongs to; picking one switches, and "Manage companies"
 * goes to the home list.
 *
 * Companies are told apart by id. They were compared by name, so two
 * companies with the same name (a test copy, say) both showed as Current and
 * picking the other one just closed the sheet.
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Pressable, ActivityIndicator, ScrollView } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { usePayrollAuth } from '../context/PayrollAuthContext';
import { useDialog } from './ui/AppDialog';
import { AUTH_COLORS as C } from './auth/AuthBackdrop';
import { serverMessage } from '../lib/serverMessage';
import { isEmployee } from '../constants/userRoles';

function initialsOf(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/** The stored role is a raw database string ("ADMIN_A", "OWNER"); people read one of two words. */
export function roleLabel(role: string | null | undefined): string {
  if (!role) return 'Member';
  return isEmployee(role) ? 'Employee' : 'HR / Admin';
}

export const CompanySwitcher: React.FC = () => {
  const { currentCompany, switchCompany, user } = usePayrollAuth();
  const navigation = useNavigation();
  const dialog = useDialog();
  const [open, setOpen] = useState(false);
  const [switchingId, setSwitchingId] = useState<string | null>(null);

  if (!currentCompany) return null;

  const tenants = user?.availableTenants ?? [];
  const currentId = user?.tenantId ?? null;

  const pick = async (tenantId: string) => {
    if (tenantId === currentId) {
      setOpen(false);
      return;
    }
    setSwitchingId(tenantId);
    try {
      // Home reloads its tiles on its own: its loaders depend on the company id.
      await switchCompany(tenantId);
      setOpen(false);
    } catch (err) {
      await dialog.notify({ title: 'Could not switch company', message: serverMessage(err, 'Please try again.'), tone: 'danger' });
    } finally {
      setSwitchingId(null);
    }
  };

  const manage = () => {
    setOpen(false);
    // Back to the list already at the bottom of the stack rather than a second copy of it on top.
    navigation.navigate('TenantHub', undefined, { pop: true });
  };

  return (
    <>
      <TouchableOpacity
        style={styles.button}
        onPress={() => setOpen(true)}
        hitSlop={{ top: 4, bottom: 4 }}
        accessibilityRole="button"
        accessibilityLabel={`Company: ${currentCompany}. Switch company`}
      >
        <View style={styles.tile}>
          <Text style={styles.tileText}>{initialsOf(currentCompany)}</Text>
        </View>
        <Text style={styles.name} numberOfLines={1} maxFontSizeMultiplier={1.25}>{currentCompany}</Text>
        <MaterialCommunityIcons name="chevron-down" size={18} color={C.body} />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" statusBarTranslucent onRequestClose={() => setOpen(false)}>
        <View style={styles.backdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setOpen(false)} accessibilityLabel="Dismiss" />
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Your companies</Text>
              <TouchableOpacity
                onPress={() => setOpen(false)}
                style={styles.close}
                accessibilityRole="button"
                accessibilityLabel="Close"
              >
                <MaterialCommunityIcons name="close" size={22} color={C.body} />
              </TouchableOpacity>
            </View>

            {/* Scrolls once the list is longer than the sheet, instead of running off the screen. */}
            <ScrollView style={styles.list} bounces={false} showsVerticalScrollIndicator={false}>
              {tenants.map((t, index) => {
                const active = t.id === currentId;
                const busy = switchingId === t.id;
                return (
                  <TouchableOpacity
                    key={t.id}
                    style={[styles.row, index < tenants.length - 1 && styles.rowDivider]}
                    onPress={() => { void pick(t.id); }}
                    disabled={switchingId !== null}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                  >
                    <View style={[styles.rowTile, active && styles.rowTileActive]}>
                      <Text style={[styles.rowTileText, active && styles.rowTileTextActive]}>{initialsOf(t.name)}</Text>
                    </View>
                    <View style={styles.rowText}>
                      <Text style={styles.rowName} numberOfLines={2}>{t.name}</Text>
                      <Text style={styles.rowMeta}>{active ? `${roleLabel(t.role)} · Current` : roleLabel(t.role)}</Text>
                    </View>
                    {busy ? (
                      <ActivityIndicator size="small" color={C.blue} />
                    ) : active ? (
                      <MaterialCommunityIcons name="check-circle" size={22} color={C.blue} />
                    ) : (
                      <MaterialCommunityIcons name="chevron-right" size={22} color={C.muted} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <TouchableOpacity style={styles.manage} onPress={manage} accessibilityRole="button">
              <MaterialCommunityIcons name="view-grid-outline" size={18} color={C.blue} />
              <Text style={styles.manageText}>Manage companies</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    paddingLeft: 5,
    paddingRight: 10,
    paddingVertical: 5,
    minHeight: 38,
    maxWidth: '100%',
    flexShrink: 1,
  },
  // Navy on a pale wash: blue is kept for buttons and the selected state, and this is neither.
  tile: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#EEF3FF', justifyContent: 'center', alignItems: 'center' },
  tileText: { fontSize: 11, fontWeight: '700', color: C.ink },
  name: { flexShrink: 1, fontSize: 13, fontWeight: '700', color: C.ink },

  backdrop: { flex: 1, backgroundColor: 'rgba(15,27,45,0.45)', justifyContent: 'center', padding: 24 },
  sheet: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 8, paddingTop: 12, maxHeight: '80%' },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingLeft: 12, paddingBottom: 4 },
  sheetTitle: { fontSize: 18, fontWeight: '700', color: C.ink },
  close: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  list: { flexGrow: 0 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, paddingVertical: 10, minHeight: 60 },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: C.line },
  rowTile: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#EEF3FF', justifyContent: 'center', alignItems: 'center' },
  rowTileActive: { backgroundColor: C.blue },
  rowTileText: { fontSize: 14, fontWeight: '700', color: C.ink },
  rowTileTextActive: { color: '#FFFFFF' },
  rowText: { flex: 1 },
  rowName: { fontSize: 15, fontWeight: '700', color: C.ink },
  rowMeta: { fontSize: 12, color: C.body, marginTop: 2 },
  manage: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 48, marginTop: 4, borderTopWidth: 1, borderTopColor: C.line },
  manageText: { fontSize: 14, fontWeight: '700', color: C.blue },
});

export default CompanySwitcher;
