import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Response } from 'express';
import { getGoogleOAuthConfig } from '../google-oauth.config';
import {
  buildOAuthState,
  isAllowedMobileRedirectUri,
  resolveMobileOAuthRedirect,
} from '../mobile-oauth.util';

@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
  canActivate(context: ExecutionContext) {
    if (!getGoogleOAuthConfig().enabled) {
      const res = context.switchToHttp().getResponse<Response>();
      const req = context.switchToHttp().getRequest<{
        query?: { platform?: string; redirect_uri?: string };
      }>();
      if (req.query?.platform === 'mobile') {
        const redirectUri =
          typeof req.query?.redirect_uri === 'string' &&
          isAllowedMobileRedirectUri(req.query.redirect_uri)
            ? req.query.redirect_uri
            : undefined;
        const state = buildOAuthState('mobile', redirectUri);
        res.redirect(resolveMobileOAuthRedirect(state, { error: 'oauth_disabled' }));
        return false;
      }
      const webUrl = process.env.WEB_URL ?? 'http://localhost:3200';
      res.redirect(`${webUrl}/giris?error=oauth_disabled`);
      return false;
    }
    return super.canActivate(context);
  }

  getAuthenticateOptions(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest<{
      query?: { platform?: string; redirect_uri?: string };
    }>();
    const platform = req.query?.platform;
    const redirectUri =
      typeof req.query?.redirect_uri === 'string' &&
      isAllowedMobileRedirectUri(req.query.redirect_uri)
        ? req.query.redirect_uri
        : undefined;
    return {
      scope: ['email', 'profile'],
      state: buildOAuthState(platform, redirectUri),
    };
  }

  handleRequest<TUser>(
    err: Error | null,
    user: TUser,
    info: unknown,
    context: ExecutionContext,
  ): TUser {
    if (err || !user) {
      const message = err?.message ?? String(info ?? 'Google OAuth failed');
      console.error('[Google OAuth]', message);
      throw err ?? new UnauthorizedException(message);
    }
    return user;
  }
}
