import React, { useState, useEffect, useRef } from 'react';
import { aiChat, getForecast, getAlerts, markAlertRead } from '../services/api';

export default function AIAssistant() {
  const [messages, setMessages] = useState([
    { role: 'ai', text: 'Namaste! I am your GODAM-E grocery AI assistant. Ask me about low stock, reorder priorities, profit status, and demand forecasting for beverages, groceries, cosmetics, veg, non-veg, and dry fruits.' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [alerts, setAlerts] = useState([]);
  const [forecast, setForecast] = useState('');
  const [forecastLoading, setForecastLoading] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    getAlerts().then(r => setAlerts(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput('');
    setMessages(m => [...m, { role: 'user', text: userMsg }]);
    setLoading(true);
    try {
      const r = await aiChat(userMsg);
      setMessages(m => [...m, { role: 'ai', text: r.data.response }]);
    } catch { setMessages(m => [...m, { role: 'ai', text: 'Sorry, I could not process that request.' }]); }
    finally { setLoading(false); }
  };

  const loadForecast = async () => {
    setForecastLoading(true);
    try { const r = await getForecast(); setForecast(r.data.forecast); }
    catch { setForecast('Could not load forecast.'); }
    finally { setForecastLoading(false); }
  };

  const handleRead = async (id) => {
    await markAlertRead(id);
    setAlerts(a => a.map(x => x.id === id ? { ...x, isRead: true } : x));
  };

  const severityColor = { CRITICAL: '#ef4444', WARNING: '#f59e0b', INFO: '#3b82f6' };
  const suggestions = [
    'Which grocery items need reordering this week?',
    'Show me low stock in beverages and dry fruits',
    'Suggest reorder quantities for veg and non veg items',
    'Which supplier should I prioritize for fresh stock?',
    'Show me current profit status and margin'
  ];

  return (
    <div style={{ padding: 32 }}>
      <h1 style={{ margin: '0 0 24px', fontSize: 22, fontWeight: 700, color: '#0f172a' }}>
        AI Assistant
      </h1>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 20, alignItems: 'start' }}>

        {/* Chat */}
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0',
          display: 'flex', flexDirection: 'column', height: 620 }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid #e2e8f0',
            fontWeight: 600, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981' }}></div>
            AI Chat
          </div>

          <div style={{ flex: 1, overflow: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {messages.map((m, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={{
                  maxWidth: '80%', padding: '10px 14px', borderRadius: m.role === 'user' ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
                  background: m.role === 'user' ? '#1e40af' : '#f8fafc',
                  color: m.role === 'user' ? '#fff' : '#0f172a',
                  fontSize: 13, lineHeight: 1.6,
                  border: m.role === 'ai' ? '1px solid #e2e8f0' : 'none',
                  whiteSpace: 'pre-wrap'
                }}>{m.text}</div>
              </div>
            ))}
            {loading && (
              <div style={{ display: 'flex', gap: 4, padding: '10px 14px' }}>
                {[0,1,2].map(i => (
                  <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: '#94a3b8',
                    animation: `bounce 1s ${i * 0.2}s infinite` }}></div>
                ))}
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Suggestions */}
          <div style={{ padding: '8px 16px', borderTop: '1px solid #f1f5f9', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {suggestions.map(s => (
              <button key={s} onClick={() => setInput(s)} style={{
                padding: '4px 10px', border: '1px solid #e2e8f0', borderRadius: 16,
                background: '#f8fafc', fontSize: 11, cursor: 'pointer', color: '#374151'
              }}>{s}</button>
            ))}
          </div>

          <div style={{ padding: 16, borderTop: '1px solid #e2e8f0', display: 'flex', gap: 8 }}>
            <input value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && send()}
              placeholder="Ask about your inventory..."
              style={{ flex: 1, padding: '9px 14px', border: '1px solid #e2e8f0',
                borderRadius: 8, fontSize: 13, outline: 'none' }} />
            <button onClick={send} disabled={loading || !input.trim()} style={{
              padding: '9px 18px', background: loading ? '#94a3b8' : '#1e40af',
              color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600
            }}>Send</button>
          </div>
        </div>

        {/* Right panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Forecast */}
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>Demand Forecast</h3>
              <button onClick={loadForecast} disabled={forecastLoading} style={{
                padding: '5px 12px', background: '#eff6ff', color: '#3b82f6',
                border: '1px solid #bfdbfe', borderRadius: 6, cursor: 'pointer', fontSize: 12
              }}>{forecastLoading ? 'Loading...' : 'Generate'}</button>
            </div>
            {forecast ? (
              <div style={{ fontSize: 12, color: '#374151', lineHeight: 1.7,
                maxHeight: 800, overflow: 'auto', whiteSpace: 'pre-wrap' }}>{forecast}</div>
            ) : (
              <div style={{ fontSize: 12, color: '#94a3b8' }}>
                Click Generate to get AI-powered 30-day grocery demand forecast
              </div>
            )}
          </div>

          {/* Alerts */}
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 20 }}>
            <h3 style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 700 }}>AI Alerts</h3>
            <div style={{ maxHeight: 320, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {alerts.length === 0 && <div style={{ fontSize: 12, color: '#94a3b8' }}>No alerts</div>}
              {alerts.map(a => (
                <div key={a.id} style={{
                  padding: '10px 12px', borderRadius: 8,
                  background: a.isRead ? '#f8fafc' : (severityColor[a.severity] + '10'),
                  border: `1px solid ${a.isRead ? '#e2e8f0' : severityColor[a.severity] + '40'}`,
                  opacity: a.isRead ? 0.6 : 1
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: severityColor[a.severity] }}>
                      {a.severity}
                    </span>
                    {!a.isRead && (
                      <button onClick={() => handleRead(a.id)} style={{
                        fontSize: 10, color: '#64748b', background: 'none',
                        border: 'none', cursor: 'pointer', padding: 0
                      }}>Mark read</button>
                    )}
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#0f172a', marginBottom: 3 }}>{a.title}</div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>{a.message?.substring(0, 100)}...</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
