import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyRound, LogOut, type LucideIcon } from 'lucide-react-native';
import { getUserById } from '../api/users';
import { roleLabel } from '../auth/roles';
import { colors, radii, shadows, sizes, spacing, type } from '../theme';

/**
 * "Anna Ek" → "AE", "Anna" → "A". The first letter of the first and the last name,
 * in upper case. Empty text gives an empty string.
 */
export function initialsFor(name: string | null | undefined): string {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return '';
  }
  const first = parts[0][0];
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase();
}

type Props = {
  visible: boolean;
  /** The name to show, or the e-mail when the name is unknown. */
  name: string;
  roleName: string | null | undefined;
  onClose: () => void;
  onChangePassword: () => void;
  onLogout: () => void;
};

/**
 * Prototype `.pmenu`: a card at the top right over a dark layer. Name and role,
 * a line, then "Byt lösenord" and "Logga ut". Pressing the dark layer closes it.
 */
export function ProfileMenu({ visible, name, roleName, onClose, onChangePassword, onLogout }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        testID="profile-menu-scrim"
        accessibilityRole="button"
        accessibilityLabel="Stäng profilmeny"
        onPress={onClose}
        style={styles.scrim}
      />
      <SafeAreaView edges={['top']} pointerEvents="box-none" style={styles.anchor}>
        <View testID="profile-menu" accessibilityLabel="Profil" style={styles.card}>
          <View style={styles.who}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initialsFor(name)}</Text>
            </View>
            <View style={styles.whoText}>
              <Text numberOfLines={1} style={type.heading}>
                {name}
              </Text>
              <Text style={type.meta}>{roleLabel(roleName)}</Text>
            </View>
          </View>
          <View style={styles.divider} />
          <ProfileRow icon={KeyRound} label="Byt lösenord" onPress={onChangePassword} />
          <ProfileRow icon={LogOut} label="Logga ut" onPress={onLogout} />
        </View>
      </SafeAreaView>
    </Modal>
  );
}

function ProfileRow({
  icon: Icon,
  label,
  onPress,
}: {
  icon: LucideIcon;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      <Icon size={sizes.icon - 2} color={colors.text} strokeWidth={1.5} />
      <Text style={[type.body, styles.label]}>{label}</Text>
    </Pressable>
  );
}

/**
 * The login answer has no name, and the API has no "me" endpoint.
 * GET /users/{id} on yourself works for ADMIN, CHAIRMAN and PLAYER;
 * other roles get 403, and then the caller shows the e-mail instead.
 */
export function useOwnName(userId: number | undefined): string | null {
  const [name, setName] = useState<string | null>(null);

  useEffect(() => {
    if (userId == null) {
      return;
    }
    let active = true;
    getUserById(userId)
      .then((user) => {
        if (active) setName(user?.name || null);
      })
      .catch(() => {
        // Not allowed for this role: keep showing the e-mail.
      });
    return () => {
      active = false;
    };
  }, [userId]);

  return name;
}

const AVATAR = 40;

const styles = StyleSheet.create({
  scrim: { ...StyleSheet.absoluteFill, backgroundColor: colors.overlay },
  // Below the top bar, on the right, like the prototype (top 72px, right 12px).
  anchor: { position: 'absolute', top: 0, right: 0, left: 0, alignItems: 'flex-end' },
  card: {
    marginTop: sizes.header + spacing.sm,
    marginRight: spacing.md,
    width: 280,
    maxWidth: '92%',
    padding: 14,
    backgroundColor: colors.surface,
    borderRadius: radii.sheet,
    borderWidth: sizes.divider,
    borderColor: colors.border,
    ...shadows.raised,
  },
  who: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingBottom: spacing.xs },
  whoText: { flex: 1, minWidth: 0 },
  // Prototype `.avatar`: a dark circle with white initials.
  avatar: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: radii.pill,
    backgroundColor: colors.text,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { ...type.rowTitle, color: colors.onPrimary },
  // Prototype `.pdiv`.
  divider: {
    borderTopWidth: sizes.divider,
    borderTopColor: colors.border,
    marginTop: 10,
    marginBottom: 6,
  },
  row: {
    minHeight: sizes.touch,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: radii.control,
  },
  rowPressed: { backgroundColor: colors.background },
  label: { marginLeft: spacing.md },
});
