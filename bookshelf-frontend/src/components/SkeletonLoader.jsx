import './SkeletonLoader.css';

export default function SkeletonLoader({ variant = 'card', count = 1 }) {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className={`skeleton skeleton--${variant}`}>
          {variant === 'card' && (
            <>
              <div className="skeleton__cover shimmer"></div>
              <div className="skeleton__body">
                <div className="skeleton__title shimmer"></div>
                <div className="skeleton__text shimmer"></div>
                <div className="skeleton__text skeleton__text--short shimmer"></div>
                <div className="skeleton__button shimmer"></div>
              </div>
            </>
          )}

          {variant === 'text' && (
            <div className="skeleton__text-block">
              <div className="skeleton__text shimmer"></div>
              <div className="skeleton__text shimmer"></div>
              <div className="skeleton__text skeleton__text--short shimmer"></div>
            </div>
          )}

          {variant === 'avatar' && (
            <div className="skeleton__avatar shimmer"></div>
          )}

          {variant === "order" && (
            <div className="skeleton__order-row">
              <div className="skeleton__order-info">
                <div className="skeleton__title shimmer"></div>
                <div className="skeleton__text skeleton__text--short shimmer"></div>
              </div>
              <div className="skeleton__order-badges">
                <div className="skeleton__badge shimmer"></div>
                <div className="skeleton__badge shimmer"></div>
              </div>
              <div className="skeleton__order-total">
                <div className="skeleton__text skeleton__text--short shimmer"></div>
              </div>
            </div>
          )}

          {variant === "detail" && (
            <div className="skeleton__detail-container">
              <div className="skeleton__detail-cover shimmer"></div>
              <div className="skeleton__detail-content">
                <div className="skeleton__detail-title shimmer"></div>
                <div className="skeleton__text skeleton__text--short shimmer"></div>
                <div className="skeleton__detail-meta">
                  <div className="skeleton__badge shimmer"></div>
                  <div className="skeleton__badge shimmer"></div>
                  <div className="skeleton__badge shimmer"></div>
                </div>
                <div className="skeleton__text shimmer"></div>
                <div className="skeleton__text shimmer"></div>
                <div className="skeleton__text skeleton__text--short shimmer"></div>
                <div className="skeleton__button shimmer" style={{ marginTop: '2rem' }}></div>
              </div>
            </div>
          )}
        </div>
      ))}
    </>
  );
}
