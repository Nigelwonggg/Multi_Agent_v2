import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './AuthPage.css';

type VerifiedIdentity = {
  institutional_id: string;
  full_name: string;
  role: 'student' | 'lecturer';
};

const SignupPage: React.FC = () => {
  const [institutionalId, setInstitutionalId] = useState('');
  const [verifiedIdentity, setVerifiedIdentity] = useState<VerifiedIdentity | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [securityQuestion, setSecurityQuestion] = useState('');
  const [securityAnswer, setSecurityAnswer] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const navigate = useNavigate();

  const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

  const handleVerifyId = async () => {
    setError('');
    setSuccessMessage('');

    if (!institutionalId.trim()) {
      setError('Please enter your student or lecturer ID.');
      return;
    }

    try {
      setVerifying(true);
      const response = await fetch(`${API_BASE}/auth/verify-id`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          institutional_id: institutionalId,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        setVerifiedIdentity(null);
        throw new Error(payload.detail || 'ID verification failed.');
      }

      setVerifiedIdentity(payload);
      setSuccessMessage(`ID verified for ${payload.full_name}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ID verification failed.');
    } finally {
      setVerifying(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (!verifiedIdentity) {
      setError('Please verify your institutional ID first.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          institutional_id: verifiedIdentity.institutional_id,
          email,
          full_name: verifiedIdentity.full_name,
          password,
          role: verifiedIdentity.role,
          security_question: securityQuestion,
          security_answer: securityAnswer,
        }),
      });

      if (response.ok) {
        navigate('/login');
      } else {
        const errData = await response.json();
        setError(errData.detail || 'Signup failed');
      }
    } catch (err) {
      setError('Connection error');
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card signup-card">
        <h2>Sign Up</h2>
        <form onSubmit={handleSignup}>
          <div className="form-group">
            <label>Student / Lecturer ID</label>
            <div className="verification-row">
              <input
                type="text"
                value={institutionalId}
                onChange={(e) => {
                  setInstitutionalId(e.target.value);
                  setVerifiedIdentity(null);
                  setSuccessMessage('');
                }}
                required
                placeholder="Enter your institutional ID"
              />
              <button
                type="button"
                className="secondary-action-button"
                onClick={handleVerifyId}
                disabled={verifying}
              >
                {verifying ? 'Verifying...' : 'Verify ID'}
              </button>
            </div>
          </div>

          {verifiedIdentity && (
            <>
              <div className="status-banner">
                Verified name: <strong>{verifiedIdentity.full_name}</strong>
              </div>

              <div className="form-group">
                <label>Full Name</label>
                <input
                  type="text"
                  value={verifiedIdentity.full_name}
                  readOnly
                  className="readonly-input"
                />
              </div>
            </>
          )}

          <div className="form-group">
            <label>Email</label>
            <input 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required 
              placeholder="e.g. name@university.edu"
              disabled={!verifiedIdentity}
            />
          </div>
          <div className="form-group">
            <label>Registered Role</label>
            <input
              type="text"
              value={verifiedIdentity ? `${verifiedIdentity.role.charAt(0).toUpperCase()}${verifiedIdentity.role.slice(1)}` : ''}
              readOnly
              className="readonly-input"
              placeholder="Verify your ID to load your assigned role"
              disabled={!verifiedIdentity}
            />
            {verifiedIdentity && (
              <p className="form-hint">Your role is fixed by the uploaded registry and cannot be changed during sign up.</p>
            )}
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Password</label>
              <input 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                required 
                disabled={!verifiedIdentity}
              />
            </div>
            <div className="form-group">
              <label>Confirm Password</label>
              <input 
                type="password" 
                value={confirmPassword} 
                onChange={(e) => setConfirmPassword(e.target.value)} 
                required 
                disabled={!verifiedIdentity}
              />
            </div>
          </div>
          <div className="form-group">
            <label>Security Question</label>
            <select 
              value={securityQuestion} 
              onChange={(e) => setSecurityQuestion(e.target.value)}
              required
              disabled={!verifiedIdentity}
            >
              <option value="">Select a question</option>
              <option value="What is your pet's name?">What is your pet's name?</option>
              <option value="What was your first school?">What was your first school?</option>
              <option value="In what city were you born?">In what city were you born?</option>
            </select>
          </div>
          <div className="form-group">
            <label>Answer</label>
            <input 
              type="text" 
              value={securityAnswer} 
              onChange={(e) => setSecurityAnswer(e.target.value)} 
              required 
              disabled={!verifiedIdentity}
            />
          </div>
          {successMessage && <p className="success-message">{successMessage}</p>}
          {error && <p className="error-message">{error}</p>}
          <button type="submit" className="auth-button" disabled={!verifiedIdentity}>
            Create Account
          </button>
        </form>
        <p className="auth-link">
          Already have an account? <Link to="/login">Login</Link>
        </p>
      </div>
    </div>
  );
};

export default SignupPage;
