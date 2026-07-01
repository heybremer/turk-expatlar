import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  FEATURE_FLAG_KEY,
  type FeatureFlagName,
} from '../decorators/require-feature.decorator';
import { isFeatureEnabled } from '../../site-settings/runtime-config.store';

@Injectable()
export class FeatureFlagGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const flag = this.reflector.getAllAndOverride<FeatureFlagName | undefined>(
      FEATURE_FLAG_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!flag) return true;

    if (isFeatureEnabled(flag)) return true;

    const labels: Record<FeatureFlagName, string> = {
      registration: 'Kayıt',
      forum: 'Forum',
      chat: 'Sohbet',
      events: 'Etkinlikler',
    };
    throw new ServiceUnavailableException(
      `${labels[flag]} geçici olarak kapalı`,
    );
  }
}
