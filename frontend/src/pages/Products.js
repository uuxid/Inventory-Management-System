import React, { useEffect, useState } from 'react';
import { getProducts, createProduct, updateProduct, deleteProduct,
  getProductBarcode, getSuppliers, uploadProductImage } from '../services/api';
import { useAuth } from '../context/AuthContext';

const inputStyle = {
  width: '100%', padding: '8px 12px', border: '1px solid #e2e8f0',
  borderRadius: 8, fontSize: 13, boxSizing: 'border-box', outline: 'none'
};

const formatNrs = (value) => `NRS ${Number(value || 0).toFixed(2)}`;

export default function Products() {
  const { isAdmin, isManager } = useAuth();
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null); // null | 'add' | 'edit' | 'barcode'
  const [selected, setSelected] = useState(null);
  const [barcodeData, setBarcodeData] = useState(null);
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const load = () => getProducts().then(r => setProducts(r.data)).catch(() => {});

  useEffect(() => {
    load();
    getSuppliers().then(r => setSuppliers(r.data)).catch(() => {});
  }, []);

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.sku.toLowerCase().includes(search.toLowerCase()) ||
    (p.barcode && p.barcode.includes(search))
  );

  const openAdd = () => { setForm({}); setModal('add'); };
  const openEdit = (p) => { setForm(p); setSelected(p); setModal('edit'); };
  const openBarcode = async (p) => {
    setSelected(p);
    const r = await getProductBarcode(p.id);
    setBarcodeData(r.data);
    setModal('barcode');
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      if (modal === 'add') await createProduct(form);
      else await updateProduct(selected.id, form);
      load(); setModal(null);
    } catch (e) {
      alert(e.response?.data?.message || 'Error saving product');
    } finally { setLoading(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Deactivate this product?')) return;
    await deleteProduct(id); load();
  };

  const handleImageSelect = async (file) => {
    if (!file) return;
    setUploadingImage(true);
    try {
      const previewUrl = URL.createObjectURL(file);
      setForm(f => ({ ...f, imageUrl: previewUrl }));
      const response = await uploadProductImage(file);
      setForm(f => ({ ...f, imageUrl: response.data.imageUrl }));
    } catch (error) {
      alert(error.response?.data?.message || 'Image upload failed');
    } finally {
      setUploadingImage(false);
    }
  };

  const stockBadge = (p) => {
    if (p.quantityOnHand <= 0) return { label: 'Out of stock', color: '#ef4444' };
    if (p.isLowStock) return { label: 'Low stock', color: '#f59e0b' };
    return { label: 'In stock', color: '#10b981' };
  };

  return (
    <div style={{ padding: 32 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#0f172a' }}>Products</h1>
        {isManager() && (
          <button onClick={openAdd} style={{
            background: '#1e40af', color: '#fff', border: 'none', borderRadius: 8,
            padding: '9px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer'
          }}>+ Add Product</button>
        )}
      </div>

      <input value={search} onChange={e => setSearch(e.target.value)}
        placeholder="Search by name, SKU or barcode..."
        style={{ ...inputStyle, marginBottom: 16, maxWidth: 400 }} />

      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              {['Image', 'Name', 'SKU', 'Category', 'Supplier', 'Qty', 'Unit Price', 'Status', 'Actions'].map(h => (
                <th key={h} style={{ padding: '12px 16px', textAlign: 'left',
                  fontWeight: 600, color: '#374151', fontSize: 12 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(p => {
              const badge = stockBadge(p);
              return (
                <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '12px 16px' }}>
                    {p.imageUrl ? (
                      <img
                        src={p.imageUrl}
                        alt={p.name}
                        style={{ width: 42, height: 42, objectFit: 'cover', borderRadius: 8, border: '1px solid #e2e8f0' }}
                        onError={e => { e.currentTarget.style.display = 'none'; }}
                      />
                    ) : (
                      <div style={{ width: 42, height: 42, borderRadius: 8, border: '1px dashed #cbd5e1',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#94a3b8' }}>
                        No Img
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ fontWeight: 600, color: '#0f172a' }}>{p.name}</div>
                    {p.location && <div style={{ fontSize: 11, color: '#94a3b8' }}>{p.location}</div>}
                  </td>
                  <td style={{ padding: '12px 16px', color: '#64748b', fontFamily: 'monospace' }}>{p.sku}</td>
                  <td style={{ padding: '12px 16px', color: '#64748b' }}>{p.categoryName || '—'}</td>
                  <td style={{ padding: '12px 16px', color: '#64748b' }}>{p.supplierName || '—'}</td>
                  <td style={{ padding: '12px 16px', fontWeight: 600, color: p.isLowStock ? '#ef4444' : '#0f172a' }}>
                    {p.quantityOnHand}
                    <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 400 }}>/{p.reorderLevel}</span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>{formatNrs(p.unitPrice)}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{
                      background: badge.color + '15', color: badge.color,
                      padding: '2px 10px', borderRadius: 10, fontSize: 11, fontWeight: 600
                    }}>{badge.label}</span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => openBarcode(p)} style={{
                        padding: '4px 10px', border: '1px solid #e2e8f0', borderRadius: 6,
                        background: '#fff', cursor: 'pointer', fontSize: 11
                      }}>Barcode</button>
                      {isManager() && (
                        <button onClick={() => openEdit(p)} style={{
                          padding: '4px 10px', border: '1px solid #3b82f6', borderRadius: 6,
                          background: '#eff6ff', color: '#3b82f6', cursor: 'pointer', fontSize: 11
                        }}>Edit</button>
                      )}
                      {isAdmin() && (
                        <button onClick={() => handleDelete(p.id)} style={{
                          padding: '4px 10px', border: '1px solid #ef4444', borderRadius: 6,
                          background: '#fef2f2', color: '#ef4444', cursor: 'pointer', fontSize: 11
                        }}>Delete</button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>No products found</div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {(modal === 'add' || modal === 'edit') && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 32,
            width: 560, maxHeight: '90vh', overflow: 'auto' }}>
            <h2 style={{ margin: '0 0 24px', fontSize: 18, fontWeight: 700 }}>
              {modal === 'add' ? 'Add Product' : 'Edit Product'}
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[
                { label: 'Name*', key: 'name' },
                { label: 'SKU*', key: 'sku' },
                { label: 'Barcode', key: 'barcode' },
                { label: 'Location', key: 'location' },
                { label: 'Image URL', key: 'imageUrl' },
              ].map(f => (
                <div key={f.key}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#374151',
                    display: 'block', marginBottom: 4 }}>{f.label}</label>
                  <input style={inputStyle} value={form[f.key] || ''}
                    onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} />
                </div>
              ))}
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151',
                  display: 'block', marginBottom: 4 }}>Upload Image From Computer</label>
                <input
                  type="file"
                  accept="image/*"
                  style={inputStyle}
                  onChange={e => handleImageSelect(e.target.files?.[0])}
                />
                {uploadingImage && <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>Uploading image...</div>}
              </div>
              {[
                { label: 'Unit Price (NRS)*', key: 'unitPrice', type: 'number' },
                { label: 'Cost Price (NRS)*', key: 'costPrice', type: 'number' },
                { label: 'Qty on Hand', key: 'quantityOnHand', type: 'number' },
                { label: 'Reorder Level', key: 'reorderLevel', type: 'number' },
                { label: 'Reorder Qty', key: 'reorderQuantity', type: 'number' },
              ].map(f => (
                <div key={f.key}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#374151',
                    display: 'block', marginBottom: 4 }}>{f.label}</label>
                  <input type="number" style={inputStyle} value={form[f.key] || ''}
                    onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} />
                </div>
              ))}
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151',
                  display: 'block', marginBottom: 4 }}>Supplier</label>
                <select style={inputStyle} value={form.supplierId || ''}
                  onChange={e => setForm(p => ({ ...p, supplierId: e.target.value }))}>
                  <option value="">Select supplier</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151',
                  display: 'block', marginBottom: 4 }}>Valuation Method</label>
                <select style={inputStyle} value={form.valuationMethod || 'FIFO'}
                  onChange={e => setForm(p => ({ ...p, valuationMethod: e.target.value }))}>
                  <option value="FIFO">FIFO</option>
                  <option value="LIFO">LIFO</option>
                  <option value="EOQ">EOQ</option>
                </select>
              </div>
            </div>
            {form.imageUrl && (
              <div style={{ marginTop: 16 }}>
                <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6 }}>Image Preview</div>
                <img
                  src={form.imageUrl}
                  alt="preview"
                  style={{ width: 100, height: 100, objectFit: 'cover', borderRadius: 10, border: '1px solid #e2e8f0' }}
                  onError={e => { e.currentTarget.style.display = 'none'; }}
                />
              </div>
            )}
            <div style={{ display: 'flex', gap: 10, marginTop: 24, justifyContent: 'flex-end' }}>
              <button onClick={() => setModal(null)} style={{
                padding: '9px 20px', border: '1px solid #e2e8f0', borderRadius: 8,
                background: '#fff', cursor: 'pointer', fontSize: 13
              }}>Cancel</button>
              <button onClick={handleSave} disabled={loading} style={{
                padding: '9px 20px', background: '#1e40af', color: '#fff',
                border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600
              }}>{loading ? 'Saving...' : 'Save Product'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Barcode Modal */}
      {modal === 'barcode' && barcodeData && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 32, textAlign: 'center', width: 360 }}>
            <h2 style={{ margin: '0 0 20px', fontSize: 18, fontWeight: 700 }}>
              {selected?.name}
            </h2>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>Barcode</div>
              <img src={barcodeData.barcode} alt="barcode" style={{ maxWidth: '100%' }} />
            </div>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>QR Code</div>
              <img src={barcodeData.qrCode} alt="qr" style={{ width: 150, height: 150 }} />
            </div>
            <button onClick={() => setModal(null)} style={{
              padding: '9px 24px', background: '#1e40af', color: '#fff',
              border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13
            }}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
