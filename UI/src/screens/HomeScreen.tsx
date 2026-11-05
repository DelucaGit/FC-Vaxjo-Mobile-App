import { useCallback, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useAuth } from '../auth/AuthContext';
import { isMember, isStaff, roleLabel } from '../auth/roles';
import { listMyChildren, listMyTrainings, MyTraining } from '../api/mySchedule';
import { listMyTeams, listTeams } from '../api/teams';
import { listTrainings, Training } from '../api/trainings';
import { ClubUser, getUserById } from '../api/users';
import type { TabParamList } from '../navigation/types';
import { colors, radius, spacing } from '../theme/colors';

function firstName(name: string | null | undefined, email: string): string {
  if (name && name.trim()) {
    return name.trim().split(/\s+/)[0];
  }
  const local = email.split('@')[0] ?? email;
  return local.charAt(0).toUpperCase() + local.slice(1);
}

function initials(name: string | null | undefined, email: string): string {
  if (name && name.trim()) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (email[0] ?? '?').toUpperCase();
}

function formatNextPass(iso: string): { day: string; time: string } {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) {
      return { day: iso, time: '' };
    }
    const day = d.toLocaleDateString('sv-SE', { weekday: 'long' });
    const time = d.toLocaleTimeString('sv-SE', {
      hour: '2-digit',
      minute: '2-digit',
    });
    const capitalized = day.charAt(0).toUpperCase() + day.slice(1);
    return { day: capitalized, time };
  } catch {
    return { day: iso, time: '' };
  }
}

function formatRelativeDay(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) {
      return '';
    }
    const now = new Date();
    const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startThat = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const diffDays = Math.round(
      (startToday.getTime() - startThat.getTime()) / (24 * 60 * 60 * 1000),
    );
    if (diffDays === 0) {
      return 'Idag';
    }
    if (diffDays === 1) {
      return 'Igår';
    }
    if (diffDays === -1) {
      return 'Imorgon';
    }
    return d.toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' });
  } catch {
    return '';
  }
}

type NextPass = {
  id: number;
  title: string;
  startsAt: string;
  endsAt: string;
  teamName: string;
};

type ActivityItem = {
  id: string;
  title: string;
  subtitle: string;
  when: string;
  icon: string;
  tint: string;
};

export default function HomeScreen() {
  const { session } = useAuth();
  const navigation = useNavigation<BottomTabNavigationProp<TabParamList>>();

  const [profile, setProfile] = useState<ClubUser | null>(null);
  const [nextPass, setNextPass] = useState<NextPass | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const staff = isStaff(session?.roleName);
  const member = isMember(session?.roleName);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      async function load() {
        if (!session) {
          return;
        }
        setError(null);
        try {
          const me = await getUserById(session.userId);
          if (cancelled) {
            return;
          }
          setProfile(me);

          if (staff) {
            let teamId = me.teamId;
            let teamName = me.teamName;
            // Coaches are linked via team_coaches, not users.team_id.
            // GET /api/my/teams allows COACH and ADMIN only, so a chairman
            // uses the full team list (same as an admin).
            if (teamId == null) {
              const myTeams =
                session.roleName === 'COACH'
                  ? await listMyTeams()
                  : await listTeams();
              if (myTeams[0]) {
                teamId = myTeams[0].id;
                teamName = myTeams[0].name;
              }
            }
            if (teamId != null) {
              const trainings = await listTrainings(teamId);
              if (cancelled) {
                return;
              }
              const now = Date.now();
              const upcoming = [...trainings]
                .filter((t) => new Date(t.startsAt).getTime() >= now - 60 * 60 * 1000)
                .sort(
                  (a, b) =>
                    new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
                );
              const pick: Training | undefined = upcoming[0] ?? trainings[0];
              if (pick) {
                setNextPass({
                  id: pick.id,
                  title: pick.title,
                  startsAt: pick.startsAt,
                  endsAt: pick.endsAt,
                  teamName: pick.teamName || teamName || '',
                });
              } else {
                setNextPass(null);
              }

              const recent = [...trainings]
                .sort(
                  (a, b) =>
                    new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime(),
                )
                .slice(0, 3)
                .map((t, index) => ({
                  id: `t-${t.id}`,
                  title: t.title,
                  subtitle: `${t.teamName} · ${formatNextPass(t.startsAt).day} ${formatNextPass(t.startsAt).time}`,
                  when: formatRelativeDay(t.startsAt),
                  icon: index === 0 ? '✓' : '📅',
                  tint: index === 0 ? colors.primary : colors.secondary,
                }));
              setActivity(recent);
            } else {
              setNextPass(null);
              setActivity([]);
            }
          } else if (member) {
            let rows: MyTraining[] = [];
            if (session.roleName === 'PARENT') {
              const kids = await listMyChildren();
              if (kids[0]) {
                rows = await listMyTrainings(kids[0].id);
              }
            } else {
              rows = await listMyTrainings();
            }
            if (cancelled) {
              return;
            }
            const now = Date.now();
            const upcoming = [...rows]
              .filter((t) => new Date(t.startsAt).getTime() >= now - 60 * 60 * 1000)
              .sort(
                (a, b) =>
                  new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
              );
            const pick = upcoming[0] ?? rows[0];
            if (pick) {
              setNextPass({
                id: pick.id,
                title: pick.title,
                startsAt: pick.startsAt,
                endsAt: pick.endsAt,
                teamName: pick.teamName,
              });
            } else {
              setNextPass(null);
            }

            setActivity(
              [...rows]
                .sort(
                  (a, b) =>
                    new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime(),
                )
                .slice(0, 3)
                .map((t) => ({
                  id: `mt-${t.id}-${t.playerUserId}`,
                  title: t.title,
                  subtitle:
                    t.status == null
                      ? 'Ej markerad ännu'
                      : `Status: ${t.status}`,
                  when: formatRelativeDay(t.startsAt),
                  icon: t.status === 'PRESENT' ? '✓' : '📅',
                  tint:
                    t.status === 'PRESENT' ? colors.primary : colors.secondary,
                })),
            );
          }
        } catch (err) {
          if (!cancelled) {
            setError(err instanceof Error ? err.message : 'Kunde inte ladda hem.');
          }
        }
      }

      load();
      return () => {
        cancelled = true;
      };
    }, [session, staff, member]),
  );

  const name = firstName(profile?.name, session?.email ?? '');
  const badge = [
    roleLabel(session?.roleName ?? ''),
    profile?.teamName ? `· ${profile.teamName}` : null,
  ]
    .filter(Boolean)
    .join(' ');

  const passWhen = nextPass ? formatNextPass(nextPass.startsAt) : null;
  const endTime = nextPass
    ? formatNextPass(nextPass.endsAt).time
    : '';

  return (
    <View style={styles.root}>
      <View style={styles.topBar}>
        <View style={styles.brandRow}>
          <View style={styles.logoMark}>
            <Text style={styles.logoMarkText}>FC</Text>
          </View>
          <Text style={styles.brandTitle}>FC VÄXJÖ</Text>
        </View>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {initials(profile?.name, session?.email ?? '?')}
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.greeting}>Hej, {name}!</Text>
        <View style={styles.rolePill}>
          <Text style={styles.rolePillText}>{badge}</Text>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.nextCard}>
          <Text style={styles.nextLabel}>NÄSTA PASS</Text>
          {nextPass && passWhen ? (
            <>
              <Text style={styles.nextTitle}>
                {passWhen.day} {passWhen.time}
                {endTime ? `–${endTime}` : ''}
              </Text>
              <View style={styles.nextMetaRow}>
                <Text style={styles.nextMetaIcon}>📍</Text>
                <Text style={styles.nextMeta}>
                  {nextPass.teamName}
                  {nextPass.title ? ` · ${nextPass.title}` : ''}
                </Text>
              </View>
              {staff ? (
                <Pressable
                  style={styles.cta}
                  onPress={() => navigation.navigate('Schema')}
                >
                  <Text style={styles.ctaText}>Öppna närvaro</Text>
                  <Text style={styles.ctaArrow}>→</Text>
                </Pressable>
              ) : (
                <Pressable
                  style={styles.cta}
                  onPress={() => navigation.navigate('Schema')}
                >
                  <Text style={styles.ctaText}>Visa schema</Text>
                  <Text style={styles.ctaArrow}>→</Text>
                </Pressable>
              )}
            </>
          ) : (
            <>
              <Text style={styles.nextTitle}>Inget pass inbokat</Text>
              <Text style={styles.nextMeta}>Skapa eller vänta på nästa träning.</Text>
              {staff ? (
                <Pressable
                  style={styles.cta}
                  onPress={() => navigation.navigate('Schema')}
                >
                  <Text style={styles.ctaText}>Gå till närvaro</Text>
                  <Text style={styles.ctaArrow}>→</Text>
                </Pressable>
              ) : null}
            </>
          )}
        </View>

        <Text style={styles.sectionTitle}>SNABBVAL</Text>
        <View style={styles.grid}>
          {staff ? (
            <QuickAction
              icon="✓"
              iconBg={colors.primary}
              label="Närvaro"
              onPress={() => navigation.navigate('Schema')}
            />
          ) : (
            <QuickAction
              icon="📅"
              iconBg={colors.primary}
              label="Schema"
              onPress={() => navigation.navigate('Schema')}
            />
          )}
          <QuickAction
            icon="👥"
            iconBg={colors.secondary}
            label="Laget"
            onPress={() => navigation.navigate('Laget')}
          />
          <QuickAction
            icon="💬"
            iconBg="#5c6b7a"
            label="Meddelanden"
            onPress={() => navigation.navigate('Mer')}
          />
          <QuickAction
            icon="🔍"
            iconBg={colors.tertiary}
            label="Sök spelare"
            onPress={() => navigation.navigate('Search')}
          />
        </View>

        <Text style={styles.sectionTitle}>SENASTE AKTIVITET</Text>
        {activity.length === 0 ? (
          <Text style={styles.emptyActivity}>Inga aktiviteter ännu.</Text>
        ) : (
          activity.map((item) => (
            <View key={item.id} style={styles.activityRow}>
              <View style={[styles.activityIcon, { backgroundColor: item.tint }]}>
                <Text style={styles.activityIconText}>{item.icon}</Text>
              </View>
              <View style={styles.activityBody}>
                <Text style={styles.activityTitle}>{item.title}</Text>
                <Text style={styles.activitySub}>{item.subtitle}</Text>
              </View>
              <Text style={styles.activityWhen}>{item.when}</Text>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

function QuickAction({
  icon,
  iconBg,
  label,
  onPress,
}: {
  icon: string;
  iconBg: string;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.quickCard} onPress={onPress}>
      <View style={[styles.quickIcon, { backgroundColor: iconBg }]}>
        <Text style={styles.quickIconText}>{icon}</Text>
      </View>
      <Text style={styles.quickLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topBar: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.gutter,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: colors.primary,
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  logoMark: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.secondaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoMarkText: {
    color: colors.primary,
    fontWeight: '800',
    fontSize: 12,
  },
  brandTitle: {
    color: colors.onPrimary,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 2,
    borderColor: colors.secondaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: colors.onPrimary,
    fontWeight: '700',
    fontSize: 12,
  },
  content: {
    padding: spacing.gutter,
    paddingBottom: 40,
  },
  greeting: {
    fontSize: 28,
    lineHeight: 36,
    fontWeight: '800',
    color: colors.onSurface,
    marginTop: spacing.sm,
  },
  rolePill: {
    alignSelf: 'flex-start',
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceContainer,
  },
  rolePillText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.onSurfaceVariant,
  },
  nextCard: {
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
    shadowColor: colors.primary,
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  nextLabel: {
    color: colors.secondaryContainer,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  nextTitle: {
    color: colors.onPrimary,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '800',
  },
  nextMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  nextMetaIcon: {
    fontSize: 12,
  },
  nextMeta: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  cta: {
    marginTop: spacing.md,
    backgroundColor: colors.secondaryContainer,
    borderRadius: radius.md,
    height: 48,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ctaText: {
    color: colors.onSecondaryContainer,
    fontSize: 15,
    fontWeight: '700',
  },
  ctaArrow: {
    color: colors.onSecondaryContainer,
    fontSize: 18,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.onSurfaceVariant,
    letterSpacing: 0.8,
    marginBottom: spacing.sm,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  quickCard: {
    width: '48%',
    flexGrow: 1,
    minWidth: '45%',
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.lg,
    padding: spacing.md,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  quickIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  quickIconText: {
    color: colors.onPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  quickLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.onSurface,
  },
  emptyActivity: {
    color: colors.onSurfaceVariant,
    marginBottom: spacing.md,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityIconText: {
    color: colors.onPrimary,
    fontWeight: '700',
    fontSize: 14,
  },
  activityBody: {
    flex: 1,
    minWidth: 0,
  },
  activityTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.onSurface,
  },
  activitySub: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  activityWhen: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.onSurfaceVariant,
  },
  error: {
    color: colors.error,
    marginBottom: spacing.sm,
  },
});
