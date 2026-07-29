import "./UserDashboard.css";

export default function UserDashboard({
  user = {
    name: "John Doe",
    email: "john@example.com",
    memberSince: "January 2026",
    avatar: "https://via.placeholder.com/100",
  },
  stats = {
    wishlist: 12,
    cart: 3,
    booksRead: 24,
    purchased: 18,
    favoriteGenre: "Fiction",
  },
  recentOrders = [
    { id: "#1021", date: "2026-07-10", status: "Delivered", total: "$45.99" },
    { id: "#1025", date: "2026-07-18", status: "Shipped", total: "$28.50" },
  ],
  recentlyViewed = [
    "Atomic Habits",
    "The Alchemist",
    "Clean Code",
  ],
}) {
  return (
    <div className="dashboard">
      <div className="dashboard__profile card">
        <img src={user.avatar} alt={user.name} className="dashboard__avatar"/>
        <div>
          <h2>{user.name}</h2>
          <p>{user.email}</p>
          <small>Member Since: {user.memberSince}</small>
        </div>
      </div>

      <div className="dashboard__stats">
        <div className="card"><h3>Wishlist</h3><p>{stats.wishlist}</p></div>
        <div className="card"><h3>Cart</h3><p>{stats.cart}</p></div>
        <div className="card"><h3>Books Read</h3><p>{stats.booksRead}</p></div>
        <div className="card"><h3>Purchased</h3><p>{stats.purchased}</p></div>
      </div>

      <div className="dashboard__grid">
        <div className="card">
          <h3>Recent Orders</h3>
          {recentOrders.map(order=>(
            <div className="dashboard__item" key={order.id}>
              <strong>{order.id}</strong>
              <span>{order.date}</span>
              <span>{order.status}</span>
              <span>{order.total}</span>
            </div>
          ))}
        </div>

        <div className="card">
          <h3>Recently Viewed</h3>
          <ul>
            {recentlyViewed.map(book=>(
              <li key={book}>{book}</li>
            ))}
          </ul>
        </div>

        <div className="card">
          <h3>Reading Statistics</h3>
          <p>Favorite Genre: {stats.favoriteGenre}</p>
          <p>Total Books Read: {stats.booksRead}</p>
        </div>

        <div className="card">
          <h3>Quick Actions</h3>
          <div className="dashboard__actions">
            <button>Wishlist</button>
            <button>Cart</button>
            <button>Orders</button>
            <button>Profile</button>
            <button>Browse Books</button>
          </div>
        </div>
      </div>
    </div>
  );
}
