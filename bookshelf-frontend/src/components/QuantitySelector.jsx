import './QuantitySelector.css';
import { useEffect, useState } from 'react';

export default function QuantitySelector({
  value = 1,
  min = 1,
  max = 99,
  onChange = () => {},
}) {
  const [quantity, setQuantity] = useState(value);

  useEffect(() => setQuantity(value), [value]);

  const update = (val) => {
    const next = Math.max(min, Math.min(max, val));
    setQuantity(next);
    onChange(next);
  };

  return (
    <div className="quantity-selector">
      <button
        className="quantity-selector__button"
        onClick={() => update(quantity - 1)}
        disabled={quantity <= min}
        aria-label="Decrease quantity"
      >
        −
      </button>

      <span className="quantity-selector__value">{quantity}</span>

      <button
        className="quantity-selector__button"
        onClick={() => update(quantity + 1)}
        disabled={quantity >= max}
        aria-label="Increase quantity"
      >
        +
      </button>
    </div>
  );
}
