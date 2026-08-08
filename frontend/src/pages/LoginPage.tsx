import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    setIsSubmitting(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(
        err.response?.data?.message || 'Login failed. Please check your credentials.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const fillCredentials = (roleEmail: string, rolePass: string) => {
    setEmail(roleEmail);
    setPassword(rolePass);
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo">💼 ERP + CRM</div>
          <p className="login-subtitle">Operations Portal Sign In</p>
        </div>

        {error && (
          <div className="alert-banner alert-banner-danger" style={{ padding: '10px 14px', borderRadius: '6px', fontSize: '13px', margin: '0 0 20px 0' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="form-input"
              placeholder="name@company.com"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="form-input"
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="btn btn-primary"
            style={{ width: '100%', padding: '12px', marginTop: '8px' }}
          >
            {isSubmitting ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <details className="login-credentials-helper">
          <summary>🔑 Quick Demo Logins</summary>
          <ul>
            <li onClick={() => fillCredentials('admin@example.com', 'Admin@123')} style={{ cursor: 'pointer', padding: '4px', borderRadius: '4px', border: '1px dashed #cbd5e1', marginBottom: '6px', backgroundColor: '#ffffff' }}>
              <strong>Admin:</strong> admin@example.com (Admin@123)
            </li>
            <li onClick={() => fillCredentials('sales@example.com', 'Sales@123')} style={{ cursor: 'pointer', padding: '4px', borderRadius: '4px', border: '1px dashed #cbd5e1', marginBottom: '6px', backgroundColor: '#ffffff' }}>
              <strong>Sales:</strong> sales@example.com (Sales@123)
            </li>
            <li onClick={() => fillCredentials('warehouse@example.com', 'Warehouse@123')} style={{ cursor: 'pointer', padding: '4px', borderRadius: '4px', border: '1px dashed #cbd5e1', marginBottom: '6px', backgroundColor: '#ffffff' }}>
              <strong>Warehouse:</strong> warehouse@example.com (Warehouse@123)
            </li>
            <li onClick={() => fillCredentials('accounts@example.com', 'Accounts@123')} style={{ cursor: 'pointer', padding: '4px', borderRadius: '4px', border: '1px dashed #cbd5e1', backgroundColor: '#ffffff' }}>
              <strong>Accounts:</strong> accounts@example.com (Accounts@123)
            </li>
          </ul>
        </details>
      </div>
    </div>
  );
};

export default LoginPage;
