import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { listMyTeams } from '../api/teams';
import { getUser, type ClubUser } from '../api/users';
import { useAuth } from '../auth/AuthContext';
import { canEditOrDeleteUser } from '../auth/permissions';
import {
  Button,
  InfoRow,
  List,
  MailLink,
  Screen,
  SectionLabel,
  SkeletonList,
  TelLink,
} from '../components/ui';
import { errorText, viewerFromSession } from '../components/users/userHelpers';
import type { AppStackParamList } from '../navigation/types';
import { colors, spacing } from '../theme';

type Props = NativeStackScreenProps<AppStackParamList, 'PlayerView'>;

/**
 * A player's details, read only (issue #117). Tapping a player lands here first,
 * so nothing is changed by mistake. "Redigera" opens Spelarprofil, the edit form.
 */
export default function PlayerViewScreen({ navigation, route }: Props) {
  const { userId } = route.params;
  const session = useAuth().session;

  const [player, setPlayer] = useState<ClubUser | null>(null);
  // Teams the logged-in coach trains. Only fetched for a COACH.
  const [myTeamIds, setMyTeamIds] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);

  const isCoach = session?.roleName === 'COACH';

  const load = useCallback(() => {
    let active = true;
    // If this fails the coach just sees no "Redigera"; the details still show.
    const myTeams = isCoach ? listMyTeams().catch(() => []) : Promise.resolve([]);
    Promise.all([getUser(userId), myTeams])
      .then(([user, teams]) => {
        if (!active) return;
        setPlayer(user);
        setMyTeamIds(teams.map((team) => team.id));
        setError(null);
      })
      .catch((e) => {
        if (active) setError(errorText(e));
      });
    return () => {
      active = false;
    };
  }, [userId, isCoach]);

  // Reload when coming back from Spelarprofil, where the player may have been edited.
  useFocusEffect(load);

  const viewer = viewerFromSession(session);
  const canEdit =
    viewer != null &&
    player != null &&
    canEditOrDeleteUser({ ...viewer, teamIds: myTeamIds }, player);

  const goBack = () => navigation.goBack();

  if (!player) {
    return (
      <Screen title="Spelare" onBack={goBack}>
        {error ? (
          <Text style={[styles.error, styles.pad]}>{error}</Text>
        ) : (
          <View style={styles.info}>
            <SkeletonList rows={5} />
          </View>
        )}
      </Screen>
    );
  }

  return (
    <Screen
      title={player.name}
      onBack={goBack}
      right={
        canEdit ? (
          <Button
            title="Redigera"
            variant="link"
            onPress={() => navigation.navigate('PlayerProfile', { userId: player.id })}
          />
        ) : undefined
      }
    >
      <View style={styles.info}>
        <List>
          <InfoRow label="Namn" value={player.name} />
          <InfoRow label="Lag" value={player.teamName ?? '–'} />
          <InfoRow
            label="Tröjnummer"
            value={player.playerNumber == null ? '–' : String(player.playerNumber)}
          />
          <InfoRow
            label="Telefon"
            value={player.mobilePhoneNumber ? <TelLink phone={player.mobilePhoneNumber} /> : '–'}
          />
          <InfoRow label="E-post" value={<MailLink email={player.email} />} />
        </List>
      </View>

      {player.parentId != null ? (
        <>
          <SectionLabel title="Förälder" />
          <List>
            <InfoRow label="Namn" value={player.parentName ?? '–'} />
            <InfoRow
              label="Telefon"
              value={
                player.parentMobilePhoneNumber ? (
                  <TelLink phone={player.parentMobilePhoneNumber} />
                ) : (
                  '–'
                )
              }
            />
          </List>
        </>
      ) : null}

      {error ? <Text style={[styles.error, styles.pad]}>{error}</Text> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  info: { paddingTop: spacing.lg, paddingBottom: spacing.lg },
  pad: { padding: spacing.page },
  error: { color: colors.warning },
});
