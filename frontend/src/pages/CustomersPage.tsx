import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Customer, CustomerType, CustomerStatus } from '../types';
import { Search, Plus, Edit2, Trash2, Eye, X } from 'lucide-react';

const CustomersPage: React.FC = () => {
  const { hasRole } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination & Filters State
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const limit = 8;

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // Form Fields State
  const [customerName, setCustomerName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [email, setEmail] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [customerType, setCustomerType] = useState<CustomerType>('RETAIL');
  const [customerStatus, setCustomerStatus] = useState<CustomerStatus>('LEAD');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params: any = {
        page,
        limit,
      };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      if (typeFilter) params.type = typeFilter;

      const res = await api.get('/customers', { params });
      if (res.data.success) {
        setCustomers(res.data.data.customers);
        setTotalPages(res.data.data.pagination.totalPages);
        setTotalRecords(res.data.data.pagination.total);
      }
    } catch (err: any) {
      console.error(err);
      setError('Failed to fetch customers list');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [page, search, statusFilter, typeFilter]);

  const resetForm = () => {
    setCustomerName('');
    setMobileNumber('');
    setEmail('');
    setBusinessName('');
    setGstNumber('');
    setCustomerType('RETAIL');
    setCustomerStatus('LEAD');
    setAddress('');
    setNotes('');
    setFormError(null);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    try {
      const res = await api.post('/customers', {
        customerName,
        mobileNumber,
        email,
        businessName,
        gstNumber: gstNumber || null,
        customerType,
        status: customerStatus,
        address,
        notes: notes || null,
      });

      if (res.data.success) {
        setIsCreateOpen(false);
        resetForm();
        fetchCustomers();
      }
    } catch (err: any) {
      console.error(err);
      setFormError(err.response?.data?.message || 'Failed to create customer');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditClick = (cust: Customer) => {
    setSelectedCustomer(cust);
    setCustomerName(cust.customerName);
    setMobileNumber(cust.mobileNumber);
    setEmail(cust.email);
    setBusinessName(cust.businessName);
    setGstNumber(cust.gstNumber || '');
    setCustomerType(cust.customerType);
    setCustomerStatus(cust.status);
    setAddress(cust.address);
    setNotes(cust.notes || '');
    setIsEditOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;
    setFormError(null);
    setIsSubmitting(true);

    try {
      const res = await api.put(`/customers/${selectedCustomer.id}`, {
        customerName,
        mobileNumber,
        email,
        businessName,
        gstNumber: gstNumber || null,
        customerType,
        status: customerStatus,
        address,
        notes: notes || null,
      });

      if (res.data.success) {
        setIsEditOpen(false);
        setSelectedCustomer(null);
        resetForm();
        fetchCustomers();
      }
    } catch (err: any) {
      console.error(err);
      setFormError(err.response?.data?.message || 'Failed to update customer');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClick = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete customer "${name}"? This action cannot be undone.`)) {
      return;
    }
    try {
      const res = await api.delete(`/customers/${id}`);
      if (res.data.success) {
        fetchCustomers();
      }
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to delete customer');
    }
  };

  const isWriteAllowed = hasRole(['ADMIN', 'SALES']);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '28px', marginBottom: '6px' }}>Customer CRM Directory</h1>
          <p style={{ color: 'var(--text-muted)' }}>Manage leads, wholesalers, distributors, and follow-up activities.</p>
        </div>
        {isWriteAllowed && (
          <button className="btn btn-primary" onClick={() => { resetForm(); setIsCreateOpen(true); }}>
            <Plus size={18} /> Add Customer
          </button>
        )}
      </div>

      {/* Filters Row */}
      <div className="filters-row">
        <div className="search-input-wrapper">
          <input
            type="text"
            placeholder="Search by Name, Business, Email, or Mobile..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="form-input"
            style={{ paddingLeft: '36px' }}
          />
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        </div>

        <div className="filters-actions">
          <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }} className="form-select" style={{ width: '160px' }}>
            <option value="">All Types</option>
            <option value="RETAIL">Retail</option>
            <option value="WHOLESALE">Wholesale</option>
            <option value="DISTRIBUTOR">Distributor</option>
          </select>

          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="form-select" style={{ width: '160px' }}>
            <option value="">All Statuses</option>
            <option value="LEAD">Lead</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </div>
      </div>

      {/* Customers Table */}
      {error && <div className="alert-banner alert-banner-danger">{error}</div>}

      <div className="panel-card">
        <div className="panel-card-body" style={{ padding: 0 }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Loading CRM database...</div>
          ) : customers.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>No customers found matching the search criteria.</div>
          ) : (
            <div className="table-responsive">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Customer / Business</th>
                    <th>Contact Details</th>
                    <th>Type</th>
                    <th>GSTIN</th>
                    <th>Status</th>
                    <th>Next Follow-up</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((cust) => (
                    <tr key={cust.id}>
                      <td>
                        <span style={{ fontWeight: 600, fontSize: '15px' }}>{cust.customerName}</span>
                        <br />
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 500 }}>{cust.businessName}</span>
                      </td>
                      <td>
                        <span style={{ fontSize: '13px', fontWeight: 500 }}>{cust.mobileNumber}</span>
                        <br />
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{cust.email}</span>
                      </td>
                      <td>
                        <span className={`badge badge-${cust.customerType.toLowerCase()}`}>
                          {cust.customerType}
                        </span>
                      </td>
                      <td>{cust.gstNumber || <em style={{ color: 'var(--text-light)', fontSize: '12px' }}>N/A</em>}</td>
                      <td>
                        <span className={`badge badge-${cust.status.toLowerCase()}`}>
                          {cust.status}
                        </span>
                      </td>
                      <td>
                        {cust.followUpDate ? (
                          <span style={{ fontSize: '13px', fontWeight: 500 }}>
                            {new Date(cust.followUpDate).toLocaleDateString()}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-light)', fontSize: '12px' }}>Not Scheduled</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '8px' }}>
                          <Link to={`/customers/${cust.id}`} className="btn btn-secondary btn-sm" title="View Details" style={{ padding: '6px' }}>
                            <Eye size={14} />
                          </Link>
                          {isWriteAllowed && (
                            <button onClick={() => handleEditClick(cust)} className="btn btn-secondary btn-sm" title="Edit" style={{ padding: '6px' }}>
                              <Edit2 size={14} />
                            </button>
                          )}
                          {hasRole(['ADMIN']) && (
                            <button onClick={() => handleDeleteClick(cust.id, cust.customerName)} className="btn btn-secondary btn-sm" title="Delete" style={{ padding: '6px', color: 'var(--danger)' }}>
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Pagination Controls */}
      {!loading && totalPages > 1 && (
        <div className="pagination-container">
          <span className="pagination-info">
            Showing Page <strong>{page}</strong> of <strong>{totalPages}</strong> ({totalRecords} total customers)
          </span>
          <div className="pagination-buttons">
            <button disabled={page === 1} onClick={() => setPage(page - 1)} className="btn btn-secondary btn-sm">Previous</button>
            <button disabled={page === totalPages} onClick={() => setPage(page + 1)} className="btn btn-secondary btn-sm">Next</button>
          </div>
        </div>
      )}

      {/* CREATE MODAL */}
      {isCreateOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '650px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Add New Customer</h3>
              <button onClick={() => setIsCreateOpen(false)} className="modal-close"><X size={18} /></button>
            </div>
            <form onSubmit={handleCreateSubmit}>
              <div className="modal-body">
                {formError && <div className="alert-banner alert-banner-danger" style={{ padding: '10px', fontSize: '13px', margin: '0 0 16px 0' }}>{formError}</div>}
                
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Customer Name *</label>
                    <input type="text" value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="form-input" placeholder="e.g. Rajesh Gupta" required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Business Name *</label>
                    <input type="text" value={businessName} onChange={(e) => setBusinessName(e.target.value)} className="form-input" placeholder="e.g. Gupta Enterprises" required />
                  </div>
                </div>

                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Mobile Number *</label>
                    <input type="text" value={mobileNumber} onChange={(e) => setMobileNumber(e.target.value)} className="form-input" placeholder="10-digit number (e.g. 9876543210)" required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Email Address *</label>
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="form-input" placeholder="name@company.com" required />
                  </div>
                </div>

                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">GST Number (Optional)</label>
                    <input type="text" value={gstNumber} onChange={(e) => setGstNumber(e.target.value)} className="form-input" placeholder="15-char GSTIN" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Customer Type *</label>
                    <select value={customerType} onChange={(e) => setCustomerType(e.target.value as CustomerType)} className="form-select">
                      <option value="RETAIL">Retail</option>
                      <option value="WHOLESALE">Wholesale</option>
                      <option value="DISTRIBUTOR">Distributor</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Customer Status *</label>
                  <select value={customerStatus} onChange={(e) => setCustomerStatus(e.target.value as CustomerStatus)} className="form-select">
                    <option value="LEAD">Lead</option>
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Billing Address *</label>
                  <textarea value={address} onChange={(e) => setAddress(e.target.value)} className="form-textarea" placeholder="Full address details..." required />
                </div>

                <div className="form-group">
                  <label className="form-label">Initial Follow-up Notes / Description</label>
                  <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="form-textarea" placeholder="Any initial notes about the client..." />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setIsCreateOpen(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="btn btn-primary">{isSubmitting ? 'Saving...' : 'Save Customer'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {isEditOpen && selectedCustomer && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '650px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Edit Customer: {selectedCustomer.customerName}</h3>
              <button onClick={() => setIsEditOpen(false)} className="modal-close"><X size={18} /></button>
            </div>
            <form onSubmit={handleEditSubmit}>
              <div className="modal-body">
                {formError && <div className="alert-banner alert-banner-danger" style={{ padding: '10px', fontSize: '13px', margin: '0 0 16px 0' }}>{formError}</div>}
                
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Customer Name *</label>
                    <input type="text" value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="form-input" required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Business Name *</label>
                    <input type="text" value={businessName} onChange={(e) => setBusinessName(e.target.value)} className="form-input" required />
                  </div>
                </div>

                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Mobile Number *</label>
                    <input type="text" value={mobileNumber} onChange={(e) => setMobileNumber(e.target.value)} className="form-input" required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Email Address *</label>
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="form-input" required />
                  </div>
                </div>

                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">GST Number (Optional)</label>
                    <input type="text" value={gstNumber} onChange={(e) => setGstNumber(e.target.value)} className="form-input" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Customer Type *</label>
                    <select value={customerType} onChange={(e) => setCustomerType(e.target.value as CustomerType)} className="form-select">
                      <option value="RETAIL">Retail</option>
                      <option value="WHOLESALE">Wholesale</option>
                      <option value="DISTRIBUTOR">Distributor</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Customer Status *</label>
                  <select value={customerStatus} onChange={(e) => setCustomerStatus(e.target.value as CustomerStatus)} className="form-select">
                    <option value="LEAD">Lead</option>
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Billing Address *</label>
                  <textarea value={address} onChange={(e) => setAddress(e.target.value)} className="form-textarea" required />
                </div>

                <div className="form-group">
                  <label className="form-label">Follow-up Notes</label>
                  <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="form-textarea" />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setIsEditOpen(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="btn btn-primary">{isSubmitting ? 'Updating...' : 'Update Customer'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomersPage;
