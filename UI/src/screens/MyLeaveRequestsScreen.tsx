import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  listMyLeaveRequests,
  withdrawLeaveRequest,
  type LeaveRequest,
} from '../api/leaveRequests';
import { useAuth } from '../auth/AuthContext';
import { ErrorText } from '../components/activities/TrainingForm';
import { LeaveAction } from '../components/home';
import { ChildPicker, useChildPicker } from '../components/schedule/ChildPicker';
import {
  Button,
  Confirm,
  Empty,
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
import { colors, spacing, type } from '../theme';

/** "Orsak: Sjuk", or the own text for Annat: "Orsak: Annat – Kalas hos mormor". */
function reasonLabel(request: LeaveRequest): string {
  const label = LEAVE_REASONS.find((r) => r.value === request.reasonType)?.label ?? '–';
  return request.reasonText ? `Orsak: ${label} – ${request.reasonText}` : `Orsak: ${label}`;
}

/** The response has no activity title, so the row shows the kind and the team. */
function activityTitle(request: LeaveRequest): string {
  const kind = request.activityKind === 'MATCH' ? 'Match' : 'Träning';
  return request.teamName ? `${kind} · ${request.teamName}` : kind;
}

/**
 * "Mina ledighetsbegäran" for PLAYER and PARENT (issue #212): every request with
 * the activity, the orsak and the status. A denied request shows the coach's comment
 * when there is one. A request that is Väntar på svar can be withdrawn after a
 * confirmation. A parent with several children picks one at the top.
 */
export default function MyLeaveRequestsScreen() {
  const { session } = useAuth();
  const picker = useChildPicker(session?.roleName);
  const isParent = session?.roleName === 'PARENT';
  const childId = picker.child?.id;
  const toast = useToast();

  const [requests, setRequests] = useState<LeaveRequest[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toWithdraw, setToWithdraw] = useState<LeaveRequest | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // A parent without children has no requests to show.
  const noChild = isParent && !picker.loading && childId == null;

  const load = useCallback(
    (isActive: () => boolean = () => true) => {
      if (picker.loading || noChild) {
        return Promise.resolve();
      }
      // A player must not send childId; a parent gets only the selected child's.
      return listMyLeaveRequests(childId)
        .then((list) => {
          if (!isActive()) return;
          setRequests(list);
          setError(null);
        })
        .catch((e: unknown) => {
          if (isActive()) setError(e instanceof Error ? e.message : 'Något gick fel');
        });
    },
    [picker.loading, noChild, childId],
  );

  // Reload on focus, so a request sent from "Begär ledigt" shows up at once.
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

  const withdraw = async () => {
    const request = toWithdraw;
    setToWithdraw(null);
    if (!request) return;
    setActionError(null);
    try {
      await withdrawLeaveRequest(request.id);
      setRequests((list) => list?.filter((r) => r.id !== request.id) ?? null);
      toast.show('Begäran är tillbakadragen');
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Något gick fel');
    }
  };

  const shownError = picker.error ?? error;
  const list = noChild ? [] : requests;

  return (
    <Screen title="Mina ledighetsbegäran" refresh={refresh}>
      <ChildPicker state={picker} />
      {shownError ? <Text style={styles.error}>{shownError}</Text> : null}
      <ErrorText message={actionError} />
      {!shownError && list == null ? <SkeletonList rows={2} /> : null}
      {!shownError && list && list.length === 0 ? <Empty text="Inga ledighetsbegäran" /> : null}
      {!shownError && list && list.length > 0 ? (
        <List>
          {list.map((request) => (
            <Row key={request.id} testID={`leave-${request.id}`}>
              <RowTitle>{activityTitle(request)}</RowTitle>
              {request.activityStart ? (
                <RowMeta>{activityDateLabel(request.activityStart)}</RowMeta>
              ) : null}
              <RowMeta>{reasonLabel(request)}</RowMeta>
              <LeaveAction status={request.status} />
              {request.status === 'DENIED' && request.coachNote ? (
                <Text style={styles.note}>{`Tränaren: ${request.coachNote}`}</Text>
              ) : null}
              {request.status === 'PENDING' ? (
                <View style={styles.actions}>
                  <Button
                    title="Dra tillbaka"
                    variant="secondary"
                    onPress={() => setToWithdraw(request)}
                  />
                </View>
              ) : null}
            </Row>
          ))}
        </List>
      ) : null}
      <Confirm
        visible={toWithdraw != null}
        title="Dra tillbaka begäran?"
        message="Tränaren ser den inte längre."
        confirmLabel="Dra tillbaka"
        onConfirm={() => void withdraw()}
        onCancel={() => setToWithdraw(null)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  error: { ...type.meta, color: colors.warning, padding: spacing.page },
  note: { ...type.meta, marginTop: spacing.sm },
  actions: { flexDirection: 'row', marginTop: spacing.sm },
});
