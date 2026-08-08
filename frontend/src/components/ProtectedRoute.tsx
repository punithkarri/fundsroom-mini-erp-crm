import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Role } from '../types';
import Layout from './Layout';
import { ShieldAlert } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: Role[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center', backgroundColor: 'var(--bg-app)' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ border: '4px solid #f3f3f3', borderTop: '4px solid var(--primary-color)', borderRadius: '50%', width: '40px', height: '40px', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
          <p style={{ fontWeight: 600, color: 'var(--text-muted)' }}>Loading session...</p>
        </div>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <Layout>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', textAlign: 'center' }}>
          <ShieldAlert size={64} color="var(--danger)" style={{ marginBottom: '24px' }} />
          <h2 style={{ fontSize: '24px', marginBottom: '8px' }}>Access Denied</h2>
          <p style={{ color: 'var(--text-muted)', maxWidth: '400px', marginBottom: '24px' }}>
            Your account role <strong>({user.role})</strong> does not have permission to view this section of the ERP portal.
          </p>
          <Navigate to="/dashboard" replace={false} />
        </div>
      </Layout>
    );
  }

  return <Layout>{children}</Layout>;
};

export default ProtectedRoute;
