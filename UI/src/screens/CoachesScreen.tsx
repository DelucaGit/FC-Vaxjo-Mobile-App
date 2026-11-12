import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { listMyCoaches, type MyCoach } from '../api/my';
import { getUserById } from '../api/users';
import { useAuth } from '../auth/AuthContext';
import { ChildPicker, useChildPicker } from '../components/schedule/ChildPicker';
import {
  Empty,
  List,
  MailLink,
  Row,
  RowTitle,
  Screen,
  SectionLabel,
  SkeletonList,
  TelLink,
  useRefresh,
} from '../components/ui';
import { colors, spacing, type } from '../theme';

type Data = { teamName: string | null; coaches: MyCoach[] };

/**
 * "Tränare" for PLAYER and PARENT (spec section 7, ADR 0009): who coaches the
 * team, with phone and e-mail links. A parent with several children picks one.
 */
export default function CoachesScreen() {
  const { session } = useAuth();
  const picker = useChildPicker(session?.roleName);
  const isParent = session?.roleName === 'PARENT';
  const userId = session?.userId;
  const child = picker.child;

  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);

  // A parent without children has no team to ask about.
  const noChild = isParent && !picker.loading && child == null;

  /**
   * `isActive` lets the effect ignore an answer for a child that is no longer chosen.
   * Written with .then (not async/await) so the lint rule can see that setState runs later.
   */
  const load = useCallback(
    (isActive: () => boolean = () => true) => {
      if (picker.loading || noChild) {
        return Promise.resolve();
      }
      // /api/my/coaches has no team name. A parent has it on the child; a player
      // reads it from their own user (GET /api/users/{own id} is allowed).
      const teamName: Promise<string | null> = isParent
        ? Promise.resolve(child?.teamName ?? null)
        : userId != null
          ? // The label is a nice-to-have: without it the coaches still show.
            getUserById(userId)
              .then((me) => me.teamName)
              .catch(() => null)
          : Promise.resolve(null);
      return Promise.all([teamName, listMyCoaches(child?.id)])
        .then(([name, coaches]) => {
          if (!isActive()) return;
          setData({ teamName: name, coaches });
          setError(null);
        })
        .catch((e: unknown) => {
          if (isActive()) setError(e instanceof Error ? e.message : 'Något gick fel');
        });
    },
    [picker.loading, noChild, isParent, child, userId],
  );

  useEffect(() => {
    let active = true;
    void load(() => active);
    return () => {
      active = false;
    };
  }, [load]);
  // Pulling the list down runs the same load again.
  const refresh = useRefresh(load);

  const shownError = picker.error ?? error;
  const coaches = noChild ? [] : data?.coaches;

  return (
    <Screen title="Tränare" refresh={refresh}>
      <ChildPicker state={picker} />
      {shownError ? <Text style={styles.error}>{shownError}</Text> : null}
      {!shownError && coaches === undefined ? <SkeletonList rows={2} /> : null}
      {!shownError && coaches && coaches.length === 0 ? <Empty text="Inga tränare" /> : null}
      {!shownError && data && coaches && coaches.length > 0 ? (
        <>
          {data.teamName ? <SectionLabel title={data.teamName} /> : null}
          <List>
            {coaches.map((coach) => (
              <Row key={coach.id} testID={`coach-${coach.id}`}>
                <RowTitle>{coach.name ?? '–'}</RowTitle>
                {coach.mobilePhoneNumber ? <TelLink phone={coach.mobilePhoneNumber} /> : null}
                {coach.email ? <MailLink email={coach.email} /> : null}
              </Row>
            ))}
          </List>
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  error: { ...type.meta, color: colors.warning, padding: spacing.page },
});
