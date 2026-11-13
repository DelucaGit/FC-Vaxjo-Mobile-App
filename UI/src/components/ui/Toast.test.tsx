import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Pressable, Text } from 'react-native';
import { TOAST_MS, ToastProvider, useToast } from './Toast';

function ShowButton({ text }: { text: string }) {
  const toast = useToast();
  return (
    <Pressable accessibilityRole="button" onPress={() => toast.show(text)}>
      <Text>Visa {text}</Text>
    </Pressable>
  );
}

describe('Toast', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  test('shows the message, announced to screen readers, and hides it after the time', async () => {
    await render(
      <ToastProvider>
        <ShowButton text="Träningen är sparad" />
      </ToastProvider>,
    );
    expect(screen.queryByRole('alert')).toBeNull();

    await fireEvent.press(screen.getByRole('button'));
    expect(screen.getByRole('alert')).toHaveTextContent('Träningen är sparad');

    await act(async () => {
      jest.advanceTimersByTime(TOAST_MS - 100);
    });
    expect(screen.getByText('Träningen är sparad')).toBeTruthy();

    await act(async () => {
      jest.advanceTimersByTime(100);
    });
    expect(screen.queryByText('Träningen är sparad')).toBeNull();
  });

  test('a new message replaces the old one and gets its full time', async () => {
    await render(
      <ToastProvider>
        <ShowButton text="Laget är skapat" />
        <ShowButton text="Tränaren är tillagd" />
      </ToastProvider>,
    );

    await fireEvent.press(screen.getByText('Visa Laget är skapat'));
    await act(async () => {
      jest.advanceTimersByTime(TOAST_MS - 100);
    });
    await fireEvent.press(screen.getByText('Visa Tränaren är tillagd'));
    expect(screen.queryByText('Laget är skapat')).toBeNull();

    await act(async () => {
      jest.advanceTimersByTime(TOAST_MS - 100);
    });
    expect(screen.getByText('Tränaren är tillagd')).toBeTruthy();
  });

  test('without a provider, show does nothing (screens rendered alone in tests)', async () => {
    await render(<ShowButton text="Spelaren är tillagd" />);
    await fireEvent.press(screen.getByRole('button'));
    expect(screen.queryByText('Spelaren är tillagd')).toBeNull();
  });
});
