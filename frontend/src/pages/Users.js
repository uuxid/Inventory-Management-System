import React, { useEffect, useState } from 'react';
import { getUsers, createUser } from '../services/api';

export default function Users() {
  const [users, setUsers] = useState([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ role: 'ROLE_EMPLOYEE' });
  const roleColor = { ROLE_ADMIN: '#ef4444', ROLE_MANAGER: '#f59e0b', ROLE_EMPLOYEE: '#3b82f6' };
  const roleLabel = { ROLE_ADMIN: 'Admin', ROLE_MANAGER: 'Manager', ROLE_EMPLOYEE: 'Employee' };

  const load = () => getUsers().then(r => setUsers(r.data)).catch(() => {});
  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    try { await createUser(form); load(); setModal(false); setForm({ role: 'ROLE_EMPLOYEE' }); }
    catch(e) { alert(e.response?.data?.message || 'Error'); }
  };

  const inputStyle = { width: '100%', padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, boxSizing: 'border-box' };

  return (
    <div style={{ padding: 32 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>User Management</h1>
        <button onClick={() => setModal(true)} style={{ background: '#1e40af', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>+ Add User</button>
      </div>
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead><tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
            {['User','Email','Role','Status','Created'].map(h => (
              <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, fontSize: 12, color: '#374151' }}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: (roleColor[u.role]||'#94a3b8')+'20', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: roleColor[u.role] }}>
                      {u.fullName?.charAt(0) || u.username.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600 }}>{u.fullName || u.username}</div>
                      <div style={{ fontSize: 11, color: '#94a3b8' }}>@{u.username}</div>
                    </div>
                  </div>
                </td>
                <td style={{ padding: '12px 16px', color: '#64748b' }}>{u.email}</td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{ background: (roleColor[u.role]||'#94a3b8')+'15', color: roleColor[u.role]||'#94a3b8', padding: '2px 10px', borderRadius: 10, fontSize: 11, fontWeight: 600 }}>
                    {roleLabel[u.role] || u.role}
                  </span>
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{ color: u.isActive ? '#10b981' : '#ef4444', fontSize: 12, fontWeight: 600 }}>
                    {u.isActive ? '● Active' : '● Inactive'}
                  </span>
                </td>
                <td style={{ padding: '12px 16px', color: '#94a3b8', fontSize: 12 }}>
                  {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 32, width: 440 }}>
            <h2 style={{ margin: '0 0 20px', fontSize: 18, fontWeight: 700 }}>Add User</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[['Full Name','fullName'],['Username*','username'],['Email*','email'],['Password*','password'],['Phone','phone']].map(([l,k]) => (
                <div key={k}>
                  <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>{l}</label>
                  <input type={k === 'password' ? 'password' : 'text'} style={inputStyle} value={form[k] || ''} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))} />
                </div>
              ))}
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Role*</label>
                <select style={inputStyle} value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                  <option value="ROLE_ADMIN">Admin</option>
                  <option value="ROLE_MANAGER">Manager</option>
                  <option value="ROLE_EMPLOYEE">Employee</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
              <button onClick={() => setModal(false)} style={{ padding: '9px 20px', border: '1px solid #e2e8f0', borderRadius: 8, background: '#fff', cursor: 'pointer', fontSize: 13 }}>Cancel</button>
              <button onClick={handleCreate} style={{ padding: '9px 20px', background: '#1e40af', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Create User</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
