import { fireEvent, render, screen } from '@testing-library/react-native';
import { initialsFor, ProfileMenu } from './ProfileMenu';

describe('initialsFor', () => {
  test.each([
    ['Anna Ek', 'AE'],
    ['anna maria ek', 'AE'],
    ['Anna', 'A'],
    ['  Bo  ', 'B'],
    ['', ''],
    [null, ''],
  ])('%p gives %p', (name, initials) => {
    expect(initialsFor(name)).toBe(initials);
  });
});

describe('ProfileMenu', () => {
  async function renderMenu() {
    const handlers = { onClose: jest.fn(), onChangePassword: jest.fn(), onLogout: jest.fn() };
    await render(<ProfileMenu visible name="Anna Ek" roleName="PARENT" {...handlers} />);
    return handlers;
  }

  test('shows the initials, the name and the role in Swedish', async () => {
    await renderMenu();

    expect(screen.getByText('AE')).toBeTruthy();
    expect(screen.getByText('Anna Ek')).toBeTruthy();
    expect(screen.getByText('Förälder')).toBeTruthy();
  });

  test('"Byt lösenord" asks to open the change-password screen', async () => {
    const { onChangePassword, onLogout } = await renderMenu();

    await fireEvent.press(screen.getByRole('button', { name: 'Byt lösenord' }));

    expect(onChangePassword).toHaveBeenCalledTimes(1);
    expect(onLogout).not.toHaveBeenCalled();
  });

  test('"Logga ut" logs out', async () => {
    const { onLogout } = await renderMenu();

    await fireEvent.press(screen.getByRole('button', { name: 'Logga ut' }));

    expect(onLogout).toHaveBeenCalledTimes(1);
  });

  test('pressing the dark layer closes it', async () => {
    const { onClose } = await renderMenu();

    await fireEvent.press(screen.getByTestId('profile-menu-scrim'));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
