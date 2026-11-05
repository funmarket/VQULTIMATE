import { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { profileStorage } from '../services/profileStorage';
import { AppLocale } from '../types/profileTypes';

export function useProfileSettings() {
  const { t, i18n } = useTranslation();
  const [locale, setLocaleState] = useState<AppLocale>(() => profileStorage.getLocale('en'));

  const setLocale = useCallback((newLocale: AppLocale) => {
    setLocaleState(newLocale);
    profileStorage.setLocale(newLocale);
    
    // Update i18n
    i18n.changeLanguage(newLocale);
    
    // Update document elements
    if (typeof document !== 'undefined') {
      document.documentElement.lang = newLocale;
      document.documentElement.dir = newLocale === 'ar' ? 'rtl' : 'ltr';
    }
    
    // Dispatch a custom event so other parts of the app can react if needed
    window.dispatchEvent(new CustomEvent('vq_locale_changed', { detail: newLocale }));
  }, [i18n]);

  // Keep changeLocale for compatibility
  const changeLocale = setLocale;

  const supportedLocales: AppLocale[] = ['en', 'ja', 'fr', 'ar', 'es', 'pt', 'zh'];

  const toggleLocale = useCallback(() => {
    const currentIndex = supportedLocales.indexOf(locale);
    const nextIndex = (currentIndex + 1) % supportedLocales.length;
    setLocale(supportedLocales[nextIndex]);
  }, [locale, setLocale]);

  useEffect(() => {
    const handleLocaleChanged = (e: Event) => {
      const customEvent = e as CustomEvent<AppLocale>;
      if (customEvent.detail && customEvent.detail !== locale) {
        setLocaleState(customEvent.detail);
        i18n.changeLanguage(customEvent.detail);
        if (typeof document !== 'undefined') {
          document.documentElement.lang = customEvent.detail;
          document.documentElement.dir = customEvent.detail === 'ar' ? 'rtl' : 'ltr';
        }
      }
    };
    window.addEventListener('vq_locale_changed', handleLocaleChanged);
    return () => {
      window.removeEventListener('vq_locale_changed', handleLocaleChanged);
    };
  }, [locale, i18n]);

  return {
    locale,
    setLocale,
    changeLocale,
    toggleLocale,
    supportedLocales,
    t
  };
}
