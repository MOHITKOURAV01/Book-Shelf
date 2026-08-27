import { useTranslation } from 'react-i18next';
import { spines } from '../data/books.js';
import './Hero.css';

export default function Hero() {
  const { t } = useTranslation();

  return (
    <section className="hero" id="shelf">
      <div className="hero__inner">
        <div className="hero__copy">
          <p className="hero__eyebrow">{t('home.heroTitle')}</p>
          <h1 className="hero__title">
            {t('home.heroTitle')}
          </h1>
          <p className="hero__sub">
            {t('home.heroSubtitle')}
          </p>
          <a className="hero__cta" href="#catalog">
            {t('home.heroCTA')} →
          </a>
        </div>

        <div className="shelf" role="list" aria-label="Featured books">
          {spines.map((book) => (
            <div
              className="shelf__spine"
              role="listitem"
              tabIndex={0}
              key={book.id}
              style={{
                '--spine-color': book.color,
                '--spine-height': `${book.height}px`,
              }}
            >
              <div className="shelf__spine-face">
                <span className="shelf__spine-title">{book.title}</span>
              </div>
              <div className="shelf__tag">
                <strong>{book.title}</strong>
                <span>{book.author}</span>
              </div>
            </div>
          ))}
        </div>
        <div className="shelf__board" aria-hidden="true" />
      </div>
    </section>
  );
}
