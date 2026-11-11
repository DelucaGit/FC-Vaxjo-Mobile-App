import type { ComponentProps } from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { createTeam } from '../api/teams';
import { FORBIDDEN_TEXT, forbiddenError, makeNavigation } from '../components/teams/testData';
import NewTeamScreen from './NewTeamScreen';

jest.mock('../api/teams');

type Props = ComponentProps<typeof NewTeamScreen>;

async function renderNewTeam() {
  const navigation = makeNavigation();
  const props = { navigation, route: { key: 'NewTeam', name: 'NewTeam' } } as unknown as Props;
  await render(<NewTeamScreen {...props} />);
  return navigation;
}

describe('NewTeamScreen', () => {
  test('Spara is locked until a name is filled in, then creates the team', async () => {
    jest.mocked(createTeam).mockResolvedValue({ id: 9, name: 'P15' });
    const navigation = await renderNewTeam();

    const save = screen.getByRole('button', { name: 'Spara' });
    expect(save).toBeDisabled();

    await fireEvent.changeText(screen.getByLabelText('Lagnamn'), '   ');
    expect(screen.getByRole('button', { name: 'Spara' })).toBeDisabled();

    await fireEvent.changeText(screen.getByLabelText('Lagnamn'), ' P15 ');
    await fireEvent.press(screen.getByRole('button', { name: 'Spara' }));

    expect(createTeam).toHaveBeenCalledWith('P15');
    expect(navigation.goBack).toHaveBeenCalled();
  });

  test('shows the Swedish message on 403', async () => {
    jest.mocked(createTeam).mockRejectedValue(await forbiddenError());
    const navigation = await renderNewTeam();

    await fireEvent.changeText(screen.getByLabelText('Lagnamn'), 'P15');
    await fireEvent.press(screen.getByRole('button', { name: 'Spara' }));

    expect(await screen.findByText(FORBIDDEN_TEXT)).toBeTruthy();
    expect(navigation.goBack).not.toHaveBeenCalled();
  });
});
