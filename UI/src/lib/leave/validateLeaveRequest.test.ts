import { validateLeaveRequest } from './validateLeaveRequest';

describe('validateLeaveRequest', () => {
  test('no reason chosen gives a message', () => {
    expect(validateLeaveRequest({ reasonType: null, reasonText: '' })).toBe('Välj en orsak.');
  });

  test('no reason chosen gives the same message even with a text', () => {
    expect(validateLeaveRequest({ reasonType: null, reasonText: 'Bortrest hela helgen' })).toBe(
      'Välj en orsak.',
    );
  });

  test.each(['', 'Resa', '    ', '  abc  ', ' a b '])(
    'Annat with fewer than 5 characters after trim (%p) gives a message',
    (reasonText) => {
      expect(validateLeaveRequest({ reasonType: 'OTHER', reasonText })).toBe(
        'Skriv en orsak med minst 5 tecken.',
      );
    },
  );

  test.each(['Kalas', '  Kalas  ', 'Bortrest hela helgen'])(
    'Annat with at least 5 characters after trim (%p) is ok',
    (reasonText) => {
      expect(validateLeaveRequest({ reasonType: 'OTHER', reasonText })).toBeNull();
    },
  );

  test.each(['SICK', 'SCHOOL', 'FAMILY', 'INJURY'] as const)(
    '%s is ok whatever the text is',
    (reasonType) => {
      expect(validateLeaveRequest({ reasonType, reasonText: '' })).toBeNull();
      expect(validateLeaveRequest({ reasonType, reasonText: 'ab' })).toBeNull();
    },
  );
});
