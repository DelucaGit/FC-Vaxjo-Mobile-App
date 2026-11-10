import { Linking } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { apiFetch } from '../api/http';
import CoachContacts from './CoachContacts';

jest.mock('../api/http', () => {
  const actual = jest.requireActual('../api/http');
  return {
    ...actual,
    apiFetch: jest.fn(),
  };
});

const mockedFetch = apiFetch as jest.MockedFunction<typeof apiFetch>;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

beforeEach(() => {
  mockedFetch.mockReset();
});

test('player sees coaches; missing phone or email is hidden', async () => {
  mockedFetch.mockResolvedValue(
    json([
      { id: 1, name: 'Anna Tränare', email: 'anna@fcvaxjo.se', mobilePhoneNumber: '0701234567' },
      { id: 2, name: 'Bo Tränare', email: null, mobilePhoneNumber: null },
    ]),
  );

  await render(<CoachContacts />);

  expect(await screen.findByText('Anna Tränare')).toBeTruthy();
  expect(screen.getByText('Ring 0701234567')).toBeTruthy();
  expect(screen.getByText('Mejla anna@fcvaxjo.se')).toBeTruthy();
  expect(screen.getByText('Bo Tränare')).toBeTruthy();
  expect(screen.getAllByText(/^Ring /)).toHaveLength(1);
  expect(screen.getAllByText(/^Mejla /)).toHaveLength(1);
  // A player sends no childId.
  expect(mockedFetch.mock.calls[0][0]).toMatch(/\/my\/coaches$/);
});

test('tapping phone and email opens tel: and mailto:', async () => {
  const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
  mockedFetch.mockResolvedValue(
    json([{ id: 1, name: 'Anna', email: 'anna@fcvaxjo.se', mobilePhoneNumber: '0701234567' }]),
  );

  await render(<CoachContacts />);

  await fireEvent.press(await screen.findByText('Ring 0701234567'));
  await fireEvent.press(screen.getByText('Mejla anna@fcvaxjo.se'));
  expect(openURL).toHaveBeenCalledWith('tel:0701234567');
  expect(openURL).toHaveBeenCalledWith('mailto:anna@fcvaxjo.se');
  openURL.mockRestore();
});

test('parent passes the child id', async () => {
  mockedFetch.mockResolvedValue(json([]));

  await render(<CoachContacts childId={42} />);

  expect(await screen.findByText('Inga tränare kopplade till laget än.')).toBeTruthy();
  expect(mockedFetch.mock.calls[0][0]).toMatch(/\/my\/coaches\?childId=42$/);
});

test('shows a Swedish error when loading fails', async () => {
  mockedFetch.mockResolvedValue(json({ message: 'Barnet hittades inte.' }, 404));

  await render(<CoachContacts childId={99} />);

  expect(
    await screen.findByText('Kunde inte hämta tränarna. Barnet hittades inte.'),
  ).toBeTruthy();
  expect(screen.queryByText('Inga tränare kopplade till laget än.')).toBeNull();
});
