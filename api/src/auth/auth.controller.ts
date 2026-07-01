import { Body, Controller, Post, Res, HttpCode, HttpStatus, UseGuards, Get, Query, Req, UseFilters } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { RequireFeature } from '../common/decorators/require-feature.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { OAuthRedirectFilter } from './filters/oauth-redirect.filter';
import { parseOAuthState, resolveMobileOAuthRedirect } from './mobile-oauth.util';
import { AuthService } from './auth.service';
import { TwoFactorService } from './two-factor.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 gün
};

const INDICATOR_OPTIONS = {
  httpOnly: false, // JS tarafından okunabilir (token içermiyor, sadece "oturum var" sinyali)
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

function setTokenCookie(res: Response, token: string) {
  res.cookie('token', token, COOKIE_OPTIONS);
  res.cookie('s', '1', INDICATOR_OPTIONS);
}

@ApiTags('auth')
@Controller('auth')
@UseFilters(OAuthRedirectFilter)
export class AuthController {
  constructor(
    private authService: AuthService,
    private twoFactorService: TwoFactorService,
  ) {}

  @Post('register')
  @RequireFeature('registration')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.register(dto);
    setTokenCookie(res, result.accessToken);
    return result;
  }

  @Post('login')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.login(dto);
    setTokenCookie(res, result.accessToken);
    return result;
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('token', { ...COOKIE_OPTIONS, maxAge: 0 });
    res.clearCookie('s', { ...INDICATOR_OPTIONS, maxAge: 0 });
    return { message: 'Çıkış yapıldı' };
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 3, ttl: 60000 } }) // 1 dakikada max 3 istek
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.requestPasswordReset(dto.email);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.token, dto.password);
  }

  @Get('verify-email')
  @HttpCode(HttpStatus.OK)
  verifyEmail(@Query('token') token: string) {
    return this.authService.verifyEmail(token);
  }

  @Post('resend-verification')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 2, ttl: 60000 } })
  resendVerification(@CurrentUser() user: { id: string }) {
    return this.authService.resendVerificationEmail(user.id);
  }

  // ─── 2FA ───────────────────────────────────────────────────────────────────

  @Get('2fa/setup')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  setup2FA(@CurrentUser() user: { id: string }) {
    return this.twoFactorService.setup(user.id);
  }

  @Post('2fa/enable')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  enable2FA(@CurrentUser() user: { id: string }, @Body('code') code: string) {
    return this.twoFactorService.enable(user.id, code);
  }

  @Post('2fa/disable')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  disable2FA(@CurrentUser() user: { id: string }, @Body('code') code: string) {
    return this.twoFactorService.disable(user.id, code);
  }

  @Post('2fa/verify')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  verify2FA(@CurrentUser() user: { id: string }, @Body('code') code: string) {
    return this.twoFactorService.validateLogin(user.id, code);
  }

  // ─── Google OAuth ──────────────────────────────────────────────────────────

  @Get('google')
  @UseGuards(GoogleAuthGuard)
  googleAuth() {
    // Passport Google redirect'i yönetir
  }

  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  async googleCallback(
    @Req() req: { user?: { id: string; email: string; role: string; emailVerified?: boolean } },
    @Res() res: Response,
    @Query('state') state?: string,
  ) {
    const webUrl = process.env.WEB_URL ?? 'http://localhost:3200';
    const { isMobile } = parseOAuthState(state);

    if (!req.user) {
      if (!res.headersSent) {
        if (isMobile) {
          res.redirect(resolveMobileOAuthRedirect(state, { error: 'oauth' }));
        } else {
          res.redirect(`${webUrl}/giris?error=oauth`);
        }
      }
      return;
    }
    try {
      const result = this.authService.buildGoogleAuthResponse(req.user);
      if (isMobile) {
        res.redirect(
          resolveMobileOAuthRedirect(state, {
            token: result.accessToken,
          }),
        );
        return;
      }
      res.cookie('token', result.accessToken, COOKIE_OPTIONS);
      res.cookie('s', '1', { ...COOKIE_OPTIONS, httpOnly: false });
      res.redirect(`${webUrl}/oauth/callback?token=${encodeURIComponent(result.accessToken)}`);
    } catch (err) {
      console.error('[Google OAuth callback]', err);
      if (!res.headersSent) {
        if (isMobile) {
          res.redirect(resolveMobileOAuthRedirect(state, { error: 'oauth' }));
        } else {
          res.redirect(`${webUrl}/giris?error=oauth`);
        }
      }
    }
  }
}
