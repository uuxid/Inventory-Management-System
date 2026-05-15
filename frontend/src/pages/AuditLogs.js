import React, { useEffect, useMemo, useState } from 'react';
import { getAllAuditLogs, getRecentAuditLogs } from '../services/api';

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loadError, setLoadError] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [filterUserId, setFilterUserId] = useState('');
  const [filterEntityType, setFilterEntityType] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('DATE_DESC');
  const [selectedLog, setSelectedLog] = useState(null);

  useEffect(() => {
    loadLogs();
  }, [filterType]);

  const loadLogs = async () => {
    setLoadError('');
    try {
      if (filterType === 'RECENT_7') {
        const r = await getRecentAuditLogs(7);
        setLogs(r.data);
      } else if (filterType === 'RECENT_30') {
        const r = await getRecentAuditLogs(30);
        setLogs(r.data);
      } else {
        const r = await getAllAuditLogs();
        setLogs(r.data);
      }
    } catch (e) {
      console.error('Error loading audit logs:', e);
      setLogs([]);
      if (e?.response?.status === 403) {
        setLoadError('You do not have access to view audit logs. Admin or Manager role is required.');
      } else {
        setLoadError('Could not load audit logs from server. Please try again.');
      }
    }
  };

  const filteredLogs = useMemo(() => {
    let result = [...logs];

    // Filter by userId
    if (filterUserId) {
      result = result.filter(log => log.userId === parseInt(filterUserId));
    }

    // Filter by entityType
    if (filterEntityType) {
      result = result.filter(log => log.entityType && log.entityType.toLowerCase().includes(filterEntityType.toLowerCase()));
    }

    // Filter by search query (username, action, entityType)
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(log =>
        (log.username && log.username.toLowerCase().includes(q)) ||
        (log.action && log.action.toLowerCase().includes(q)) ||
        (log.entityType && log.entityType.toLowerCase().includes(q))
      );
    }

    // Sort
    if (sortBy === 'DATE_DESC') {
      result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } else if (sortBy === 'DATE_ASC') {
      result.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    } else if (sortBy === 'USER') {
      result.sort((a, b) => (a.username || '').localeCompare(b.username || ''));
    } else if (sortBy === 'ACTION') {
      result.sort((a, b) => (a.action || '').localeCompare(b.action || ''));
    }

    return result;
  }, [logs, filterUserId, filterEntityType, searchQuery, sortBy]);

  const actionColors = {
    CREATE: '#10b981',
    UPDATE: '#3b82f6',
    DELETE: '#ef4444',
    VIEW: '#8b5cf6',
    LOGIN: '#f59e0b',
  };

  const getActionColor = (action) => {
    if (!action) return '#64748b';
    const upperAction = action.toUpperCase();
    for (const [key, color] of Object.entries(actionColors)) {
      if (upperAction.includes(key)) return color;
    }
    return '#64748b';
  };

  const parseValue = (value) => {
    if (!value) return null;
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  };

  const renderParsedValue = (value) => {
    if (value == null || value === '') {
      return 'No value';
    }
    if (typeof value === 'string') {
      return value;
    }
    return JSON.stringify(value, null, 2);
  };

  return (
    <div style={{ padding: 32 }}>
      <h1 style={{ margin: '0 0 24px', fontSize: 22, fontWeight: 700, color: '#0f172a' }}>
        Audit Logs
      </h1>

      {loadError && (
        <div style={{
          marginBottom: 16,
          padding: '10px 12px',
          borderRadius: 8,
          border: '1px solid #fecaca',
          background: '#fef2f2',
          color: '#991b1b',
          fontSize: 13
        }}>
          {loadError}
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <input
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search by user, action, or entity type..."
          style={{
            minWidth: 280,
            padding: '8px 10px',
            border: '1px solid #e2e8f0',
            borderRadius: 8,
            fontSize: 13,
            outline: 'none'
          }}
        />
        <select
          value={filterType}
          onChange={e => { setFilterType(e.target.value); }}
          style={{ padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13 }}
        >
          <option value="ALL">All time</option>
          <option value="RECENT_7">Last 7 days</option>
          <option value="RECENT_30">Last 30 days</option>
        </select>

        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value)}
          style={{ padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13 }}
        >
          <option value="DATE_DESC">Sort: Latest first</option>
          <option value="DATE_ASC">Sort: Oldest first</option>
          <option value="USER">Sort: User A-Z</option>
          <option value="ACTION">Sort: Action A-Z</option>
        </select>
      </div>

      <div style={{ marginBottom: 16, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <label style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>
          Filter by Entity Type:
          <input
            value={filterEntityType}
            onChange={e => setFilterEntityType(e.target.value)}
            placeholder="e.g., Product, Order, User..."
            style={{
              marginLeft: 8,
              padding: '6px 10px',
              border: '1px solid #e2e8f0',
              borderRadius: 6,
              fontSize: 12,
              width: 200,
            }}
          />
        </label>
        <label style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>
          Filter by User ID:
          <input
            type="number"
            value={filterUserId}
            onChange={e => setFilterUserId(e.target.value)}
            placeholder="User ID..."
            style={{
              marginLeft: 8,
              padding: '6px 10px',
              border: '1px solid #e2e8f0',
              borderRadius: 6,
              fontSize: 12,
              width: 120,
            }}
          />
        </label>
      </div>

      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              {['Timestamp', 'User', 'Action', 'Entity Type', 'Entity ID', 'IP Address', 'Changes'].map(h => (
                <th key={h} style={{
                  padding: '12px 16px', textAlign: 'left',
                  fontWeight: 600, color: '#374151', fontSize: 12
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredLogs.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>
                  No audit logs found.
                </td>
              </tr>
            ) : filteredLogs.map(log => (
              <tr key={log.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '12px 16px', color: '#64748b' }}>
                  {log.createdAt ? new Date(log.createdAt).toLocaleString() : '—'}
                </td>
                <td style={{ padding: '12px 16px', fontWeight: 600, color: '#0f172a' }}>
                  {log.username}
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{
                    background: getActionColor(log.action) + '20',
                    color: getActionColor(log.action),
                    padding: '3px 10px',
                    borderRadius: 999,
                    fontSize: 11,
                    fontWeight: 700
                  }}>
                    {log.action || '—'}
                  </span>
                </td>
                <td style={{ padding: '12px 16px', color: '#64748b' }}>
                  {log.entityType || '—'}
                </td>
                <td style={{ padding: '12px 16px', color: '#64748b', fontFamily: 'monospace' }}>
                  {log.entityId || '—'}
                </td>
                <td style={{ padding: '12px 16px', color: '#94a3b8', fontSize: 11 }}>
                  {log.ipAddress || '—'}
                </td>
                <td style={{ padding: '12px 16px', fontSize: 11 }}>
                  {(log.oldValue || log.newValue) ? (
                    <button
                      type="button"
                      onClick={() => setSelectedLog(log)}
                      style={{
                        background: '#eff6ff',
                        color: '#1d4ed8',
                        border: '1px solid #bfdbfe',
                        borderRadius: 6,
                        padding: '6px 10px',
                        fontSize: 11,
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      View changes
                    </button>
                  ) : (
                    <span style={{ color: '#94a3b8' }}>No changes</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 16, color: '#64748b', fontSize: 12 }}>
        Showing {filteredLogs.length} of {logs.length} audit logs
      </div>

      {selectedLog && (
        <div
          onClick={() => setSelectedLog(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 16
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 'min(900px, 100%)',
              maxHeight: '80vh',
              overflow: 'auto',
              background: '#ffffff',
              borderRadius: 12,
              border: '1px solid #e2e8f0',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2)',
              padding: 18
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ margin: 0, fontSize: 16, color: '#0f172a' }}>Actual Changes</h3>
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 6,
                  padding: '6px 10px',
                  cursor: 'pointer',
                  fontSize: 12
                }}
              >
                Close
              </button>
            </div>

            <div style={{ marginBottom: 12, fontSize: 12, color: '#475569' }}>
              <strong>User:</strong> {selectedLog.username || '—'} &nbsp;|&nbsp;
              <strong>Action:</strong> {selectedLog.action || '—'} &nbsp;|&nbsp;
              <strong>Entity:</strong> {selectedLog.entityType || '—'} #{selectedLog.entityId || '—'}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ border: '1px solid #fecaca', borderRadius: 8, overflow: 'hidden' }}>
                <div style={{ background: '#fef2f2', color: '#b91c1c', fontWeight: 700, fontSize: 12, padding: '8px 10px' }}>
                  Old Value
                </div>
                <pre style={{ margin: 0, padding: 12, fontSize: 12, lineHeight: 1.45, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {renderParsedValue(parseValue(selectedLog.oldValue))}
                </pre>
              </div>

              <div style={{ border: '1px solid #bbf7d0', borderRadius: 8, overflow: 'hidden' }}>
                <div style={{ background: '#f0fdf4', color: '#15803d', fontWeight: 700, fontSize: 12, padding: '8px 10px' }}>
                  New Value
                </div>
                <pre style={{ margin: 0, padding: 12, fontSize: 12, lineHeight: 1.45, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {renderParsedValue(parseValue(selectedLog.newValue))}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
