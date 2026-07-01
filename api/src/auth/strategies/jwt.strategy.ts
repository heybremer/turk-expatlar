import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      // Cookie'den önce Bearer header'a bak, yoksa HttpOnly cookie'den al
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        (req: Request) => (req?.cookies as Record<string, string>)?.['token'] ?? null,
      ]),
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
    });
  }

  async validate(payload: { sub: string }) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { profile: { include: { state: true, city: true } } },
    });

    if (!user || user.deletedAt) {
      throw new UnauthorizedException('Hesap bulunamadı');
    }

    if (user.status === 'BANNED') {
      throw new UnauthorizedException('Hesabınız kalıcı olarak askıya alınmıştır');
    }

    if (user.status === 'SUSPENDED') {
      // Geçici ban süresi bitmişse durumu güncelle
      if (user.bannedUntil && user.bannedUntil <= new Date()) {
        await this.prisma.user.update({
          where: { id: user.id },
          data: { status: 'ACTIVE', bannedUntil: null },
        });
      } else {
        const until = user.bannedUntil
          ? ` (${user.bannedUntil.toLocaleDateString('tr-TR')} tarihine kadar)`
          : '';
        throw new UnauthorizedException(`Hesabınız askıya alınmıştır${until}`);
      }
    }

    const { passwordHash: _, ...safeUser } = user;
    return safeUser;
  }
}
