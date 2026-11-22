import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MapPin, X } from 'lucide-react-native';
import {
  createSavedVenue,
  deleteSavedVenue,
  listSavedVenues,
  type SavedVenue,
} from '../../api/savedVenues';
import { Button, Confirm, Field, SkeletonList, useToast } from '../ui';
import { GuideOption, type GuideStep } from '../ui/Guide';
import { colors, fonts, radius, sizes, spacing, type } from '../../theme';
import { ErrorText } from './TrainingForm';

export const NO_VENUES_MESSAGE = 'Det finns inga sparade platser än.';

/**
 * Where the typed address goes (the match guide, issue #220). 'first' for an away match,
 * where the address usually is new; 'last' under the saved venues for a home match.
 */
export type AddressField = 'first' | 'last';

const ADDRESS_LABEL: Record<AddressField, string> = {
  first: 'Adress till bortaplanen',
  last: 'Eller skriv en annan adress',
};

function byName(a: SavedVenue, b: SavedVenue) {
  return a.name.localeCompare(b.name, 'sv');
}

type ToggleProps = { editing: boolean; onToggle: () => void };

/** The small red "Redigera" / "Klar" next to the question (prototype `.edtxt`). */
export function VenueEditButton({ editing, onToggle }: ToggleProps) {
  return <Button title={editing ? 'Klar' : 'Redigera'} variant="link" onPress={onToggle} />;
}

type Props = {
  /** The chosen venue's name, '' when none. */
  value: string;
  onChange: (name: string) => void;
  editing: boolean;
  onEditingChange: (editing: boolean) => void;
  /** Also lets the coach type an address that is not saved. Left out: saved venues only. */
  addressField?: AddressField;
};

/**
 * Issue #218: pick one of the club's saved venues (Sparad plats). In edit mode the
 * coach adds a venue (name, optional address) or removes one. Adding picks it;
 * removing the chosen one un-picks it. Leaving the step ends edit mode.
 * With `addressField` the coach may instead type an address (issue #220).
 */
export function VenueStep({ value, onChange, editing, onEditingChange, addressField }: Props) {
  const toast = useToast();
  const [venues, setVenues] = useState<SavedVenue[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [busy, setBusy] = useState(false);
  const [removing, setRemoving] = useState<SavedVenue | null>(null);
  // The typed address. Kept apart from `value`, so picking a saved venue empties the field.
  const [typed, setTyped] = useState('');

  // Read once: coming back to the step shows a typed answer in the field again.
  const firstValue = useRef(value);
  useEffect(() => {
    let active = true;
    listSavedVenues()
      .then((list) => {
        if (!active) return;
        setVenues(list);
        const start = firstValue.current;
        if (start && !list.some((v) => v.name === start)) setTyped(start);
      })
      .catch((e: Error) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, []);

  // The prototype leaves edit mode when the guide moves to another step.
  const endEditing = useRef(onEditingChange);
  useEffect(() => {
    endEditing.current = onEditingChange;
  });
  useEffect(() => () => endEditing.current(false), []);

  if (!venues) {
    return (
      <>
        <ErrorText message={error} />
        {error ? null : <SkeletonList rows={3} />}
      </>
    );
  }

  const add = async () => {
    const trimmed = name.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    setError(null);
    try {
      const created = await createSavedVenue({ name: trimmed, address: address.trim() || null });
      setVenues((list) => [...(list ?? []), created].sort(byName));
      onChange(created.name);
      setTyped('');
      setName('');
      setAddress('');
      toast.show('Platsen är tillagd');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (venue: SavedVenue) => {
    setRemoving(null);
    setBusy(true);
    setError(null);
    try {
      await deleteSavedVenue(venue.id);
      setVenues((list) => (list ?? []).filter((v) => v.id !== venue.id));
      if (value === venue.name) onChange('');
      toast.show('Platsen är borttagen');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const pin = (on: boolean) => <MapPin size={22} color={on ? colors.onPrimary : colors.icon} />;

  if (!editing) {
    const saved =
      venues.length === 0 ? (
        <View style={styles.empty}>
          <Text style={type.body}>{NO_VENUES_MESSAGE}</Text>
          <Button title="Lägg till den första platsen" onPress={() => onEditingChange(true)} />
        </View>
      ) : (
        venues.map((v) => (
          <GuideOption
            key={v.id}
            label={v.name}
            selected={value === v.name}
            onPress={() => {
              setTyped('');
              onChange(v.name);
            }}
            icon={pin(value === v.name)}
          />
        ))
      );
    if (!addressField) return <>{saved}</>;

    const field = (
      <View style={addressField === 'first' ? styles.addressFirst : styles.addressLast}>
        <Field
          label={ADDRESS_LABEL[addressField]}
          value={typed}
          onChangeText={(text) => {
            setTyped(text);
            onChange(text);
          }}
          placeholder="Skriv adress"
          maxLength={120}
        />
      </View>
    );
    return addressField === 'first' ? (
      <>
        {field}
        {venues.length > 0 ? <Text style={styles.listLabel}>Eller välj en sparad plats</Text> : null}
        {saved}
      </>
    ) : (
      <>
        {saved}
        {field}
      </>
    );
  }

  return (
    <>
      {venues.map((v) => (
        <View key={v.id} style={styles.row}>
          {pin(false)}
          <View style={styles.rowText}>
            <Text style={styles.rowName}>{v.name}</Text>
            {v.address ? <Text style={type.meta}>{v.address}</Text> : null}
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Ta bort ${v.name}`}
            disabled={busy}
            onPress={() => setRemoving(v)}
            style={styles.remove}
            hitSlop={8}
          >
            <X size={22} color={colors.icon} />
          </Pressable>
        </View>
      ))}
      <View style={styles.add}>
        <Field label="Ny plats" value={name} onChangeText={setName} maxLength={80} />
        <Field label="Adress (valfri)" value={address} onChangeText={setAddress} maxLength={120} />
        <ErrorText message={error} />
        <Button title="Lägg till" disabled={!name.trim() || busy} onPress={() => void add()} />
      </View>
      <Confirm
        visible={removing !== null}
        title={`Ta bort ${removing?.name ?? ''}?`}
        message="Gamla träningar och matcher behåller sin plats."
        confirmLabel="Ta bort"
        onConfirm={() => removing && void remove(removing)}
        onCancel={() => setRemoving(null)}
      />
    </>
  );
}

type StepOptions<A> = {
  /** E.g. "Var ska ni vara?". */
  question: string;
  /** Edit mode, kept by the screen because the button sits in the Guide's question row. */
  editing: boolean;
  setEditing: (editing: boolean) => void;
  venueOf: (answers: A) => string;
  patch: (name: string) => Partial<A>;
  /** The match guide also takes a typed address (issue #220). Left out: saved venues only. */
  address?: (answers: A) => AddressField;
};

/** The Plats step for a Guide (training, and the match guide in #220). A venue is required. */
export function venueGuideStep<A>({
  question,
  editing,
  setEditing,
  venueOf,
  patch,
  address,
}: StepOptions<A>): GuideStep<A> {
  return {
    key: 'venue',
    question,
    label: 'Plats',
    summary: (a) => venueOf(a).trim(),
    canProceed: (a) => venueOf(a).trim() !== '',
    headerAction: () => <VenueEditButton editing={editing} onToggle={() => setEditing(!editing)} />,
    render: (a, update) => (
      <VenueStep
        value={venueOf(a)}
        onChange={(name) => update(patch(name))}
        editing={editing}
        onEditingChange={setEditing}
        addressField={address?.(a)}
      />
    ),
  };
}

const styles = StyleSheet.create({
  empty: { gap: spacing.md },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 58,
    backgroundColor: colors.surface,
    borderWidth: sizes.divider,
    borderColor: colors.border,
    borderRadius: radius,
    paddingVertical: 10,
    paddingLeft: 16,
    paddingRight: 8,
    marginBottom: 10,
  },
  rowText: { flex: 1 },
  rowName: { fontFamily: fonts.semibold, fontSize: 17, color: colors.text },
  remove: { minWidth: sizes.touch, minHeight: sizes.touch, alignItems: 'center', justifyContent: 'center' },
  add: { gap: spacing.sm, marginTop: spacing.sm },
  addressFirst: { marginBottom: spacing.md },
  addressLast: { marginTop: spacing.sm },
  listLabel: { fontFamily: fonts.semibold, fontSize: 14, color: colors.textMuted, marginBottom: spacing.sm, marginHorizontal: 2 },
});
