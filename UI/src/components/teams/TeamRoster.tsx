import { StyleSheet, View } from 'react-native';
import type { ClubUser } from '../../api/users';
import { colors } from '../../theme';
import {
  Button,
  Empty,
  List,
  MailLink,
  Row,
  RowMeta,
  RowTitle,
  SectionLabel,
  TelLink,
} from '../ui';

type Props = {
  coaches: readonly ClubUser[];
  players: readonly ClubUser[];
  onPlayerPress: (player: ClubUser) => void;
  /** Only on Lagsida (Ordförande, Admin). Laget (Tränare) leaves both out. */
  onAddCoach?: () => void;
  onRemoveCoach?: (coach: ClubUser) => void;
};

/**
 * "Tränare" and "Spelare (N)" for one team (spec section 7).
 * Used by Laget and Lagsida; only Lagsida passes the coach buttons.
 */
export function TeamRoster({ coaches, players, onPlayerPress, onAddCoach, onRemoveCoach }: Props) {
  return (
    <View>
      <SectionLabel title="Tränare" actionLabel="Lägg till tränare" onAction={onAddCoach} />
      {coaches.length === 0 ? (
        <Empty text="Inga tränare" />
      ) : (
        <List>
          {coaches.map((coach) => (
            <Row
              key={coach.id}
              right={
                onRemoveCoach ? (
                  <Button title="Ta bort" variant="link" onPress={() => onRemoveCoach(coach)} />
                ) : undefined
              }
            >
              <RowTitle>{coach.name}</RowTitle>
              {coach.mobilePhoneNumber ? <TelLink phone={coach.mobilePhoneNumber} /> : null}
              {coach.email ? <MailLink email={coach.email} /> : null}
            </Row>
          ))}
        </List>
      )}

      <SectionLabel title={`Spelare (${players.length})`} />
      {players.length === 0 ? (
        <Empty text="Inga spelare" />
      ) : (
        <List>
          {players.map((player) => {
            const parent = parentLine(player);
            return (
              <Row
                key={player.id}
                testID={`player-${player.id}`}
                onPress={() => onPlayerPress(player)}
                right={
                  player.playerNumber != null ? (
                    <RowTitle style={styles.number}>{player.playerNumber}</RowTitle>
                  ) : undefined
                }
              >
                <RowTitle>{player.name}</RowTitle>
                {player.mobilePhoneNumber ? <RowMeta>{player.mobilePhoneNumber}</RowMeta> : null}
                {parent ? <RowMeta>{parent}</RowMeta> : null}
              </Row>
            );
          })}
        </List>
      )}
    </View>
  );
}

/** "Förälder namn · telefon · e-post", skipping what the API left empty. */
export function parentLine(player: ClubUser): string {
  return [player.parentName, player.parentMobilePhoneNumber, player.parentEmail]
    .filter((part): part is string => Boolean(part))
    .join(' · ');
}

const styles = StyleSheet.create({
  number: { color: colors.textMuted },
});
