import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { SalesChallan } from '../types';
import { ArrowLeft, CheckCircle, XCircle, Printer } from 'lucide-react';

const ChallanDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { hasRole } = useAuth();
  
  const [challan, setChallan] = useState<SalesChallan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchChallanDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get(`/challans/${id}`);
      if (res.data.success) {
        setChallan(res.data.data);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to fetch sales challan details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChallanDetails();
  }, [id]);

  const handleConfirm = async () => {
    if (!window.confirm('Confirm Challan? This will lock product rows, check available stock, and permanently deduct items from inventory.')) {
      return;
    }

    setActionError(null);
    setActionSuccess(null);
    setIsProcessing(true);

    try {
      const res = await api.post(`/challans/${id}/confirm`);
      if (res.data.success) {
        setActionSuccess('Sales Challan successfully confirmed! Inventory stock levels updated.');
        fetchChallanDetails();
      }
    } catch (err: any) {
      console.error(err);
      setActionError(err.response?.data?.message || 'Failed to confirm challan');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancel = async () => {
    const isConfirmed = challan?.status === 'CONFIRMED';
    const confirmMsg = isConfirmed
      ? 'Cancel CONFIRMED Challan? This will return all deducted item quantities back to warehouse inventory and record IN movements.'
      : 'Cancel DRAFT Challan? This will cancel the challan without changing any stock levels.';

    if (!window.confirm(confirmMsg)) {
      return;
    }

    setActionError(null);
    setActionSuccess(null);
    setIsProcessing(true);

    try {
      const res = await api.post(`/challans/${id}/cancel`);
      if (res.data.success) {
        setActionSuccess(
          isConfirmed
            ? 'Sales Challan cancelled and products successfully restocked into warehouse.'
            : 'Draft Sales Challan successfully cancelled.'
        );
        fetchChallanDetails();
      }
    } catch (err: any) {
      console.error(err);
      setActionError(err.response?.data?.message || 'Failed to cancel challan');
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '40px' }}>Loading challan record...</div>;
  }

  if (error || !challan) {
    return (
      <div className="alert-banner alert-banner-danger">
        {error || 'Sales challan not found.'}
        <Link to="/challans" className="btn btn-secondary btn-sm" style={{ marginLeft: '12px' }}>
          Back to list
        </Link>
      </div>
    );
  }

  const isWriteAllowed = hasRole(['ADMIN', 'SALES']);
  const totalVal = challan.items?.reduce((acc, it) => acc + Number(it.totalPrice), 0) || 0;

  return (
    <div>
      <div className="no-print" style={{ marginBottom: '24px' }}>
        <Link to="/challans" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', textDecoration: 'none', fontSize: '14px', fontWeight: 600 }}>
          <ArrowLeft size={16} /> Back to Challan Logs
        </Link>
      </div>

      {actionSuccess && (
        <div className="alert-banner alert-banner-success no-print" style={{ marginBottom: '24px' }}>
          {actionSuccess}
        </div>
      )}

      {actionError && (
        <div className="alert-banner alert-banner-danger no-print" style={{ marginBottom: '24px' }}>
          {actionError}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '28px', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            {challan.challanNumber}
            <span className={`badge badge-${challan.status.toLowerCase()}`}>{challan.status}</span>
          </h1>
          <p className="no-print" style={{ color: 'var(--text-muted)' }}>Supply details and dispatch list.</p>
        </div>
        <div className="no-print" style={{ display: 'flex', gap: '12px' }}>
          <button onClick={handlePrint} className="btn btn-secondary">
            <Printer size={16} /> Print Challan
          </button>
          
          {isWriteAllowed && challan.status === 'DRAFT' && (
            <>
              <button onClick={handleCancel} disabled={isProcessing} className="btn btn-danger">
                <XCircle size={16} /> Cancel Challan
              </button>
              <button onClick={handleConfirm} disabled={isProcessing} className="btn btn-success">
                <CheckCircle size={16} /> Confirm & Deduct Stock
              </button>
            </>
          )}

          {isWriteAllowed && challan.status === 'CONFIRMED' && (
            <button onClick={handleCancel} disabled={isProcessing} className="btn btn-danger">
              <XCircle size={16} /> Cancel & Restock
            </button>
          )}
        </div>
      </div>

      <div className="detail-grid">
        {/* Left Column: Metadata details */}
        <div>
          <div className="panel-card" style={{ height: 'fit-content' }}>
            <div className="panel-card-header">
              <h3 className="panel-card-title">Billing & Supply Info</h3>
            </div>
            <div className="panel-card-body">
              <ul className="detail-info-list">
                <li className="detail-info-item">
                  <span className="detail-info-label">Customer Business</span>
                  <span className="detail-info-value" style={{ fontWeight: 600 }}>{challan.customer?.businessName}</span>
                </li>
                <li className="detail-info-item">
                  <span className="detail-info-label">Contact Person</span>
                  <span className="detail-info-value">{challan.customer?.customerName}</span>
                </li>
                <li className="detail-info-item">
                  <span className="detail-info-label">Mobile / Email</span>
                  <span className="detail-info-value">{challan.customer?.mobileNumber} | {challan.customer?.email}</span>
                </li>
                <li className="detail-info-item">
                  <span className="detail-info-label">GSTIN ID</span>
                  <span className="detail-info-value">{challan.customer?.gstNumber || 'N/A'}</span>
                </li>
                <li className="detail-info-item">
                  <span className="detail-info-label">Shipping / Delivery Address</span>
                  <span className="detail-info-value" style={{ whiteSpace: 'pre-wrap' }}>{challan.customer?.address}</span>
                </li>
                <li className="detail-info-item">
                  <span className="detail-info-label">Order Created Date</span>
                  <span className="detail-info-value">{new Date(challan.createdAt).toLocaleString()}</span>
                </li>
                <li className="detail-info-item">
                  <span className="detail-info-label">Prepared By (Sales Employee)</span>
                  <span className="detail-info-value">{challan.creator?.name || 'System'}</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Right Column: Order Items Table */}
        <div>
          <div className="panel-card">
            <div className="panel-card-header">
              <h3 className="panel-card-title">Dispatch Material List</h3>
            </div>
            <div className="panel-card-body" style={{ padding: 0 }}>
              <div className="table-responsive">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Product Snapshot Details</th>
                      <th>SKU Snapshot</th>
                      <th>Qty Ordered</th>
                      <th>Price snapshot</th>
                      <th style={{ textAlign: 'right' }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {challan.items?.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <span style={{ fontWeight: 600 }}>{item.productNameSnapshot}</span>
                          {challan.status === 'DRAFT' && (
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                              Current Live Stock: {item.product?.currentStock} units
                            </div>
                          )}
                        </td>
                        <td><code>{item.skuSnapshot}</code></td>
                        <td>{item.quantity} units</td>
                        <td>₹{Number(item.unitPriceSnapshot).toFixed(2)}</td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>
                          ₹{Number(item.totalPrice).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                    {/* Totals rows */}
                    <tr style={{ backgroundColor: '#f8fafc', borderTop: '2px solid var(--border-color)' }}>
                      <td colSpan={2} style={{ fontWeight: 600, textTransform: 'uppercase', fontSize: '12px' }}>Total Summary</td>
                      <td style={{ fontWeight: 700 }}>{challan.totalQuantity} units</td>
                      <td></td>
                      <td style={{ textAlign: 'right', fontWeight: 800, fontSize: '16px', color: 'var(--primary-color)', fontFamily: 'Outfit' }}>
                        ₹{totalVal.toFixed(2)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="no-print" style={{ backgroundColor: 'var(--bg-app)', border: '1px dashed var(--border-color)', padding: '16px', borderRadius: '8px', fontSize: '12.5px', color: 'var(--text-muted)' }}>
            ⚠️ <strong>ERP Compliance Policy:</strong> This confirmed challan stores the historical product name, SKU, and unit price snapshot. Live catalog adjustments made later will *not* impact this historical document.
          </div>
        </div>
      </div>
      
      {/* CSS styling override specifically for printing */}
      <style>{`
        @media print {
          .no-print, .sidebar, .top-header {
            display: none !important;
          }
          .main-wrapper {
            margin-left: 0 !important;
            padding: 0 !important;
          }
          .page-container {
            padding: 0 !important;
          }
          .detail-grid {
            display: block !important;
          }
          .panel-card {
            border: none !important;
            box-shadow: none !important;
            margin-bottom: 30px !important;
          }
          .panel-card-header {
            border-bottom: 2px solid #000 !important;
            padding: 10px 0 !important;
          }
          .custom-table th {
            color: #000 !important;
            border-bottom: 2px solid #000 !important;
          }
          .custom-table td {
            border-bottom: 1px solid #ddd !important;
          }
        }
      `}</style>
    </div>
  );
};

export default ChallanDetailPage;
