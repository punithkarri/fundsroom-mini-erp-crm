import React, { useEffect, useState } from 'react';
import { ArrowRightLeft, ClipboardList, Package, Plus, RefreshCw, ShoppingCart } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Customer, InventoryItem, WorkOrder, InternalTransfer, CustomerOrder } from '../types';

type Tab = 'inventory' | 'work-orders' | 'transfers' | 'orders';

const OperationsPage: React.FC = () => {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('inventory');
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [transfers, setTransfers] = useState<InternalTransfer[]>([]);
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const isSales = user?.role === 'SALES';

  const load = async () => {
    setLoading(true); setError('');
    try {
      const requests = [api.get('/inventory')];
      if (!isSales) requests.push(api.get('/work-orders'), api.get('/transfers'));
      if (user?.role === 'ADMIN' || isSales) requests.push(api.get('/customer-orders'), api.get('/customers?limit=100'));
      const responses = await Promise.all(requests);
      setItems(responses[0].data.data);
      let index = 1;
      if (!isSales) { setWorkOrders(responses[index++].data.data); setTransfers(responses[index++].data.data); }
      if (user?.role === 'ADMIN' || isSales) { setOrders(responses[index++].data.data); setCustomers(responses[index].data.data.customers); }
    } catch (err: any) { setError(err.response?.data?.message || 'Unable to load Operations ERP data'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [user?.role]);

  const action = async (call: () => Promise<unknown>, success: string) => {
    setError(''); setMessage('');
    try { await call(); setMessage(success); await load(); } catch (err: any) { setError(err.response?.data?.message || 'Operation failed'); }
  };

  const createWorkOrder = () => {
    const item = items[0];
    if (!item || !user) return;
    action(() => api.post('/work-orders', { workOrderNumber: `WO-${Date.now()}`, locationId: item.locationId, itemId: item.id, requiredQuantity: 1, assignedUserId: user.id }), 'Work order created');
  };

  const createTransfer = () => {
    const source = items.find((item) => item.availableQuantity > 0);
    const destination = items.find((item) => item.locationId !== source?.locationId);
    if (!source || !destination) { setError('Two different inventory locations are required'); return; }
    action(() => api.post('/transfers', { transferNumber: `TR-${Date.now()}`, sourceLocationId: source.locationId, destinationLocationId: destination.locationId, itemId: source.id, quantity: 1 }), 'Transfer requested');
  };

  const createOrder = () => {
    const item = items.find((entry) => entry.availableQuantity > 0);
    const customer = customers[0];
    if (!item || !customer) { setError('A customer and available item are required'); return; }
    action(() => api.post('/customer-orders', { orderNumber: `ORD-${Date.now()}`, customerId: customer.id, items: [{ itemId: item.id, quantity: 1 }] }), 'Customer order created');
  };

  if (loading) return <div className="empty-state">Loading Operations ERP...</div>;

  return <div>
    <div className="page-header">
      <div><h1>Operations ERP</h1><p className="page-subtitle">Location-aware inventory, fulfillment, and reservations</p></div>
      <button className="btn btn-secondary" onClick={load}><RefreshCw size={16} /> Refresh</button>
    </div>
    {(message || error) && <div className={`alert-banner ${error ? 'alert-banner-danger' : 'alert-banner-success'}`}>{error || message}</div>}
    <div className="operations-tabs">
      <button className={tab === 'inventory' ? 'active' : ''} onClick={() => setTab('inventory')}><Package size={16} /> Inventory</button>
      {!isSales && <button className={tab === 'work-orders' ? 'active' : ''} onClick={() => setTab('work-orders')}><ClipboardList size={16} /> Work Orders</button>}
      {!isSales && <button className={tab === 'transfers' ? 'active' : ''} onClick={() => setTab('transfers')}><ArrowRightLeft size={16} /> Internal Transfers</button>}
      {(user?.role === 'ADMIN' || isSales) && <button className={tab === 'orders' ? 'active' : ''} onClick={() => setTab('orders')}><ShoppingCart size={16} /> Customer Orders</button>}
    </div>

    {tab === 'inventory' && <section className="panel-card"><div className="panel-card-header"><h2 className="panel-card-title">Inventory</h2></div><div className="table-responsive"><table className="custom-table"><thead><tr><th>Item</th><th>SKU</th><th>Category</th><th>Location</th><th>Physical</th><th>Reserved</th><th>Available</th><th>Minimum</th><th>Status</th></tr></thead><tbody>{items.map((item) => <tr key={item.id}><td>{item.name}</td><td>{item.sku}</td><td>{item.category?.name}</td><td>{item.location?.name}</td><td>{item.physicalQuantity}</td><td>{item.reservedQuantity}</td><td>{item.availableQuantity}</td><td>{item.minimumStock}</td><td><span className={`badge ${item.availableQuantity <= item.minimumStock ? 'badge-cancelled' : 'badge-confirmed'}`}>{item.availableQuantity <= item.minimumStock ? 'LOW' : 'OK'}</span></td></tr>)}</tbody></table>{items.length === 0 && <div className="empty-state">No inventory items found.</div>}</div></section>}

    {tab === 'work-orders' && <section className="panel-card"><div className="panel-card-header"><h2 className="panel-card-title">Work Orders</h2><button className="btn btn-primary btn-sm" onClick={createWorkOrder}><Plus size={14} /> Create</button></div><div className="table-responsive"><table className="custom-table"><thead><tr><th>Work Order</th><th>Item</th><th>Required</th><th>Available</th><th>Shortage</th><th>Status</th><th>Action</th></tr></thead><tbody>{workOrders.map((order) => <tr key={order.id}><td>{order.workOrderNumber}</td><td>{order.item.name}</td><td>{order.requiredQuantity}</td><td>{order.availableQuantity}</td><td className={order.shortage > 0 ? 'text-danger' : ''}>{order.shortage}</td><td>{order.status}</td><td>{order.status !== 'COMPLETED' && <button className="btn btn-secondary btn-sm" onClick={() => action(() => api.patch(`/work-orders/${order.id}/status`, { status: order.status === 'ASSIGNED' ? 'IN_PROGRESS' : 'COMPLETED' }), 'Work order updated')}>Advance</button>}</td></tr>)}</tbody></table>{workOrders.length === 0 && <div className="empty-state">No work orders found.</div>}</div></section>}

    {tab === 'transfers' && <section className="panel-card"><div className="panel-card-header"><h2 className="panel-card-title">Internal Transfers</h2><button className="btn btn-primary btn-sm" onClick={createTransfer}><Plus size={14} /> Request</button></div><div className="table-responsive"><table className="custom-table"><thead><tr><th>Transfer</th><th>Item</th><th>Source</th><th>Destination</th><th>Qty</th><th>Status</th><th>Action</th></tr></thead><tbody>{transfers.map((transfer) => <tr key={transfer.id}><td>{transfer.transferNumber}</td><td>{transfer.item.name}</td><td>{transfer.sourceLocation.name}</td><td>{transfer.destinationLocation.name}</td><td>{transfer.quantity}</td><td>{transfer.status}</td><td>{transfer.status === 'REQUESTED' && <button className="btn btn-secondary btn-sm" onClick={() => action(() => api.post(`/transfers/${transfer.id}/dispatch`), 'Transfer dispatched')}>Dispatch</button>}{transfer.status === 'DISPATCHED' && <button className="btn btn-secondary btn-sm" onClick={() => action(() => api.post(`/transfers/${transfer.id}/receive`), 'Transfer received')}>Receive</button>}</td></tr>)}</tbody></table>{transfers.length === 0 && <div className="empty-state">No transfers found.</div>}</div></section>}

    {tab === 'orders' && <section className="panel-card"><div className="panel-card-header"><h2 className="panel-card-title">Customer Orders & Reservations</h2><button className="btn btn-primary btn-sm" onClick={createOrder}><Plus size={14} /> Create Order</button></div><div className="table-responsive"><table className="custom-table"><thead><tr><th>Order</th><th>Customer</th><th>Items</th><th>Status</th><th>Action</th></tr></thead><tbody>{orders.map((order) => <tr key={order.id}><td>{order.orderNumber}</td><td>{order.customer.businessName}</td><td>{order.items.map((item) => `${item.item.name} x${item.quantity}`).join(', ')}</td><td>{order.status}</td><td>{order.status === 'PENDING' && <button className="btn btn-secondary btn-sm" onClick={() => action(() => api.post(`/customer-orders/${order.id}/reserve`), 'Stock reserved')}>Reserve</button>}{order.status !== 'CANCELLED' && <button className="btn btn-secondary btn-sm" onClick={() => action(() => api.post(`/customer-orders/${order.id}/cancel`), 'Reservation released')}>Cancel</button>}</td></tr>)}</tbody></table>{orders.length === 0 && <div className="empty-state">No customer orders found.</div>}</div></section>}
  </div>;
};

export default OperationsPage;
