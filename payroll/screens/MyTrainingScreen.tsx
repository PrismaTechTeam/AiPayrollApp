/**
 * My Training — what the company requires of me, and where each course stands.
 *
 * The screen answers one question first: is there anything for me to do? The
 * header says how many courses are the employee's problem, the summary card how
 * far along the checklist is, and the groups under it put the overdue ones at
 * the top and push "completed" and "not required" out of the way. A flat list
 * ordered by course name would make someone read all twelve rows to find the
 * two that matter.
 *
 * Two things this screen deliberately does not do. It does not let anyone book
 * a place -- sessions are arranged by HR and there is no booking endpoint, so
 * offering a button would be theatre. And it does not compute a status from
 * dates: EXPIRING vs EXPIRED vs DUE_SOON comes from the server's resolver,
 * which knows each course's warning window and each person's join-date grace.
 * Recomputing it here would eventually disagree with HR's own screen about
 * whether somebody is compliant.
 */
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { RefreshControl, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import AuthBackdrop, { AUTH_COLORS as C } from '../components/auth/AuthBackdrop';
import { Busy, DocumentState, type SheetNoteValue } from '../components/documents/DocumentUi';
import {
  GROUP_TITLE,
  GroupHeading,
  TrainingPanel,
  TrainingRowItem,
  TrainingSheet,
  TrainingSummary,
  groupOf,
  type TrainingGroup,
} from '../components/training/TrainingUi';
import { useDialog } from '../components/ui/AppDialog';
import trainingService, { TrainingChecklist, TrainingRow } from '../api/services/trainingService';
import { openAttachment } from '../lib/downloadAttachment';
import { serverMessage } from '../lib/serverMessage';

type Load =
  | { kind: 'loading' }
  | { kind: 'ready'; data: TrainingChecklist }
  | { kind: 'failed'; message: string };

/** Sections in the order they appear — the employee's own work first. */
const GROUP_ORDER: TrainingGroup[] = ['action', 'soon', 'done', 'notRequired'];

export const MyTrainingScreen: React.FC = () => {
  const navigation = useNavigation();
  const dialog = useDialog();

  const [load, setLoad] = useState<Load>({ kind: 'loading' });
  const [refreshing, setRefreshing] = useState(false);
  const [openRowId, setOpenRowId] = useState<string | null>(null);
  const [opening, setOpening] = useState(false);
  const [note, setNote] = useState<SheetNoteValue | null>(null);
  const alive = useRef(true);
  const openingRef = useRef(false);
  const openRowRef = useRef<string | null>(null);
  openRowRef.current = openRowId;

  const fetch = useCallback(async () => {
    try {
      const data = await trainingService.getChecklist();
      if (!alive.current) return;
      setLoad({ kind: 'ready', data });
    } catch (err) {
      if (!alive.current) return;
      // The fallback says what to do, not what happened -- the title above it
      // already says what happened, and repeating it verbatim reads as a bug.
      setLoad({ kind: 'failed', message: serverMessage(err, 'Check your connection and try again.') });
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
   * Rows split into their sections once, and the summary's slices counted from
   * the same split over required courses only — the server's own action and
   * expiring counts include optional courses, so they did not add up to the
   * "x of y" beside the bar.
   */
  const { sections, needYou, comingUp, expiring, requiredAction } = useMemo(() => {
    const buckets: Record<TrainingGroup, TrainingRow[]> = {
      action: [], soon: [], done: [], notRequired: [],
    };
    let reqSoon = 0;
    let reqExpiring = 0;
    let reqAction = 0;
    (data?.rows ?? []).forEach((row) => {
      const group = groupOf(row);
      buckets[group].push(row);
      if (!row.isRequired) return;
      if (group === 'soon') reqSoon += 1;
      if (row.status === 'EXPIRING') reqExpiring += 1;
      if (group === 'action') reqAction += 1;
    });
    return {
      sections: GROUP_ORDER.map((group) => ({ group, rows: buckets[group] })).filter((s) => s.rows.length > 0),
      needYou: buckets.action.length,
      comingUp: reqSoon,
      expiring: reqExpiring,
      requiredAction: reqAction,
    };
  }, [data]);

  // The open row is looked up by id rather than held as an object, so it follows
  // a refresh instead of showing a stale copy.
  const openRow = useMemo(
    () => (data?.rows ?? []).find((r) => r.trainingTypeId === openRowId) ?? null,
    [data, openRowId],
  );

  const openSheet = (row: TrainingRow) => {
    setOpenRowId(row.trainingTypeId);
    setNote(null);
  };

  const closeSheet = () => {
    setOpenRowId(null);
    setNote(null);
  };

  const openCertificate = async () => {
    const row = openRow;
    if (!row?.sessionId || openingRef.current) return;
    openingRef.current = true;
    setOpening(true);
    setNote(null);
    try {
      // No extension here on purpose: the scan HR filed may be a PDF or a photo,
      // and the download names the file from what the server sends.
      await openAttachment(
        trainingService.certificateUrl(row.sessionId),
        `${row.code || 'training'} attendance record`,
      );
    } catch (err) {
      const text = serverMessage(err, 'Could not open the attendance record. Please try again.');
      // In the sheet while it is up: on iOS a dialog raised over an open sheet
      // is refused and the failure would say nothing at all.
      if (openRowRef.current === row.trainingTypeId) setNote({ tone: 'danger', text });
      else void dialog.notify({ title: 'Could not open the attendance record', message: text, tone: 'danger' });
    } finally {
      openingRef.current = false;
      if (alive.current) setOpening(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────

  const subtitle = !data
    ? 'Your training'
    : needYou > 0
      ? `${needYou} ${needYou === 1 ? 'needs' : 'need'} you`
      : data.requiredCount === 0
        ? 'Nothing is required of you'
        : `${data.doneCount} of ${data.requiredCount} completed`;

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
            <Text style={styles.headerTitle} numberOfLines={1}>My Training</Text>
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
              title="Could not load your training"
              body={load.message}
              tone="danger"
              onRetry={() => void onRefresh()}
            />
          ) : (
            <>
              {/* "100% · 0 of 0" over "No training is set up yet" contradicts
                  itself; with nothing required there is nothing to measure. */}
              {load.data.requiredCount > 0 ? (
                <TrainingSummary
                  percent={load.data.compliancePercent}
                  required={load.data.requiredCount}
                  done={load.data.doneCount}
                  comingUp={comingUp}
                  expiring={expiring}
                  actionNeeded={requiredAction}
                />
              ) : null}

              {sections.length === 0 ? (
                // Two different facts, two different sentences. "Nobody has set
                // this up" is the company's gap; "none of it applies to you" is
                // a complete and correct answer.
                <DocumentState
                  icon="school-outline"
                  title={load.data.catalogueIsEmpty ? 'No training is set up yet' : 'Nothing is required of you'}
                  body={
                    load.data.catalogueIsEmpty
                      ? 'Your company has not added any training courses. Anything they add will appear here.'
                      : 'None of the courses your company runs apply to your role right now.'
                  }
                />
              ) : (
                sections.map(({ group, rows }) => (
                  <View key={group} style={styles.section}>
                    <GroupHeading title={GROUP_TITLE[group]} count={rows.length} />
                    <TrainingPanel>
                      {rows.map((row, index) => (
                        <TrainingRowItem
                          key={row.trainingTypeId}
                          row={row}
                          onPress={() => openSheet(row)}
                          last={index === rows.length - 1}
                        />
                      ))}
                    </TrainingPanel>
                  </View>
                ))
              )}
            </>
          )}
        </ScrollView>
      </SafeAreaView>

      <TrainingSheet
        row={openRow}
        opening={opening}
        note={note}
        onClose={closeSheet}
        onCertificate={() => { void openCertificate(); }}
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
  section: { marginTop: 16 },
});

export default MyTrainingScreen;
