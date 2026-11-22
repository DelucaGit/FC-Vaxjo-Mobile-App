import { useCallback, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  approveLeaveRequest,
  denyLeaveRequest,
  listLeaveRequests,
  type LeaveRequest,
} from '../api/leaveRequests';
import { ErrorText } from '../components/activities/TrainingForm';
import { LeaveAction } from '../components/home';
import {
  Button,
  Empty,
  Field,
  List,
  Row,
  RowMeta,
  RowTitle,
  Screen,
  SkeletonList,
  useRefresh,
  useToast,
} from '../components/ui';
import { activityDateLabel } from '../lib/dates';
import { LEAVE_REASONS } from '../lib/leave/leaveLabels';
import { colors, radii, shadows, spacing, type } from '../theme';

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : 'Något gick fel';
}

/** "Orsak: Sjuk", or the own text for Annat: "Orsak: Annat – Kalas hos mormor". */
function reasonLabel(request: LeaveRequest): string {
  const label = LEAVE_REASONS.find((r) => r.value === request.reasonType)?.label ?? '–';
  return request.reasonText ? `Orsak: ${label} – ${request.reasonText}` : `Orsak: ${label}`;
}

/** The response has no activity title: "Träning · P12 Alfa · tis 24 nov 17:30". */
function activityLabel(request: LeaveRequest): string {
  const parts = [request.activityKind === 'MATCH' ? 'Match' : 'Träning'];
  if (request.teamName) parts.push(request.teamName);
  if (request.activityStart) parts.push(activityDateLabel(request.activityStart));
  return parts.join(' · ');
}

function firstName(request: LeaveRequest): string {
  return request.playerName?.split(' ')[0] ?? 'spelaren';
}

/**
 * "Ledighetsbegäran" for COACH, CHAIRMAN and ADMIN (issue #214): every request that is
 * Väntar på svar, for the teams the user is responsible for, with the player, the activity
 * and the orsak. Godkänn answers at once (the server marks the player Ledig);
 * Neka asks for an optional comment first. An answered request leaves the list.
 */
export default function LeaveRequestsScreen() {
  const toast = useToast();
  const [requests, setRequests] = useState<LeaveRequest[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  /** The request being answered, so its buttons cannot be pressed twice. */
  const [busyId, setBusyId] = useState<number | null>(null);
  const [toDeny, setToDeny] = useState<LeaveRequest | null>(null);
  const [note, setNote] = useState('');

  const load = useCallback(
    (isActive: () => boolean = () => true) =>
      listLeaveRequests({ status: 'PENDING' })
        .then((list) => {
          if (!isActive()) return;
          setRequests(list);
          setError(null);
        })
        .catch((e: unknown) => {
          if (isActive()) setError(messageOf(e));
        }),
    [],
  );

  // Reload on focus, so a request sent meanwhile shows up when the page is opened again.
  useFocusEffect(
    useCallback(() => {
      let active = true;
      void load(() => active);
      return () => {
        active = false;
      };
    }, [load]),
  );
  const refresh = useRefresh(load);

  /** Sends one answer. On success the request leaves the list; on error the server's message shows. */
  const answer = async (request: LeaveRequest, send: () => Promise<unknown>, done: string) => {
    setActionError(null);
    setBusyId(request.id);
    try {
      await send();
      setRequests((list) => list?.filter((r) => r.id !== request.id) ?? null);
      toast.show(done);
    } catch (e) {
      setActionError(messageOf(e));
    } finally {
      setBusyId(null);
    }
  };

  const approve = (request: LeaveRequest) =>
    void answer(
      request,
      () => approveLeaveRequest(request.id),
      `Ledighet godkänd för ${firstName(request)}`,
    );

  const openDeny = (request: LeaveRequest) => {
    setNote('');
    setToDeny(request);
  };

  const deny = () => {
    const request = toDeny;
    setToDeny(null);
    if (!request) return;
    const comment = note.trim();
    void answer(request, () => denyLeaveRequest(request.id, comment || null), 'Begäran nekad');
  };

  return (
    <Screen title="Ledighetsbegäran" refresh={refresh}>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <ErrorText message={actionError} />
      {!error && requests == null ? <SkeletonList rows={2} /> : null}
      {!error && requests && requests.length === 0 ? (
        <Empty text="Inga ledighetsbegäran väntar på svar" />
      ) : null}
      {!error && requests && requests.length > 0 ? (
        <List>
          {requests.map((request) => (
            <Row key={request.id} testID={`leave-${request.id}`}>
              <RowTitle>{request.playerName ?? '–'}</RowTitle>
              <RowMeta>{activityLabel(request)}</RowMeta>
              <RowMeta>{reasonLabel(request)}</RowMeta>
              <LeaveAction status={request.status} />
              <View style={styles.actions}>
                <Button
                  title="Godkänn"
                  disabled={busyId === request.id}
                  onPress={() => approve(request)}
                />
                <Button
                  title="Neka"
                  variant="danger"
                  disabled={busyId === request.id}
                  onPress={() => openDeny(request)}
                />
              </View>
            </Row>
          ))}
        </List>
      ) : null}

      {/* Neka: the same sheet as Confirm, with a field for the optional comment. */}
      <Modal
        transparent
        visible={toDeny != null}
        animationType="slide"
        onRequestClose={() => setToDeny(null)}
      >
        <View style={styles.sheetRoot}>
          <Pressable
            accessibilityLabel="Stäng"
            style={StyleSheet.absoluteFill}
            onPress={() => setToDeny(null)}
          />
          <View style={styles.sheet}>
            <Text style={type.heading}>
              {toDeny ? `Neka ledighet för ${firstName(toDeny)}?` : ''}
            </Text>
            <Field
              label="Kommentar"
              placeholder="Kort kommentar (frivilligt)"
              value={note}
              onChangeText={setNote}
              autoComplete="off"
            />
            <View style={styles.sheetButtons}>
              <Button title="Neka" variant="danger" onPress={deny} block />
              <Button title="Avbryt" variant="secondary" onPress={() => setToDeny(null)} block />
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  error: { ...type.meta, color: colors.warning, padding: spacing.page },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  sheetRoot: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: spacing.page,
    paddingBottom: spacing.lg,
    backgroundColor: colors.overlay,
  },
  sheet: {
    gap: spacing.sm,
    padding: 20,
    borderRadius: radii.sheet,
    backgroundColor: colors.surface,
    ...shadows.raised,
  },
  sheetButtons: { gap: spacing.sm, marginTop: spacing.sm },
});
