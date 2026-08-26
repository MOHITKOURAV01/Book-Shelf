import { currencySymbol, formatMoney } from '../utils/currency.js';
import './BookPrice.css';

/**
 * Nothing imports this component yet. It is corrected anyway: it defaulted
 * `currency` to a hardcoded '₹' and concatenated the raw number after it,
 * which is the same class of bug #335 was filed for, waiting for whoever
 * wires it up. `currency` now takes a *code* and the amounts are formatted,
 * so `1234.5` renders as ₹1,234.50 rather than ₹1234.5.
 */
export default function BookPrice({
  price,
  originalPrice,
  currency,
  size = 'medium',
}) {
  const symbol = currencySymbol(currency);
  const hasDiscount = originalPrice && Number(originalPrice) > Number(price);

  const discount = hasDiscount
    ? Math.round(((originalPrice - price) / originalPrice) * 100)
    : 0;

  return (
    <div className={`book-price book-price--${size}`}>
      <span className="book-price__current">
        {formatMoney(price, { currency, fallback: `${symbol}—` })}
      </span>

      {hasDiscount && (
        <>
          <span className="book-price__original">
            {formatMoney(originalPrice, { currency, fallback: `${symbol}—` })}
          </span>

          <span className="book-price__discount">{discount}% OFF</span>
        </>
      )}
    </div>
  );
}
