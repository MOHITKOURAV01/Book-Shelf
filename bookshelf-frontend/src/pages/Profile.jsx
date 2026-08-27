import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { useAuth } from '../hooks/useAuth.js';
import './Auth.css';
import { usePageMetadata } from '../hooks/usePageMetadata.js';

const Profile = () => {
  usePageMetadata({
    title: 'Your profile',
    description:
      'Your BookShelf account details.',
  });

  const { user } = useAuth();

  return (
    <main className="profile-page">
      {/* Banner */}
      <section className="profile-header-banner">
        <div className="profile-user-summary">
          <div className="profile-avatar-circle">{profileData.avatar}</div>
          <div className="profile-user-meta">
            <h1>{formName}</h1>
            <p className="profile-email">{user?.email || 'reader@example.com'}</p>
            <div className="profile-user-badges">
              <span className="profile-badge profile-badge--role">
                {user?.role || 'Member'}
              </span>
              <span className="profile-badge profile-badge--member">
                📚 Bibliophile
              </span>
            </div>
            {profileData.bio && <p className="profile-bio-quote">"{profileData.bio}"</p>}
          </div>
        </div>
        <button
          type="button"
          className="profile-logout-btn"
          onClick={handleLogout}
          aria-label={t('auth.logout', 'Log Out')}
        >
          <span>🚪</span> {t('auth.logout', 'Log Out')}
        </button>
      </section>

      {/* Tabs */}
      <nav className="profile-tabs" aria-label="Profile navigation">
        <button
          type="button"
          className={`profile-tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          📊 {t('profile.tabs.overview', 'Overview & Analytics')}
        </button>
        <button
          type="button"
          className={`profile-tab ${activeTab === 'goals' ? 'active' : ''}`}
          onClick={() => setActiveTab('goals')}
        >
          🎯 {t('profile.tabs.goals', 'Reading Goals')}
        </button>
        <button
          type="button"
          className={`profile-tab ${activeTab === 'library' ? 'active' : ''}`}
          onClick={() => setActiveTab('library')}
        >
          📖 {t('profile.tabs.library', 'My Activity')}
        </button>
        <button
          type="button"
          className={`profile-tab ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          ⚙️ {t('profile.tabs.settings', 'Account Settings')}
        </button>
      </nav>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <section className="profile-tab-pane">
          <div>
            <h2>{t('profile.tabs.overview', 'Overview & Analytics')}</h2>
            <div className="profile-analytics-grid">
              <div className="profile-stat-card">
                <span className="profile-stat-icon">📚</span>
                <span className="profile-stat-value">{booksReadCount}</span>
                <span className="profile-stat-label">{t('profile.stats.booksRead', 'Books Read')}</span>
              </div>
              <div className="profile-stat-card">
                <span className="profile-stat-icon">📄</span>
                <span className="profile-stat-value">{pagesReadCount.toLocaleString()}</span>
                <span className="profile-stat-label">{t('profile.stats.pagesRead', 'Pages Read')}</span>
              </div>
              <div className="profile-stat-card">
                <span className="profile-stat-icon">⏰</span>
                <span className="profile-stat-value">{readingHoursCount}h</span>
                <span className="profile-stat-label">{t('profile.stats.readingHours', 'Reading Hours')}</span>
              </div>
              <div className="profile-stat-card">
                <span className="profile-stat-icon">🔥</span>
                <span className="profile-stat-value">12 {t('profile.stats.days', 'Days')}</span>
                <span className="profile-stat-label">{t('profile.stats.currentStreak', 'Current Streak')}</span>
              </div>
              <div className="profile-stat-card">
                <span className="profile-stat-icon">🏆</span>
                <span className="profile-stat-value">28 {t('profile.stats.days', 'Days')}</span>
                <span className="profile-stat-label">{t('profile.stats.longestStreak', 'Longest Streak')}</span>
              </div>
              <div className="profile-stat-card">
                <span className="profile-stat-icon">⭐</span>
                <span className="profile-stat-value">4.8</span>
                <span className="profile-stat-label">{t('profile.stats.avgRating', 'Average Rating')}</span>
              </div>
            </div>
          </div>

          <div className="profile-widget-row">
            <div className="profile-card">
              <h3>🎯 {t('profile.annualGoal', '2026 Annual Reading Goal')}</h3>
              <ReadingGoalRing
                value={booksReadCount}
                goal={profileData.annualGoal}
                label={t('profile.annualGoal', 'Annual Reading Goal')}
                unit="books"
                variant="blue"
              />
            </div>

            <div className="profile-card">
              <h3>❤️ {t('profile.preferredGenres', 'Favorite Genres')}</h3>
              <div className="profile-genre-tags">
                {profileData.preferredGenres.map((g) => (
                  <span key={g} className="profile-genre-chip">
                    {g}
                  </span>
                ))}
              </div>
              <p style={{ fontSize: '13px', color: 'var(--ink-soft)', marginTop: '8px' }}>
                You can customize your favorite genres in the Account Settings tab.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Goals Tab */}
      {activeTab === 'goals' && (
        <section className="profile-tab-pane">
          <div>
            <h2>🎯 {t('profile.tabs.goals', 'Reading Goals & Challenges')}</h2>
            <div className="profile-card">
              <h3>Set Your 2026 Annual Book Goal</h3>
              <p style={{ fontSize: '14px', color: 'var(--ink-soft)' }}>
                Challenge yourself by updating your yearly book reading target.
              </p>
              <div className="profile-goal-adjuster">
                <label htmlFor="annual-goal-input" style={{ fontWeight: '600', fontSize: '14px' }}>
                  Target Books:
                </label>
                <input
                  id="annual-goal-input"
                  type="number"
                  min="1"
                  max="500"
                  value={formGoal}
                  onChange={(e) => setFormGoal(e.target.value)}
                  className="profile-goal-input"
                />
                <button
                  type="button"
                  className="profile-save-btn"
                  onClick={handleSaveProfile}
                  style={{ padding: '8px 16px', fontSize: '14px' }}
                >
                  {t('profile.saveChanges', 'Save Goal')}
                </button>
              </div>
            </div>
          </div>

          <div className="profile-widget-row">
            <div className="profile-card">
              <h3>🔥 Reading Streak</h3>
              <ReadingStreak
                currentStreak={12}
                longestStreak={28}
                days={[true, true, true, true, true, false, true]}
              />
            </div>
            <div className="profile-card">
              <h3>📊 Monthly Target Breakdown</h3>
              <p style={{ fontSize: '14px', color: 'var(--ink-soft)' }}>
                To reach your goal of <strong>{profileData.annualGoal} books</strong>, aim to finish{' '}
                <strong>{Math.ceil(profileData.annualGoal / 12)} books per month</strong>.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Library & Activity Tab */}
      {activeTab === 'library' && (
        <section className="profile-tab-pane">
          <div>
            <h2>📖 {t('profile.tabs.library', 'My Activity & Saved Books')}</h2>
            <div className="profile-widget-row">
              <div className="profile-card">
                <h3>💖 Wishlist ({wishlistCount})</h3>
                <p style={{ fontSize: '14px', color: 'var(--ink-soft)' }}>
                  You currently have {wishlistCount} book{wishlistCount === 1 ? '' : 's'} saved.
                </p>
                <Link to="/wishlist" className="profile-save-btn" style={{ textDecoration: 'none', display: 'inline-block', textAlign: 'center' }}>
                  View Wishlist
                </Link>
              </div>

              <div className="profile-card">
                <h3>📦 Orders ({orders.length})</h3>
                <p style={{ fontSize: '14px', color: 'var(--ink-soft)' }}>
                  Track and review your past book orders.
                </p>
                <Link to="/orders" className="profile-save-btn" style={{ textDecoration: 'none', display: 'inline-block', textAlign: 'center' }}>
                  View Order History
                </Link>
              </div>
            </div>
          </div>

          <div>
            <FavoriteBooks />
          </div>

          <div>
            <RecentlyViewed />
          </div>
        </section>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <section className="profile-tab-pane">
          <div>
            <h2>⚙️ {t('profile.tabs.settings', 'Account Settings')}</h2>

            {saveMessage && (
              <div className="profile-toast-alert profile-toast-alert--success" role="alert">
                ✓ {saveMessage}
              </div>
            )}

            <form className="profile-card profile-settings-form" onSubmit={handleSaveProfile}>
              <h3>Profile Information</h3>

              <div className="profile-form-row">
                <div className="profile-form-group">
                  <label htmlFor="profile-name-input">{t('profile.name', 'Full Name')}</label>
                  <input
                    id="profile-name-input"
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    required
                  />
                </div>

                <div className="profile-form-group">
                  <label htmlFor="profile-email-input">{t('profile.email', 'Email Address')}</label>
                  <input
                    id="profile-email-input"
                    type="email"
                    value={user?.email || ''}
                    disabled
                  />
                </div>
              </div>

              <div className="profile-form-group">
                <label>{t('profile.bio', 'Reading Motto & Bio')}</label>
                <textarea
                  rows="3"
                  value={formBio}
                  onChange={(e) => setFormBio(e.target.value)}
                  placeholder={t('profile.bioPlaceholder', 'Share your reading motto...')}
                />
              </div>

              <div className="profile-form-group">
                <label>Choose Avatar Icon</label>
                <div className="profile-avatar-picker">
                  {AVATAR_OPTIONS.map((icon) => (
                    <button
                      key={icon}
                      type="button"
                      className={`profile-avatar-option ${formAvatar === icon ? 'selected' : ''}`}
                      onClick={() => setFormAvatar(icon)}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>

              <div className="profile-form-group">
                <label>{t('profile.preferredGenres', 'Favorite Genres')}</label>
                <div className="profile-genre-tags">
                  {ALL_GENRES.map((g) => (
                    <button
                      key={g}
                      type="button"
                      className={`profile-genre-chip profile-genre-chip--selectable ${
                        formGenres.includes(g) ? 'profile-genre-chip--selected' : ''
                      }`}
                      onClick={() => toggleGenre(g)}
                    >
                      {g} {formGenres.includes(g) ? '✓' : '+'}
                    </button>
                  ))}
                </div>
              </div>

              <button type="submit" className="profile-save-btn">
                {t('profile.saveChanges', 'Save Changes')}
              </button>
            </form>
          </div>

          <div>
            {securityMessage && (
              <div
                className={`profile-toast-alert profile-toast-alert--${securityMessage.type}`}
                role="alert"
              >
                {securityMessage.type === 'success' ? '✓' : '⚠️'} {securityMessage.text}
              </div>
            )}

            <form className="profile-card profile-settings-form" onSubmit={handleUpdatePassword}>
              <h3>🔒 {t('profile.security.title', 'Security & Credentials')}</h3>

              <div className="profile-form-row">
                <div className="profile-form-group">
                  <label htmlFor="current-password">{t('profile.security.currentPassword', 'Current Password')}</label>
                  <input
                    id="current-password"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                  />
                </div>

                <div className="profile-form-group">
                  <label htmlFor="new-password">{t('profile.security.newPassword', 'New Password')}</label>
                  <input
                    id="new-password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>
              </div>

              <button type="submit" className="profile-save-btn">
                {t('profile.security.updatePassword', 'Update Password')}
              </button>
            </form>
          </div>
        </section>
      )}
    </main>
  );
}
