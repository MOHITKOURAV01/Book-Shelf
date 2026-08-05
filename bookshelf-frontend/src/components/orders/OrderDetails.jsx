import './OrderDetails.css';

export default function OrderDetails({ items }) {
  return (
    <div className="order-details">
      <h4>Purchased Items</h4>
      <div className="order-items-list">
        {items.map(item => (
          <div key={item.id} className="order-item">
            <img src={item.image} alt={item.title} className="order-item-image" />
            <div className="order-item-info">
              <h5>{item.title}</h5>
              <p className="order-item-author">By {item.author}</p>
            </div>
            <div className="order-item-price-qty">
              <p>${item.price.toFixed(2)}</p>
              <p>Qty: {item.quantity}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
