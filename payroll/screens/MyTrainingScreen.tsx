/**
 * My Training — what the company requires of me, and where each course stands.
 *
 * The screen answers one question first: is there anything for me to do? The
 * summary card says how far along the checklist is and how many rows are
 * overdue; the groups under it put those at the top and push "completed" and
 * "not required" out of the way. A flat list ordered by course name would make
 * someone read all twelve rows to find the two that matter.
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
import { Busy, DocumentState } from '../components/documents/DocumentUi';
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
  const alive = useRef(true);

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

  /** Rows split into their sections once, rather than filtered four times per render. */
  const sections = useMemo(() => {
    const buckets: Record<TrainingGroup, TrainingRow[]> = {
      action: [], soon: [], done: [], notRequired: [],
    };
    (data?.rows ?? []).forEach((row) => buckets[groupOf(row)].push(row));
    return GROUP_ORDER.map((group) => ({ group, rows: buckets[group] })).filter((s) => s.rows.length > 0);
  }, [data]);

  // The open row is looked up by id rather than held as an object, so it follows
  // a refresh instead of showing a stale copy.
  const openRow = useMemo(
    () => (data?.rows ?? []).find((r) => r.trainingTypeId === openRowId) ?? null,
    [data, openRowId],
  );

  const openCertificate = async (row: TrainingRow) => {
    if (!row.sessionId) return;
    setOpening(true);
    try {
      await openAttachment(
        trainingService.certificateUrl(row.sessionId),
        `${row.code || 'training'}-certificate`,
      );
    } catch (err) {
      await dialog.notify({
        title: 'Could not open the certificate',
        message: serverMessage(err, 'Please try again.'),
        tone: 'danger',
      });
    } finally {
      if (alive.current) setOpening(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────

  const subtitle = data
    ? data.requiredCount === 0
      ? 'Nothing is required of you'
      : `${data.doneCount} of ${data.requiredCount} completed`
    : 'What your company asks you to complete';

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
            <Text style={styles.headerTitle}>My Training</Text>
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
              title="Could not load your training"
              body={load.message}
              tone="danger"
              onRetry={() => void onRefresh()}
            />
          ) : (
            <>
              <TrainingSummary
                percent={load.data.compliancePercent}
                required={load.data.requiredCount}
                done={load.data.doneCount}
                expiring={load.data.expiringCount}
                actionNeeded={load.data.actionNeededCount}
              />

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
                          onPress={() => setOpenRowId(row.trainingTypeId)}
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
        onClose={() => setOpenRowId(null)}
        onCertificate={() => { if (openRow) void openCertificate(openRow); }}
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
  section: { marginTop: 24 },
});

export default MyTrainingScreen;
