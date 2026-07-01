const DEFAULT_SCHEME = process.env.MOBILE_APP_SCHEME ?? 'turkexpatlar';

export function defaultMobileOAuthCallbackUrl(): string {
  return `${DEFAULT_SCHEME}://oauth/callback`;
}

/** Expo Go (exp://) ve production (turkexpatlar://) callback URL'leri */
export function isAllowedMobileRedirectUri(uri: string): boolean {
  try {
    const trimmed = uri.trim();
    if (!trimmed || trimmed.length > 512) return false;

    const match = trimmed.match(/^([a-z][a-z0-9+.-]*):\/\/([^/?#]*)(\/[^?#]*)?/i);
    if (!match) return false;

    const protocol = match[1].toLowerCase();
    const host = match[2];
    const path = (match[3] ?? '').replace(/^\/--+/, '/');

    if (protocol === DEFAULT_SCHEME.toLowerCase()) {
      return host === 'oauth' && path.startsWith('/callback');
    }

    if (protocol === 'exp' || protocol === 'exps') {
      return path.includes('oauth/callback');
    }

    return false;
  } catch {
    return false;
  }
}

export function appendOAuthQueryParams(
  baseUrl: string,
  params: Record<string, string>,
): string {
  const q = new URLSearchParams(params).toString();
  if (!q) return baseUrl;
  const sep = baseUrl.includes('?') ? '&' : '?';
  return `${baseUrl}${sep}${q}`;
}

export type ParsedOAuthState = {
  isMobile: boolean;
  redirectUri?: string;
};

export function buildOAuthState(
  platform: string | undefined,
  redirectUri?: string,
): string {
  if (platform !== 'mobile') return 'web';
  if (redirectUri && isAllowedMobileRedirectUri(redirectUri)) {
    return `mobile:${encodeURIComponent(redirectUri)}`;
  }
  return 'mobile';
}

export function parseOAuthState(state?: string): ParsedOAuthState {
  if (!state || state === 'web') return { isMobile: false };
  if (state === 'mobile') return { isMobile: true };

  if (state.startsWith('mobile:')) {
    const encoded = state.slice('mobile:'.length);
    try {
      const redirectUri = decodeURIComponent(encoded);
      if (isAllowedMobileRedirectUri(redirectUri)) {
        return { isMobile: true, redirectUri };
      }
    } catch {
      /* ignore */
    }
    return { isMobile: true };
  }

  return { isMobile: false };
}

export function resolveMobileOAuthRedirect(
  state?: string,
  params: Record<string, string> = {},
): string {
  const { redirectUri } = parseOAuthState(state);
  const base = redirectUri ?? defaultMobileOAuthCallbackUrl();
  return appendOAuthQueryParams(base, params);
}
