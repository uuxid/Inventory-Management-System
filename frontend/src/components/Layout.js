import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getUnreadCount } from '../services/api';

const roleThemes = {
  ROLE_ADMIN: {
    sidebarBg: 'linear-gradient(180deg, #1e1b4b 0%, #0f172a 100%)',
    sidebarBorder: '#312e81',
    navActiveBg: '#4338ca',
    navActiveText: '#eef2ff',
    navText: '#c7d2fe',
    navMuted: '#a5b4fc',
    badgeBg: '#dc2626',
    mainBg: 'linear-gradient(145deg, #eef2ff 0%, #f8fafc 55%, #ecfeff 100%)',
    userDot: '#4f46e5'
  },
  ROLE_MANAGER: {
    sidebarBg: 'linear-gradient(180deg, #042f2e 0%, #0f172a 100%)',
    sidebarBorder: '#115e59',
    navActiveBg: '#0f766e',
    navActiveText: '#f0fdfa',
    navText: '#99f6e4',
    navMuted: '#5eead4',
    badgeBg: '#f97316',
    mainBg: 'linear-gradient(145deg, #ecfeff 0%, #f0fdf4 50%, #f8fafc 100%)',
    userDot: '#14b8a6'
  },
  ROLE_EMPLOYEE: {
    sidebarBg: 'linear-gradient(180deg, #7c2d12 0%, #1f2937 100%)',
    sidebarBorder: '#9a3412',
    navActiveBg: '#c2410c',
    navActiveText: '#fff7ed',
    navText: '#fed7aa',
    navMuted: '#fdba74',
    badgeBg: '#dc2626',
    mainBg: 'linear-gradient(145deg, #fff7ed 0%, #fffbeb 50%, #f8fafc 100%)',
    userDot: '#ea580c'
  }
};

export default function Layout() {
  const { user, logout, isAdmin, isManager } = useAuth();
  const navigate = useNavigate();
  const [unread, setUnread] = useState(0);
  const role = user?.role || 'ROLE_EMPLOYEE';
  const theme = roleThemes[role] || roleThemes.ROLE_EMPLOYEE;

  useEffect(() => {
    if (isManager()) {
      getUnreadCount().then(r => setUnread(r.data.count)).catch(() => {});
      const t = setInterval(() => {
        getUnreadCount().then(r => setUnread(r.data.count)).catch(() => {});
      }, 30000);
      return () => clearInterval(t);
    }
  }, []);

  useEffect(() => {
    document.body.classList.remove('role-admin', 'role-manager', 'role-employee');
    if (role === 'ROLE_ADMIN') document.body.classList.add('role-admin');
    else if (role === 'ROLE_MANAGER') document.body.classList.add('role-manager');
    else document.body.classList.add('role-employee');
  }, [role]);

  const handleLogout = async () => { await logout(); navigate('/login'); };

  const navItems = [
    { to: '/', label: 'Dashboard', icon: '▦', always: true },
    { to: '/products', label: 'Products', icon: '☰', always: true },
    { to: '/inventory', label: 'Inventory', icon: '⊞', always: true },
    { to: '/orders', label: 'Orders', icon: '◫', manager: true },
    { to: '/suppliers', label: 'Suppliers', icon: '⊙', manager: true },
    { to: '/ai', label: 'AI Assistant', icon: '✦', manager: true, badge: unread },
    { to: '/reports', label: 'Reports', icon: '◫', manager: true },
    { to: '/audit', label: 'Audit Logs', icon: '📋', manager: true },
    { to: '/users', label: 'Users', icon: '◉', admin: true },
  ];

  const roleLabel = { ROLE_ADMIN: 'Admin', ROLE_MANAGER: 'Manager', ROLE_EMPLOYEE: 'Employee' };
  const roleColor = { ROLE_ADMIN: '#ef4444', ROLE_MANAGER: '#f59e0b', ROLE_EMPLOYEE: '#3b82f6' };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>
      {/* Sidebar */}
      <aside style={{
        width: 220, background: theme.sidebarBg, color: theme.navText,
        display: 'flex', flexDirection: 'column', flexShrink: 0
      }}>
        <div style={{ padding: '20px 16px', borderBottom: `1px solid ${theme.sidebarBorder}` }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#fff', marginBottom: 4 }}>
            ⚡ GODAM-E
          </div>
          <div style={{ fontSize: 11, color: theme.navMuted }}>Smart Grocery Operations</div>
        </div>

        <nav style={{ flex: 1, padding: '12px 8px' }}>
          {navItems.map(item => {
            if (item.admin && !isAdmin()) return null;
            if (item.manager && !isManager()) return null;
            return (
              <NavLink key={item.to} to={item.to} end={item.to === '/'}
                style={({ isActive }) => ({
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '9px 12px', borderRadius: 8, marginBottom: 2,
                  textDecoration: 'none', fontSize: 13, fontWeight: 500,
                  background: isActive ? theme.navActiveBg : 'transparent',
                  color: isActive ? theme.navActiveText : theme.navText,
                  transition: 'all 0.15s'
                })}>
                <span style={{ fontSize: 15 }}>{item.icon}</span>
                <span style={{ flex: 1 }}>{item.label}</span>
                {item.badge > 0 && (
                  <span style={{
                    background: theme.badgeBg, color: '#fff', borderRadius: 10,
                    fontSize: 10, padding: '1px 6px', fontWeight: 700
                  }}>{item.badge}</span>
                )}
              </NavLink>
            );
          })}
        </nav>

        <div style={{ padding: 12, borderTop: `1px solid ${theme.sidebarBorder}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              background: roleColor[user?.role] || theme.userDot,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 700, color: '#fff'
            }}>
              {user?.fullName?.charAt(0) || user?.username?.charAt(0)?.toUpperCase()}
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#e2e8f0' }}>
                {user?.fullName || user?.username}
              </div>
              <div style={{
                fontSize: 10, color: roleColor[user?.role],
                fontWeight: 600, textTransform: 'uppercase'
              }}>
                {roleLabel[user?.role]}
              </div>
            </div>
          </div>
          <button onClick={handleLogout} style={{
            width: '100%', padding: '7px 0', background: theme.sidebarBorder,
            color: theme.navText, border: 'none', borderRadius: 6,
            cursor: 'pointer', fontSize: 12
          }}>Sign out</button>
        </div>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, background: theme.mainBg, overflow: 'auto' }}>
        <Outlet />
      </main>
    </div>
  );
}
