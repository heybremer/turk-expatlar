import { SetMetadata } from '@nestjs/common';
import type { FeatureFlag } from '../../site-settings/runtime-config.store';

export type FeatureFlagName = FeatureFlag;

export const FEATURE_FLAG_KEY = 'feature_flag';

export const RequireFeature = (flag: FeatureFlagName) =>
  SetMetadata(FEATURE_FLAG_KEY, flag);
