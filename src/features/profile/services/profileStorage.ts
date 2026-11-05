import { safeLocalStorage } from '../../../shared/services/storage/safeLocalStorage';
import { ProfileSettings, LocalDeviceAiSettings, AppLocale } from '../types/profileTypes';

const STORAGE_KEYS = {
  LOCALE: 'vq_app_locale',
  LOCAL_AI_ENABLED: 'vq_local_ai_enabled',
  LOCAL_AI_ENDPOINT: 'vq_local_ai_endpoint',
  LOCAL_AI_PROVIDER: 'vq_local_ai_provider'
};

export const profileStorage = {
  getLocale: (fallback: AppLocale = 'en'): AppLocale => {
    return safeLocalStorage.getItem<AppLocale>(STORAGE_KEYS.LOCALE, fallback);
  },

  setLocale: (locale: AppLocale): void => {
    safeLocalStorage.setItem(STORAGE_KEYS.LOCALE, locale);
  },

  getLocalAiSettings: (): LocalDeviceAiSettings => {
    const enabled = safeLocalStorage.getItem<boolean>(STORAGE_KEYS.LOCAL_AI_ENABLED, false);
    const endpoint = safeLocalStorage.getItem<string>(STORAGE_KEYS.LOCAL_AI_ENDPOINT, 'http://localhost:11434');
    const provider = safeLocalStorage.getItem<LocalDeviceAiSettings['provider']>(STORAGE_KEYS.LOCAL_AI_PROVIDER, 'auto');
    
    return { enabled, endpoint, provider };
  },

  setLocalAiSettings: (settings: Partial<LocalDeviceAiSettings>): void => {
    const current = profileStorage.getLocalAiSettings();
    const updated = { ...current, ...settings };
    
    safeLocalStorage.setItem(STORAGE_KEYS.LOCAL_AI_ENABLED, updated.enabled);
    safeLocalStorage.setItem(STORAGE_KEYS.LOCAL_AI_ENDPOINT, updated.endpoint);
    safeLocalStorage.setItem(STORAGE_KEYS.LOCAL_AI_PROVIDER, updated.provider);
  },

  clearAllProfileData: (): void => {
    safeLocalStorage.removeItem(STORAGE_KEYS.LOCALE);
    safeLocalStorage.removeItem(STORAGE_KEYS.LOCAL_AI_ENABLED);
    safeLocalStorage.removeItem(STORAGE_KEYS.LOCAL_AI_ENDPOINT);
    safeLocalStorage.removeItem(STORAGE_KEYS.LOCAL_AI_PROVIDER);
  }
};
