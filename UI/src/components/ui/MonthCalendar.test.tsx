import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { MonthCalendar } from './MonthCalendar';

// Sunday 22 Nov 2026, evening. Injected, never the real clock.
const today = new Date(2026, 10, 22, 18, 0);

function Harness({ onChange, initial = null }: { onChange: (d: string) => void; initial?: string | null }) {
  const [value, setValue] = useState<string | null>(initial);
  return (
    <MonthCalendar
      today={today}
      value={value}
      onChange={(d) => {
        setValue(d);
        onChange(d);
      }}
    />
  );
}

describe('MonthCalendar', () => {
  test('shows the month of today with Swedish weekday headings', async () => {
    await render(<Harness onChange={jest.fn()} />);

    expect(screen.getByRole('header', { name: 'November 2026' })).toBeOnTheScreen();
    // The headings are hidden from screen readers: each day's label already names its weekday.
    expect(screen.getByText('mån', { includeHiddenElements: true })).toBeOnTheScreen();
    expect(screen.getByText('sön', { includeHiddenElements: true })).toBeOnTheScreen();
  });

  test('a past day is disabled and pressing it does nothing', async () => {
    const onChange = jest.fn();
    await render(<Harness onChange={onChange} />);

    const yesterday = screen.getByRole('button', { name: 'lördag 21 november 2026' });
    expect(yesterday).toBeDisabled();
    await fireEvent.press(yesterday);

    expect(onChange).not.toHaveBeenCalled();
  });

  test('today and later days can be chosen and show as selected', async () => {
    const onChange = jest.fn();
    await render(<Harness onChange={onChange} />);

    const todayButton = screen.getByRole('button', { name: 'söndag 22 november 2026' });
    expect(todayButton).toBeEnabled();

    await fireEvent.press(screen.getByRole('button', { name: 'tisdag 24 november 2026' }));

    expect(onChange).toHaveBeenCalledWith('2026-11-24');
    expect(screen.getByRole('button', { name: 'tisdag 24 november 2026' })).toBeSelected();
  });

  test('cannot go back before the month of today, but can go forward and back again', async () => {
    const onChange = jest.fn();
    await render(<Harness onChange={onChange} />);

    const back = screen.getByRole('button', { name: 'Föregående månad' });
    expect(back).toBeDisabled();

    await fireEvent.press(screen.getByRole('button', { name: 'Nästa månad' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Nästa månad' }));
    expect(screen.getByRole('header', { name: 'Januari 2027' })).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'fredag 1 januari 2027' }));
    expect(onChange).toHaveBeenCalledWith('2027-01-01');

    await fireEvent.press(screen.getByRole('button', { name: 'Föregående månad' }));
    expect(screen.getByRole('header', { name: 'December 2026' })).toBeOnTheScreen();
  });

  test('opens on the month of an already chosen future day', async () => {
    await render(<Harness onChange={jest.fn()} initial="2027-02-10" />);

    expect(screen.getByRole('header', { name: 'Februari 2027' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'onsdag 10 februari 2027' })).toBeSelected();
  });
});
