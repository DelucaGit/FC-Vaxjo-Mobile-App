import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { TimeWheel, type TimeRange } from './TimeWheel';

function Harness({
  onChange,
  initial = { start: '17:30', end: '19:00' },
}: {
  onChange: (r: TimeRange, valid: boolean) => void;
  initial?: TimeRange;
}) {
  const [value, setValue] = useState<TimeRange>(initial);
  return (
    <TimeWheel
      value={value}
      onChange={(r, valid) => {
        setValue(r);
        onChange(r, valid);
      }}
    />
  );
}

describe('TimeWheel', () => {
  test('shows Start and Slut, with Start chosen first', async () => {
    await render(<Harness onChange={jest.fn()} />);

    expect(screen.getByRole('tab', { name: 'Start 17:30' })).toBeSelected();
    expect(screen.getByRole('tab', { name: 'Slut 19:00' })).not.toBeSelected();
    expect(screen.getByRole('adjustable', { name: 'Timme' })).toBeOnTheScreen();
    expect(screen.getByRole('adjustable', { name: 'Minut' })).toBeOnTheScreen();
  });

  test('the minute column only has 00, 05 … 55', async () => {
    await render(<Harness onChange={jest.fn()} />);

    const minutes = screen.getAllByLabelText(/^Minut \d\d$/).map((el) => el.props.accessibilityLabel);
    expect(minutes).toEqual(
      ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'].map((m) => `Minut ${m}`),
    );
  });

  test('tapping a row changes the chosen side only', async () => {
    const onChange = jest.fn();
    await render(<Harness onChange={onChange} />);

    await fireEvent.press(screen.getByLabelText('Timme 18'));
    expect(onChange).toHaveBeenLastCalledWith({ start: '18:30', end: '19:00' }, true);

    await fireEvent.press(screen.getByRole('tab', { name: 'Slut 19:00' }));
    await fireEvent.press(screen.getByLabelText('Minut 45'));
    expect(onChange).toHaveBeenLastCalledWith({ start: '18:30', end: '19:45' }, true);
  });

  test('scrolling snaps to the nearest row', async () => {
    const onChange = jest.fn();
    await render(<Harness onChange={onChange} />);

    // Row 9 of the minute column is 45. 44 px rows; 400 px is nearest row 9.
    await fireEvent(screen.getByTestId('time-wheel-minute'), 'momentumScrollEnd', {
      nativeEvent: { contentOffset: { x: 0, y: 400 } },
    });

    expect(onChange).toHaveBeenLastCalledWith({ start: '17:45', end: '19:00' }, true);
  });

  test('screen reader can step the hour up and down', async () => {
    const onChange = jest.fn();
    await render(<Harness onChange={onChange} />);
    const hour = screen.getByRole('adjustable', { name: 'Timme' });

    await fireEvent(hour, 'accessibilityAction', { nativeEvent: { actionName: 'increment' } });
    expect(onChange).toHaveBeenLastCalledWith({ start: '18:30', end: '19:00' }, true);

    await fireEvent(hour, 'accessibilityAction', { nativeEvent: { actionName: 'decrement' } });
    expect(onChange).toHaveBeenLastCalledWith({ start: '17:30', end: '19:00' }, true);
  });

  test('an end equal to the start is not accepted and shows the warning', async () => {
    const onChange = jest.fn();
    await render(<Harness onChange={onChange} />);

    await fireEvent.press(screen.getByRole('tab', { name: 'Slut 19:00' }));
    await fireEvent.press(screen.getByLabelText('Timme 17'));
    await fireEvent.press(screen.getByLabelText('Minut 30'));

    expect(onChange).toHaveBeenLastCalledWith({ start: '17:30', end: '17:30' }, false);
    expect(screen.getByRole('alert')).toHaveTextContent('Sluttiden måste vara efter starttiden');
  });

  test('an end before the start is not accepted', async () => {
    const onChange = jest.fn();
    await render(<Harness onChange={onChange} />);

    await fireEvent.press(screen.getByRole('tab', { name: 'Slut 19:00' }));
    await fireEvent.press(screen.getByLabelText('Timme 16'));

    expect(onChange).toHaveBeenLastCalledWith({ start: '17:30', end: '16:00' }, false);
    expect(screen.getByRole('alert')).toBeOnTheScreen();
  });

  test('a minute off the wheel is shown snapped down', async () => {
    await render(<Harness onChange={jest.fn()} initial={{ start: '10:03', end: '11:00' }} />);

    expect(screen.getByRole('tab', { name: 'Start 10:00' })).toBeOnTheScreen();
  });
});
