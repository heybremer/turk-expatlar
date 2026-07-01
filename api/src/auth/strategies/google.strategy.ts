import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback, Profile } from 'passport-google-oauth20';
import { AuthService } from '../auth.service';
import { getGoogleOAuthConfig } from '../google-oauth.config';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(private authService: AuthService) {
    const { clientID, clientSecret, callbackURL } = getGoogleOAuthConfig();
    super({
      clientID,
      clientSecret,
      callbackURL,
      scope: ['email', 'profile'],
    });
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ) {
    const email = profile.emails?.[0]?.value;
    const displayName =
      profile.displayName ?? profile.name?.givenName ?? 'Kullanıcı';
    const avatarUrl = profile.photos?.[0]?.value ?? null;

    if (!email) {
      return done(new Error('Google hesabında e-posta bulunamadı'), undefined);
    }

    try {
      const user = await this.authService.findOrCreateGoogleUser({
        googleId: profile.id,
        email,
        displayName,
        avatarUrl,
      });
      done(null, user);
    } catch (err) {
      console.error('[Google OAuth validate]', err);
      done(err as Error, undefined);
    }
  }
}
