import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

import Profile from './Profile.jsx';
import { AuthContext } from '../context/AuthContext.jsx';
import { WishlistContext } from '../context/WishlistContext.jsx';

const navigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => navigate };
});

vi.mock('../components/RecentlyViewed.jsx', () => ({
  default: () => <div data-testid="recently-viewed-mock">Recently Viewed Mock</div>,
}));

vi.mock('../components/FavoriteBooks.jsx', () => ({
  default: () => <div data-testid="favorite-books-mock">Favorite Books Mock</div>,
}));

function renderProfile(user = { name: 'Jane Reader', email: 'jane@example.com', role: 'Member' }, logout = vi.fn()) {
  const authValue = {
    user,
    isAuthenticated: true,
    loading: false,
    logout,
    login: vi.fn(),
    register: vi.fn(),
    checkAuth: vi.fn(),
  };

  const wishlistValue = {
    wishlist: ['b1', 'b2'],
    loading: false,
    count: 2,
    isWishlisted: () => true,
    toggleWishlist: vi.fn(),
  };

  return render(
    <MemoryRouter>
      <AuthContext.Provider value={authValue}>
        <WishlistContext.Provider value={wishlistValue}>
          <Profile />
        </WishlistContext.Provider>
      </AuthContext.Provider>
    </MemoryRouter>
  );
}

describe('Profile Page (Reading Portal)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('renders user details and default analytics in overview tab', () => {
    renderProfile();

    expect(screen.getByText('Jane Reader')).toBeInTheDocument();
    expect(screen.getByText('jane@example.com')).toBeInTheDocument();
    expect(screen.getByText('Books Read')).toBeInTheDocument();
    expect(screen.getByText('Pages Read')).toBeInTheDocument();
    expect(screen.getByText('Reading Hours')).toBeInTheDocument();
  });

  it('allows switching between tabs', async () => {
    const user = userEvent.setup();
    renderProfile();

    // Switch to Reading Goals tab
    const goalsTab = screen.getByRole('button', { name: /🎯 Reading Goals/i });
    await user.click(goalsTab);

    expect(screen.getByText(/Set Your 2026 Annual Book Goal/i)).toBeInTheDocument();
    expect(screen.getByText(/Monthly Target Breakdown/i)).toBeInTheDocument();

    // Switch to Account Settings tab
    const settingsTab = screen.getByRole('button', { name: /⚙️ Account Settings/i });
    await user.click(settingsTab);

    expect(screen.getByText('Profile Information')).toBeInTheDocument();
    expect(screen.getByLabelText(/full name/i)).toHaveValue('Jane Reader');
  });

  it('allows updating annual goal in goals tab', async () => {
    const user = userEvent.setup();
    renderProfile();

    const goalsTab = screen.getByRole('button', { name: /🎯 Reading Goals/i });
    await user.click(goalsTab);

    const goalInput = screen.getByLabelText(/target books:/i);
    await user.clear(goalInput);
    await user.type(goalInput, '30');

    const saveBtn = screen.getByRole('button', { name: /save goal/i });
    await user.click(saveBtn);

    const stored = JSON.parse(localStorage.getItem('bookshelf_user_profile'));
    expect(stored.annualGoal).toBe(30);
  });

  it('allows editing bio and saving profile settings', async () => {
    const user = userEvent.setup();
    renderProfile();

    const settingsTab = screen.getByRole('button', { name: /⚙️ Account Settings/i });
    await user.click(settingsTab);

    const bioInput = screen.getByPlaceholderText(/share your reading motto/i);
    await user.clear(bioInput);
    await user.type(bioInput, 'Keep reading every single day.');

    const saveBtn = screen.getByRole('button', { name: /save changes/i });
    await user.click(saveBtn);

    expect(await screen.findByText(/profile updated successfully!/i)).toBeInTheDocument();
    const stored = JSON.parse(localStorage.getItem('bookshelf_user_profile'));
    expect(stored.bio).toBe('Keep reading every single day.');
  });

  it('handles password updates validation', async () => {
    const user = userEvent.setup();
    renderProfile();

    const settingsTab = screen.getByRole('button', { name: /⚙️ Account Settings/i });
    await user.click(settingsTab);

    const updatePwdBtn = screen.getByRole('button', { name: /update password/i });
    await user.click(updatePwdBtn);

    expect(await screen.findByText(/please fill out both password fields/i)).toBeInTheDocument();
  });

  it('triggers logout when logout button is clicked', async () => {
    const user = userEvent.setup();
    const mockLogout = vi.fn().mockResolvedValue();
    renderProfile(undefined, mockLogout);

    const logoutBtn = screen.getByRole('button', { name: /log out/i });
    await user.click(logoutBtn);

    expect(mockLogout).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith('/login');
  });
});
