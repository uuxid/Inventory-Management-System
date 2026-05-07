import React, { useEffect, useState } from 'react';
import { getDashboard, getLowStock, getOrders } from '../services/api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, Legend } from 'recharts';

const formatNrs = (value) => `NRS ${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function Reports() {
  const [stats, setStats]     = useState(null);
  const [lowStock, setLowStock] = useState([]);
  const [orders, setOrders]   = useState([]);

  useEffect(() => {
    getDashboard().then(r => setStats(r.data)).catch(() => {});
    getLowStock().then(r => setLowStock(r.data)).catch(() => {});
    getOrders().then(r => setOrders(r.data)).catch(() => {});
  }, []);

  const exportFile = (endpoint, filename) => {
    const token = localStorage.getItem('token');
    fetch(`/api/reports/${endpoint}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.blob())
      .then(blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = filename; a.click();
        URL.revokeObjectURL(url);
      });
  };

  const ordersByStatus = ['DRAFT','PENDING','APPROVED','ORDERED','RECEIVED','CANCELLED'].map(s => ({
    status: s,
    count: orders.filter(o => o.status === s).length
  })).filter(d => d.count > 0);

  const topLowStock = lowStock.slice(0, 8).map(p => ({
    name: p.name.length > 14 ? p.name.substring(0, 14) + '…' : p.name,
    current: p.quantityOnHand,
    minimum: p.reorderLevel
  }));

  const card = (label, value, color) => (
    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12,
      padding: '20px 24px', flex: 1, minWidth: 160 }}>
      <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 700, color: color || '#0f172a' }}>{value}</div>
    </div>
  );

  const btnStyle = (color) => ({
    padding: '8px 16px', background: color + '15', color,
    border: `1px solid ${color}40`, borderRadius: 8,
    cursor: 'pointer', fontSize: 12, fontWeight: 600
  });

  return (
    <div style={{ padding: 32 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#0f172a' }}>Reports</h1>
        <div style={{ display: 'flex', gap: 10 }}>
          <button style={btnStyle('#3b82f6')}
            onClick={() => exportFile('products/export', 'products.doc')}>
            ↓ Export Products (Word)
          </button>
          <button style={btnStyle('#10b981')}
            onClick={() => exportFile('stock-movements/export', 'movements.xlsx')}>
            ↓ Export Movements (Excel)
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'flex', gap: 14, marginBottom: 24, flexWrap: 'wrap' }}>
        {card('Total Products', stats?.totalProducts ?? '—')}
        {card('Low Stock Items', stats?.lowStockCount ?? '—', stats?.lowStockCount > 0 ? '#ef4444' : '#10b981')}
        {card('Inventory Value', stats ? formatNrs(stats.totalInventoryValue) : '—', '#3b82f6')}
        {card('Total Orders', orders.length)}
      </div>

      {/* Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 24 }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 600 }}>Low stock — current vs minimum</h3>
          {topLowStock.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={topLowStock} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={110} />
                <Tooltip />
                <Legend />
                <Bar dataKey="current" fill="#3b82f6" name="Current qty" radius={[0,4,4,0]} />
                <Bar dataKey="minimum" fill="#fca5a5" name="Min required" radius={[0,4,4,0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#10b981', fontSize: 14 }}>All stock levels healthy ✓</div>
          )}
        </div>

        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 24 }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 600 }}>Orders by status</h3>
          {ordersByStatus.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={ordersByStatus}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="status" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" name="Orders" radius={[6,6,0,0]}
                  fill="#6366f1" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 240, display: 'flex', alignItems: 'center',
              justifyContent: 'center', color: '#94a3b8', fontSize: 14 }}>No orders yet</div>
          )}
        </div>
      </div>

      {/* Low stock table */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #e2e8f0',
          fontWeight: 600, fontSize: 14 }}>
          Low stock items ({lowStock.length})
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              {['Product','SKU','Supplier','Current Qty','Min Required','Reorder Qty','Deficit'].map(h => (
                <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600,
                  fontSize: 12, color: '#374151' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {lowStock.length === 0 ? (
              <tr><td colSpan={7} style={{ padding: 32, textAlign: 'center', color: '#10b981' }}>
                All products are adequately stocked ✓
              </td></tr>
            ) : lowStock.map(p => (
              <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '10px 16px', fontWeight: 600 }}>{p.name}</td>
                <td style={{ padding: '10px 16px', fontFamily: 'monospace', color: '#64748b' }}>{p.sku}</td>
                <td style={{ padding: '10px 16px', color: '#64748b' }}>{p.supplierName || '—'}</td>
                <td style={{ padding: '10px 16px', fontWeight: 700,
                  color: p.quantityOnHand === 0 ? '#ef4444' : '#f59e0b' }}>
                  {p.quantityOnHand}
                </td>
                <td style={{ padding: '10px 16px', color: '#64748b' }}>{p.reorderLevel}</td>
                <td style={{ padding: '10px 16px', color: '#64748b' }}>{p.reorderQuantity}</td>
                <td style={{ padding: '10px 16px', fontWeight: 700, color: '#ef4444' }}>
                  {Math.max(0, p.reorderLevel - p.quantityOnHand)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
