import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { listMyChildren, type MyChild } from '../../api/my';
import { spacing } from '../../theme';
import { Segmented } from '../ui';

/** "Elsa Lind" -> "Elsa". The picker only has room for first names (spec section 7). */
export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name;
}

export type ChildPickerState = {
  /** Still asking the API for the children (PARENT only). */
  loading: boolean;
  /** Swedish error text, or null. */
  error: string | null;
  /** The parent's children. Always empty for a PLAYER. */
  children: MyChild[];
  /** The chosen child, or null (PLAYER, or a parent without children). */
  child: MyChild | null;
  setChildId: (id: number) => void;
};

/**
 * Loads a parent's children and remembers which one is chosen.
 * A PLAYER gets loading=false and child=null straight away: the /api/my calls
 * then go without childId, which is what the API wants for a player (ADR 0009).
 */
export function useChildPicker(roleName: string | undefined): ChildPickerState {
  const isParent = roleName === 'PARENT';
  const [children, setChildren] = useState<MyChild[]>([]);
  const [childId, setChildId] = useState<number | null>(null);
  const [loading, setLoading] = useState(isParent);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isParent) {
      return;
    }
    let active = true;
    listMyChildren()
      .then((list) => {
        if (!active) return;
        setChildren(list);
        setChildId(list[0]?.id ?? null);
      })
      .catch((e: unknown) => {
        if (active) setError(e instanceof Error ? e.message : 'Något gick fel');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [isParent]);

  const child = children.find((c) => c.id === childId) ?? null;
  return { loading, error, children, child, setChildId };
}

/** Segmented picker with first names. Draws nothing for one child or none. */
export function ChildPicker({ state }: { state: ChildPickerState }) {
  if (state.children.length < 2 || !state.child) {
    return null;
  }
  return (
    <View style={styles.wrap}>
      <Segmented
        accessibilityLabel="Välj barn"
        options={state.children.map((c) => ({ value: c.id, label: firstName(c.name) }))}
        value={state.child.id}
        onChange={state.setChildId}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: spacing.page, paddingTop: spacing.page },
});
