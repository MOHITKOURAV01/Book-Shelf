import { useTranslation } from 'react-i18next';
import './LanguageSwitcher.css';

const LANGUAGES = [
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
];

export default function LanguageSwitcher() {
  const { i18n, t } = useTranslation();

  const handleLanguageChange = (e) => {
    const newLang = e.target.value;
    if (i18n && typeof i18n.changeLanguage === 'function') {
      i18n.changeLanguage(newLang);
    }
  };

  const currentLang = i18n?.language || 'en';

  return (
    <div className="language-switcher" title={t ? t('navbar.language') : 'Language'}>
      <select
        className="language-switcher__select"
        value={currentLang}
        onChange={handleLanguageChange}
        aria-label={t ? t('navbar.language') : 'Language'}
      >
        {LANGUAGES.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {lang.flag} {lang.label}
          </option>
        ))}
      </select>
    </div>
  );
}
