import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { authenticator } from 'otplib';
import { AuthService } from './auth.service';
import { MailService } from './mail.service';
import { PrismaService } from '../prisma/prisma.service';

describe('AuthService Google 2FA', () => {
  const JWT_SECRET = 'test-secret';
  const twoFactorSecret = authenticator.generateSecret();
  const baseUser = {
    id: 'u1',
    email: 'a@b.de',
    role: 'USER',
    emailVerified: true,
    twoFactorEnabled: true,
    twoFactorSecret,
    deletedAt: null,
    status: 'ACTIVE',
    bannedUntil: null,
    profile: null,
  };

  let jwt: JwtService;
  let prisma: { user: { findUnique: jest.Mock; update: jest.Mock } };
  let service: AuthService;
  let prevSecret: string | undefined;

  beforeEach(() => {
    prevSecret = process.env.JWT_SECRET;
    process.env.JWT_SECRET = JWT_SECRET;
    jwt = new JwtService({ secret: JWT_SECRET });
    prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue(baseUser),
        update: jest.fn().mockResolvedValue(baseUser),
      },
    };
    service = new AuthService(
      prisma as unknown as PrismaService,
      jwt,
      {} as MailService,
    );
  });

  afterEach(() => {
    if (prevSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = prevSecret;
  });

  it('issues an access token directly when 2FA is disabled', () => {
    const result = service.buildGoogleAuthResponse({
      ...baseUser,
      twoFactorEnabled: false,
    });
    expect('accessToken' in result).toBe(true);
  });

  it('issues a ticket that cannot be used as an access token', () => {
    const result = service.buildGoogleAuthResponse(baseUser);
    expect('twoFactorTicket' in result).toBe(true);
    const ticket = (result as { twoFactorTicket: string }).twoFactorTicket;
    expect(() => jwt.verify(ticket)).toThrow();
  });

  it('exchanges ticket + valid code for an access token without leaking secrets', async () => {
    const { twoFactorTicket } = service.buildGoogleAuthResponse(baseUser) as {
      twoFactorTicket: string;
    };

    const result = await service.completeGoogleTwoFactor(
      twoFactorTicket,
      authenticator.generate(twoFactorSecret),
    );

    expect(jwt.verify<{ sub: string }>(result.accessToken).sub).toBe('u1');
    expect(result.user).not.toHaveProperty('twoFactorSecret');
  });

  it('rejects a wrong code', async () => {
    const { twoFactorTicket } = service.buildGoogleAuthResponse(baseUser) as {
      twoFactorTicket: string;
    };
    const valid = authenticator.generate(twoFactorSecret);
    const wrong = valid === '000000' ? '111111' : '000000';

    await expect(
      service.completeGoogleTwoFactor(twoFactorTicket, wrong),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects a regular access token used as ticket', async () => {
    const accessToken = jwt.sign({ sub: 'u1' });
    await expect(
      service.completeGoogleTwoFactor(accessToken, '123456'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects when the account was deleted after the ticket was issued', async () => {
    const { twoFactorTicket } = service.buildGoogleAuthResponse(baseUser) as {
      twoFactorTicket: string;
    };
    prisma.user.findUnique.mockResolvedValue({
      ...baseUser,
      deletedAt: new Date(),
    });

    await expect(
      service.completeGoogleTwoFactor(
        twoFactorTicket,
        authenticator.generate(twoFactorSecret),
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
