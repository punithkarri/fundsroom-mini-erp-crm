import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Users,
  Package,
  FileText,
  LogOut,
  User as UserIcon,
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, setIsOpen }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Helper to check role matching
  const isRole = (roles: string[]) => roles.includes(user.role);

  // Define navigation items based on Role permissions
  const menuItems = [
    {
      to: '/dashboard',
      label: 'Dashboard',
      icon: <LayoutDashboard size={18} />,
      show: true,
    },
    {
      to: '/customers',
      label: 'Customers CRM',
      icon: <Users size={18} />,
      show: isRole(['ADMIN', 'SALES', 'ACCOUNTS']),
    },
    {
      to: '/products',
      label: 'Products & Stock',
      icon: <Package size={18} />,
      show: isRole(['ADMIN', 'SALES', 'WAREHOUSE', 'ACCOUNTS']),
    },
    {
      to: '/challans',
      label: 'Sales Challans',
      icon: <FileText size={18} />,
      show: isRole(['ADMIN', 'SALES', 'WAREHOUSE', 'ACCOUNTS']),
    },
  ];

  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
      <div className="sidebar-header">
        <div className="sidebar-logo">💼 ERP+CRM Portal</div>
      </div>

      <ul className="sidebar-menu">
        {menuItems
          .filter((item) => item.show)
          .map((item) => (
            <li key={item.to} className="sidebar-item" onClick={() => setIsOpen(false)}>
              <NavLink
                to={item.to}
                className={({ isActive }) =>
                  `sidebar-link ${isActive ? 'active' : ''}`
                }
              >
                {item.icon}
                <span>{item.label}</span>
              </NavLink>
            </li>
          ))}
      </ul>

      <div className="sidebar-footer">
        <div className="user-badge">
          <div className="user-avatar">
            <UserIcon size={16} />
          </div>
          <div className="user-info">
            <span className="user-name">{user.name}</span>
            <span className="user-role">{user.role}</span>
          </div>
        </div>
        <button onClick={handleLogout} className="btn-logout">
          <LogOut size={16} />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
