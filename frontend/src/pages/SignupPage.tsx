import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Navbar from '../components/Navbar/Navbar';
import './AuthPage.css';

const SignupPage: React.FC = () => {
  const [step, setStep] = useState(1);
  const [studentId, setStudentId] = useState('');
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('student');
  const [securityQuestion, setSecurityQuestion] = useState('');
  const [securityAnswer, setSecurityAnswer] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleVerifyId = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch(`http://localhost:8000/auth/verify-id/${studentId}`);
      const data = await response.json();

      if (response.ok) {
        setFullName(data.name);
        setRole(data.role);
        setStep(2);
      } else {
        setError(data.detail || 'ID verification failed');
      }
    } catch (err) {
      setError('Connection error');
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    try {
      const response = await fetch('http://localhost:8000/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          role,
          full_name: fullName,
          student_id: studentId,
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
    <>
      <Navbar />
      <div className="auth-container">
        <div className="auth-card signup-card">
          <h2>Sign Up</h2>
          
          {step === 1 && (
            <form onSubmit={handleVerifyId}>
              <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', textAlign: 'center' }}>
                Please enter your Student or Lecturer ID to begin.
              </p>
              <div className="form-group">
                <label>Student / Lecturer ID</label>
                <input 
                  type="text" 
                  value={studentId} 
                  onChange={(e) => setStudentId(e.target.value)} 
                  required 
                  placeholder="Enter your ID"
                />
              </div>
              {error && <p className="error-message">{error}</p>}
              <button type="submit" className="auth-button" disabled={loading}>
                {loading ? 'Verifying...' : 'Verify ID'}
              </button>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={handleSignup}>
              <div className="form-group">
                <label>Name (Verified)</label>
                <input type="text" value={fullName} disabled />
              </div>
              <div className="form-group">
                <label>Role</label>
                <input type="text" value={role.charAt(0).toUpperCase() + role.slice(1)} disabled />
              </div>
              <div className="form-group">
                <label>Email Address</label>
                <input 
                  type="email" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  required 
                  placeholder="e.g. name@university.edu"
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Password</label>
                  <input 
                    type="password" 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                    required 
                  />
                </div>
                <div className="form-group">
                  <label>Confirm Password</label>
                  <input 
                    type="password" 
                    value={confirmPassword} 
                    onChange={(e) => setConfirmPassword(e.target.value)} 
                    required 
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Security Question</label>
                <select 
                  value={securityQuestion} 
                  onChange={(e) => setSecurityQuestion(e.target.value)}
                  required
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
                />
              </div>
              {error && <p className="error-message">{error}</p>}
              <div className="form-row" style={{ marginTop: '1.5rem' }}>
                 <button type="button" className="auth-button" style={{ background: 'transparent', color: 'var(--accent)', border: '1px solid var(--accent)' }} onClick={() => setStep(1)}>Back</button>
                 <button type="submit" className="auth-button">Create Account</button>
              </div>
            </form>
          )}

          <p className="auth-link">
            Already have an account? <Link to="/login">Login</Link>
          </p>
        </div>
      </div>
    </>
  );
};

export default SignupPage;
