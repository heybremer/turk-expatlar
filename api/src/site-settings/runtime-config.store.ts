let cacheEnabled = true;
let cacheTtlMs = 60 * 60 * 1000;

export function setCacheConfig(enabled: boolean, ttlMinutes: number) {
  cacheEnabled = enabled;
  cacheTtlMs = Math.max(5, ttlMinutes) * 60 * 1000;
}

export function getCacheConfig() {
  return { cacheEnabled, cacheTtlMs };
}

export type FeatureFlag = 'registration' | 'forum' | 'chat' | 'events';

let featureFlags = {
  registrationEnabled: true,
  forumEnabled: true,
  chatEnabled: true,
  eventsEnabled: true,
};

export function setFeatureFlags(flags: typeof featureFlags) {
  featureFlags = { ...flags };
}

export type AppFeatureFlag =
  | 'appStateNewsEnabled'
  | 'appCityNewsEnabled'
  | 'appEventCalendarEnabled'
  | 'appPublicHolidaysEnabled'
  | 'appConsulatesEnabled'
  | 'appOfficialInstitutionsEnabled'
  | 'appTravelGuideEnabled';

let appFeatureFlags: Record<AppFeatureFlag, boolean> = {
  appStateNewsEnabled: true,
  appCityNewsEnabled: true,
  appEventCalendarEnabled: true,
  appPublicHolidaysEnabled: true,
  appConsulatesEnabled: true,
  appOfficialInstitutionsEnabled: true,
  appTravelGuideEnabled: true,
};

export function setAppFeatureFlags(flags: Partial<Record<AppFeatureFlag, boolean>>) {
  appFeatureFlags = { ...appFeatureFlags, ...flags };
}

export function isAppFeatureEnabled(flag: AppFeatureFlag): boolean {
  return appFeatureFlags[flag] !== false;
}

export function isFeatureEnabled(flag: FeatureFlag): boolean {
  switch (flag) {
    case 'registration':
      return featureFlags.registrationEnabled;
    case 'forum':
      return featureFlags.forumEnabled;
    case 'chat':
      return featureFlags.chatEnabled;
    case 'events':
      return featureFlags.eventsEnabled;
    default:
      return true;
  }
}

let maintenanceState = {
  active: false,
  message: null as string | null,
};

export function setMaintenanceState(active: boolean, message: string | null) {
  maintenanceState = { active, message };
}

export function getMaintenanceState() {
  return maintenanceState;
}
