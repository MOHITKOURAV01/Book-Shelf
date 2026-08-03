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
        </div>
      ))}
    </>
  );
}
