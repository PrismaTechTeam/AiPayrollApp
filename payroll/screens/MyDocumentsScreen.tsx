/**
 * My Documents — what the employee owes the company, and where each one stands.
 *
 * The screen answers one question first: is there anything for me to do? The
 * header says how many rows are the employee's problem, the summary card how
 * far along the checklist is, and the groups under it put those rows at the top
 * and push "provided" and "not required" out of the way. A flat list ordered by
 * document type would make someone read all eleven rows to find the two that
 * matter.
 *
 * Every count on the screen is taken from the same grouped rows the list shows.
 * The server's actionNeededCount also counts HR-issued documents the employee
 * cannot upload, so using it here made the card say "2 need you" over a list
 * with one row under NEEDS YOUR ATTENTION — and the Home tile say 1.
 *
 * Uploading is refused server-side in two cases that are not the person's fault
 * — employment has ended, or the type is HR-issued. Both are answered here
 * before a file is chosen: the banner and the WITH HR group for the first, the
 * "Issued by HR" line and no upload button for the second. Discovering either by
 * watching an upload fail is the failure this screen is built to avoid.
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
  SheetNote,
  groupOf,
  type DocumentBusy,
  type DocumentGroup,
  type SheetNoteValue,
  type SheetStep,
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
  const [step, setStep] = useState<SheetStep>('detail');
  const [note, setNote] = useState<SheetNoteValue | null>(null);
  const [busy, setBusy] = useState<DocumentBusy>(null);
  const [uploadingFor, setUploadingFor] = useState<{ id: string; name: string } | null>(null);
  const alive = useRef(true);
  // Read synchronously so a double tap cannot start two downloads into the same
  // cache path, or two uploads, before the state update lands.
  const busyRef = useRef(false);
  // Which sheet is up right now, for work that finishes after the person moved on.
  const openRowRef = useRef<string | null>(null);
  openRowRef.current = openRowId;

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

  /**
   * Rows split into their sections once, and every number on the screen counted
   * from the same split, so the header, the bar and the list cannot disagree.
   */
  const { sections, needYou, withHr, requiredWaiting, requiredAction } = useMemo(() => {
    const buckets: Record<DocumentGroup, DocumentRow[]> = {
      action: [], waiting: [], provided: [], notRequired: [],
    };
    let reqWaiting = 0;
    let reqAction = 0;
    (data?.rows ?? []).forEach((row) => {
      const group = groupOf(row, data?.canUpload ?? false);
      buckets[group].push(row);
      if (row.isRequired && group === 'waiting') reqWaiting += 1;
      if (row.isRequired && group === 'action') reqAction += 1;
    });
    return {
      sections: GROUP_ORDER.map((group) => ({ group, rows: buckets[group] })).filter((s) => s.rows.length > 0),
      needYou: buckets.action.length,
      withHr: buckets.waiting.length,
      requiredWaiting: reqWaiting,
      requiredAction: reqAction,
    };
  }, [data]);

  // The open row is looked up by id rather than held as an object, so it follows
  // a refresh instead of showing a stale copy after an upload.
  const openRow = useMemo(
    () => (data?.rows ?? []).find((r) => r.documentTypeId === openRowId) ?? null,
    [data, openRowId],
  );

  // ── Sheet ───────────────────────────────────────────────────────────

  const openSheet = (row: DocumentRow) => {
    setOpenRowId(row.documentTypeId);
    setStep('detail');
    setNote(null);
  };

  const closeSheet = () => {
    setOpenRowId(null);
    setStep('detail');
    setNote(null);
  };

  /**
   * Feedback for work that may outlive the sheet. In the sheet when it is still
   * open on that row; in whichever sheet is open now, naming the document, when
   * the person has moved to another one (a dialog over an open sheet is refused
   * on iOS); and as a dialog only when no sheet is up for it to collide with.
   */
  const report = (row: DocumentRow, value: SheetNoteValue, dialogTitle: string) => {
    if (openRowRef.current === row.documentTypeId) {
      setNote(value);
      return;
    }
    if (openRowRef.current !== null) {
      setNote({ ...value, text: `${row.name}: ${value.text}` });
      return;
    }
    void dialog.notify({
      title: dialogTitle,
      message: value.text,
      tone: value.tone === 'success' ? 'success' : 'danger',
    });
  };

  // ── Actions ─────────────────────────────────────────────────────────

  const chooseSource = () => {
    if (busyRef.current) return;
    setNote(null);
    setStep('source');
  };

  const backToDetail = () => {
    setNote(null);
    setStep('detail');
  };

  const send = async (source: PickSource) => {
    const row = openRow;
    if (!row || busyRef.current) return;
    setNote(null);

    let picked: PickedFile | null;
    try {
      picked = await pickDocumentFile(source);
    } catch (err) {
      setNote({ tone: 'warning', text: serverMessage(err, 'Could not open that. Please try again.') });
      return;
    }
    if (!picked) return;

    // Checked here as a courtesy; the server checks the bytes and is the control.
    const why = rejectionReason(picked);
    if (why) {
      setNote({ tone: 'warning', text: why });
      return;
    }

    busyRef.current = true;
    setBusy('upload');
    setUploadingFor({ id: row.documentTypeId, name: row.name });
    setStep('detail');
    try {
      await documentService.submit(row.documentTypeId, picked);
      await fetch();
      report(row, { tone: 'success', text: 'Sent to HR. It shows as Checking until they look at it.' }, 'Sent to HR');
    } catch (err) {
      report(row, { tone: 'danger', text: serverMessage(err, 'Could not send it. Please try again.') }, 'Could not send it');
    } finally {
      busyRef.current = false;
      setBusy(null);
      setUploadingFor(null);
    }
  };

  const download = async () => {
    const row = openRow;
    const doc = row?.document;
    if (!row || !doc || busyRef.current) return;

    busyRef.current = true;
    setBusy('download');
    setNote(null);
    try {
      await openAttachment(documentService.contentUrl(doc.id), doc.fileName);
    } catch (err) {
      report(row, { tone: 'danger', text: serverMessage(err, 'Could not open the file. Please try again.') }, 'Could not open the file');
    } finally {
      busyRef.current = false;
      setBusy(null);
    }
  };

  const getTemplate = async () => {
    const row = openRow;
    if (!row || busyRef.current) return;

    busyRef.current = true;
    setBusy('template');
    setNote(null);
    try {
      const url = await documentService.getTemplateUrl(row.documentTypeId);
      const opened = await Linking.canOpenURL(url);
      if (!opened) throw new Error('This phone has nothing that can open the form.');
      await Linking.openURL(url);
    } catch (err) {
      report(row, { tone: 'danger', text: serverMessage(err, 'Could not get the blank form. Please try again.') }, 'Could not get the blank form');
    } finally {
      busyRef.current = false;
      setBusy(null);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────

  const subtitle = !data
    ? 'Your documents'
    : needYou > 0
      ? `${needYou} ${needYou === 1 ? 'needs' : 'need'} you`
      : data.requiredCount === 0 && data.rows.length === 0
        ? 'Nothing is required of you'
        : withHr > 0
          ? `Nothing needs you · ${withHr} with HR`
          : 'Nothing needs you';

  // While an upload runs, the open sheet for that row says so in place of any
  // earlier message.
  const sheetNote: SheetNoteValue | null =
    busy === 'upload' && uploadingFor?.id === openRowId
      ? { tone: 'progress', text: 'Sending to HR…' }
      : note;

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
          <View style={styles.headerText}>
            <Text style={styles.headerTitle} numberOfLines={1}>My Documents</Text>
            <Text style={styles.headerSubtitle} numberOfLines={1}>{subtitle}</Text>
          </View>
          <View style={styles.headerSpacer} />
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
              {/* "100% · 0 of 0" over an empty list contradicts itself; with
                  nothing required there is nothing to measure. */}
              {load.data.requiredCount > 0 ? (
                <ComplianceSummary
                  percent={load.data.compliancePercent}
                  required={load.data.requiredCount}
                  satisfied={load.data.satisfiedCount}
                  waiting={requiredWaiting}
                  actionNeeded={requiredAction}
                />
              ) : null}

              {load.data.notice ? (
                <View style={styles.gap}>
                  <NoticeBanner message={load.data.notice} />
                </View>
              ) : null}

              {/* The sheet was closed mid-upload: the list still says it is going. */}
              {uploadingFor && uploadingFor.id !== openRowId ? (
                <SheetNote tone="progress" text={`Sending ${uploadingFor.name} to HR…`} />
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
                      {rows.map((row, i) => (
                        <DocumentRowItem
                          key={row.documentTypeId}
                          row={row}
                          group={group}
                          onPress={() => openSheet(row)}
                          last={i === rows.length - 1}
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
        step={step}
        busy={busy}
        note={sheetNote}
        onClose={closeSheet}
        onUpload={chooseSource}
        onBack={backToDetail}
        onPick={(source) => { void send(source); }}
        onDownload={() => { void download(); }}
        onTemplate={() => { void getTemplate(); }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F6F8FF' },
  flex: { flex: 1 },

  // Back arrow, centred title, and a spacer the same width as the arrow: the
  // title is centred on the screen and a long subtitle truncates instead of
  // running under the arrow.
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 6, paddingBottom: 10 },
  back: { width: 40, height: 44, alignItems: 'flex-start', justifyContent: 'center' },
  headerText: { flex: 1, alignItems: 'center' },
  headerSpacer: { width: 40 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: C.ink },
  headerSubtitle: { fontSize: 13, color: C.body, marginTop: 1 },

  scroll: { paddingHorizontal: 20, paddingBottom: 24 },
  gap: { marginTop: 12 },
  section: { marginTop: 16 },
});

export default MyDocumentsScreen;
