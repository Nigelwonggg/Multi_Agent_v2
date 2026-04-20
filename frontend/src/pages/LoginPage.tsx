import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Navbar from '../components/Navbar/Navbar';
import './AuthPage.css';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    try {
      const response = await fetch('http://localhost:8000/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('token', data.access_token);
        
        // Fetch user details
        const userRes = await fetch('http://localhost:8000/auth/me', {
          headers: { 'Authorization': `Bearer ${data.access_token}` },
        });
        
        if (userRes.ok) {
          const userData = await userRes.json();
          localStorage.setItem('user', JSON.stringify(userData));
          // Trigger storage event for Navbar update
          window.dispatchEvent(new Event('storage'));
        }
        
        navigate('/');
      } else {
        const errData = await response.json();
        setError(errData.detail || 'Login failed');
      }
    } catch (err) {
      setError('Connection error');
    }
  };

  return (
    <>
      <Navbar />
      <div className="auth-container">
        <div className="auth-card">
          <h2>Login</h2>
          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label>ID (Email)</label>
              <input 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                required 
                placeholder="Enter your ID/Email"
              />
            </div>
            <div className="form-group">
              <label>Password</label>
              <div className="password-input-wrapper">
                <input 
                  type={showPassword ? "text" : "password"} 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  required 
                  placeholder="Enter your password"
                />
                <button 
                  type="button" 
                  className="toggle-password" 
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>
            {error && <p className="error-message">{error}</p>}
            <button type="submit" className="auth-button">Login</button>
          </form>
          <p className="auth-link">
            Don't have an account? <Link to="/signup">Sign up</Link>
          </p>
        </div>
      </div>
    </>
  );
};

export default LoginPage;
