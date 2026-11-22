import { menuForRole } from './menuForRole';

/** Label and route of every menu item, in order. */
function itemsOf(role: string | null | undefined) {
  return menuForRole(role).map((item) => [item.label, item.route]);
}

describe('menuForRole', () => {
  it.skip('gives a player the schedule, the coaches and past activities', () => {
    expect(itemsOf('PLAYER')).toEqual([
      ['Schema', 'Schedule'],
      ['Tränare', 'Coaches'],
      ['Tidigare aktiviteter', 'PastActivities'],
    ]);
  });

  it('gives a parent the same menu as a player', () => {
    expect(itemsOf('PARENT')).toEqual(itemsOf('PLAYER'));
  });

  it('gives a coach activities, own teams, player search and past activities', () => {
    expect(itemsOf('COACH')).toEqual([
      ['Aktiviteter', 'Activities'],
      ['Lag', 'Squad'],
      ['Sök spelare', 'Search'],
      ['Tidigare aktiviteter', 'PastActivities'],
    ]);
  });

  it('gives an admin activities, all teams, users, new user and past activities', () => {
    expect(itemsOf('ADMIN')).toEqual([
      ['Aktiviteter', 'Activities'],
      ['Lag', 'Teams'],
      ['Användare', 'Users'],
      ['Ny användare', 'NewUser'],
      ['Tidigare aktiviteter', 'PastActivities'],
    ]);
  });

  it('gives the chairman the same menu as an admin', () => {
    expect(itemsOf('CHAIRMAN')).toEqual(itemsOf('ADMIN'));
  });

  it('never shows Statistik', () => {
    for (const role of ['PLAYER', 'PARENT', 'COACH', 'CHAIRMAN', 'ADMIN']) {
      expect(menuForRole(role).map((item) => item.label)).not.toContain('Statistik');
    }
  });

  it('never lets a player or parent reach coach or admin pages', () => {
    const adminRoutes = ['Activities', 'Squad', 'Search', 'Teams', 'Users', 'NewUser'];
    for (const role of ['PLAYER', 'PARENT']) {
      const routes = menuForRole(role).map((item) => item.route);
      for (const route of adminRoutes) expect(routes).not.toContain(route);
    }
  });

  it('never lets a coach reach the user pages', () => {
    const routes = menuForRole('COACH').map((item) => item.route);
    expect(routes).not.toContain('Users');
    expect(routes).not.toContain('NewUser');
  });

  it('gives an unknown or missing role an empty menu', () => {
    expect(menuForRole('SOMETHING')).toEqual([]);
    expect(menuForRole(null)).toEqual([]);
    expect(menuForRole(undefined)).toEqual([]);
  });
});
