import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { DashboardStats } from '../types';
import {
  Users,
  Package,
  AlertTriangle,
  FileText,
  Clock,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
} from 'lucide-react';

const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/dashboard/stats');
      if (res.data.success) {
        setStats(res.data.data);
      }
    } catch (err: any) {
      console.error(err);
      setError('Failed to fetch dashboard metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '40px' }}>Loading dashboard analytics...</div>;
  }

  if (error || !stats) {
    return (
      <div className="alert-banner alert-banner-danger">
        {error || 'Stats are unavailable.'}
        <button onClick={fetchStats} className="btn btn-secondary btn-sm" style={{ marginLeft: '12px' }}>Retry</button>
      </div>
    );
  }

  const { summary, recentChallans, recentStockMovements, lowStockProducts, upcomingFollowUps } = stats;

  return (
    <div>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '28px', marginBottom: '6px' }}>Dashboard Overview</h1>
        <p style={{ color: 'var(--text-muted)' }}>
          Welcome back, <strong>{user?.name}</strong>. Here is the operational summary for today.
        </p>
      </div>

      {/* KPI Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-info">
            <span className="stat-label">Total Customers</span>
            <span className="stat-value">{summary.totalCustomers}</span>
            <span style={{ fontSize: '11px', color: 'var(--success)', fontWeight: 600 }}>
              {summary.activeCustomers} Active
            </span>
          </div>
          <div className="stat-icon icon-indigo">
            <Users size={20} />
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-info">
            <span className="stat-label">Total Products</span>
            <span className="stat-value">{summary.totalProducts}</span>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>In Stock items</span>
          </div>
          <div className="stat-icon icon-cyan">
            <Package size={20} />
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-info">
            <span className="stat-label">Low Stock Alerts</span>
            <span className="stat-value" style={{ color: summary.lowStockProductsCount > 0 ? 'var(--danger)' : 'inherit' }}>
              {summary.lowStockProductsCount}
            </span>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Below threshold limit</span>
          </div>
          <div className="stat-icon icon-rose">
            <AlertTriangle size={20} />
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-info">
            <span className="stat-label">Sales Challans</span>
            <span className="stat-value">{summary.totalChallans}</span>
            <span style={{ fontSize: '11px', color: 'var(--success)', fontWeight: 600 }}>
              {summary.confirmedChallans} Confirmed
            </span>
          </div>
          <div className="stat-icon icon-amber">
            <FileText size={20} />
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-info">
            <span className="stat-label">Pending Follow-ups</span>
            <span className="stat-value">{summary.upcomingFollowUpsCount}</span>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>CRM logs pending</span>
          </div>
          <div className="stat-icon icon-indigo">
            <Calendar size={20} />
          </div>
        </div>
      </div>

      {/* Main Panels Grid */}
      <div className="dashboard-grid">
        {/* Left Side: Challans & Stock Movements */}
        <div>
          {/* Recent Sales Challans */}
          <div className="panel-card">
            <div className="panel-card-header">
              <h3 className="panel-card-title">Recent Sales Challans</h3>
              <Link to="/challans" className="btn btn-secondary btn-sm">View All</Link>
            </div>
            <div className="panel-card-body" style={{ padding: 0 }}>
              {recentChallans.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>No recent challans found.</div>
              ) : (
                <div className="table-responsive">
                  <table className="custom-table">
                    <thead>
                      <tr>
                        <th>Challan No</th>
                        <th>Customer</th>
                        <th>Qty</th>
                        <th>Status</th>
                        <th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentChallans.map((ch) => (
                        <tr key={ch.id}>
                          <td>
                            <Link to={`/challans/${ch.id}`} style={{ color: 'var(--primary-color)', fontWeight: 600, textDecoration: 'none' }}>
                              {ch.challanNumber}
                            </Link>
                          </td>
                          <td>{ch.customer?.businessName || 'N/A'}</td>
                          <td>{ch.totalQuantity}</td>
                          <td>
                            <span className={`badge badge-${ch.status.toLowerCase()}`}>
                              {ch.status}
                            </span>
                          </td>
                          <td>{new Date(ch.createdAt).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Recent Stock Movements */}
          <div className="panel-card">
            <div className="panel-card-header">
              <h3 className="panel-card-title">Recent Stock Log Movements</h3>
              <Link to="/products" className="btn btn-secondary btn-sm">Inventory Log</Link>
            </div>
            <div className="panel-card-body" style={{ padding: 0 }}>
              {recentStockMovements.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>No stock movements recorded.</div>
              ) : (
                <div className="table-responsive">
                  <table className="custom-table">
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th>Type</th>
                        <th>Quantity</th>
                        <th>Reason</th>
                        <th>User</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentStockMovements.map((m) => (
                        <tr key={m.id}>
                          <td>
                            <span style={{ fontWeight: 500 }}>{m.product?.productName}</span>
                            <br />
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{m.product?.sku}</span>
                          </td>
                          <td>
                            <span className={`badge ${m.movementType === 'IN' ? 'badge-in' : 'badge-out'}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              {m.movementType === 'IN' ? <ArrowDownLeft size={10} /> : <ArrowUpRight size={10} />}
                              {m.movementType}
                            </span>
                          </td>
                          <td>{m.quantityChanged}</td>
                          <td>{m.reason}</td>
                          <td>{m.creator?.name || 'System'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Side: CRM Follow-ups & Stock Warnings */}
        <div>
          {/* Upcoming CRM Follow-ups */}
          <div className="panel-card">
            <div className="panel-card-header">
              <h3 className="panel-card-title">Upcoming CRM Follow-ups</h3>
              <Link to="/customers" className="btn btn-secondary btn-sm">CRM Desk</Link>
            </div>
            <div className="panel-card-body" style={{ padding: 0 }}>
              {upcomingFollowUps.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>No pending follow-ups scheduled.</div>
              ) : (
                <div className="table-responsive">
                  <table className="custom-table">
                    <thead>
                      <tr>
                        <th>Customer</th>
                        <th>Date Scheduled</th>
                        <th>Last Follow-up Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {upcomingFollowUps.map((fu) => (
                        <tr key={fu.id}>
                          <td>
                            <Link to={`/customers/${fu.id}`} style={{ color: 'var(--primary-color)', fontWeight: 600, textDecoration: 'none' }}>
                              {fu.customerName}
                            </Link>
                            <br />
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{fu.businessName}</span>
                          </td>
                          <td>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 500 }}>
                              <Clock size={12} color="var(--primary-color)" />
                              {new Date(fu.followUpDate!).toLocaleDateString()}
                            </span>
                          </td>
                          <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {fu.notes || 'No notes logged.'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Low Stock Warnings */}
          <div className="panel-card">
            <div className="panel-card-header" style={{ borderColor: 'var(--danger-border)' }}>
              <h3 className="panel-card-title" style={{ color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertTriangle size={16} /> Critical Inventory Low Stock
              </h3>
              <Link to="/products" className="btn btn-secondary btn-sm">Restock Desk</Link>
            </div>
            <div className="panel-card-body" style={{ padding: 0 }}>
              {lowStockProducts.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--success)', fontWeight: 600 }}>
                  ✓ All inventory levels are stable. No low stock alerts!
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="custom-table">
                    <thead>
                      <tr>
                        <th>Product / SKU</th>
                        <th>Loc</th>
                        <th>Available Stock</th>
                        <th>Min Stock</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lowStockProducts.map((p) => (
                        <tr key={p.id}>
                          <td>
                            <span style={{ fontWeight: 600 }}>{p.productName}</span>
                            <br />
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{p.sku}</span>
                          </td>
                          <td><span className="badge badge-draft">{p.warehouseLocation}</span></td>
                          <td>
                            <span style={{ color: 'var(--danger)', fontWeight: 700 }}>
                              {p.currentStock} units
                            </span>
                          </td>
                          <td>{p.minimumStock} units</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
