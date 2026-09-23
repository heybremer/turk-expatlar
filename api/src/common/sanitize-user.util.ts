type SensitiveUserFields = {
  passwordHash?: string | null;
  twoFactorSecret?: string | null;
  googleId?: string | null;
  expoPushToken?: string | null;
};

/** İstemciye veya req.user'a asla taşınmaması gereken kimlik alanlarını çıkarır. */
export function sanitizeUser<T extends SensitiveUserFields>(
  user: T,
): Omit<T, keyof SensitiveUserFields> {
  const {
    passwordHash: _passwordHash,
    twoFactorSecret: _twoFactorSecret,
    googleId: _googleId,
    expoPushToken: _expoPushToken,
    ...safe
  } = user;
  return safe;
}
