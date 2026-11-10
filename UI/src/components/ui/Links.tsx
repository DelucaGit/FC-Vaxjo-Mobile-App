import { Linking, Pressable, StyleSheet, Text } from 'react-native';
import { colors, type } from '../../theme';

type LinkProps = {
  href: string;
  label: string;
  accessibilityLabel: string;
};

function ExternalLink({ href, label, accessibilityLabel }: LinkProps) {
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={accessibilityLabel}
      hitSlop={8}
      onPress={() => {
        // A phone without a mail app would reject; there is nothing useful to show then.
        Linking.openURL(href).catch(() => {});
      }}
    >
      {({ pressed }) => <Text style={[styles.link, pressed && styles.pressed]}>{label}</Text>}
    </Pressable>
  );
}

/** Opens the phone app. */
export function TelLink({ phone }: { phone: string }) {
  const digits = phone.replace(/[^\d+]/g, '');
  return <ExternalLink href={`tel:${digits}`} label={phone} accessibilityLabel={`Ring ${phone}`} />;
}

/** Opens the mail app. */
export function MailLink({ email }: { email: string }) {
  return (
    <ExternalLink href={`mailto:${email}`} label={email} accessibilityLabel={`Mejla ${email}`} />
  );
}

const styles = StyleSheet.create({
  link: { ...type.body, color: colors.primary },
  pressed: { textDecorationLine: 'underline' },
});
