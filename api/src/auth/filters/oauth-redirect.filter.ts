import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  UnauthorizedException,
} from '@nestjs/common';
import type { Response } from 'express';
import { parseOAuthState, resolveMobileOAuthRedirect } from '../mobile-oauth.util';

@Catch(UnauthorizedException)
export class OAuthRedirectFilter implements ExceptionFilter {
  catch(exception: UnauthorizedException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<{ url?: string; query?: { state?: string } }>();

    if (req.url?.includes('/auth/google')) {
      if (!res.headersSent) {
        const state = typeof req.query?.state === 'string' ? req.query.state : undefined;
        const { isMobile } = parseOAuthState(state);
        const webUrl = process.env.WEB_URL ?? 'http://localhost:3200';
        if (isMobile) {
          res.redirect(resolveMobileOAuthRedirect(state, { error: 'oauth' }));
        } else {
          res.redirect(`${webUrl}/giris?error=oauth`);
        }
        return;
      }
      return;
    }

    if (!res.headersSent) {
      res.status(401).json({
        statusCode: 401,
        message: exception.message,
      });
    }
  }
}
