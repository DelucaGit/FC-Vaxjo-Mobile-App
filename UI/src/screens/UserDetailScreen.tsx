import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  Button,
  Confirm,
  InfoRow,
  List,
  MailLink,
  Row,
  RowTitle,
  Screen,
  SelectField,
  SkeletonList,
  TelLink,
} from '../components/ui';
import { errorText, viewerFromSession } from '../components/users/userHelpers';
import { CreatedAccounts } from '../components/players/CreatedAccounts';
import { changeUserRole, getUser, resetPassword, type ClubUser } from '../api/users';
import { useAuth } from '../auth/AuthContext';
import {
  assignableRoles,
  canChangeRole,
  canMakeCoach,
  canResetPassword,
} from '../auth/permissions';
import { roleLabel, type ClubRoleName } from '../auth/roles';
import type { AppStackParamList } from '../navigation/types';
import { colors, spacing } from '../theme';

type Props = NativeStackScreenProps<AppStackParamList, 'UserDetail'>;

const ROLE_CHANGE_WARNING = 'Tröjnummer, lag och förälder tas bort.';
const RESET_WARNING = 'Det gamla lösenordet slutar fungera direkt.';

/**
 * "Användardetalj" (spec section 7): Ordförande, Admin.
 * Everyone is shown read-only. A player gets a row that opens Spelarprofil,
 * where editing and removing happen. Role changes always ask first.
 */
export default function UserDetailScreen({ navigation, route }: Props) {
  const { userId } = route.params;
  const viewer = viewerFromSession(useAuth().session);

  const [user, setUser] = useState<ClubUser | null>(null);
  const [error, setError] = useState<string | null>(null);
  // The role waiting for "Bekräfta" in the dialog. null: no dialog.
  const [pendingRole, setPendingRole] = useState<ClubRoleName | null>(null);
  const [saving, setSaving] = useState(false);
  // "Återställ lösenord": the dialog, then the new password, shown once.
  const [confirmReset, setConfirmReset] = useState(false);
  const [newPassword, setNewPassword] = useState<string | null>(null);

  const load = useCallback(() => {
    let active = true;
    getUser(userId)
      .then((next) => {
        if (active) {
          setUser(next);
          setError(null);
        }
      })
      .catch((e) => {
        if (active) {
          setError(errorText(e));
        }
      });
    return () => {
      active = false;
    };
  }, [userId]);

  // Reload when coming back from Spelarprofil, where the player may have been edited.
  useFocusEffect(load);

  async function confirmRole() {
    if (!pendingRole) {
      return;
    }
    const role = pendingRole;
    setPendingRole(null);
    setSaving(true);
    setError(null);
    try {
      await changeUserRole(userId, role);
      load();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setSaving(false);
    }
  }

  async function confirmPasswordReset() {
    setConfirmReset(false);
    setSaving(true);
    setError(null);
    try {
      const result = await resetPassword(userId);
      setNewPassword(result.temporaryPassword);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setSaving(false);
    }
  }

  const goBack = () => navigation.goBack();

  if (user && newPassword) {
    // "Klar" forgets the password, so it is never shown again.
    return (
      <CreatedAccounts
        title="Nytt lösenord"
        accounts={[{ name: user.name, temporaryPassword: newPassword }]}
        onDone={() => setNewPassword(null)}
      />
    );
  }

  if (!user || !viewer) {
    return (
      <Screen title="Användare" onBack={goBack}>
        {error ? <Text style={[styles.error, styles.pad]}>{error}</Text> : null}
        {!user && !error ? <SkeletonList rows={5} /> : null}
      </Screen>
    );
  }

  const isPlayer = user.roleName === 'PLAYER';
  const showMakeCoach = canMakeCoach(viewer, user);
  const showChangeRole = canChangeRole(viewer, user);
  // An inactive account answers 404, so the button is hidden for it.
  const showResetPassword = user.active && canResetPassword(viewer, user);
  const roleOptions = assignableRoles(viewer.role).map((role) => ({
    label: roleLabel(role),
    value: role,
  }));

  return (
    <Screen title={user.name} onBack={goBack}>
      <View style={styles.info}>
        <List>
          <InfoRow label="Namn" value={user.name} />
          <InfoRow label="E-post" value={<MailLink email={user.email} />} />
          <InfoRow
            label="Telefon"
            value={user.mobilePhoneNumber ? <TelLink phone={user.mobilePhoneNumber} /> : '–'}
          />
          <InfoRow label="Roll" value={roleLabel(user.roleName)} />
          <InfoRow label="Lag" value={user.teamName ?? '–'} />
        </List>
      </View>

      {isPlayer ? (
        <List>
          <Row onPress={() => navigation.navigate('PlayerProfile', { userId: user.id })}>
            <RowTitle>Redigera spelare</RowTitle>
          </Row>
        </List>
      ) : null}

      {showMakeCoach || showChangeRole || showResetPassword || error ? (
        <View style={[styles.actions, styles.pad]}>
          {showChangeRole ? (
            <SelectField
              label="Ändra roll"
              value={user.roleName as ClubRoleName}
              options={roleOptions}
              disabled={saving}
              onChange={(role) => {
                if (role !== user.roleName) {
                  setPendingRole(role);
                }
              }}
            />
          ) : null}
          {showMakeCoach ? (
            <Button
              title="Gör till tränare"
              variant="secondary"
              disabled={saving}
              onPress={() => setPendingRole('COACH')}
              block
            />
          ) : null}
          {showResetPassword ? (
            <Button
              title="Återställ lösenord"
              variant="secondary"
              disabled={saving}
              onPress={() => setConfirmReset(true)}
              block
            />
          ) : null}
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </View>
      ) : null}

      <Confirm
        visible={pendingRole != null}
        title={
          pendingRole === 'COACH' && isPlayer
            ? 'Gör till tränare?'
            : `Ändra roll till ${roleLabel(pendingRole)}?`
        }
        message={ROLE_CHANGE_WARNING}
        confirmLabel="Bekräfta"
        onConfirm={confirmRole}
        onCancel={() => setPendingRole(null)}
      />

      <Confirm
        visible={confirmReset}
        title={`Återställ lösenord för ${user.name}?`}
        message={RESET_WARNING}
        confirmLabel="Återställ"
        onConfirm={confirmPasswordReset}
        onCancel={() => setConfirmReset(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  info: { paddingTop: spacing.lg, paddingBottom: spacing.lg },
  pad: { padding: spacing.page },
  actions: { gap: spacing.md },
  error: { color: colors.warning },
});
