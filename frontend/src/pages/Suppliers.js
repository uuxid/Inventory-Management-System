import React, { useEffect, useState } from 'react';
import { getSuppliers, createSupplier, updateSupplier } from '../services/api';

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({});

  const load = () => getSuppliers().then(r => setSuppliers(r.data)).catch(() => {});
  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    try {
      if (form.id) await updateSupplier(form.id, form);
      else await createSupplier(form);
      load(); setModal(false); setForm({});
    } catch(e) { alert(e.response?.data?.message || 'Error'); }
  };

  const inputStyle = { width: '100%', padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, boxSizing: 'border-box' };

  return (
    <div style={{ padding: 32 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Suppliers</h1>
        <button onClick={() => { setForm({}); setModal(true); }} style={{ background: '#1e40af', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>+ Add Supplier</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px,1fr))', gap: 16 }}>
        {suppliers.map(s => (
          <div key={s.id} style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>{s.name}</div>
                <div style={{ fontSize: 12, color: '#64748b' }}>{s.contactPerson}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#f59e0b', fontWeight: 600 }}>★ {Number(s.rating).toFixed(1)}</div>
            </div>
            {[['Email', s.email], ['Phone', s.phone], ['Lead time', `${s.leadTimeDays} days`]].map(([l,v]) => v && (
              <div key={l} style={{ display: 'flex', gap: 8, fontSize: 12, marginBottom: 4 }}>
                <span style={{ color: '#94a3b8', width: 70 }}>{l}</span>
                <span style={{ color: '#374151' }}>{v}</span>
              </div>
            ))}
            <button onClick={() => { setForm(s); setModal(true); }} style={{ marginTop: 12, width: '100%', padding: '7px', border: '1px solid #e2e8f0', borderRadius: 8, background: '#f8fafc', cursor: 'pointer', fontSize: 12 }}>Edit</button>
          </div>
        ))}
      </div>

      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 32, width: 460 }}>
            <h2 style={{ margin: '0 0 20px', fontSize: 18, fontWeight: 700 }}>{form.id ? 'Edit' : 'Add'} Supplier</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[['Name*','name'], ['Contact Person','contactPerson'], ['Email','email'], ['Phone','phone'], ['Address','address']].map(([l,k]) => (
                <div key={k}>
                  <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>{l}</label>
                  <input style={inputStyle} value={form[k] || ''} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))} />
                </div>
              ))}
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Lead Time (days)</label>
                <input type="number" style={inputStyle} value={form.leadTimeDays || ''} onChange={e => setForm(f => ({ ...f, leadTimeDays: e.target.value }))} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
              <button onClick={() => { setModal(false); setForm({}); }} style={{ padding: '9px 20px', border: '1px solid #e2e8f0', borderRadius: 8, background: '#fff', cursor: 'pointer', fontSize: 13 }}>Cancel</button>
              <button onClick={handleSave} style={{ padding: '9px 20px', background: '#1e40af', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
