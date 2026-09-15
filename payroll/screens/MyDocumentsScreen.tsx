/**
 * My Documents — what the employee owes the company, and where each one stands.
 *
 * The screen answers one question first: is there anything for me to do? The
 * summary card says how far along the checklist is and how many rows are the
 * employee's problem rather than HR's; the groups under it put those rows at the
 * top and push "provided" and "not required" out of the way. A flat list ordered
 * by document type would make someone read all eleven rows to find the two that
 * matter.
 *
 * Uploading is refused server-side in two cases that are not the person's fault
 * — employment has ended, or the type is HR-issued. Both are answered here
 * before a file is chosen: the banner for the first, a hidden button and a plain
 * sentence for the second. Discovering either by watching an upload fail is the
 * failure this screen is built to avoid.
 */
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  Linking,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import AuthBackdrop, { AUTH_COLORS as C } from '../components/auth/AuthBackdrop';
import { useDialog } from '../components/ui/AppDialog';
import documentService, { DocumentChecklist, DocumentRow } from '../api/services/documentService';
import { openAttachment } from '../lib/downloadAttachment';
import { pickDocumentFile, rejectionReason, type PickSource, type PickedFile } from '../lib/complianceFiles';
import { serverMessage } from '../lib/serverMessage';
import {
  Busy,
  ComplianceSummary,
  DocumentPanel,
  DocumentRowItem,
  DocumentSheet,
  DocumentState,
  GROUP_TITLE,
  GroupHeading,
  NoticeBanner,
  SourceSheet,
  groupOf,
  type DocumentGroup,
} from '../components/documents/DocumentUi';

type Load =
  | { kind: 'loading' }
  | { kind: 'ready'; data: DocumentChecklist }
  | { kind: 'failed'; message: string };

/** Sections in the order they appear — the employee's own work first. */
const GROUP_ORDER: DocumentGroup[] = ['action', 'waiting', 'provided', 'notRequired'];

export const MyDocumentsScreen: React.FC = () => {
  const navigation = useNavigation();
  const dialog = useDialog();

  const [load, setLoad] = useState<Load>({ kind: 'loading' });
  const [refreshing, setRefreshing] = useState(false);
  const [openRowId, setOpenRowId] = useState<string | null>(null);
  const [pickingFor, setPickingFor] = useState<DocumentRow | null>(null);
  const [uploading, setUploading] = useState(false);
  const alive = useRef(true);

  const fetch = useCallback(async () => {
    try {
      const data = await documentService.getChecklist();
      if (!alive.current) return;
      setLoad({ kind: 'ready', data });
    } catch (err) {
      if (!alive.current) return;
      setLoad({ kind: 'failed', message: serverMessage(err, 'Could not load your documents.') });
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      alive.current = true;
      void fetch();
      return () => {
        alive.current = false;
      };
    }, [fetch]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetch();
    if (alive.current) setRefreshing(false);
  }, [fetch]);

  const data = load.kind === 'ready' ? load.data : null;

  /** Rows split into their sections once, rather than filtered four times per render. */
  const sections = useMemo(() => {
    const buckets: Record<DocumentGroup, DocumentRow[]> = {
      action: [], waiting: [], provided: [], notRequired: [],
    };
    (data?.rows ?? []).forEach((row) => buckets[groupOf(row)].push(row));
    return GROUP_ORDER.map((group) => ({ group, rows: buckets[group] })).filter((s) => s.rows.length > 0);
  }, [data]);

  // The open row is looked up by id rather than held as an object, so it follows
  // a refresh instead of showing a stale copy after an upload.
  const openRow = useMemo(
    () => (data?.rows ?? []).find((r) => r.documentTypeId === openRowId) ?? null,
    [data, openRowId],
  );

  // ── Actions ─────────────────────────────────────────────────────────

  const startUpload = (row: DocumentRow) => {
    setOpenRowId(null);
    setPickingFor(row);
  };

  const send = async (source: PickSource) => {
    const row = pickingFor;
    setPickingFor(null);
    if (!row) return;

    let picked: PickedFile | null;
    try {
      picked = await pickDocumentFile(source);
    } catch (err) {
      await dialog.notify({
        title: 'Cannot open the picker',
        message: serverMessage(err, 'Please try again.'),
        tone: 'warning',
      });
      return;
    }
    if (!picked) return;

    // Checked here as a courtesy; the server checks the bytes and is the control.
    const why = rejectionReason(picked);
    if (why) {
      await dialog.notify({ title: 'That file cannot be used', message: why, tone: 'warning' });
      return;
    }

    setUploading(true);
    try {
      await documentService.submit(row.documentTypeId, picked);
      await fetch();
      await dialog.notify({
        title: 'Sent to HR',
        message: `${row.name} is with HR now. You will see it here once they have checked it.`,
        tone: 'success',
      });
    } catch (err) {
      await dialog.notify({
        title: 'Could not send it',
        message: serverMessage(err, 'Please try again.'),
        tone: 'danger',
      });
    } finally {
      if (alive.current) setUploading(false);
    }
  };

  const download = async (row: DocumentRow) => {
    const doc = row.document;
    if (!doc) return;
    try {
      await openAttachment(documentService.contentUrl(doc.id), doc.fileName);
    } catch (err) {
      await dialog.notify({
        title: 'Could not open the file',
        message: serverMessage(err, 'Please try again.'),
        tone: 'danger',
      });
    }
  };

  const getTemplate = async (row: DocumentRow) => {
    try {
      const url = await documentService.getTemplateUrl(row.documentTypeId);
      const opened = await Linking.canOpenURL(url);
      if (!opened) throw new Error('This phone has nothing that can open the form.');
      await Linking.openURL(url);
    } catch (err) {
      await dialog.notify({
        title: 'Could not get the blank form',
        message: serverMessage(err, 'Please try again.'),
        tone: 'danger',
      });
    }
  };

  // ── Render ──────────────────────────────────────────────────────────

  const subtitle = data
    ? data.requiredCount === 0
      ? 'Nothing is required of you'
      : `${data.satisfiedCount} of ${data.requiredCount} provided`
    : 'What HR needs from you';

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <AuthBackdrop scriptLines={[]} />

      <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.back}
            accessibilityRole="button"
            accessibilityLabel="Back"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MaterialCommunityIcons name="arrow-left" size={26} color={C.ink} />
          </TouchableOpacity>
          <View style={styles.headerText} pointerEvents="none">
            <Text style={styles.headerTitle}>My Documents</Text>
            <Text style={styles.headerSubtitle}>{subtitle}</Text>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.blue} colors={[C.blue]} />
          }
        >
          {load.kind === 'loading' ? (
            <Busy />
          ) : load.kind === 'failed' ? (
            <DocumentState
              icon="cloud-off-outline"
              title="Could not load your documents"
              body={load.message}
              tone="danger"
              onRetry={() => void onRefresh()}
            />
          ) : (
            <>
              <ComplianceSummary
                percent={load.data.compliancePercent}
                required={load.data.requiredCount}
                satisfied={load.data.satisfiedCount}
                pending={load.data.pendingReviewCount}
                actionNeeded={load.data.actionNeededCount}
              />

              {load.data.notice ? (
                <View style={styles.gap}>
                  <NoticeBanner message={load.data.notice} />
                </View>
              ) : null}

              {sections.length === 0 ? (
                <DocumentState
                  icon="folder-open-outline"
                  title="No documents are set up yet"
                  body="HR has not asked you for anything. Anything they need will appear here."
                />
              ) : (
                sections.map(({ group, rows }) => (
                  <View key={group} style={styles.section}>
                    <GroupHeading title={GROUP_TITLE[group]} count={rows.length} />
                    <DocumentPanel>
                      {rows.map((row, index) => (
                        <DocumentRowItem
                          key={row.documentTypeId}
                          row={row}
                          onPress={() => setOpenRowId(row.documentTypeId)}
                          last={index === rows.length - 1}
                        />
                      ))}
                    </DocumentPanel>
                  </View>
                ))
              )}
            </>
          )}
        </ScrollView>
      </SafeAreaView>

      <DocumentSheet
        row={openRow}
        canUpload={data?.canUpload ?? false}
        uploading={uploading}
        onClose={() => setOpenRowId(null)}
        onUpload={() => openRow && startUpload(openRow)}
        onDownload={() => { if (openRow) void download(openRow); }}
        onTemplate={() => { if (openRow) void getTemplate(openRow); }}
      />

      <SourceSheet
        visible={pickingFor !== null}
        onClose={() => setPickingFor(null)}
        onPick={(source) => { void send(source); }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F6F8FF' },
  flex: { flex: 1 },

  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 14, justifyContent: 'center' },
  back: { width: 40, height: 40, alignItems: 'flex-start', justifyContent: 'center' },
  headerText: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 22, fontWeight: '800', color: C.ink },
  headerSubtitle: { fontSize: 13, color: C.body, marginTop: 2 },

  scroll: { paddingHorizontal: 20, paddingBottom: 40 },
  gap: { marginTop: 14 },
  section: { marginTop: 24 },
});

export default MyDocumentsScreen;
