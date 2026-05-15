import React, { useEffect, useMemo, useState } from 'react';
import { getProducts, adjustStock, getMovements } from '../services/api';

export default function Inventory() {
  const [products, setProducts] = useState([]);
  const [movements, setMovements] = useState([]);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({ movementType: 'IN', quantity: '', notes: '', referenceNo: '' });
  const [search, setSearch] = useState('');
  const [stockFilter, setStockFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('LOW_STOCK_FIRST');
  const [movementFilter, setMovementFilter] = useState('ALL');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => { getProducts().then(r => setProducts(r.data)).catch(() => {}); }, []);

  const summary = useMemo(() => {
    const total = products.length;
    const low = products.filter(p => p.isLowStock).length;
    const out = products.filter(p => (p.quantityOnHand || 0) <= 0).length;
    const totalUnits = products.reduce((sum, p) => sum + (p.quantityOnHand || 0), 0);
    return { total, low, out, totalUnits };
  }, [products]);

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    const sorted = [...products].filter(p => {
      const bySearch = !q
        || p.name?.toLowerCase().includes(q)
        || p.sku?.toLowerCase().includes(q)
        || p.categoryName?.toLowerCase().includes(q);
      if (!bySearch) return false;

      if (stockFilter === 'LOW') return p.isLowStock;
      if (stockFilter === 'OUT') return (p.quantityOnHand || 0) <= 0;
      if (stockFilter === 'HEALTHY') return !p.isLowStock;
      return true;
    });

    if (sortBy === 'NAME') {
      sorted.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    } else if (sortBy === 'QTY_ASC') {
      sorted.sort((a, b) => (a.quantityOnHand || 0) - (b.quantityOnHand || 0));
    } else if (sortBy === 'QTY_DESC') {
      sorted.sort((a, b) => (b.quantityOnHand || 0) - (a.quantityOnHand || 0));
    } else {
      sorted.sort((a, b) => {
        const aScore = a.isLowStock ? 0 : 1;
        const bScore = b.isLowStock ? 0 : 1;
        if (aScore !== bScore) return aScore - bScore;
        return (a.quantityOnHand || 0) - (b.quantityOnHand || 0);
      });
    }

    return sorted;
  }, [products, search, stockFilter, sortBy]);

  const filteredMovements = useMemo(() => {
    if (movementFilter === 'ALL') return movements;
    return movements.filter(m => m.movementType === movementFilter);
  }, [movements, movementFilter]);

  const selectProduct = (p) => {
    setSelected(p);
    setMsg('');
    getMovements(p.id).then(r => setMovements(r.data)).catch(() => {});
  };

  const adjustQuantity = (delta) => {
    setForm(f => ({
      ...f,
      quantity: String(Math.max(0, (parseInt(f.quantity || '0', 10) || 0) + delta))
    }));
  };

  const handleAdjust = async () => {
    const quantity = parseInt(form.quantity, 10);
    if (!selected || Number.isNaN(quantity) || quantity <= 0) {
      setMsg('Error: quantity must be greater than 0');
      return;
    }
    setLoading(true);
    try {
      await adjustStock(selected.id, { ...form, quantity });
      setMsg('Stock updated successfully');
      getProducts().then(r => { setProducts(r.data); setSelected(r.data.find(p => p.id === selected.id)); });
      getMovements(selected.id).then(r => setMovements(r.data));
      setForm(f => ({ ...f, quantity: '', notes: '', referenceNo: '' }));
    } catch (e) { setMsg('Error: ' + (e.response?.data?.message || e.message)); }
    finally { setLoading(false); }
  };

  const typeColor = { IN: '#10b981', OUT: '#ef4444', ADJUSTMENT: '#f59e0b', RETURN: '#3b82f6', TRANSFER: '#8b5cf6' };
  const movementTypes = ['IN', 'OUT', 'ADJUSTMENT', 'RETURN', 'TRANSFER'];

  return (
    <div style={{ padding: 32 }}>
      <h1 style={{ margin: '0 0 24px', fontSize: 22, fontWeight: 700, color: '#0f172a' }}>Stock Management</h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(120px, 1fr))', gap: 12, marginBottom: 16 }}>
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 14 }}>
          <div style={{ fontSize: 11, color: '#64748b' }}>Total Products</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#0f172a' }}>{summary.total}</div>
        </div>
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 14 }}>
          <div style={{ fontSize: 11, color: '#64748b' }}>Low Stock</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#f59e0b' }}>{summary.low}</div>
        </div>
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 14 }}>
          <div style={{ fontSize: 11, color: '#64748b' }}>Out of Stock</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#ef4444' }}>{summary.out}</div>
        </div>
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 14 }}>
          <div style={{ fontSize: 11, color: '#64748b' }}>Total Units</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#3b82f6' }}>{summary.totalUnits}</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, SKU, or category"
          style={{
            minWidth: 260,
            padding: '8px 10px',
            border: '1px solid #e2e8f0',
            borderRadius: 8,
            fontSize: 13,
            outline: 'none'
          }}
        />
        <select
          value={stockFilter}
          onChange={e => setStockFilter(e.target.value)}
          style={{ padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13 }}
        >
          <option value="ALL">All stock states</option>
          <option value="LOW">Low stock only</option>
          <option value="OUT">Out of stock only</option>
          <option value="HEALTHY">Healthy stock only</option>
        </select>
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value)}
          style={{ padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13 }}
        >
          <option value="LOW_STOCK_FIRST">Sort: Priority first</option>
          <option value="NAME">Sort: Name A-Z</option>
          <option value="QTY_ASC">Sort: Quantity low-high</option>
          <option value="QTY_DESC">Sort: Quantity high-low</option>
        </select>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 20 }}>
        {/* Product list */}
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid #e2e8f0', fontWeight: 600, fontSize: 14 }}>
            Products — click to manage stock ({filteredProducts.length})
          </div>
          <div style={{ maxHeight: 600, overflow: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 620 }}>
              <thead style={{ position: 'sticky', top: 0, background: '#f8fafc', zIndex: 1 }}>
                <tr>
                  <th style={{ textAlign: 'left', padding: '10px 12px', fontSize: 12, color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>Item</th>
                  <th style={{ textAlign: 'left', padding: '10px 12px', fontSize: 12, color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>SKU</th>
                  <th style={{ textAlign: 'left', padding: '10px 12px', fontSize: 12, color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>Category</th>
                  <th style={{ textAlign: 'right', padding: '10px 12px', fontSize: 12, color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>Qty</th>
                  <th style={{ textAlign: 'right', padding: '10px 12px', fontSize: 12, color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>Reorder</th>
                  <th style={{ textAlign: 'center', padding: '10px 12px', fontSize: 12, color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map(p => (
                  <tr
                    key={p.id}
                    onClick={() => selectProduct(p)}
                    style={{
                      cursor: 'pointer',
                      background: selected?.id === p.id ? '#eff6ff' : '#fff',
                      borderLeft: selected?.id === p.id ? '3px solid #2563eb' : '3px solid transparent'
                    }}
                  >
                    <td style={{ padding: '12px', borderBottom: '1px solid #f1f5f9', fontSize: 14, fontWeight: 600, color: '#0f172a' }}>{p.name}</td>
                    <td style={{ padding: '12px', borderBottom: '1px solid #f1f5f9', fontSize: 12, color: '#64748b' }}>{p.sku}</td>
                    <td style={{ padding: '12px', borderBottom: '1px solid #f1f5f9', fontSize: 12, color: '#64748b' }}>{p.categoryName || '—'}</td>
                    <td style={{ padding: '12px', borderBottom: '1px solid #f1f5f9', fontSize: 16, fontWeight: 700, textAlign: 'right', color: p.isLowStock ? '#dc2626' : '#059669' }}>{p.quantityOnHand}</td>
                    <td style={{ padding: '12px', borderBottom: '1px solid #f1f5f9', fontSize: 13, textAlign: 'right', color: '#475569' }}>{p.reorderLevel}</td>
                    <td style={{ padding: '12px', borderBottom: '1px solid #f1f5f9', textAlign: 'center' }}>
                      <span style={{
                        fontSize: 11,
                        fontWeight: 700,
                        padding: '3px 10px',
                        borderRadius: 999,
                        color: p.isLowStock ? '#b91c1c' : '#166534',
                        background: p.isLowStock ? '#fee2e2' : '#dcfce7'
                      }}>
                        {p.isLowStock ? 'LOW' : 'HEALTHY'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredProducts.length === 0 && (
              <div style={{ padding: 28, color: '#94a3b8', textAlign: 'center', fontSize: 13 }}>
                No products match the selected filters.
              </div>
            )}
          </div>
        </div>

        {/* Right panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {selected ? (
            <>
              {/* Adjust form */}
              <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 20 }}>
                <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700 }}>{selected.name}</h3>
                <div style={{ display: 'flex', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
                  <div style={{ fontSize: 12, color: '#64748b' }}>Current: <strong style={{ color: '#0f172a' }}>{selected.quantityOnHand}</strong></div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>Reorder level: <strong style={{ color: '#0f172a' }}>{selected.reorderLevel}</strong></div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>Category: <strong style={{ color: '#0f172a' }}>{selected.categoryName || 'N/A'}</strong></div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Movement Type</label>
                    <select style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13 }}
                      value={form.movementType} onChange={e => setForm(f => ({ ...f, movementType: e.target.value }))}>
                      <option value="IN">IN (receive stock)</option>
                      <option value="OUT">OUT (issue stock)</option>
                      <option value="ADJUSTMENT">ADJUSTMENT (set qty)</option>
                      <option value="RETURN">RETURN</option>
                      <option value="TRANSFER">TRANSFER</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Quantity*</label>
                    <input type="number" style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }}
                      value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} placeholder="0" />
                    <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                      {[1, 5, 10, 25].map(step => (
                        <button
                          key={step}
                          onClick={() => adjustQuantity(step)}
                          type="button"
                          style={{
                            padding: '3px 8px',
                            border: '1px solid #dbeafe',
                            background: '#eff6ff',
                            borderRadius: 12,
                            fontSize: 11,
                            color: '#1d4ed8',
                            cursor: 'pointer'
                          }}
                        >
                          +{step}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Reference No</label>
                    <input style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }}
                      value={form.referenceNo} onChange={e => setForm(f => ({ ...f, referenceNo: e.target.value }))} />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Notes</label>
                    <input style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }}
                      value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
                  </div>
                </div>
                {msg && <div style={{ padding: '8px 12px', borderRadius: 8, marginBottom: 10, fontSize: 13,
                  background: msg.startsWith('Error') ? '#fef2f2' : '#f0fdf4',
                  color: msg.startsWith('Error') ? '#dc2626' : '#16a34a' }}>{msg}</div>}
                <button onClick={handleAdjust} disabled={loading} style={{
                  width: '100%', padding: '10px', background: '#1e40af', color: '#fff',
                  border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer'
                }}>{loading ? 'Updating...' : 'Update Stock'}</button>
              </div>

              {/* Movements history */}
              <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>Movement History</h3>
                  <select
                    value={movementFilter}
                    onChange={e => setMovementFilter(e.target.value)}
                    style={{ padding: '6px 8px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12 }}
                  >
                    <option value="ALL">All types</option>
                    {movementTypes.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div style={{ maxHeight: 280, overflow: 'auto' }}>
                  {filteredMovements.length === 0 ? <div style={{ color: '#94a3b8', fontSize: 13 }}>No movements yet</div>
                  : filteredMovements.map(m => (
                    <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between',
                      padding: '8px 0', borderBottom: '1px solid #f1f5f9', fontSize: 12 }}>
                      <div>
                        <span style={{ fontWeight: 600, color: typeColor[m.movementType] }}>{m.movementType}</span>
                        <span style={{ color: '#64748b', marginLeft: 8 }}>{m.username}</span>
                        {m.createdAt && <span style={{ color: '#94a3b8', marginLeft: 8 }}>{new Date(m.createdAt).toLocaleString()}</span>}
                        {m.notes && <span style={{ color: '#94a3b8', marginLeft: 6 }}>— {m.notes}</span>}
                      </div>
                      <div style={{ fontWeight: 700, color: ['IN','RETURN'].includes(m.movementType) ? '#10b981' : '#ef4444' }}>
                        {['IN','RETURN'].includes(m.movementType) ? '+' : '-'}{m.quantity}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0',
              padding: 60, textAlign: 'center', color: '#94a3b8' }}>
              Select a product to manage its stock
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
