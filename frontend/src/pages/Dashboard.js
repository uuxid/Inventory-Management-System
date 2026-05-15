import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, CartesianGrid, Legend } from 'recharts';
import { getDashboard, getLowStock, getOrders, getAlerts, getReceivedVsSold } from '../services/api';
import { useAuth } from '../context/AuthContext';

const formatNrs = (value) => `NRS ${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const roleThemes = {
  ROLE_ADMIN: {
    title: 'Admin Command Center',
    pageBackground: 'linear-gradient(135deg, #f8fafc 0%, #eef2ff 45%, #ecfeff 100%)',
    panelBackground: '#ffffff',
    panelBorder: '#c7d2fe',
    headingColor: '#312e81',
    mutedText: '#475569',
    statLabel: '#64748b',
    badgeBg: '#e0e7ff',
    badgeText: '#3730a3',
    tooltipBg: '#eef2ff',
    tooltipBorder: '#c7d2fe',
    chartA: '#4f46e5',
    chartB: '#0891b2',
    chartC: '#f59e0b',
    alertStrip: '#3730a3',
  },
  ROLE_MANAGER: {
    title: 'Manager Operations Dashboard',
    pageBackground: 'linear-gradient(140deg, #f0fdf4 0%, #ecfeff 55%, #f8fafc 100%)',
    panelBackground: '#ffffff',
    panelBorder: '#99f6e4',
    headingColor: '#065f46',
    mutedText: '#475569',
    statLabel: '#64748b',
    badgeBg: '#ccfbf1',
    badgeText: '#0f766e',
    tooltipBg: '#f0fdfa',
    tooltipBorder: '#99f6e4',
    chartA: '#0ea5a4',
    chartB: '#22c55e',
    chartC: '#eab308',
    alertStrip: '#0f766e',
  },
  ROLE_EMPLOYEE: {
    title: 'Employee Workboard',
    pageBackground: 'linear-gradient(140deg, #fff7ed 0%, #fffbeb 52%, #f8fafc 100%)',
    panelBackground: '#ffffff',
    panelBorder: '#fdba74',
    headingColor: '#9a3412',
    mutedText: '#52525b',
    statLabel: '#71717a',
    badgeBg: '#ffedd5',
    badgeText: '#9a3412',
    tooltipBg: '#fffbeb',
    tooltipBorder: '#fdba74',
    chartA: '#ea580c',
    chartB: '#f59e0b',
    chartC: '#0ea5e9',
    alertStrip: '#c2410c',
  },
};

const StatCard = ({ label, value, sub, color, theme }) => (
  <div style={{
    background: theme.panelBackground,
    borderRadius: 12,
    padding: '20px 24px',
    border: `1px solid ${theme.panelBorder}`,
    boxShadow: '0 6px 18px rgba(15, 23, 42, 0.04)',
    flex: 1,
    minWidth: 0
  }}>
    <div style={{ fontSize: 13, color: theme.statLabel, marginBottom: 6 }}>{label}</div>
    <div style={{ fontSize: 28, fontWeight: 700, color: color || theme.headingColor }}>{value}</div>
    {sub && <div style={{ fontSize: 12, color: theme.mutedText, marginTop: 4 }}>{sub}</div>}
  </div>
);

export default function Dashboard() {
  const { isManager, user } = useAuth();
  const [stats, setStats] = useState(null);
  const [lowStock, setLowStock] = useState([]);
  const [orders, setOrders] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [receivedVsSold, setReceivedVsSold] = useState(null);
  const role = user?.role || 'ROLE_EMPLOYEE';
  const theme = roleThemes[role] || roleThemes.ROLE_EMPLOYEE;
  const roleLabel = (role || 'ROLE_EMPLOYEE').replace('ROLE_', '');

  useEffect(() => {
    getDashboard().then(r => setStats(r.data)).catch(() => {});
    if (isManager()) {
      getLowStock().then(r => setLowStock(r.data)).catch(() => {});
      getOrders().then(r => setOrders(r.data.slice(0, 5))).catch(() => {});
      getAlerts().then(r => setAlerts(r.data.filter(a => !a.isRead).slice(0, 4))).catch(() => {});
      getReceivedVsSold(7)
        .then(r => {
          if (r.data) setReceivedVsSold(r.data);
        })
        .catch(err => {
          console.error('Error fetching received vs sold:', err);
          setReceivedVsSold({ received: 0, sold: 0 });
        });
    }
  }, []);

  const stockData = lowStock.slice(0, 6).map(p => ({
    name: p.name.length > 12 ? p.name.substring(0, 12) + '…' : p.name,
    qty: p.quantityOnHand, min: p.reorderLevel
  }));

  const orderStatusData = [
    { name: 'Pending', value: orders.filter(o => o.status === 'PENDING').length, color: '#f59e0b' },
    { name: 'Approved', value: orders.filter(o => o.status === 'APPROVED').length, color: '#10b981' },
    { name: 'Received', value: orders.filter(o => o.status === 'RECEIVED').length, color: '#3b82f6' },
  ].filter(d => d.value > 0);

  const severityColor = { CRITICAL: '#ef4444', WARNING: '#f59e0b', INFO: '#3b82f6' };

  return (
    <div style={{ padding: 32, background: theme.pageBackground, minHeight: '100vh' }}>
      <div style={{
        marginBottom: 24,
        background: theme.panelBackground,
        border: `1px solid ${theme.panelBorder}`,
        borderRadius: 14,
        padding: '16px 18px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        flexWrap: 'wrap'
      }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: theme.headingColor }}>
          {theme.title}
        </h1>
        <span style={{
          padding: '6px 12px',
          borderRadius: 999,
          background: theme.badgeBg,
          color: theme.badgeText,
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: 0.2
        }}>
          {roleLabel}
        </span>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
        <StatCard label="Total Products" value={stats?.totalProducts ?? '—'} sub="Active SKUs" theme={theme} />
        <StatCard label="Low Stock Items" value={stats?.lowStockCount ?? '—'}
          color={stats?.lowStockCount > 0 ? '#ef4444' : '#10b981'}
          sub="Need reordering" theme={theme} />
        <StatCard label="Inventory Value"
          value={stats ? formatNrs(stats.totalInventoryValue) : '—'}
          sub="Total cost value" theme={theme} />
        <StatCard label="Active Products" value={stats?.activeProducts ?? '—'}
          sub="In catalog" color={theme.chartA} theme={theme} />
        <StatCard label="Potential Profit"
          value={stats ? formatNrs(stats.potentialProfit) : '—'}
          sub={stats ? `Margin ${Number(stats.profitMarginPercent || 0).toFixed(2)}%` : 'Based on current stock'}
          color={(Number(stats?.potentialProfit || 0) >= 0) ? theme.chartB : '#ef4444'} theme={theme} />
      </div>

      {!isManager() && (
        <div style={{
          marginBottom: 24,
          background: theme.panelBackground,
          border: `1px solid ${theme.panelBorder}`,
          borderLeft: `5px solid ${theme.alertStrip}`,
          borderRadius: 12,
          padding: '14px 16px',
          color: theme.mutedText,
          fontSize: 13
        }}>
          Employee dashboard shows essential inventory KPIs. Manager/Admin views include operational charts, alerts, and recent orders.
        </div>
      )}

      {/* Charts row */}
      {isManager() && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 24 }}>
          {/* Received vs Sold */}
          <div style={{ background: theme.panelBackground, borderRadius: 12, padding: 24, border: `1px solid ${theme.panelBorder}` }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 600, color: theme.headingColor }}>
              Received vs Sold (7 days)
            </h3>
            {receivedVsSold ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={[
                  { name: 'Received', value: receivedVsSold.received, fill: theme.chartB },
                  { name: 'Sold', value: receivedVsSold.sold, fill: theme.chartC }
                ]}>
                  <CartesianGrid strokeDasharray="3 3" stroke={theme.panelBorder} />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ borderRadius: 10, border: `1px solid ${theme.tooltipBorder}`, background: theme.tooltipBg }}
                    cursor={{ fill: 'rgba(59, 130, 246, 0.06)' }}
                  />
                  <Bar dataKey="value" radius={[6,6,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: 200, display: 'flex', alignItems: 'center',
                justifyContent: 'center', color: theme.mutedText, fontSize: 13 }}>Loading...</div>
            )}
          </div>

          <div style={{ background: theme.panelBackground, borderRadius: 12, padding: 24, border: `1px solid ${theme.panelBorder}` }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 600, color: theme.headingColor }}>
              Low stock levels
            </h3>
            {stockData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={stockData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={theme.panelBorder} />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ borderRadius: 10, border: `1px solid ${theme.tooltipBorder}`, background: theme.tooltipBg }}
                    cursor={{ fill: 'rgba(59, 130, 246, 0.06)' }}
                  />
                  <Bar dataKey="qty" fill={theme.chartA} name="Current" radius={[6,6,0,0]} />
                  <Bar dataKey="min" fill="#ef4444" name="Min required" radius={[6,6,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: 200, display: 'flex', alignItems: 'center',
                justifyContent: 'center', color: theme.chartB, fontSize: 14 }}>
                All stock levels are healthy ✓
              </div>
            )}
          </div>

          <div style={{ background: theme.panelBackground, borderRadius: 12, padding: 24, border: `1px solid ${theme.panelBorder}` }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 600, color: theme.headingColor }}>
              Order status
            </h3>
            {orderStatusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={orderStatusData} cx="50%" cy="50%" innerRadius={34} outerRadius={78}
                    dataKey="value" label={({ name, value }) => `${name}: ${value}`}
                    labelLine={false}>
                    {orderStatusData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 10, border: `1px solid ${theme.tooltipBorder}`, background: theme.tooltipBg }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: 200, display: 'flex', alignItems: 'center',
                justifyContent: 'center', color: theme.mutedText, fontSize: 13 }}>No orders yet</div>
            )}
          </div>
        </div>
      )}

      {/* Bottom row */}
      {isManager() && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {/* AI Alerts */}
          <div style={{ background: theme.panelBackground, borderRadius: 12, padding: 24, border: `1px solid ${theme.panelBorder}` }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 600, color: theme.headingColor }}>
              AI Alerts
            </h3>
            {alerts.length === 0 ? (
              <div style={{ color: theme.mutedText, fontSize: 13 }}>No unread alerts</div>
            ) : alerts.map(a => (
              <div key={a.id} style={{
                padding: '10px 14px', borderRadius: 8, marginBottom: 8,
                background: severityColor[a.severity] + '15',
                borderLeft: `3px solid ${severityColor[a.severity]}`
              }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: severityColor[a.severity] }}>
                  {a.severity} — {a.title}
                </div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                  {a.message?.substring(0, 80)}...
                </div>
              </div>
            ))}
          </div>

          {/* Recent orders */}
            <div style={{ background: theme.panelBackground, borderRadius: 12, padding: 24, border: `1px solid ${theme.panelBorder}` }}>
              <h3 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 600, color: theme.headingColor }}>
              Recent orders
            </h3>
            {orders.length === 0 ? (
                <div style={{ color: theme.mutedText, fontSize: 13 }}>No orders yet</div>
            ) : orders.map(o => {
              const color = { PENDING:'#f59e0b', APPROVED:'#10b981',
                RECEIVED:'#3b82f6', CANCELLED:'#ef4444', DRAFT:'#94a3b8' };
              return (
                <div key={o.id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '8px 0', borderBottom: `1px solid ${theme.panelBorder}`, fontSize: 13
                }}>
                  <div>
                      <div style={{ fontWeight: 600, color: theme.headingColor }}>{o.orderNo}</div>
                      <div style={{ color: theme.mutedText, fontSize: 12 }}>{o.supplierName}</div>
                  </div>
                  <span style={{
                    background: (color[o.status] || '#94a3b8') + '20',
                    color: color[o.status] || '#94a3b8',
                    padding: '2px 10px', borderRadius: 10, fontSize: 11, fontWeight: 600
                  }}>{o.status}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
