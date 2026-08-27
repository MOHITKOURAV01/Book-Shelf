import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import './Footer.css';

export default function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="footer" id="about">
      <div className="footer__inner">
        {/* ── Left: Brand block ── */}
        <div className="footer__brand-block">
          <Link to="/" className="footer__logo">
            <span className="footer__logo-icon" aria-hidden="true">
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
              </svg>
            </span>
            {t('navbar.logo') || 'BookShelf'}
          </Link>
          <p className="footer__desc">
            {t('footer.slogan')}
          </p>
        </div>

        {/* ── Right: Link columns ── */}
        <div className="footer__columns">
          {/* Column 0 — Discover */}
          <div className="footer__col">
            <h4 className="footer__col-title">{t('footer.quickLinks')}</h4>
            <ul className="footer__col-links">
              <li>
                <a href="#catalog">{t('navbar.catalog')}</a>
              </li>
              <li>
                <Link to="/wishlist">{t('navbar.wishlist')}</Link>
              </li>
              <li>
                <Link to="/orders">{t('navbar.orders')}</Link>
              </li>
            </ul>
          </div>

          {/* Column 1 — Legal */}
          <div className="footer__col">
            <h4 className="footer__col-title">{t('footer.legal')}</h4>
            <ul className="footer__col-links">
              <li>
                <Link to="/about">{t('navbar.about')}</Link>
              </li>
              <li>
                <Link to="/privacy">{t('footer.privacy')}</Link>
              </li>
              <li>
                <Link to="/terms">{t('footer.terms')}</Link>
              </li>
            </ul>
          </div>

          {/* Column 2 — Access */}
          <div className="footer__col">
            <h4 className="footer__col-title">{t('navbar.profile')}</h4>
            <ul className="footer__col-links">
              <li>
                <Link to="/login">{t('navbar.login')}</Link>
              </li>
              <li>
                <Link to="/register">{t('navbar.register')}</Link>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="footer__bottom">
        <p className="footer__copy">
          {t('footer.copyright')}
        </p>
      </div>
    </footer>
  );
}
}
