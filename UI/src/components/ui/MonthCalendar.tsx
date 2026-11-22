import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { colors, radii, sizes, type } from '../../theme';
import {
  addMonths,
  canGoToPreviousMonth,
  dayAccessibilityLabel,
  dayKey,
  isPastDay,
  monthOf,
  monthTitle,
  monthWeeks,
  WEEKDAY_SHORT,
  type Month,
} from '../../lib/schedule/calendar';

type Props = {
  /** The chosen day as "2026-11-22", or null when nothing is chosen yet. */
  value: string | null;
  onChange: (day: string) => void;
  /** Days before this one cannot be chosen. Tests pass a fixed day. */
  today?: Date;
};

function monthOfKey(key: string | null): Month | null {
  const m = key ? /^(\d{4})-(\d{2})-\d{2}$/.exec(key) : null;
  return m ? { year: Number(m[1]), month: Number(m[2]) - 1 } : null;
}

/**
 * Issue #215: pick one day in a month grid (prototype `.cal`).
 * Weeks start on Monday, days before today are greyed out and cannot be pressed,
 * and the back arrow stops at the month of today.
 */
export function MonthCalendar({ value, onChange, today = new Date() }: Props) {
  const [view, setView] = useState<Month>(() => {
    const chosen = value && !isPastDay(value, today) ? monthOfKey(value) : null;
    return chosen ?? monthOf(today);
  });
  const todayKey = dayKey(today.getFullYear(), today.getMonth(), today.getDate());
  const canGoBack = canGoToPreviousMonth(view, today);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Föregående månad"
          accessibilityState={{ disabled: !canGoBack }}
          disabled={!canGoBack}
          onPress={() => setView((v) => addMonths(v, -1))}
          style={[styles.arrow, !canGoBack && styles.arrowDisabled]}
        >
          <ChevronLeft color={colors.text} size={22} />
        </Pressable>
        <Text accessibilityRole="header" style={type.heading}>
          {monthTitle(view)}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Nästa månad"
          onPress={() => setView((v) => addMonths(v, 1))}
          style={styles.arrow}
        >
          <ChevronRight color={colors.text} size={22} />
        </Pressable>
      </View>

      <View style={styles.week} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
        {WEEKDAY_SHORT.map((name) => (
          <Text key={name} style={styles.weekday}>
            {name}
          </Text>
        ))}
      </View>

      {monthWeeks(view.year, view.month).map((week, w) => (
        <View key={w} style={styles.week}>
          {week.map((day, i) => {
            if (day === null) {
              return <View key={i} style={styles.cell} />;
            }
            const key = dayKey(view.year, view.month, day);
            const past = isPastDay(key, today);
            const selected = key === value;
            return (
              <View key={i} style={styles.cell}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={dayAccessibilityLabel(key)}
                  accessibilityState={{ disabled: past, selected }}
                  disabled={past}
                  onPress={() => {
                    if (!past) {
                      onChange(key);
                    }
                  }}
                  style={[styles.day, key === todayKey && styles.today, selected && styles.selected]}
                >
                  <Text style={[styles.dayText, past && styles.pastText, selected && styles.selectedText]}>
                    {day}
                  </Text>
                </Pressable>
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const DAY = 40;

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderWidth: sizes.divider,
    borderColor: colors.border,
    borderRadius: radii.card,
    padding: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  arrow: {
    width: 44,
    height: 44,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowDisabled: { opacity: 0.3 },
  week: { flexDirection: 'row' },
  weekday: {
    ...type.weekLabel,
    flex: 1,
    textAlign: 'center',
    paddingVertical: 4,
  },
  cell: { flex: 1, alignItems: 'center', paddingVertical: 1 },
  day: {
    width: DAY,
    height: DAY,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  today: { borderWidth: 2, borderColor: colors.primary },
  selected: { backgroundColor: colors.primary, borderColor: colors.primary },
  dayText: { ...type.dateRow, fontSize: 15 },
  pastText: { color: colors.chevron },
  selectedText: { color: colors.onPrimary },
});
