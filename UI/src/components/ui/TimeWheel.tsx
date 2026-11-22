import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, type ScrollViewInstance } from 'react-native';
import { colors, fonts, radii, sizes, type } from '../../theme';
import {
  END_BEFORE_START_MESSAGE,
  HOURS,
  indexFromOffset,
  isEndAfterStart,
  MINUTES,
  snapTime,
  withHour,
  withMinute,
} from '../../lib/schedule/timeWheel';

export type TimeRange = { start: string; end: string };

type Props = {
  /** "17:30" and "19:00". A minute off the wheel is shown snapped down. */
  value: TimeRange;
  /** `valid` is false while the end is not after the start. */
  onChange: (next: TimeRange, valid: boolean) => void;
};

type Side = keyof TimeRange;

/**
 * Issue #215: pick a start and an end time (prototype "Tidväljare").
 * A Start/Slut switch chooses which time the wheel changes. The wheel has an hour
 * column and a minute column in five-minute steps. A red line warns when the end
 * is not after the start.
 */
export function TimeWheel({ value, onChange }: Props) {
  const [side, setSide] = useState<Side>('start');
  const start = snapTime(value.start) ?? '00:00';
  const end = snapTime(value.end) ?? '00:00';
  const current = side === 'start' ? start : end;
  const [hour, minute] = current.split(':').map(Number);
  const valid = isEndAfterStart(start, end);

  function set(next: string) {
    const range = side === 'start' ? { start: next, end } : { start, end: next };
    onChange(range, isEndAfterStart(range.start, range.end));
  }

  return (
    <View>
      <View accessibilityRole="tablist" style={styles.tabs}>
        {(['start', 'end'] as const).map((s) => {
          const label = s === 'start' ? 'Start' : 'Slut';
          const time = s === 'start' ? start : end;
          const on = s === side;
          return (
            <Pressable
              key={s}
              accessibilityRole="tab"
              accessibilityLabel={`${label} ${time}`}
              accessibilityState={{ selected: on }}
              onPress={() => setSide(s)}
              style={[styles.tab, on && styles.tabOn]}
            >
              <Text style={styles.tabLabel}>{label}</Text>
              <Text style={[styles.tabTime, on && styles.tabTimeOn]}>{time}</Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.digital} importantForAccessibility="no" accessibilityElementsHidden>
        {current}
      </Text>

      <View style={styles.wheel}>
        <View style={styles.band} pointerEvents="none" />
        <WheelColumn
          label="Timme"
          testID="time-wheel-hour"
          values={HOURS}
          selected={HOURS.indexOf(hour)}
          onSelect={(i) => set(withHour(current, HOURS[i]))}
        />
        <Text style={styles.colon}>:</Text>
        <WheelColumn
          label="Minut"
          testID="time-wheel-minute"
          values={MINUTES}
          selected={MINUTES.indexOf(minute)}
          onSelect={(i) => set(withMinute(current, MINUTES[i]))}
        />
      </View>

      <Text accessibilityRole={valid ? undefined : 'alert'} accessibilityLiveRegion="polite" style={styles.warn}>
        {valid ? '' : END_BEFORE_START_MESSAGE}
      </Text>
    </View>
  );
}

const ROW = 44;
const VISIBLE = 5;
const PAD = ROW * Math.floor(VISIBLE / 2);

type ColumnProps = {
  label: string;
  testID: string;
  values: readonly number[];
  selected: number;
  onSelect: (index: number) => void;
};

/**
 * One scrolling column. It snaps to a row when the scroll stops, and a row can
 * also be tapped. For screen readers the column is one "adjustable" control:
 * swipe up or down to step through the values.
 */
function WheelColumn({ label, testID, values, selected, onSelect }: ColumnProps) {
  const ref = useRef<ScrollViewInstance>(null);
  const index = Math.max(0, selected);

  useEffect(() => {
    ref.current?.scrollTo({ y: index * ROW, animated: true });
  }, [index]);

  return (
    <View
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityValue={{ text: String(values[index]).padStart(2, '0') }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => {
        const step = e.nativeEvent.actionName === 'increment' ? 1 : -1;
        const next = Math.min(values.length - 1, Math.max(0, index + step));
        if (next !== index) {
          onSelect(next);
        }
      }}
      style={styles.column}
    >
      <ScrollView
        ref={ref}
        testID={testID}
        contentOffset={{ x: 0, y: index * ROW }}
        contentContainerStyle={{ paddingVertical: PAD }}
        snapToInterval={ROW}
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
        onMomentumScrollEnd={(e) => {
          const next = indexFromOffset(e.nativeEvent.contentOffset.y, ROW, values.length);
          if (next !== index) {
            onSelect(next);
          }
        }}
      >
        {values.map((v, i) => {
          const text = String(v).padStart(2, '0');
          return (
            <Pressable
              key={v}
              accessibilityLabel={`${label} ${text}`}
              onPress={() => {
                if (i !== index) {
                  onSelect(i);
                }
              }}
              style={styles.row}
            >
              <Text style={[styles.rowText, i === index && styles.rowTextOn]}>{text}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  tab: {
    flex: 1,
    minHeight: sizes.touch,
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: colors.surface,
    borderWidth: sizes.divider,
    borderColor: colors.border,
    borderRadius: radii.control,
  },
  tabOn: { borderColor: colors.primary, borderWidth: 2 },
  tabLabel: { ...type.weekLabel, letterSpacing: 12 * 0.06 },
  tabTime: { fontFamily: fonts.bold, fontSize: 20, color: colors.text },
  tabTimeOn: { color: colors.primary },
  digital: {
    fontFamily: fonts.bold,
    fontSize: 52,
    lineHeight: 57,
    letterSpacing: -1,
    textAlign: 'center',
    color: colors.text,
    marginTop: 2,
    marginBottom: 8,
  },
  wheel: {
    flexDirection: 'row',
    justifyContent: 'center',
    height: ROW * VISIBLE,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    borderWidth: sizes.divider,
    borderColor: colors.border,
    borderRadius: radii.card,
  },
  band: {
    position: 'absolute',
    left: 12,
    right: 12,
    top: PAD,
    height: ROW,
    borderRadius: radii.control,
    backgroundColor: colors.primarySoft,
  },
  column: { width: 90, height: ROW * VISIBLE },
  colon: { alignSelf: 'center', fontFamily: fonts.bold, fontSize: 26, color: colors.text, paddingHorizontal: 2 },
  row: { height: ROW, alignItems: 'center', justifyContent: 'center' },
  rowText: { fontFamily: fonts.semibold, fontSize: 22, color: colors.chevron },
  rowTextOn: { fontFamily: fonts.bold, fontSize: 26, color: colors.primary },
  warn: { ...type.meta, color: colors.danger, fontFamily: fonts.semibold, marginTop: 8, marginHorizontal: 2, minHeight: 20 },
});
