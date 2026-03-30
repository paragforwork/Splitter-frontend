import React, { useEffect, useMemo, useState } from 'react';
import { Bell, Filter, Image as ImageIcon, IndianRupee, Receipt, RefreshCw, UserRound } from 'lucide-react';
import BottomNav from '../components/BottomNav.jsx';
import LoadingSpinner from '../components/loadingSpinner.jsx';
import { getApiBase } from '../lib/apiBase.js';
import '../styles/dashboard.css';
import '../styles/home.css';

const API_BASE = getApiBase();
const formatCurrency = (value) => `₹${Number(value || 0).toLocaleString('en-IN')}`;
const formatTime = (dateValue) => {
  const date = new Date(dateValue);
  return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
};

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);
  const [typeFilter, setTypeFilter] = useState('all');
  const [groupFilter, setGroupFilter] = useState('');
  const [personFilter, setPersonFilter] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [receiptUrl, setReceiptUrl] = useState('');

  const token = localStorage.getItem('authToken');

  const fetchActivity = async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      params.set('type', typeFilter);
      if (groupFilter) params.set('groupId', groupFilter);
      if (personFilter) params.set('personId', personFilter);

      const response = await fetch(`${API_BASE}/api/activity?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to fetch activity');
      }
      setData(result);
    } catch (err) {
      setError(err.message || 'Could not load activity');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) return;
    fetchActivity();
  }, [typeFilter, groupFilter, personFilter]);

  const groupedEntries = useMemo(() => {
    if (!data?.groupedByDate) return [];
    return Object.entries(data.groupedByDate);
  }, [data]);

  const onPayNow = (item) => {
    const upiId = item?.counterparty?.upiId;
    if (!upiId) {
      alert('UPI ID not available for this person');
      return;
    }
    const uri = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(item.counterparty.name)}&am=${encodeURIComponent(item.amount)}&cu=INR&tn=${encodeURIComponent('Splitter settlement')}`;
    window.location.href = uri;
  };

  const onRemind = (item) => {
    alert(`Reminder queued for ${item.counterparty?.name || item.actor?.name || 'user'}`);
  };

  if (loading) return <LoadingSpinner fullScreen />;

  if (error || !data) {
    return (
      <div className="activity-page center">
        <p>{error || 'Something went wrong'}</p>
        <button className="btn-primary" onClick={fetchActivity}>Retry</button>
      </div>
    );
  }

  return (
    <div className="activity-page">
      <section className="card pending-card">
        <div className="title-row">
          <h2>Pending Actions</h2>
          <Bell size={16} />
        </div>
        {data.pendingActions.length === 0 ? (
          <p className="muted">No urgent pending actions 🎉</p>
        ) : (
          <div className="pending-list">
            {data.pendingActions.map((item) => (
              <div className="pending-item" key={item.id}>
                <div>
                  <strong>{item.text}</strong>
                  <span>{item.group?.name}</span>
                </div>
                <span className={item.status === 'owe' ? 'amount-neg' : 'amount-pos'}>
                  {formatCurrency(item.amount)}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="card">
        <div className="title-row">
          <h3>Filters</h3>
          <Filter size={16} />
        </div>
        <div className="filter-tabs">
          {['all', 'expense', 'settlement', 'group'].map((filter) => (
            <button key={filter} className={typeFilter === filter ? 'active' : ''} onClick={() => setTypeFilter(filter)}>
              {filter[0].toUpperCase() + filter.slice(1)}
            </button>
          ))}
        </div>
        <div className="filter-row">
          <select value={groupFilter} onChange={(e) => setGroupFilter(e.target.value)}>
            <option value="">All groups</option>
            {data.filters.groups.map((group) => (
              <option key={group.id} value={group.id}>{group.name}</option>
            ))}
          </select>
          <select value={personFilter} onChange={(e) => setPersonFilter(e.target.value)}>
            <option value="">All people</option>
            {data.filters.people.map((person) => (
              <option key={person.id} value={person.id}>{person.name}</option>
            ))}
          </select>
        </div>
      </section>

      <section className="card">
        <h3>Insights</h3>
        <div className="insights-grid">
          <div><span>This month</span><strong>{data.insights.totalThisMonth}</strong></div>
          <div><span>You owe</span><strong>{data.insights.oweCount}</strong></div>
          <div><span>You get</span><strong>{data.insights.getCount}</strong></div>
        </div>
      </section>

      <section className="feed-wrap">
        {groupedEntries.length === 0 ? (
          <div className="card"><p className="muted">No activities found.</p></div>
        ) : (
          groupedEntries.map(([label, items]) => (
            <div key={label} className="date-group">
              <h4 className="date-title">{label}</h4>
              <div className="feed-list">
                {items.map((item) => (
                  <div className={`feed-item ${item.status}`} key={item.id}>
                    <div className="avatar-wrap">
                      {item.actor.avatar ? (
                        <img src={item.actor.avatar} alt={item.actor.name} />
                      ) : (
                        <UserRound size={18} />
                      )}
                    </div>
                    <div className="feed-main">
                      <strong>{item.actor.name}</strong>
                      <p>{item.message}</p>
                      <span>{item.group.name} • {formatTime(item.date)}</span>
                      <div className="meta-row">
                        <span className={item.status === 'owe' ? 'amount-neg' : item.status === 'get' ? 'amount-pos' : 'amount-neutral'}>
                          {item.status === 'neutral' ? 'Settled' : formatCurrency(item.amount)}
                        </span>
                        {item.receiptUrl && (
                          <button className="icon-btn" onClick={() => setReceiptUrl(item.receiptUrl)}>
                            <ImageIcon size={14} /> Receipt
                          </button>
                        )}
                      </div>

                      <div className="action-row">
                        {item.status === 'owe' && <button className="btn-danger" onClick={() => onPayNow(item)}><IndianRupee size={14} /> Pay Now</button>}
                        {item.status === 'get' && <button className="btn-success" onClick={() => onRemind(item)}><Bell size={14} /> Remind</button>}
                        <button className="btn-muted" onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}>
                          {expandedId === item.id ? <RefreshCw size={14} /> : <Receipt size={14} />}
                          {expandedId === item.id ? 'Hide details' : 'Expand'}
                        </button>
                      </div>

                      {expandedId === item.id && (
                        <div className="expanded">
                          <h5>Split breakdown</h5>
                          {item.splitDetails.map((share) => (
                            <div key={`${item.id}-${share.userId}`} className="split-row">
                              <span>{share.name}</span>
                              <span>Owes {formatCurrency(share.owedAmount)}</span>
                            </div>
                          ))}
                          <p className="muted small">Notes: detailed notes can be attached on expense create/edit.</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </section>

      {receiptUrl && (
        <div className="modal-overlay" onClick={() => setReceiptUrl('')}>
          <div className="receipt-modal" onClick={(e) => e.stopPropagation()}>
            <img src={receiptUrl} alt="Receipt" />
          </div>
        </div>
      )}

      <div style={{ height: 90 }} />
      <BottomNav />
    </div>
  );
};

export default Dashboard;
