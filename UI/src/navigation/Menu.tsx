import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';
import { Modal, Pressable, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ellipsis } from 'lucide-react-native';
import type { NavigationHelpers, StackNavigationState } from '@react-navigation/native';
import { useAuth } from '../auth/AuthContext';
import { colors, radii, shadows, sizes, spacing, type } from '../theme';
import { MenuContext } from './menuContext';
import { menuForRole, type MenuItem, type MenuRoute } from './menuForRole';
import type { AppStackParamList } from './types';

/**
 * "Mer" (Byt lösenord, Logga ut) stays here for now, under the role's pages.
 * Task #206 replaces it with the profile menu.
 */
const MORE_ITEM: MenuItem = { label: 'Mer', route: 'More', icon: Ellipsis };

type LayoutProps = {
  state: StackNavigationState<AppStackParamList>;
  navigation: NavigationHelpers<AppStackParamList>;
  children: ReactNode;
};

/**
 * Passed as `layout` to the stack navigator, so the menu knows the stack's state
 * and can navigate in it. A plain function: React Navigation calls it directly.
 */
export function MenuLayout({ state, navigation, children }: LayoutProps): ReactElement {
  const root = state.routes[0];
  return (
    <MenuProvider rootRoute={root?.name} rootKey={root?.key} navigation={navigation}>
      {children}
    </MenuProvider>
  );
}

/**
 * Passed as `screenLayout` to the stack navigator. Only the first page of the stack
 * (the page a menu item opened) gets the menu button; a pushed page keeps its back arrow.
 */
export function MenuScreenLayout({
  route,
  children,
}: {
  route: { key: string };
  children: ReactElement;
}): ReactElement {
  return <FirstPageOnly routeKey={route.key}>{children}</FirstPageOnly>;
}

/** The whole stack's menu: opens it, and knows which page is the first one. */
const StackMenuContext = createContext<{ openMenu: () => void; rootKey?: string } | null>(null);

function FirstPageOnly({ routeKey, children }: { routeKey: string; children: ReactNode }) {
  const stackMenu = useContext(StackMenuContext);
  const value = useMemo(
    () => (stackMenu && stackMenu.rootKey === routeKey ? { openMenu: stackMenu.openMenu } : null),
    [stackMenu, routeKey],
  );
  return <MenuContext.Provider value={value}>{children}</MenuContext.Provider>;
}

function MenuProvider({
  rootRoute,
  rootKey,
  navigation,
  children,
}: {
  rootRoute: string | undefined;
  rootKey: string | undefined;
  navigation: NavigationHelpers<AppStackParamList>;
  children: ReactNode;
}) {
  const { session } = useAuth();
  const [open, setOpen] = useState(false);
  const value = useMemo(() => ({ openMenu: () => setOpen(true), rootKey }), [rootKey]);
  const items = [...menuForRole(session?.roleName), MORE_ITEM];

  // Each menu item starts its page over, like pressing a tab did before.
  function go(route: MenuRoute) {
    setOpen(false);
    navigation.reset({ index: 0, routes: [{ name: route }] });
  }

  return (
    <StackMenuContext.Provider value={value}>
      {children}
      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        {/* Prototype `.scrim`: the dark layer. Pressing it closes the menu. */}
        <Pressable
          testID="menu-scrim"
          accessibilityRole="button"
          accessibilityLabel="Stäng meny"
          onPress={() => setOpen(false)}
          style={styles.scrim}
        />
        {/* Prototype `.drawer`: the panel on the left. */}
        <SafeAreaView edges={['top', 'bottom']} style={styles.drawer} testID="menu">
          {items.map((item) => (
            <MenuRow
              key={item.route}
              item={item}
              active={item.route === rootRoute}
              onPress={() => go(item.route)}
            />
          ))}
        </SafeAreaView>
      </Modal>
    </StackMenuContext.Provider>
  );
}

function MenuRow({ item, active, onPress }: { item: MenuItem; active: boolean; onPress: () => void }) {
  const { icon: Icon, label } = item;
  const color = active ? colors.primary : colors.text;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        active && styles.rowActive,
        pressed && !active && styles.rowPressed,
      ]}
    >
      <Icon size={sizes.icon - 2} color={color} strokeWidth={active ? 2 : 1.5} />
      <Text style={[type.body, styles.label, { color }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scrim: { ...StyleSheet.absoluteFill, backgroundColor: colors.overlay },
  drawer: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: '84%',
    backgroundColor: colors.surface,
    paddingTop: 28,
    paddingHorizontal: 14,
    paddingBottom: spacing.page,
    borderTopRightRadius: radii.sheet,
    borderBottomRightRadius: radii.sheet,
    ...shadows.raised,
  },
  row: {
    minHeight: sizes.touch,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: radii.control,
    marginBottom: spacing.xs,
  },
  rowActive: { backgroundColor: colors.primarySoft },
  rowPressed: { backgroundColor: colors.background },
  label: { marginLeft: spacing.md },
});
