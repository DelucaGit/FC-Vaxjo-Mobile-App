import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { colors, radius, sizes, spacing, type } from '../../theme';

/** How long a message stays on screen. */
export const TOAST_MS = 2500;

type Toast = {
  /** Shows a short message at the bottom, e.g. "Träningen är sparad". */
  show: (text: string) => void;
};

/**
 * Without a provider (screen tests that render one screen alone) `show` does nothing,
 * so screens can always call `useToast()`.
 */
const ToastContext = createContext<Toast>({ show: () => {} });

export function useToast(): Toast {
  return useContext(ToastContext);
}

/**
 * Holds the message above all navigators (App.tsx), so it is still visible after
 * a screen calls `navigation.goBack()` (issue #150).
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((text: string) => {
    // A new message replaces the old one and gets its own full time.
    if (timer.current) clearTimeout(timer.current);
    setMessage(text);
    timer.current = setTimeout(() => setMessage(null), TOAST_MS);
  }, []);

  // Stop the timer if the provider goes away (e.g. the app closes).
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const value = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={value}>
      <View style={styles.root}>
        {children}
        {message ? <ToastMessage text={message} /> : null}
      </View>
    </ToastContext.Provider>
  );
}

function ToastMessage({ text }: { text: string }) {
  // Read the context directly: it is null in tests without a SafeAreaProvider, instead of throwing.
  const insetBottom = useContext(SafeAreaInsetsContext)?.bottom ?? 0;
  return (
    <View
      style={[styles.wrap, { bottom: insetBottom + sizes.tabBar + spacing.sm }]}
    >
      <View style={styles.box} accessible accessibilityRole="alert" accessibilityLiveRegion="polite">
        <Text style={styles.text}>{text}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  wrap: {
    position: 'absolute',
    // Taps go through to the screen underneath.
    pointerEvents: 'none',
    left: spacing.page,
    right: spacing.page,
    alignItems: 'center',
  },
  // Dark box with light text: stands out on the light screens without a shadow (spec section 3).
  box: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.page,
    borderRadius: radius,
    backgroundColor: colors.text,
  },
  text: { ...type.body, color: colors.onPrimary },
});
