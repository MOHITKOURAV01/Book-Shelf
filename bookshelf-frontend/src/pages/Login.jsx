import { useEffect, useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { describeApiError, fieldErrors } from '../utils/apiError.js';
import './Auth.css'; // We'll need some basic CSS for forms
import { usePageMetadata } from '../hooks/usePageMetadata.js';

const Login = () => {
  usePageMetadata({
    title: 'Log in',
    description:
      'Sign in to your BookShelf account to see your orders and your wishlist.',
  });

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [fieldError, setFieldError] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const redirect = new URLSearchParams(location.search).get('redirect') || '/';

  useEffect(() => {
    if (isAuthenticated) {
      navigate(redirect);
    }
  }, [isAuthenticated, navigate, redirect]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setFieldError({});
    setSubmitting(true);

    try {
      await login({ email, password });
      navigate(redirect);
    } catch (err) {
      /*
       * `utils/api.js` rejects with { status, message, code, original } — the
       * raw Axios error lives under `original`, so the `err.response?.data?.
       * message` this used to read was always undefined and every failure
       * rendered as "Failed to login". A wrong password, a 15-minute
       * rate-limit lockout and an unreachable server were indistinguishable.
       * See #325.
       */
      setError(describeApiError(err, 'Failed to login'));
      setFieldError(fieldErrors(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-container">
      <h2>Log In</h2>
      {error && (
        <div className="auth-error" role="alert">
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit} className="auth-form" noValidate>
        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            aria-invalid={fieldError.email ? 'true' : 'false'}
            aria-describedby={fieldError.email ? 'email-error' : undefined}
          />
          {fieldError.email && (
            <span className="auth-field-error" id="email-error" role="alert">
              {fieldError.email}
            </span>
          )}
        </div>
        <div className="form-group">
          <label htmlFor="password">Password</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            aria-invalid={fieldError.password ? 'true' : 'false'}
            aria-describedby={fieldError.password ? 'password-error' : undefined}
          />
          {fieldError.password && (
            <span className="auth-field-error" id="password-error" role="alert">
              {fieldError.password}
            </span>
          )}
        </div>
        <button type="submit" className="auth-button" disabled={submitting}>
          {submitting ? 'Logging in…' : 'Login'}
        </button>
      </form>
      <p>
        Don&apos;t have an account?{' '}
        <Link to={`/register?redirect=${redirect}`}>Register</Link>
      </p>
    </div>
  );
};

export default Login;
