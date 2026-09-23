import { sanitizeUser } from './sanitize-user.util';

describe('sanitizeUser', () => {
  it('removes credential and device fields but keeps public ones', () => {
    const safe = sanitizeUser({
      id: 'u1',
      email: 'a@b.de',
      twoFactorEnabled: true,
      passwordHash: 'hash',
      twoFactorSecret: 'secret',
      googleId: 'g-1',
      expoPushToken: 'ExponentPushToken[x]',
    });

    expect(safe).toEqual({ id: 'u1', email: 'a@b.de', twoFactorEnabled: true });
  });
});
