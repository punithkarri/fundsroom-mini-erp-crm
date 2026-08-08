import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { Customer, Product } from '../types';
import { ArrowLeft, Plus, Trash2, Save, ShoppingCart } from 'lucide-react';

interface SelectedItem {
  product: Product;
  quantity: number;
}

const CreateChallanPage: React.FC = () => {
  const navigate = useNavigate();

  // Master Data
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Selection state
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  
  // Product search state
  const [productSearch, setProductSearch] = useState('');
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);

  // Submission state
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const loadMasterData = async () => {
      try {
        setLoadingData(true);
        setError(null);

        // Fetch active customers
        const custRes = await api.get('/customers', { params: { limit: 100 } });
        // Fetch products
        const prodRes = await api.get('/products', { params: { limit: 100 } });

        if (custRes.data.success && prodRes.data.success) {
          setCustomers(custRes.data.data.customers.filter((c: Customer) => c.status === 'ACTIVE'));
          setProducts(prodRes.data.data.products);
          setFilteredProducts(prodRes.data.data.products);
        }
      } catch (err: any) {
        console.error(err);
        setError('Failed to load active customers and product catalogs');
      } finally {
        setLoadingData(false);
      }
    };

    loadMasterData();
  }, []);

  useEffect(() => {
    if (!productSearch) {
      setFilteredProducts(products);
    } else {
      const q = productSearch.toLowerCase();
      setFilteredProducts(
        products.filter(
          (p) =>
            p.productName.toLowerCase().includes(q) ||
            p.sku.toLowerCase().includes(q)
        )
      );
    }
  }, [productSearch, products]);

  const handleAddProduct = (prod: Product) => {
    // Check if product already added
    const existing = selectedItems.find((it) => it.product.id === prod.id);
    if (existing) {
      setSelectedItems(
        selectedItems.map((it) =>
          it.product.id === prod.id
            ? { ...it, quantity: it.quantity + 1 }
            : it
        )
      );
    } else {
      setSelectedItems([...selectedItems, { product: prod, quantity: 1 }]);
    }
  };

  const handleQtyChange = (productId: string, val: number) => {
    if (val < 1) return;
    setSelectedItems(
      selectedItems.map((it) =>
        it.product.id === productId ? { ...it, quantity: val } : it
      )
    );
  };

  const handleRemoveItem = (productId: string) => {
    setSelectedItems(selectedItems.filter((it) => it.product.id !== productId));
  };

  const calculateTotalQty = () => {
    return selectedItems.reduce((acc, it) => acc + it.quantity, 0);
  };

  const calculateTotalPrice = () => {
    return selectedItems.reduce((acc, it) => acc + it.quantity * Number(it.product.unitPrice), 0);
  };

  const handleSaveDraft = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!selectedCustomerId) {
      setFormError('Please select a customer.');
      return;
    }
    if (selectedItems.length === 0) {
      setFormError('Please add at least one product to the challan.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.post('/challans', {
        customerId: selectedCustomerId,
        items: selectedItems.map((it) => ({
          productId: it.product.id,
          quantity: it.quantity,
        })),
        status: 'DRAFT',
      });

      if (res.data.success) {
        navigate('/challans');
      }
    } catch (err: any) {
      console.error(err);
      setFormError(err.response?.data?.message || 'Failed to create sales challan');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loadingData) {
    return <div style={{ textAlign: 'center', padding: '40px' }}>Loading transaction forms...</div>;
  }

  if (error) {
    return <div className="alert-banner alert-banner-danger">{error}</div>;
  }

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <Link to="/challans" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', textDecoration: 'none', fontSize: '14px', fontWeight: 600 }}>
          <ArrowLeft size={16} /> Back to Challan Logs
        </Link>
      </div>

      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '28px', marginBottom: '6px' }}>Generate Sales Challan</h1>
        <p style={{ color: 'var(--text-muted)' }}>Build a new shipment delivery challan. Automatically saved as a DRAFT.</p>
      </div>

      {formError && (
        <div className="alert-banner alert-banner-danger" style={{ marginBottom: '24px' }}>
          {formError}
        </div>
      )}

      <div className="challan-builder-grid">
        {/* Left Column: Selector and Order Lines */}
        <div>
          <div className="panel-card" style={{ marginBottom: '24px' }}>
            <div className="panel-card-header">
              <h3 className="panel-card-title">1. Select Customer Account</h3>
            </div>
            <div className="panel-card-body">
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Active Billing Customer *</label>
                <select
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className="form-select"
                  required
                >
                  <option value="">-- Choose Active Client --</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.businessName} ({c.customerName})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="panel-card">
            <div className="panel-card-header">
              <h3 className="panel-card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShoppingCart size={16} /> 2. Challan Line Items
              </h3>
            </div>
            <div className="panel-card-body">
              {selectedItems.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-light)' }}>
                  No items added yet. Search and click "+" on the products panel to add items.
                </div>
              ) : (
                <div>
                  <div className="selected-items-list">
                    {selectedItems.map((it) => (
                      <div key={it.product.id} className="selected-item-row">
                        <div className="selected-item-info">
                          <span className="selected-item-title">{it.product.productName}</span>
                          <div className="selected-item-meta">
                            SKU: <code>{it.product.sku}</code> | Price: ₹{Number(it.product.unitPrice).toFixed(2)} | Avail Stock: <strong style={{ color: it.product.currentStock < it.quantity ? 'var(--danger)' : 'inherit' }}>{it.product.currentStock} units</strong>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <input
                            type="number"
                            value={it.quantity}
                            onChange={(e) => handleQtyChange(it.product.id, parseInt(e.target.value, 10))}
                            className="form-input selected-item-qty-input"
                            min="1"
                          />
                          <span className="selected-item-price">
                            ₹{(Number(it.product.unitPrice) * it.quantity).toFixed(2)}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(it.product.id)}
                            className="btn btn-secondary btn-sm"
                            style={{ color: 'var(--danger)', padding: '8px' }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Summary Footer */}
                  <div style={{ borderTop: '2px solid var(--border-color)', marginTop: '24px', paddingTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 600 }}>TOTAL QUANTITY:</span>
                      <strong style={{ fontSize: '18px', marginLeft: '8px' }}>{calculateTotalQty()} units</strong>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 600 }}>ESTIMATED TOTAL:</span>
                      <strong style={{ fontSize: '22px', marginLeft: '8px', color: 'var(--primary-color)', fontFamily: 'Outfit' }}>
                        ₹{calculateTotalPrice().toFixed(2)}
                      </strong>
                    </div>
                  </div>

                  <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                    <Link to="/challans" className="btn btn-secondary">Cancel</Link>
                    <button
                      type="button"
                      onClick={handleSaveDraft}
                      disabled={isSubmitting}
                      className="btn btn-primary"
                      style={{ padding: '10px 24px' }}
                    >
                      <Save size={16} /> {isSubmitting ? 'Saving...' : 'Save as Draft'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Products Quick Finder */}
        <div>
          <div className="panel-card" style={{ height: 'fit-content' }}>
            <div className="panel-card-header">
              <h3 className="panel-card-title">Add Products</h3>
            </div>
            <div className="panel-card-body" style={{ padding: '16px' }}>
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <input
                  type="text"
                  placeholder="Search products by SKU or Name..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="form-input"
                />
              </div>

              <div style={{ maxHeight: '420px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {filteredProducts.length === 0 ? (
                  <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px 0' }}>No products found.</p>
                ) : (
                  filteredProducts.map((p) => {
                    const isOut = p.currentStock === 0;
                    return (
                      <div
                        key={p.id}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '12px',
                          border: '1px solid var(--border-color)',
                          borderRadius: '6px',
                          backgroundColor: isOut ? 'rgba(0,0,0,0.01)' : '#ffffff',
                          opacity: isOut ? 0.7 : 1,
                        }}
                      >
                        <div>
                          <strong style={{ fontSize: '13.5px' }}>{p.productName}</strong>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            SKU: <code>{p.sku}</code> | ₹{Number(p.unitPrice).toFixed(2)}
                          </div>
                          <span style={{ fontSize: '11px', fontWeight: 600, color: isOut ? 'var(--danger)' : 'var(--success)' }}>
                            Stock: {p.currentStock} units
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleAddProduct(p)}
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '6px' }}
                          disabled={isOut}
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateChallanPage;
