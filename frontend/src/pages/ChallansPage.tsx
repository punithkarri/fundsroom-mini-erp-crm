import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { SalesChallan } from '../types';
import { Plus, Eye } from 'lucide-react';

const ChallansPage: React.FC = () => {
  const { hasRole } = useAuth();
  const [challans, setChallans] = useState<SalesChallan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination & Filter States
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const limit = 8;

  const fetchChallans = async () => {
    try {
      setLoading(true);
      setError(null);
      const params: any = {
        page,
        limit,
      };
      if (statusFilter) params.status = statusFilter;

      const res = await api.get('/challans', { params });
      if (res.data.success) {
        setChallans(res.data.data.challans);
        setTotalPages(res.data.data.pagination.totalPages);
        setTotalRecords(res.data.data.pagination.total);
      }
    } catch (err: any) {
      console.error(err);
      setError('Failed to load sales challans archive');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChallans();
  }, [page, statusFilter]);

  const isWriteAllowed = hasRole(['ADMIN', 'SALES']);

  return (
    <div>
      <div style={{ display: 'flex', justifySelf: 'stretch', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '28px', marginBottom: '6px' }}>Sales Challan Logs</h1>
          <p style={{ color: 'var(--text-muted)' }}>Generate, confirm, and audit customer supply delivery challans.</p>
        </div>
        {isWriteAllowed && (
          <Link to="/challans/new" className="btn btn-primary">
            <Plus size={18} /> New Sales Challan
          </Link>
        )}
      </div>

      {/* Filters Row */}
      <div className="filters-row">
        <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-muted)' }}>Quick Filters</span>
        <div className="filters-actions">
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="form-select" style={{ width: '180px' }}>
            <option value="">All Challan Statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Challans Table */}
      {error && <div className="alert-banner alert-banner-danger">{error}</div>}

      <div className="panel-card">
        <div className="panel-card-body" style={{ padding: 0 }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Loading challans records...</div>
          ) : challans.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>No sales challans recorded.</div>
          ) : (
            <div className="table-responsive">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Challan Number</th>
                    <th>Customer Name</th>
                    <th>Business Name</th>
                    <th>Total Items Qty</th>
                    <th>Status</th>
                    <th>Created By</th>
                    <th>Date Created</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {challans.map((ch) => (
                    <tr key={ch.id}>
                      <td>
                        <Link to={`/challans/${ch.id}`} style={{ color: 'var(--primary-color)', fontWeight: 700, textDecoration: 'none' }}>
                          {ch.challanNumber}
                        </Link>
                      </td>
                      <td>{ch.customer?.customerName}</td>
                      <td><strong>{ch.customer?.businessName}</strong></td>
                      <td>{ch.totalQuantity} units</td>
                      <td>
                        <span className={`badge badge-${ch.status.toLowerCase()}`}>
                          {ch.status}
                        </span>
                      </td>
                      <td>{ch.creator?.name || 'System'}</td>
                      <td>{new Date(ch.createdAt).toLocaleDateString()}</td>
                      <td style={{ textAlign: 'right' }}>
                        <Link to={`/challans/${ch.id}`} className="btn btn-secondary btn-sm" style={{ padding: '6px' }}>
                          <Eye size={14} /> View Details
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="pagination-container">
          <span className="pagination-info">
            Showing Page <strong>{page}</strong> of <strong>{totalPages}</strong> ({totalRecords} total challans)
          </span>
          <div className="pagination-buttons">
            <button disabled={page === 1} onClick={() => setPage(page - 1)} className="btn btn-secondary btn-sm">Previous</button>
            <button disabled={page === totalPages} onClick={() => setPage(page + 1)} className="btn btn-secondary btn-sm">Next</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChallansPage;
