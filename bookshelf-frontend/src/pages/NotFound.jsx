import { Link } from 'react-router-dom';
import './NotFound.css';
import { usePageMetadata } from '../hooks/usePageMetadata.js';

export default function NotFound() {
  usePageMetadata({
    title: 'Page not found',
    description:
      'That page does not exist. Head back to the BookShelf catalogue to keep browsing.',
  });

  return (
    <main className="not-found-page">
      <div className="not-found-container">
        <h1 className="not-found-title">404</h1>
        <h2 className="not-found-subtitle">Page Not Found</h2>
        
        <div className="not-found-icon">
          📚
        </div>

        <p className="not-found-text">
          Oops! The page you're looking for doesn't exist or has been moved.
        </p>

        <Link to="/" className="not-found-home-link">
          Go Back Home
        </Link>
      </div>
    </main>
  );
}
