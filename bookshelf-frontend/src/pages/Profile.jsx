import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import SkeletonLoader from '../components/SkeletonLoader.jsx';
import OrderCard from '../components/orders/OrderCard.jsx';
import { getOrders } from '../utils/orderStorage.js';
import './Profile.css';

export default function Profile() {
  const [activeTab, setActiveTab] = useState('details');
  const [loading, setLoading] = useState(true);
  const [profileOrders, setProfileOrders] = useState([]);
  const navigate = useNavigate();

  // Mock initial states
  const [accountInfo, setAccountInfo] = useState({
    name: 'John Doe',
    email: 'john@example.com',
    username: 'johndoe88'
  });
  
  const [passwordInfo, setPasswordInfo] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    newsletter: true,
    promotions: false,
    orderUpdates: true
  });

  const [messages, setMessages] = useState({
    account: { type: '', text: '' },
    password: { type: '', text: '' },
    notification: { type: '', text: '' }
  });

  useEffect(() => {
    // Basic route protection
    const isAuth = localStorage.getItem('isAuthenticated');
    if (!isAuth) {
      navigate('/login');
      return;
    }
    const timer = setTimeout(() => {
      setProfileOrders(getOrders());
      setLoading(false);
    }, 500);
    return () => clearTimeout(timer);
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('isAuthenticated');
    navigate('/login');
  };

  const handleAccountSubmit = (e) => {
    e.preventDefault();
    const { name, email, username } = accountInfo;
    
    if (!name.trim() || !email.trim() || !username.trim()) {
      setMessages({ ...messages, account: { type: 'error', text: 'All fields are required.' } });
      return;
    }
    
    if (!/\S+@\S+\.\S+/.test(email)) {
      setMessages({ ...messages, account: { type: 'error', text: 'Please enter a valid email address.' } });
      return;
    }

    setMessages({ ...messages, account: { type: 'success', text: 'Account information updated successfully.' } });
    setTimeout(() => setMessages({ ...messages, account: { type: '', text: '' } }), 3000);
  };

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    const { currentPassword, newPassword, confirmPassword } = passwordInfo;

    if (!currentPassword || !newPassword || !confirmPassword) {
      setMessages({ ...messages, password: { type: 'error', text: 'All password fields are required.' } });
      return;
    }

    if (newPassword.length < 6) {
      setMessages({ ...messages, password: { type: 'error', text: 'New password must be at least 6 characters.' } });
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessages({ ...messages, password: { type: 'error', text: 'New passwords do not match.' } });
      return;
    }

    setMessages({ ...messages, password: { type: 'success', text: 'Password updated successfully.' } });
    setPasswordInfo({ currentPassword: '', newPassword: '', confirmPassword: '' });
    setTimeout(() => setMessages({ ...messages, password: { type: '', text: '' } }), 3000);
  };

  const handleNotificationsSubmit = (e) => {
    e.preventDefault();
    setMessages({ ...messages, notification: { type: 'success', text: 'Notification preferences saved.' } });
    setTimeout(() => setMessages({ ...messages, notification: { type: '', text: '' } }), 3000);
  };
  if (loading) {
    return (
      <main className="profile-page">
        <div className="profile-container">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '2rem' }}>
            <SkeletonLoader variant="avatar" count={1} />
            <div style={{ flex: 1 }}>
              <SkeletonLoader variant="text" count={1} />
            </div>
          </div>
          <SkeletonLoader variant="text" count={3} />
        </div>
      </main>
    );
  }

  return (
    <main className="profile-page">
      <div className="profile-container">
        <header className="profile-header">
          <h1 className="profile-title">User Profile</h1>
          <button className="profile-logout-btn" onClick={handleLogout}>Log Out</button>
        </header>
        
        <div className="profile-tabs">
          <button 
            className={`profile-tab ${activeTab === 'details' ? 'active' : ''}`}
            onClick={() => setActiveTab('details')}
          >
            Account Details
          </button>
          <button 
            className={`profile-tab ${activeTab === 'orders' ? 'active' : ''}`}
            onClick={() => setActiveTab('orders')}
          >
            Order History
          </button>
          <button 
            className={`profile-tab ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            Settings
          </button>
        </div>
        
        <div className="profile-content">
          {activeTab === 'details' && (
            <div className="profile-tab-pane">
              <h2>Account Details</h2>
              <div className="profile-info-grid">
                <div className="profile-info-item">
                  <span className="profile-info-label">Name</span>
                  <span className="profile-info-value">{accountInfo.name}</span>
                </div>
                <div className="profile-info-item">
                  <span className="profile-info-label">Email</span>
                  <span className="profile-info-value">{accountInfo.email}</span>
                </div>
                <div className="profile-info-item">
                  <span className="profile-info-label">Phone</span>
                  <span className="profile-info-value">+1 (555) 123-4567</span>
                </div>
                <div className="profile-info-item">
                  <span className="profile-info-label">Shipping Address</span>
                  <span className="profile-info-value">123 Book St, Reading City, RC 12345</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'orders' && (
            <div className="profile-tab-pane">
              <h2>Order History</h2>
              {profileOrders.length === 0 ? (
                <div className="profile-empty-state">
                  <p>You haven't placed any orders yet.</p>
                  <Link to="/" className="profile-action-btn" style={{ display: 'inline-block', marginTop: '12px' }}>
                    Browse Books
                  </Link>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '8px' }}>
                  {profileOrders.map((order) => (
                    <OrderCard key={order.id} order={order} />
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="profile-tab-pane">
              <h2>Settings</h2>
              <div className="profile-settings-list">
                
                {/* Account Information Section */}
                <form className="settings-section" onSubmit={handleAccountSubmit}>
                  <h3>Account Information</h3>
                  {messages.account.text && <div className={`settings-msg ${messages.account.type}`}>{messages.account.text}</div>}
                  <div className="settings-form-group">
                    <label>Name</label>
                    <input 
                      type="text" 
                      value={accountInfo.name} 
                      onChange={(e) => setAccountInfo({...accountInfo, name: e.target.value})}
                    />
                  </div>
                  <div className="settings-form-group">
                    <label>Email</label>
                    <input 
                      type="email" 
                      value={accountInfo.email} 
                      onChange={(e) => setAccountInfo({...accountInfo, email: e.target.value})}
                    />
                  </div>
                  <div className="settings-form-group">
                    <label>Username</label>
                    <input 
                      type="text" 
                      value={accountInfo.username} 
                      onChange={(e) => setAccountInfo({...accountInfo, username: e.target.value})}
                    />
                  </div>
                  <button type="submit" className="profile-action-btn">Save Changes</button>
                </form>

                <hr className="settings-divider" />

                {/* Password Section */}
                <form className="settings-section" onSubmit={handlePasswordSubmit}>
                  <h3>Password</h3>
                  {messages.password.text && <div className={`settings-msg ${messages.password.type}`}>{messages.password.text}</div>}
                  <div className="settings-form-group">
                    <label>Current Password</label>
                    <input 
                      type="password" 
                      value={passwordInfo.currentPassword} 
                      onChange={(e) => setPasswordInfo({...passwordInfo, currentPassword: e.target.value})}
                    />
                  </div>
                  <div className="settings-form-group">
                    <label>New Password</label>
                    <input 
                      type="password" 
                      value={passwordInfo.newPassword} 
                      onChange={(e) => setPasswordInfo({...passwordInfo, newPassword: e.target.value})}
                    />
                  </div>
                  <div className="settings-form-group">
                    <label>Confirm Password</label>
                    <input 
                      type="password" 
                      value={passwordInfo.confirmPassword} 
                      onChange={(e) => setPasswordInfo({...passwordInfo, confirmPassword: e.target.value})}
                    />
                  </div>
                  <button type="submit" className="profile-action-btn">Update Password</button>
                </form>

                <hr className="settings-divider" />

                {/* Notification Preferences Section */}
                <form className="settings-section" onSubmit={handleNotificationsSubmit}>
                  <h3>Notification Preferences</h3>
                  {messages.notification.text && <div className={`settings-msg ${messages.notification.type}`}>{messages.notification.text}</div>}
                  <label className="profile-settings-item">
                    <input 
                      type="checkbox" 
                      checked={notifications.emailNotifications} 
                      onChange={(e) => setNotifications({...notifications, emailNotifications: e.target.checked})}
                    />
                    <span>Email Notifications</span>
                  </label>
                  <label className="profile-settings-item">
                    <input 
                      type="checkbox" 
                      checked={notifications.newsletter} 
                      onChange={(e) => setNotifications({...notifications, newsletter: e.target.checked})}
                    />
                    <span>Newsletter</span>
                  </label>
                  <label className="profile-settings-item">
                    <input 
                      type="checkbox" 
                      checked={notifications.promotions} 
                      onChange={(e) => setNotifications({...notifications, promotions: e.target.checked})}
                    />
                    <span>Promotions</span>
                  </label>
                  <label className="profile-settings-item">
                    <input 
                      type="checkbox" 
                      checked={notifications.orderUpdates} 
                      onChange={(e) => setNotifications({...notifications, orderUpdates: e.target.checked})}
                    />
                    <span>Order Updates</span>
                  </label>
                  <button type="submit" className="profile-action-btn">Save Preferences</button>
                </form>

              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
