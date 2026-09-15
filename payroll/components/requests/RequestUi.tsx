/**
 * The pieces the four request screens share: the status pill, the file row, and
 * the "add a file" control. One place, so the employee's view of an attachment
 * and HR's view of the same attachment cannot drift apart.
 */
import React, { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { AUTH_COLORS as C } from '../auth/AuthBackdrop';
import type { IconName } from '../auth/PrimaryButton';
import type { RequestAttachment } from '../../api/services/requestService';
import { formatBytes, iconForFile, MAX_FILE_BYTES, ALLOWED_LABEL, type PickSource } from '../../lib/requestAttachments';

// ── Status ────────────────────────────────────────────────────────────

export type RequestStatus = 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export const STATUS_LOOK: Record<RequestStatus, { label: string; bg: string; fg: string; icon: IconName }> = {
  DRAFT: { label: 'Draft', bg: '#EEF2F7', fg: '#64748B', icon: 'file-edit-outline' },
  PENDING: { label: 'Pending', bg: '#FFF4E5', fg: '#B45309', icon: 'clock-outline' },
  APPROVED: { label: 'Approved', bg: '#DCFCE7', fg: '#15803D', icon: 'check' },
  REJECTED: { label: 'Rejected', bg: '#FEE2E2', fg: '#B91C1C', icon: 'close' },
  CANCELLED: { label: 'Cancelled', bg: '#EEF2F7', fg: '#64748B', icon: 'minus' },
};

export function statusOf(raw: string | null | undefined): RequestStatus {
  const key = (raw ?? '').toUpperCase();
  return (key in STATUS_LOOK ? key : 'PENDING') as RequestStatus;
}

export const StatusPill: React.FC<{ status: string; large?: boolean }> = ({ status, large = false }) => {
  const look = STATUS_LOOK[statusOf(status)];
  return (
    <View style={[styles.pill, large && styles.pillLarge, { backgroundColor: look.bg }]}>
      <MaterialCommunityIcons name={look.icon} size={large ? 16 : 13} color={look.fg} />
      <Text style={[styles.pillText, large && styles.pillTextLarge, { color: look.fg }]}>{look.label}</Text>
    </View>
  );
};

// ── Dates ─────────────────────────────────────────────────────────────

/** Server timestamps are UTC; some arrive without a zone marker. */
export function parseDate(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const withZone = /[zZ]|[+-]\d{2}:\d{2}$/.test(iso) ? iso : `${iso}Z`;
  const d = new Date(withZone);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function shortDate(iso: string | null | undefined): string {
  const d = parseDate(iso);
  return d ? d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
}

export function dateAndTime(iso: string | null | undefined): string {
  const d = parseDate(iso);
  return d ? d.toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : '';
}

/** A start date arrives as a plain YYYY-MM-DD and must not be shifted by a zone. */
export function plainDate(value: string | null | undefined): string {
  if (!value) return '—';
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return shortDate(value);
  const d = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

// ── Attachments ───────────────────────────────────────────────────────

export const AttachmentRow: React.FC<{
  file: RequestAttachment;
  onOpen: () => void | Promise<void>;
  onRemove?: () => void | Promise<void>;
  last?: boolean;
}> = ({ file, onOpen, onRemove, last = false }) => {
  const [busy, setBusy] = useState(false);
  const fromHr = file.uploadedByRole === 'HR';

  const open = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await onOpen();
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={[styles.fileRow, !last && styles.fileDivider]}>
      <TouchableOpacity style={styles.fileMain} onPress={open} activeOpacity={0.7} accessibilityRole="button">
        <View style={[styles.fileIcon, fromHr && styles.fileIconHr]}>
          <MaterialCommunityIcons name={iconForFile(file.fileName)} size={22} color={fromHr ? '#7C3AED' : C.blue} />
        </View>
        <View style={styles.fileText}>
          <Text style={styles.fileName} numberOfLines={1}>{file.fileName}</Text>
          <Text style={styles.fileMeta} numberOfLines={1}>
            {formatBytes(file.fileSizeBytes)}
            {file.uploadedByName ? ` · ${file.uploadedByName}` : ''}
          </Text>
        </View>
        {busy ? (
          <ActivityIndicator size="small" color={C.blue} />
        ) : (
          <MaterialCommunityIcons name="tray-arrow-down" size={20} color={C.muted} />
        )}
      </TouchableOpacity>
      {onRemove ? (
        <TouchableOpacity
          onPress={() => { void onRemove(); }}
          style={styles.fileRemove}
          accessibilityRole="button"
          accessibilityLabel={`Remove ${file.fileName}`}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <MaterialCommunityIcons name="close" size={18} color={C.danger} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
};

/** The dashed "attach a file" target, with the rules written under it. */
export const AttachButton: React.FC<{
  onPress: () => void;
  busy?: boolean;
  disabled?: boolean;
  label?: string;
}> = ({ onPress, busy = false, disabled = false, label = 'Add a file' }) => (
  <TouchableOpacity
    onPress={onPress}
    disabled={busy || disabled}
    activeOpacity={0.7}
    style={[styles.attach, (busy || disabled) && styles.attachDisabled]}
    accessibilityRole="button"
  >
    {busy ? (
      <ActivityIndicator size="small" color={C.blue} />
    ) : (
      <MaterialCommunityIcons name="paperclip" size={20} color={C.blue} />
    )}
    <View style={styles.attachText}>
      <Text style={styles.attachTitle}>{busy ? 'Uploading…' : label}</Text>
      <Text style={styles.attachHint}>{ALLOWED_LABEL}, up to {formatBytes(MAX_FILE_BYTES)}</Text>
    </View>
  </TouchableOpacity>
);

export const EmptyLine: React.FC<{ children: string }> = ({ children }) => (
  <Text style={styles.empty}>{children}</Text>
);

/**
 * Where the file comes from. Three plain rows rather than the OS action sheet,
 * which on Android is an Alert and looks like a different app.
 */
export const PickSourceSheet: React.FC<{
  visible: boolean;
  onClose: () => void;
  onPick: (source: PickSource) => void;
}> = ({ visible, onClose, onPick }) => {
  const options: { key: PickSource; icon: IconName; title: string; hint: string }[] = [
    { key: 'camera', icon: 'camera-outline', title: 'Take a photo', hint: 'Use the camera now' },
    { key: 'library', icon: 'image-outline', title: 'Choose a photo', hint: 'From your gallery' },
    { key: 'document', icon: 'file-document-outline', title: 'Choose a document', hint: 'PDF, Word or Excel' },
  ];

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.sheetBackdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Dismiss" />
        <View style={styles.sheet}>
          <Text style={styles.sheetTitle}>Attach a file</Text>
          {options.map((o, index) => (
            <TouchableOpacity
              key={o.key}
              style={[styles.sheetRow, index < options.length - 1 && styles.fileDivider]}
              onPress={() => onPick(o.key)}
              activeOpacity={0.7}
              accessibilityRole="button"
            >
              <View style={styles.fileIcon}>
                <MaterialCommunityIcons name={o.icon} size={22} color={C.blue} />
              </View>
              <View style={styles.fileText}>
                <Text style={styles.fileName}>{o.title}</Text>
                <Text style={styles.fileMeta}>{o.hint}</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={22} color={C.muted} />
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.sheetCancel} onPress={onClose} accessibilityRole="button">
            <Text style={styles.sheetCancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  pill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999 },
  pillLarge: { paddingHorizontal: 14, paddingVertical: 7, gap: 6 },
  pillText: { fontSize: 12, fontWeight: '700' },
  pillTextLarge: { fontSize: 14 },

  fileRow: { flexDirection: 'row', alignItems: 'center' },
  fileDivider: { borderBottomWidth: 1, borderBottomColor: C.line },
  fileMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  fileIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#E8F0FE', justifyContent: 'center', alignItems: 'center' },
  fileIconHr: { backgroundColor: '#F1EAFE' },
  fileText: { flex: 1 },
  fileName: { fontSize: 14, fontWeight: '700', color: C.ink },
  fileMeta: { fontSize: 12, color: C.body, marginTop: 2 },
  fileRemove: { width: 36, height: 36, borderRadius: 10, backgroundColor: C.dangerBg, justifyContent: 'center', alignItems: 'center', marginLeft: 8 },

  attach: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#C9DAF8',
    borderRadius: 16,
    backgroundColor: '#F8FBFF',
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  attachDisabled: { opacity: 0.5 },
  attachText: { flex: 1 },
  attachTitle: { fontSize: 14, fontWeight: '700', color: C.blue },
  attachHint: { fontSize: 12, color: C.body, marginTop: 2 },

  empty: { fontSize: 13, color: C.muted, paddingVertical: 8 },

  sheetBackdrop: { flex: 1, backgroundColor: 'rgba(15,27,45,0.45)', justifyContent: 'flex-end', padding: 16 },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 10,
    shadowColor: C.ink,
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 10,
  },
  sheetTitle: { fontSize: 18, fontWeight: '800', color: C.ink, marginBottom: 6 },
  sheetRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13 },
  sheetCancel: { height: 48, justifyContent: 'center', alignItems: 'center', marginTop: 6 },
  sheetCancelText: { fontSize: 15, fontWeight: '700', color: C.body },
});
