import React from 'react';
import { Menu } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface HeaderProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

const Header: React.FC<HeaderProps> = ({ sidebarOpen, setSidebarOpen }) => {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <header className="top-header">
      <div className="header-title-container">
        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="mobile-toggle">
          <Menu size={22} />
        </button>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
          Current Role: <strong style={{ color: 'var(--primary-color)' }}>{user.role}</strong>
        </span>
      </div>
    </header>
  );
};

export default Header;
