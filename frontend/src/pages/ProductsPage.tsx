import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Product } from '../types';
import { Search, Plus, Edit2, ArrowDownLeft, ArrowUpRight, AlertTriangle, Eye, X } from 'lucide-react';

const ProductsPage: React.FC = () => {
  const { hasRole } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search, Filters & Pagination
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [lowStockFilter, setLowStockFilter] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const limit = 8;

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isStockOpen, setIsStockOpen] = useState(false);
  const [isLogOpen, setIsLogOpen] = useState(false);
  
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [stockMovements, setStockMovements] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // Form Fields State
  const [productName, setProductName] = useState('');
  const [sku, setSku] = useState('');
  const [category, setCategory] = useState('');
  const [unitPrice, setUnitPrice] = useState<number>(0);
  const [minimumStock, setMinimumStock] = useState<number>(5);
  const [warehouseLocation, setWarehouseLocation] = useState('');
  const [currentStock, setCurrentStock] = useState<number>(0); // only for creation

  // Stock Adjustment State
  const [adjustQty, setAdjustQty] = useState<number>(0);
  const [adjustReason, setAdjustReason] = useState('');

  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError(null);

      const params: any = {
        page,
        limit,
      };
      if (search) params.search = search;
      if (categoryFilter) params.category = categoryFilter;
      if (lowStockFilter) params.lowStock = 'true';

      const res = await api.get('/products', { params });
      if (res.data.success) {
        setProducts(res.data.data.products);
        setTotalPages(res.data.data.pagination.totalPages);
        setTotalRecords(res.data.data.pagination.total);
      }
    } catch (err: any) {
      console.error(err);
      setError('Failed to load products inventory catalog');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [page, search, categoryFilter, lowStockFilter]);

  const resetForm = () => {
    setProductName('');
    setSku('');
    setCategory('');
    setUnitPrice(0);
    setMinimumStock(5);
    setWarehouseLocation('');
    setCurrentStock(0);
    setAdjustQty(0);
    setAdjustReason('');
    setFormError(null);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    try {
      const res = await api.post('/products', {
        productName,
        sku,
        category,
        unitPrice: Number(unitPrice),
        minimumStock: Number(minimumStock),
        warehouseLocation,
        currentStock: Number(currentStock),
      });

      if (res.data.success) {
        setIsCreateOpen(false);
        resetForm();
        fetchProducts();
      }
    } catch (err: any) {
      console.error(err);
      setFormError(err.response?.data?.message || 'Failed to create product');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditClick = (prod: Product) => {
    setSelectedProduct(prod);
    setProductName(prod.productName);
    setSku(prod.sku);
    setCategory(prod.category);
    setUnitPrice(Number(prod.unitPrice));
    setMinimumStock(prod.minimumStock);
    setWarehouseLocation(prod.warehouseLocation);
    setIsEditOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;
    setFormError(null);
    setIsSubmitting(true);

    try {
      const res = await api.put(`/products/${selectedProduct.id}`, {
        productName,
        sku,
        category,
        unitPrice: Number(unitPrice),
        minimumStock: Number(minimumStock),
        warehouseLocation,
      });

      if (res.data.success) {
        setIsEditOpen(false);
        setSelectedProduct(null);
        resetForm();
        fetchProducts();
      }
    } catch (err: any) {
      console.error(err);
      setFormError(err.response?.data?.message || 'Failed to update product');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStockClick = (prod: Product) => {
    setSelectedProduct(prod);
    resetForm();
    setIsStockOpen(true);
  };

  const handleStockAdjustment = async (type: 'IN' | 'OUT') => {
    if (!selectedProduct) return;
    setFormError(null);

    if (adjustQty <= 0) {
      setFormError('Quantity must be a positive integer.');
      return;
    }
    if (!adjustReason) {
      setFormError('Please enter a reason for this movement.');
      return;
    }

    setIsSubmitting(true);
    try {
      const endpoint = type === 'IN' ? 'stock-in' : 'stock-out';
      const res = await api.post(`/products/${selectedProduct.id}/${endpoint}`, {
        quantityChanged: Number(adjustQty),
        reason: adjustReason,
      });

      if (res.data.success) {
        setIsStockOpen(false);
        setSelectedProduct(null);
        resetForm();
        fetchProducts();
      }
    } catch (err: any) {
      console.error(err);
      setFormError(err.response?.data?.message || `Failed to register stock ${type} operation`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleViewLogs = async (prod: Product) => {
    setSelectedProduct(prod);
    setLoadingLogs(true);
    setIsLogOpen(true);
    try {
      const res = await api.get(`/products/${prod.id}/stock-movements`);
      if (res.data.success) {
        setStockMovements(res.data.data);
      }
    } catch (err: any) {
      console.error(err);
      alert('Failed to load stock movements history');
    } finally {
      setLoadingLogs(false);
    }
  };

  const isWarehouseAllowed = hasRole(['ADMIN', 'OPERATIONS']);
  const isAdmin = hasRole(['ADMIN']);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '28px', marginBottom: '6px' }}>Inventory Catalog</h1>
          <p style={{ color: 'var(--text-muted)' }}>Monitor available stock, view movement history, and manage warehouse locations.</p>
        </div>
        {isAdmin && (
          <button className="btn btn-primary" onClick={() => { resetForm(); setIsCreateOpen(true); }}>
            <Plus size={18} /> Add Product
          </button>
        )}
      </div>

      {/* Filters Row */}
      <div className="filters-row">
        <div className="search-input-wrapper">
          <input
            type="text"
            placeholder="Search by Product Name or SKU..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="form-input"
            style={{ paddingLeft: '36px' }}
          />
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        </div>

        <div className="filters-actions">
          <input
            type="text"
            placeholder="Category..."
            value={categoryFilter}
            onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
            className="form-input"
            style={{ width: '160px' }}
          />

          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', userSelect: 'none' }}>
            <input
              type="checkbox"
              checked={lowStockFilter}
              onChange={(e) => { setLowStockFilter(e.target.checked); setPage(1); }}
              style={{ width: '16px', height: '16px', cursor: 'pointer' }}
            />
            <span style={{ color: lowStockFilter ? 'var(--danger)' : 'var(--text-main)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <AlertTriangle size={14} /> Low Stock Only
            </span>
          </label>
        </div>
      </div>

      {/* Products Table */}
      {error && <div className="alert-banner alert-banner-danger">{error}</div>}

      <div className="panel-card">
        <div className="panel-card-body" style={{ padding: 0 }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Loading inventory databases...</div>
          ) : products.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>No products in catalog.</div>
          ) : (
            <div className="table-responsive">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Product / SKU</th>
                    <th>Category</th>
                    <th>Unit Price</th>
                    <th>Warehouse Loc</th>
                    <th>Current Stock</th>
                    <th>Alert Limit</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((p) => {
                    const isLow = p.currentStock <= p.minimumStock;
                    return (
                      <tr key={p.id} style={{ backgroundColor: isLow ? 'rgba(239, 68, 68, 0.02)' : 'inherit' }}>
                        <td>
                          <span style={{ fontWeight: 600, fontSize: '15px' }}>{p.productName}</span>
                          <br />
                          <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 500 }}>{p.sku}</span>
                        </td>
                        <td><span className="badge badge-draft" style={{ backgroundColor: '#f1f5f9' }}>{p.category}</span></td>
                        <td style={{ fontWeight: 500 }}>₹{Number(p.unitPrice).toFixed(2)}</td>
                        <td><strong>{p.warehouseLocation}</strong></td>
                        <td>
                          <span style={{
                            color: isLow ? 'var(--danger)' : 'var(--success)',
                            fontWeight: 700,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            {isLow && <AlertTriangle size={14} />}
                            {p.currentStock} units
                          </span>
                        </td>
                        <td>{p.minimumStock} units</td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '8px' }}>
                            {isWarehouseAllowed && (
                              <button onClick={() => handleViewLogs(p)} className="btn btn-secondary btn-sm" title="View Stock Movement Timeline" style={{ padding: '6px' }}>
                                <Eye size={14} />
                              </button>
                            )}
                            {isWarehouseAllowed && (
                              <button onClick={() => handleStockClick(p)} className="btn btn-success btn-sm" style={{ padding: '6px 10px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <ArrowDownLeft size={12} /> Stock
                              </button>
                            )}
                            {isAdmin && (
                              <button onClick={() => handleEditClick(p)} className="btn btn-secondary btn-sm" title="Edit Product Data" style={{ padding: '6px' }}>
                                <Edit2 size={14} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
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
            Showing Page <strong>{page}</strong> of <strong>{totalPages}</strong> ({totalRecords} total products)
          </span>
          <div className="pagination-buttons">
            <button disabled={page === 1} onClick={() => setPage(page - 1)} className="btn btn-secondary btn-sm">Previous</button>
            <button disabled={page === totalPages} onClick={() => setPage(page + 1)} className="btn btn-secondary btn-sm">Next</button>
          </div>
        </div>
      )}

      {/* ADD MODAL */}
      {isCreateOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '550px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Register New Product</h3>
              <button onClick={() => setIsCreateOpen(false)} className="modal-close"><X size={18} /></button>
            </div>
            <form onSubmit={handleCreateSubmit}>
              <div className="modal-body">
                {formError && <div className="alert-banner alert-banner-danger" style={{ padding: '10px', fontSize: '13px', margin: '0 0 16px 0' }}>{formError}</div>}

                <div className="form-group">
                  <label className="form-label">Product Name *</label>
                  <input type="text" value={productName} onChange={(e) => setProductName(e.target.value)} className="form-input" placeholder="e.g. Copper Connector Elbow" required />
                </div>

                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">SKU / Code *</label>
                    <input type="text" value={sku} onChange={(e) => setSku(e.target.value)} className="form-input" placeholder="e.g. CON-COP-001" required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Category *</label>
                    <input type="text" value={category} onChange={(e) => setCategory(e.target.value)} className="form-input" placeholder="e.g. Fittings" required />
                  </div>
                </div>

                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Unit Price (₹) *</label>
                    <input type="number" step="0.01" value={unitPrice} onChange={(e) => setUnitPrice(Number(e.target.value))} className="form-input" min="0" required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Warehouse Location *</label>
                    <input type="text" value={warehouseLocation} onChange={(e) => setWarehouseLocation(e.target.value)} className="form-input" placeholder="e.g. Bin B12" required />
                  </div>
                </div>

                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Initial Stock Level</label>
                    <input type="number" value={currentStock} onChange={(e) => setCurrentStock(parseInt(e.target.value, 10))} className="form-input" min="0" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Min Stock Level Alert *</label>
                    <input type="number" value={minimumStock} onChange={(e) => setMinimumStock(parseInt(e.target.value, 10))} className="form-input" min="0" required />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setIsCreateOpen(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="btn btn-primary">{isSubmitting ? 'Registering...' : 'Save Product'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {isEditOpen && selectedProduct && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '550px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Edit Product: {selectedProduct.productName}</h3>
              <button onClick={() => setIsEditOpen(false)} className="modal-close"><X size={18} /></button>
            </div>
            <form onSubmit={handleEditSubmit}>
              <div className="modal-body">
                {formError && <div className="alert-banner alert-banner-danger" style={{ padding: '10px', fontSize: '13px', margin: '0 0 16px 0' }}>{formError}</div>}

                <div className="form-group">
                  <label className="form-label">Product Name *</label>
                  <input type="text" value={productName} onChange={(e) => setProductName(e.target.value)} className="form-input" required />
                </div>

                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">SKU / Code *</label>
                    <input type="text" value={sku} onChange={(e) => setSku(e.target.value)} className="form-input" required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Category *</label>
                    <input type="text" value={category} onChange={(e) => setCategory(e.target.value)} className="form-input" required />
                  </div>
                </div>

                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Unit Price (₹) *</label>
                    <input type="number" step="0.01" value={unitPrice} onChange={(e) => setUnitPrice(Number(e.target.value))} className="form-input" required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Warehouse Location *</label>
                    <input type="text" value={warehouseLocation} onChange={(e) => setWarehouseLocation(e.target.value)} className="form-input" required />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Min Stock Level Alert *</label>
                  <input type="number" value={minimumStock} onChange={(e) => setMinimumStock(parseInt(e.target.value, 10))} className="form-input" required />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setIsEditOpen(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="btn btn-primary">{isSubmitting ? 'Updating...' : 'Update Product'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* STOCK ADJUSTMENT MODAL */}
      {isStockOpen && selectedProduct && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '450px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Record Stock Movement</h3>
              <button onClick={() => setIsStockOpen(false)} className="modal-close"><X size={18} /></button>
            </div>
            <div className="modal-body">
              {formError && <div className="alert-banner alert-banner-danger" style={{ padding: '10px', fontSize: '13px', margin: '0 0 16px 0' }}>{formError}</div>}
              
              <div style={{ marginBottom: '16px', backgroundColor: '#f8fafc', padding: '12px', borderRadius: '6px', fontSize: '13.5px' }}>
                Product: <strong>{selectedProduct.productName}</strong><br />
                SKU: <code>{selectedProduct.sku}</code><br />
                Current Stock: <strong style={{ color: 'var(--primary-color)' }}>{selectedProduct.currentStock} units</strong>
              </div>

              <div className="form-group">
                <label className="form-label">Adjustment Quantity *</label>
                <input type="number" value={adjustQty} onChange={(e) => setAdjustQty(parseInt(e.target.value, 10))} className="form-input" min="1" required />
              </div>

              <div className="form-group">
                <label className="form-label">Movement Notes / Reason *</label>
                <input type="text" value={adjustReason} onChange={(e) => setAdjustReason(e.target.value)} className="form-input" placeholder="e.g. Fresh vendor delivery, manual correction..." required />
              </div>
            </div>
            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <button type="button" onClick={() => setIsStockOpen(false)} className="btn btn-secondary">Cancel</button>
              <div style={{ display: 'inline-flex', gap: '8px' }}>
                <button type="button" disabled={isSubmitting} onClick={() => handleStockAdjustment('OUT')} className="btn btn-danger">
                  <ArrowUpRight size={14} /> Stock OUT
                </button>
                <button type="button" disabled={isSubmitting} onClick={() => handleStockAdjustment('IN')} className="btn btn-success">
                  <ArrowDownLeft size={14} /> Stock IN
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STOCK LOGS TIMELINE MODAL */}
      {isLogOpen && selectedProduct && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '650px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Movement Log: {selectedProduct.sku}</h3>
              <button onClick={() => setIsLogOpen(false)} className="modal-close"><X size={18} /></button>
            </div>
            <div className="modal-body" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
              {loadingLogs ? (
                <div style={{ textAlign: 'center', padding: '20px' }}>Loading stock logs...</div>
              ) : stockMovements.length === 0 ? (
                <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No movements recorded for this product.</p>
              ) : (
                <div className="table-responsive">
                  <table className="custom-table" style={{ fontSize: '13px' }}>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Type</th>
                        <th>Qty Changed</th>
                        <th>Reason</th>
                        <th>Recorded By</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stockMovements.map((move) => (
                        <tr key={move.id}>
                          <td>{new Date(move.createdAt).toLocaleString()}</td>
                          <td>
                            <span className={`badge ${move.movementType === 'IN' ? 'badge-in' : 'badge-out'}`}>
                              {move.movementType}
                            </span>
                          </td>
                          <td style={{ fontWeight: 600 }}>{move.quantityChanged}</td>
                          <td>{move.reason}</td>
                          <td>{move.creator?.name || 'System'} ({move.creator?.role})</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button onClick={() => setIsLogOpen(false)} className="btn btn-secondary">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductsPage;
