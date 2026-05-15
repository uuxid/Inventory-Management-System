import React, { useEffect, useState } from 'react';
import { getOrders, createOrder, approveOrder, receiveOrder, cancelOrder, getSuppliers, getProducts } from '../services/api';
import { useAuth } from '../context/AuthContext';

const statusColor = { PENDING:'#f59e0b', APPROVED:'#10b981', RECEIVED:'#3b82f6', CANCELLED:'#ef4444', DRAFT:'#94a3b8', ORDERED:'#8b5cf6' };
const formatNrs = (value) => `NRS ${Number(value || 0).toFixed(2)}`;

export default function Orders() {
  const { isAdmin } = useAuth();
  const [orders, setOrders] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ supplierId: '', expectedDate: '', notes: '', items: [{ productId: '', quantity: 1, unitCost: '' }] });

  const load = () => getOrders().then(r => setOrders(r.data)).catch(() => {});
  useEffect(() => {
    load();
    getSuppliers().then(r => setSuppliers(r.data)).catch(() => {});
    getProducts().then(r => setProducts(r.data)).catch(() => {});
  }, []);

  const addItem = () => setForm(f => ({ ...f, items: [...f.items, { productId: '', quantity: 1, unitCost: '' }] }));
  const updateItem = (i, key, val) => setForm(f => {
    const items = [...f.items]; items[i] = { ...items[i], [key]: val }; return { ...f, items };
  });

  const handleCreate = async () => {
    try {
      await createOrder({ ...form, items: form.items.map(i => ({ ...i, quantity: parseInt(i.quantity), unitCost: parseFloat(i.unitCost) })) });
      load(); setModal(false);
    } catch(e) { alert(e.response?.data?.message || 'Error'); }
  };

  return (
    <div style={{ padding: 32 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Purchase Orders</h1>
        <button onClick={() => setModal(true)} style={{ background: '#1e40af', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>+ New Order</button>
      </div>
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead><tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
            {['Order No','Supplier','Created By','Total','Status','Expected','Actions'].map(h => (
              <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, fontSize: 12, color: '#374151' }}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {orders.map(o => (
              <tr key={o.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontWeight: 600 }}>{o.orderNo}</td>
                <td style={{ padding: '12px 16px' }}>{o.supplierName}</td>
                <td style={{ padding: '12px 16px', color: '#64748b' }}>{o.createdByUsername}</td>
                <td style={{ padding: '12px 16px', fontWeight: 600 }}>{formatNrs(o.totalAmount)}</td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{ background: (statusColor[o.status]||'#94a3b8')+'15', color: statusColor[o.status]||'#94a3b8', padding: '2px 10px', borderRadius: 10, fontSize: 11, fontWeight: 600 }}>{o.status}</span>
                </td>
                <td style={{ padding: '12px 16px', color: '#64748b' }}>{o.expectedDate || '—'}</td>
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {o.status === 'PENDING' && <button onClick={() => approveOrder(o.id).then(load)} style={{ padding: '4px 10px', background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', borderRadius: 6, cursor: 'pointer', fontSize: 11 }}>Approve</button>}
                    {o.status === 'APPROVED' && <button onClick={() => receiveOrder(o.id).then(load)} style={{ padding: '4px 10px', background: '#eff6ff', color: '#3b82f6', border: '1px solid #bfdbfe', borderRadius: 6, cursor: 'pointer', fontSize: 11 }}>Receive</button>}
                    {['PENDING','DRAFT'].includes(o.status) && <button onClick={() => cancelOrder(o.id).then(load)} style={{ padding: '4px 10px', background: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca', borderRadius: 6, cursor: 'pointer', fontSize: 11 }}>Cancel</button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {orders.length === 0 && <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>No orders yet</div>}
      </div>

      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 32, width: 580, maxHeight: '90vh', overflow: 'auto' }}>
            <h2 style={{ margin: '0 0 20px', fontSize: 18, fontWeight: 700 }}>New Purchase Order</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Supplier*</label>
                <select style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13 }}
                  value={form.supplierId} onChange={e => setForm(f => ({ ...f, supplierId: e.target.value }))}>
                  <option value="">Select supplier</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Expected Date</label>
                <input type="date" style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }}
                  value={form.expectedDate} onChange={e => setForm(f => ({ ...f, expectedDate: e.target.value }))} />
              </div>
            </div>
            <h4 style={{ margin: '0 0 10px', fontSize: 13 }}>Order Items</h4>
            {form.items.map((item, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 8, marginBottom: 8 }}>
                <select style={{ padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12 }}
                  value={item.productId} onChange={e => updateItem(i, 'productId', e.target.value)}>
                  <option value="">Select product</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
                </select>
                <input type="number" placeholder="Qty" style={{ padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12 }}
                  value={item.quantity} onChange={e => updateItem(i, 'quantity', e.target.value)} />
                <input type="number" placeholder="Unit Cost (NRS)" style={{ padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12 }}
                  value={item.unitCost} onChange={e => updateItem(i, 'unitCost', e.target.value)} />
              </div>
            ))}
            <button onClick={addItem} style={{ fontSize: 12, color: '#3b82f6', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: 20 }}>+ Add item</button>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setModal(false)} style={{ padding: '9px 20px', border: '1px solid #e2e8f0', borderRadius: 8, background: '#fff', cursor: 'pointer', fontSize: 13 }}>Cancel</button>
              <button onClick={handleCreate} style={{ padding: '9px 20px', background: '#1e40af', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Create Order</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
