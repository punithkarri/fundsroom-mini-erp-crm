import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { User } from '../types';

const UsersPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [error, setError] = useState('');
  useEffect(() => { api.get('/users').then((response) => setUsers(response.data.data)).catch(() => setError('Unable to load users')); }, []);
  return <div><div className="page-header"><div><h1>Users</h1><p className="page-subtitle">Admin access directory</p></div></div>{error && <div className="alert-banner alert-banner-danger">{error}</div>}<section className="panel-card"><div className="table-responsive"><table className="custom-table"><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Created</th></tr></thead><tbody>{users.map((user) => <tr key={user.id}><td>{user.name}</td><td>{user.email}</td><td><span className="badge badge-confirmed">{user.role}</span></td><td>{new Date(user.createdAt).toLocaleDateString()}</td></tr>)}</tbody></table>{!error && users.length === 0 && <div className="empty-state">No users found.</div>}</div></section></div>;
};
export default UsersPage;
