export function getGoogleOAuthConfig() {
  const clientID = process.env.GOOGLE_CLIENT_ID?.trim() ?? '';
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim() ?? '';
  const enabled =
    !!clientID &&
    !!clientSecret &&
    clientID !== 'DISABLED' &&
    clientSecret !== 'DISABLED';

  const apiBase = (
    process.env.API_URL ??
    process.env.SITE_URL ??
    'http://localhost:3201'
  ).replace(/\/$/, '');

  return {
    enabled,
    clientID,
    clientSecret,
    callbackURL: `${apiBase}/api/auth/google/callback`,
  };
}
