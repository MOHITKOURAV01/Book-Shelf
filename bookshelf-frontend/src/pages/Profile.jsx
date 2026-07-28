import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Profile.css';

export default function Profile() {
  const [activeTab, setActiveTab] = useState('details');
  const navigate = useNavigate();

  useEffect(() => {
    // Basic route protection
    const isAuth = localStorage.getItem('isAuthenticated');
    if (!isAuth) {
      navigate('/login');
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('isAuthenticated');
    navigate('/login');
  };

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
                  <span className="profile-info-value">John Doe</span>
                </div>
                <div className="profile-info-item">
                  <span className="profile-info-label">Email</span>
                  <span className="profile-info-value">john@example.com</span>
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
              <div className="profile-empty-state">
                <p>You have no previous orders.</p>
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="profile-tab-pane">
              <h2>Settings</h2>
              <div className="profile-settings-list">
                <label className="profile-settings-item">
                  <input type="checkbox" defaultChecked />
                  <span>Receive email notifications</span>
                </label>
                <label className="profile-settings-item">
                  <input type="checkbox" defaultChecked />
                  <span>Enable SMS updates for deliveries</span>
                </label>
                <div className="profile-settings-actions">
                  <button className="profile-action-btn">Update Password</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
