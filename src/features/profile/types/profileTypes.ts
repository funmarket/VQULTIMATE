export type AppLocale = 'en' | 'ja' | 'fr' | 'ar' | 'es' | 'pt' | 'zh';

export interface LocalDeviceAiSettings {
  enabled: boolean;
  endpoint: string;
  provider: 'auto' | 'local-endpoint' | 'chrome-built-in' | 'native-bridge' | 'server';
}

export interface ProfileSettings {
  locale: AppLocale;
  localAi: LocalDeviceAiSettings;
}
