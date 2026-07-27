import { useState } from 'react';
import { Link } from 'react-router-dom';
import './Auth.css';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    // TODO: Connect to backend for JWT authentication
    console.log('Login attempt with:', { email, password });
  };

  return (
    <main className="auth-page">
      <div className="auth-container">
        <h1 className="auth-title">Welcome Back</h1>
        <p className="auth-subtitle">Sign in to your BookShelf account</p>
        
        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-form-group">
            <label htmlFor="email">Email</label>
            <input 
              type="email" 
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required 
            />
          </div>
          
          <div className="auth-form-group">
            <label htmlFor="password">Password</label>
            <input 
              type="password" 
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required 
            />
          </div>
          
          <button type="submit" className="auth-submit-btn">
            Sign In
          </button>
        </form>
        
        <div className="auth-links">
          Don't have an account? 
          <Link to="/signup" className="auth-link">Sign up</Link>
        </div>
      </div>
    </main>
  );
}
