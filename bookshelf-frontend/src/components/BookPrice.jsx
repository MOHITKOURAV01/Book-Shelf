import './BookPrice.css';

export default function BookPrice({
  price,
  originalPrice,
  currency = '₹',
  size = 'medium',
}) {
  const hasDiscount = originalPrice && Number(originalPrice) > Number(price);

  const discount = hasDiscount
    ? Math.round(((originalPrice - price) / originalPrice) * 100)
    : 0;

  return (
    <div className={`book-price book-price--${size}`}>
      <span className="book-price__current">
        {currency}
        {price}
      </span>

      {hasDiscount && (
        <>
          <span className="book-price__original">
            {currency}
            {originalPrice}
          </span>

          <span className="book-price__discount">{discount}% OFF</span>
        </>
      )}
    </div>
  );
}
