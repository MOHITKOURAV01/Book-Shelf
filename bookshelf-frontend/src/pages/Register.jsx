import { useEffect, useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { describeApiError, fieldErrors } from '../utils/apiError.js';
import './Auth.css';

const Register = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [fieldError, setFieldError] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const { register, isAuthenticated } = useAuth();
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

    if (password !== confirmPassword) {
      // A local check, so it belongs on the field rather than in the banner.
      setFieldError({ confirmPassword: 'Passwords do not match' });
      return;
    }

    setSubmitting(true);

    try {
      await register({ name, email, password });
      navigate(redirect);
    } catch (err) {
      /*
       * These are the failures a user can actually act on — "Email already
       * registered", and the per-field messages from validateBody (see
       * #275). Reading the pre-normalisation `err.response` meant all of
       * them arrived as "Failed to register", with nothing saying which
       * field was wrong. See #325.
       */
      setError(describeApiError(err, 'Failed to register'));
      setFieldError(fieldErrors(err));
    } finally {
      setSubmitting(false);
    }
  };

  /** Every field renders its error the same way; this keeps that in one place. */
  const errorFor = (field) =>
    fieldError[field] ? (
      <span className="auth-field-error" id={`${field}-error`} role="alert">
        {fieldError[field]}
      </span>
    ) : null;

  const errorProps = (field) => ({
    'aria-invalid': fieldError[field] ? 'true' : 'false',
    'aria-describedby': fieldError[field] ? `${field}-error` : undefined,
  });

  return (
    <div className="auth-container">
      <h2>Register</h2>
      {error && (
        <div className="auth-error" role="alert">
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit} className="auth-form" noValidate>
        <div className="form-group">
          <label htmlFor="name">Name</label>
          <input
            type="text"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            {...errorProps('name')}
          />
          {errorFor('name')}
        </div>
        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            {...errorProps('email')}
          />
          {errorFor('email')}
        </div>
        <div className="form-group">
          <label htmlFor="password">Password</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength="8"
            {...errorProps('password')}
          />
          {errorFor('password')}
        </div>
        <div className="form-group">
          <label htmlFor="confirmPassword">Confirm Password</label>
          <input
            type="password"
            id="confirmPassword"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength="8"
            {...errorProps('confirmPassword')}
          />
          {errorFor('confirmPassword')}
        </div>
        <button type="submit" className="auth-button" disabled={submitting}>
          {submitting ? 'Creating account…' : 'Register'}
        </button>
      </form>
      <p>
        Already have an account?{' '}
        <Link to={`/login?redirect=${redirect}`}>Log In</Link>
      </p>
    </div>
  );
};

export default Register;
