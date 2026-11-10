import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { Button } from './Button';
import { Confirm } from './Confirm';
import { Segmented } from './Segmented';

describe('Button', () => {
  test('calls onPress', async () => {
    const onPress = jest.fn();
    await render(<Button title="Spara" onPress={onPress} />);

    await fireEvent.press(screen.getByRole('button', { name: 'Spara' }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  test('does nothing while disabled', async () => {
    const onPress = jest.fn();
    await render(<Button title="Spara" onPress={onPress} disabled />);

    const button = screen.getByRole('button', { name: 'Spara' });
    await fireEvent.press(button);

    expect(onPress).not.toHaveBeenCalled();
    expect(button).toBeDisabled();
  });
});

describe('Segmented', () => {
  const options = [
    { label: 'Närvarande', value: 'PRESENT' },
    { label: 'Frånvarande', value: 'ABSENT' },
    { label: 'Ursäktad', value: 'EXCUSED' },
  ] as const;

  function Harness({ onChange }: { onChange: (v: string) => void }) {
    const [value, setValue] = useState<string | null>(null);
    return (
      <Segmented
        options={options}
        value={value}
        onChange={(v) => {
          setValue(v);
          onChange(v);
        }}
      />
    );
  }

  test('starts with nothing chosen and marks the pressed option', async () => {
    const onChange = jest.fn();
    await render(<Harness onChange={onChange} />);

    for (const radio of screen.getAllByRole('radio')) {
      expect(radio).not.toBeChecked();
    }

    await fireEvent.press(screen.getByRole('radio', { name: 'Frånvarande' }));

    expect(onChange).toHaveBeenCalledWith('ABSENT');
    expect(screen.getByRole('radio', { name: 'Frånvarande' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Närvarande' })).not.toBeChecked();
  });

  test('pressing the chosen option again does not call onChange', async () => {
    const onChange = jest.fn();
    await render(<Segmented options={options} value="PRESENT" onChange={onChange} />);

    await fireEvent.press(screen.getByRole('radio', { name: 'Närvarande' }));

    expect(onChange).not.toHaveBeenCalled();
  });
});

describe('Confirm', () => {
  function renderConfirm() {
    const onConfirm = jest.fn();
    const onCancel = jest.fn();
    const result = render(
      <Confirm
        visible
        title="Låsa närvaron?"
        message="Den går inte att ändra efteråt."
        confirmLabel="Lås"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );
    return { onConfirm, onCancel, result };
  }

  test('shows title and message, confirm calls onConfirm', async () => {
    const { onConfirm, onCancel, result } = renderConfirm();
    await result;

    expect(screen.getByText('Låsa närvaron?')).toBeTruthy();
    expect(screen.getByText('Den går inte att ändra efteråt.')).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Lås' }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onCancel).not.toHaveBeenCalled();
  });

  test('"Avbryt" and a tap outside both cancel', async () => {
    const { onConfirm, onCancel, result } = renderConfirm();
    await result;

    await fireEvent.press(screen.getByRole('button', { name: 'Avbryt' }));
    await fireEvent.press(screen.getByTestId('confirm-overlay'));

    expect(onCancel).toHaveBeenCalledTimes(2);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  test('renders nothing when not visible', async () => {
    await render(
      <Confirm
        visible={false}
        title="Låsa närvaron?"
        confirmLabel="Lås"
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
      />,
    );

    expect(screen.queryByText('Låsa närvaron?')).toBeNull();
  });
});
