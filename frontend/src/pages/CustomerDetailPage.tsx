import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Customer } from '../types';
import { ArrowLeft, Calendar, FileText, Plus, Clock } from 'lucide-react';

const CustomerDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { hasRole } = useAuth();
  
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Follow-up Form State
  const [note, setNote] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [followUpError, setFollowUpError] = useState<string | null>(null);
  const [isLogging, setIsLogging] = useState(false);

  const fetchCustomerDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get(`/customers/${id}`);
      if (res.data.success) {
        setCustomer(res.data.data);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to fetch customer profile details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomerDetails();
  }, [id]);

  const handleFollowUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFollowUpError(null);

    if (!note || !followUpDate) {
      setFollowUpError('Please fill in both fields.');
      return;
    }

    const selectedDate = new Date(followUpDate);
    if (selectedDate <= new Date()) {
      setFollowUpError('Next follow-up date must be in the future.');
      return;
    }

    setIsLogging(true);
    try {
      const res = await api.post(`/customers/${id}/follow-ups`, {
        note,
        followUpDate,
      });

      if (res.data.success) {
        setNote('');
        setFollowUpDate('');
        fetchCustomerDetails(); // reload timeline and followUpDate header
      }
    } catch (err: any) {
      console.error(err);
      setFollowUpError(err.response?.data?.message || 'Failed to submit follow-up logs');
    } finally {
      setIsLogging(false);
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '40px' }}>Loading customer records...</div>;
  }

  if (error || !customer) {
    return (
      <div className="alert-banner alert-banner-danger">
        {error || 'Customer not found.'}
        <Link to="/customers" className="btn btn-secondary btn-sm" style={{ marginLeft: '12px' }}>
          Back to Directory
        </Link>
      </div>
    );
  }

  const isWriteAllowed = hasRole(['ADMIN', 'SALES']);

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <Link to="/customers" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', textDecoration: 'none', fontSize: '14px', fontWeight: 600 }}>
          <ArrowLeft size={16} /> Back to Customer CRM Directory
        </Link>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '28px', marginBottom: '6px' }}>{customer.customerName}</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '15px' }}>{customer.businessName}</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <span className={`badge badge-${customer.customerType.toLowerCase()}`}>{customer.customerType}</span>
          <span className={`badge badge-${customer.status.toLowerCase()}`}>{customer.status}</span>
        </div>
      </div>

      <div className="detail-grid">
        {/* Left Column: Customer Profile */}
        <div>
          <div className="panel-card" style={{ marginBottom: '24px' }}>
            <div className="panel-card-header">
              <h3 className="panel-card-title">Business Profile</h3>
            </div>
            <div className="panel-card-body">
              <ul className="detail-info-list">
                <li className="detail-info-item">
                  <span className="detail-info-label">Contact Person</span>
                  <span className="detail-info-value">{customer.customerName}</span>
                </li>
                <li className="detail-info-item">
                  <span className="detail-info-label">Mobile Number</span>
                  <span className="detail-info-value">{customer.mobileNumber}</span>
                </li>
                <li className="detail-info-item">
                  <span className="detail-info-label">Email Address</span>
                  <span className="detail-info-value">{customer.email}</span>
                </li>
                <li className="detail-info-item">
                  <span className="detail-info-label">GSTIN / Tax Number</span>
                  <span className="detail-info-value">{customer.gstNumber || 'N/A'}</span>
                </li>
                <li className="detail-info-item">
                  <span className="detail-info-label">Billing Address</span>
                  <span className="detail-info-value" style={{ whiteSpace: 'pre-wrap' }}>{customer.address}</span>
                </li>
                <li className="detail-info-item">
                  <span className="detail-info-label">Next Scheduled Follow-up</span>
                  <span className="detail-info-value" style={{ color: customer.followUpDate ? 'var(--primary-color)' : 'var(--text-muted)' }}>
                    {customer.followUpDate ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <Calendar size={14} />
                        {new Date(customer.followUpDate).toLocaleDateString()}
                      </span>
                    ) : (
                      'No scheduled interactions'
                    )}
                  </span>
                </li>
                <li className="detail-info-item">
                  <span className="detail-info-label">Profile Notes</span>
                  <span className="detail-info-value" style={{ fontWeight: 'normal', color: 'var(--text-muted)' }}>
                    {customer.notes || 'No description notes available.'}
                  </span>
                </li>
              </ul>
            </div>
          </div>

          {/* Log New Follow-up (CRM Panel) */}
          {isWriteAllowed && (
            <div className="panel-card">
              <div className="panel-card-header">
                <h3 className="panel-card-title">Schedule & Log CRM Activity</h3>
              </div>
              <form onSubmit={handleFollowUpSubmit}>
                <div className="panel-card-body">
                  {followUpError && (
                    <div className="alert-banner alert-banner-danger" style={{ padding: '8px 12px', borderRadius: '6px', fontSize: '13px', margin: '0 0 16px 0' }}>
                      {followUpError}
                    </div>
                  )}

                  <div className="form-group">
                    <label className="form-label">Activity / Conversation Notes *</label>
                    <textarea
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      className="form-textarea"
                      placeholder="e.g. Called client. Enquired about bulk connector discounts. Arranged sample dispatch."
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Next Interaction Date *</label>
                    <input
                      type="datetime-local"
                      value={followUpDate}
                      onChange={(e) => setFollowUpDate(e.target.value)}
                      className="form-input"
                      required
                    />
                  </div>

                  <button type="submit" disabled={isLogging} className="btn btn-primary" style={{ width: '100%' }}>
                    <Plus size={16} /> {isLogging ? 'Logging activity...' : 'Log Activity'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Right Column: Interaction History Timeline */}
        <div>
          <div className="panel-card" style={{ minHeight: '100%' }}>
            <div className="panel-card-header">
              <h3 className="panel-card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Clock size={16} /> CRM Interaction Timeline
              </h3>
            </div>
            <div className="panel-card-body">
              {!customer.followUps || customer.followUps.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
                  <FileText size={48} style={{ opacity: 0.15, marginBottom: '16px' }} />
                  <p>No historical interactions logged for this customer profile yet.</p>
                </div>
              ) : (
                <div className="timeline">
                  {customer.followUps.map((fu) => (
                    <div key={fu.id} className="timeline-item">
                      <div className="timeline-header">
                        <span className="timeline-creator">
                          👤 {fu.creator?.name || 'System'} ({fu.creator?.role})
                        </span>
                        <span>{new Date(fu.createdAt).toLocaleString()}</span>
                      </div>
                      <div className="timeline-body">
                        <p>{fu.note}</p>
                        <div style={{ marginTop: '8px', borderTop: '1px dashed var(--border-color)', paddingTop: '6px', fontSize: '11px', color: 'var(--primary-color)', fontWeight: 600 }}>
                          🗓 Scheduled Next: {new Date(fu.followUpDate).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerDetailPage;
