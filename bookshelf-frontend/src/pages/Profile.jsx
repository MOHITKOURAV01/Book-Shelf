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
    <div className="auth-container">
      <h2>My Profile</h2>
      <div className="profile-details">
        <p>
          <strong>Name:</strong> {user?.name}
        </p>
        <p>
          <strong>Email:</strong> {user?.email}
        </p>
        <p>
          <strong>Role:</strong> {user?.role}
        </p>
      </div>
    </div>
  );
};

export default Profile;
