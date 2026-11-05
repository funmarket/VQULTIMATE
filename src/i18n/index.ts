import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en/common.json';
import ja from './locales/ja/common.json';
import fr from './locales/fr/common.json';
import ar from './locales/ar/common.json';
import es from './locales/es/common.json';
import pt from './locales/pt/common.json';
import zh from './locales/zh/common.json';

// Detect initial language
const getInitialLanguage = (): string => {
  try {
    const saved = localStorage.getItem('vq_app_locale');
    if (saved) {
      let parsed = saved;
      if (saved.startsWith('"') && saved.endsWith('"')) {
        try {
          parsed = JSON.parse(saved);
        } catch (_) {}
      }
      if (['en', 'ja', 'fr', 'ar', 'es', 'pt', 'zh'].includes(parsed)) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed to read locale from local storage:', e);
  }

  // Fallback to browser language
  const browserLang = navigator.language?.split('-')[0] || 'en';
  if (['en', 'ja', 'fr', 'ar', 'es', 'pt', 'zh'].includes(browserLang)) {
    return browserLang;
  }

  return 'en';
};

const initialLang = getInitialLanguage();

// Set initial document properties
if (typeof document !== 'undefined') {
  document.documentElement.lang = initialLang;
  document.documentElement.dir = initialLang === 'ar' ? 'rtl' : 'ltr';
}

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      ja: { translation: ja },
      fr: { translation: fr },
      ar: { translation: ar },
      es: { translation: es },
      pt: { translation: pt },
      zh: { translation: zh },
    },
    lng: initialLang,
    fallbackLng: 'en',
    supportedLngs: ['en', 'ja', 'fr', 'ar', 'es', 'pt', 'zh'],
    interpolation: {
      escapeValue: false, // react already safes from xss
    },
  });

export default i18n;
