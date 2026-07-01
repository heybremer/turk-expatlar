import {
  Injectable,
  NestMiddleware,
  ServiceUnavailableException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { NextFunction, Request, Response } from 'express';
import { getMaintenanceState } from '../site-settings/runtime-config.store';

const EXEMPT_PREFIXES = [
  '/api/site-settings/public',
  '/api/auth',
  '/api/admin',
  '/api/docs',
  '/api/health',
];

function extractToken(req: Request): string | null {
  const auth = req.headers.authorization;
  if (auth?.startsWith('Bearer ')) {
    return auth.slice(7);
  }
  const cookies = req.cookies as Record<string, string> | undefined;
  return cookies?.token ?? null;
}

@Injectable()
export class MaintenanceMiddleware implements NestMiddleware {
  constructor(private jwtService: JwtService) {}

  private isStaffToken(token: string): boolean {
    try {
      const payload = this.jwtService.verify<{ role?: string }>(token);
      return payload.role === 'ADMIN' || payload.role === 'MODERATOR';
    } catch {
      return false;
    }
  }

  use(req: Request, _res: Response, next: NextFunction) {
    const path = req.originalUrl.split('?')[0];
    if (EXEMPT_PREFIXES.some((p) => path.startsWith(p))) {
      return next();
    }

    const { active, message } = getMaintenanceState();
    if (!active) return next();

    const token = extractToken(req);
    if (token && this.isStaffToken(token)) {
      return next();
    }

    throw new ServiceUnavailableException({
      message: message ?? 'Sitemiz kısa süreli bakımda.',
      maintenance: true,
    });
  }
}
