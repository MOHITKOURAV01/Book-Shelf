import { Link } from 'react-router-dom';
import './EmptyOrders.css';

export default function EmptyOrders() {
  return (
    <div className="empty-orders">
      <div className="empty-icon">📦</div>
      <h3>No orders yet</h3>
      <p>Looks like you haven't purchased any books yet.</p>
      <Link to="/" className="btn btn-primary mt-4">Start Shopping</Link>
    </div>
  );
}
