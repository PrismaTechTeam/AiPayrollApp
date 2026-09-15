/**
 * Company Switcher
 * The pill in the top bar naming the current company. Tapping it lists every
 * company the person belongs to; picking one switches, and "Manage companies"
 * goes to the home list.
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Pressable, ActivityIndicator } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { usePayrollAuth } from '../context/PayrollAuthContext';
import { useDialog } from './ui/AppDialog';
import { AUTH_COLORS as C } from './auth/AuthBackdrop';

function initialsOf(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export const CompanySwitcher: React.FC = () => {
  const { currentCompany, switchCompany, user } = usePayrollAuth();
  const navigation = useNavigation();
  const dialog = useDialog();
  const [open, setOpen] = useState(false);
  const [switchingId, setSwitchingId] = useState<string | null>(null);

  if (!currentCompany) return null;

  const tenants = user?.availableTenants ?? [];

  const pick = async (tenantId: string, tenantName: string) => {
    if (tenantName === currentCompany) {
      setOpen(false);
      return;
    }
    setSwitchingId(tenantId);
    try {
      await switchCompany(tenantId);
      setOpen(false);
    } catch {
      await dialog.notify({ title: 'Could not switch company', message: 'Please try again.', tone: 'danger' });
    } finally {
      setSwitchingId(null);
    }
  };

  return (
    <>
      <TouchableOpacity style={styles.button} onPress={() => setOpen(true)} accessibilityRole="button" accessibilityLabel="Switch company">
        <View style={styles.tile}>
          <Text style={styles.tileText}>{initialsOf(currentCompany)}</Text>
        </View>
        <Text style={styles.name} numberOfLines={1}>{currentCompany}</Text>
        <MaterialCommunityIcons name="chevron-down" size={18} color={C.body} />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" statusBarTranslucent onRequestClose={() => setOpen(false)}>
        <View style={styles.backdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setOpen(false)} accessibilityLabel="Dismiss" />
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Your companies</Text>
              <TouchableOpacity onPress={() => setOpen(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityLabel="Close">
                <MaterialCommunityIcons name="close" size={22} color={C.body} />
              </TouchableOpacity>
            </View>

            {tenants.map((t, index) => {
              const active = t.name === currentCompany;
              const busy = switchingId === t.id;
              return (
                <TouchableOpacity
                  key={t.id}
                  style={[styles.row, index < tenants.length - 1 && styles.rowDivider]}
                  onPress={() => { void pick(t.id, t.name); }}
                  disabled={switchingId !== null}
                  activeOpacity={0.7}
                >
                  <View style={[styles.rowTile, active && styles.rowTileActive]}>
                    <Text style={[styles.rowTileText, active && styles.rowTileTextActive]}>{initialsOf(t.name)}</Text>
                  </View>
                  <View style={styles.rowText}>
                    <Text style={styles.rowName} numberOfLines={1}>{t.name}</Text>
                    <Text style={styles.rowMeta}>{active ? 'Current' : t.role || 'Tap to switch'}</Text>
                  </View>
                  {busy ? (
                    <ActivityIndicator size="small" color={C.blue} />
                  ) : active ? (
                    <MaterialCommunityIcons name="check-circle" size={22} color={C.blue} />
                  ) : null}
                </TouchableOpacity>
              );
            })}

            <TouchableOpacity
              style={styles.manage}
              onPress={() => { setOpen(false); navigation.navigate('TenantHub'); }}
              accessibilityRole="button"
            >
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
    backgroundColor: '#EEF3FB',
    borderRadius: 999,
    paddingLeft: 6,
    paddingRight: 10,
    paddingVertical: 5,
    maxWidth: '100%',
    flexShrink: 1,
  },
  tile: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#D8E6FB', justifyContent: 'center', alignItems: 'center' },
  tileText: { fontSize: 11, fontWeight: '800', color: C.blue },
  name: { flex: 1, fontSize: 13, fontWeight: '700', color: C.ink },

  backdrop: { flex: 1, backgroundColor: 'rgba(15,27,45,0.45)', justifyContent: 'center', padding: 24 },
  sheet: { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 8, paddingTop: 16 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingBottom: 10 },
  sheetTitle: { fontSize: 18, fontWeight: '800', color: C.ink },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, paddingVertical: 12 },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: C.line },
  rowTile: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#EEF3FB', justifyContent: 'center', alignItems: 'center' },
  rowTileActive: { backgroundColor: C.blue },
  rowTileText: { fontSize: 14, fontWeight: '800', color: C.blue },
  rowTileTextActive: { color: '#FFFFFF' },
  rowText: { flex: 1 },
  rowName: { fontSize: 15, fontWeight: '700', color: C.ink },
  rowMeta: { fontSize: 12, color: C.body, marginTop: 2 },
  manage: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, marginTop: 4, borderTopWidth: 1, borderTopColor: C.line },
  manageText: { fontSize: 14, fontWeight: '700', color: C.blue },
});

export default CompanySwitcher;
