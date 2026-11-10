import { fireEvent, render, screen } from '@testing-library/react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { getMatch, setMatchResult, type Match } from '../api/matches';
import { readErrorMessage } from '../api/http';
import type { AppStackParamList } from '../navigation/types';
import SetResultScreen from './SetResultScreen';

jest.mock('../api/matches', () => ({ getMatch: jest.fn(), setMatchResult: jest.fn() }));

type Props = NativeStackScreenProps<AppStackParamList, 'SetResult'>;
const mockedGet = getMatch as jest.Mock;
const mockedSet = setMatchResult as jest.Mock;

const match: Match = {
  id: 9,
  teamId: 3,
  teamName: 'P14',
  opponent: 'IFK Värnamo',
  kickoffAt: '2026-11-21T10:00:00',
  venue: 'Myresjöhus Arena',
  homeAway: 'HOME',
  result: null,
  createdByUserId: 1,
  attendanceLockedAt: null,
};

function setup() {
  const goBack = jest.fn();
  const props = {
    navigation: { goBack },
    route: { key: 'SetResult', name: 'SetResult', params: { matchId: 9 } },
  } as unknown as Props;
  return { goBack, props };
}

const saveButton = () => screen.getByRole('button', { name: 'Spara' });

describe('SetResultScreen', () => {
  beforeEach(() => {
    mockedGet.mockReset();
    mockedSet.mockReset();
  });

  test('labels the fields with our team and the opponent; Spara locked until both are filled', async () => {
    mockedGet.mockResolvedValue(match);
    const { props } = setup();
    await render(<SetResultScreen {...props} />);

    const ours = await screen.findByLabelText('P14');
    expect(screen.getByLabelText('IFK Värnamo')).toBeTruthy();
    expect(screen.getByText('–')).toBeTruthy();
    expect(saveButton()).toBeDisabled();

    await fireEvent.changeText(ours, '2');
    expect(saveButton()).toBeDisabled();

    await fireEvent.changeText(screen.getByLabelText('IFK Värnamo'), '1');
    expect(saveButton()).toBeEnabled();
    // No result saved yet, so there is nothing to remove.
    expect(screen.queryByRole('button', { name: 'Ta bort resultat' })).toBeNull();
  });

  test('saves the result and goes back', async () => {
    mockedGet.mockResolvedValue(match);
    mockedSet.mockResolvedValue({ ...match, result: { goalsFor: 2, goalsAgainst: 1 } });
    const { goBack, props } = setup();
    await render(<SetResultScreen {...props} />);

    await fireEvent.changeText(await screen.findByLabelText('P14'), '2');
    await fireEvent.changeText(screen.getByLabelText('IFK Värnamo'), '1');
    await fireEvent.press(saveButton());

    expect(mockedSet).toHaveBeenCalledWith(9, 2, 1);
    expect(goBack).toHaveBeenCalled();
  });

  test('an existing result is filled in and can be removed', async () => {
    mockedGet.mockResolvedValue({ ...match, result: { goalsFor: 3, goalsAgainst: 0 } });
    mockedSet.mockResolvedValue(match);
    const { goBack, props } = setup();
    await render(<SetResultScreen {...props} />);

    expect((await screen.findByLabelText('P14')).props.value).toBe('3');
    expect(screen.getByLabelText('IFK Värnamo').props.value).toBe('0');

    await fireEvent.press(screen.getByRole('button', { name: 'Ta bort resultat' }));
    expect(mockedSet).toHaveBeenCalledWith(9, null, null);
    expect(goBack).toHaveBeenCalled();
  });

  test('shows the backend error message', async () => {
    mockedGet.mockResolvedValue(match);
    mockedSet.mockRejectedValue(
      new Error('goalsFor and goalsAgainst must both be set, or both left empty'),
    );
    const { goBack, props } = setup();
    await render(<SetResultScreen {...props} />);

    await fireEvent.changeText(await screen.findByLabelText('P14'), '2');
    await fireEvent.changeText(screen.getByLabelText('IFK Värnamo'), '1');
    await fireEvent.press(saveButton());

    expect(
      await screen.findByText('goalsFor and goalsAgainst must both be set, or both left empty'),
    ).toBeTruthy();
    expect(goBack).not.toHaveBeenCalled();
  });

  test('a 403 shows the Swedish message', async () => {
    const message = await readErrorMessage(new Response('Access Denied', { status: 403 }));
    mockedGet.mockResolvedValue(match);
    mockedSet.mockRejectedValue(new Error(message));
    const { props } = setup();
    await render(<SetResultScreen {...props} />);

    await fireEvent.changeText(await screen.findByLabelText('P14'), '2');
    await fireEvent.changeText(screen.getByLabelText('IFK Värnamo'), '1');
    await fireEvent.press(saveButton());

    expect(await screen.findByText(message)).toBeTruthy();
    expect(message).not.toMatch(/Access Denied/);
  });
});
