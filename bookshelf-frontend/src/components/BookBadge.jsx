import './BookBadge.css';

export default function BookBadge({ type = 'default', text }) {
  const badges = {
    bestSeller: { label: 'Best Seller', className: 'book-badge--best-seller' },
    newArrival: { label: 'New Arrival', className: 'book-badge--new-arrival' },
    editorsPick: {
      label: "Editor's Pick",
      className: 'book-badge--editors-pick',
    },
    limitedEdition: {
      label: 'Limited Edition',
      className: 'book-badge--limited-edition',
    },
    trending: { label: 'Trending', className: 'book-badge--trending' },
    sale: { label: 'Sale', className: 'book-badge--sale' },
    default: { label: 'Book', className: 'book-badge--default' },
  };

  const badge = badges[type] || badges.default;

  return (
    <span className={`book-badge ${badge.className}`}>
      {text || badge.label}
    </span>
  );
}
