import { useState } from 'react';
import './Rating.css';

export default function Rating({ value, onChange }) {
  const [hoverValue, setHoverValue] = useState(0);

  return (
    <div className="rating-stars">
      {[1, 2, 3, 4, 5].map((star) => (
        <span
          key={star}
          className={`rating-star ${star <= (hoverValue || value) ? 'filled' : ''}`}
          onClick={() => onChange(star)}
          onMouseEnter={() => setHoverValue(star)}
          onMouseLeave={() => setHoverValue(0)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onChange(star);
            }
          }}
          aria-label={`${star} Star${star > 1 ? 's' : ''}`}
        >
          {star <= (hoverValue || value) ? '★' : '☆'}
        </span>
      ))}
    </div>
  );
}
