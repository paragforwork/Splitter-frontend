import React, { useEffect, useMemo, useState } from 'react';
import {
  Bell,
  CheckCircle2,
  Copy,
  IndianRupee,
  Link2,
  LogOut,
  Pencil,
  QrCode,
  RefreshCw,
  Settings,
  Users,
  X
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import BottomNav from '../components/BottomNav.jsx';
import LoadingSpinner from '../components/loadingSpinner.jsx';
import { getApiBase } from '../lib/apiBase.js';
import { logoutEverywhere } from '../lib/authSession.js';
import '../styles/accounts.css';

const API_BASE = getApiBase();
const DEFAULT_AVATAR = 'https://cdn-icons-png.flaticon.com/512/149/149071.png';

const formatCurrency = (value) => `₹${Number(value || 0).toLocaleString('en-IN')}`;
const getAvatar = (avatarUrl) => avatarUrl && avatarUrl.trim() ? avatarUrl : DEFAULT_AVATAR;

const toRelativeTime = (dateValue) => {
  const date = new Date(dateValue).getTime();
  const now = Date.now();
  const delta = Math.max(0, now - date);
  const minutes = Math.floor(delta / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

function Accounts() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activityFilter, setActivityFilter] = useState('all');
  const [saving, setSaving] = useState(false);
  const [upiInput, setUpiInput] = useState('');
  const [profileName, setProfileName] = useState('');
  const [profilePhone, setProfilePhone] = useState('');
  const [copied, setCopied] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editUpi, setEditUpi] = useState('');

  const token = localStorage.getItem('authToken');
  const localUser = JSON.parse(localStorage.getItem('user') || '{}');

  const fetchOverview = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_BASE}/api/account/overview`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to fetch account overview');
      }
      setData(result.account);
      setUpiInput(result.account.profile.upiId || '');
      setProfileName(result.account.profile.name || '');
      setProfilePhone(result.account.profile.phone || '');
      setEditName(result.account.profile.name || '');
      setEditPhone(result.account.profile.phone || '');
      setEditUpi(result.account.profile.upiId || '');
    } catch (err) {
      setError(err.message || 'Server connection failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) {
      navigate('/signup');
      return;
    }
    fetchOverview();
  }, []);

  const filteredActivity = useMemo(() => {
    if (!data?.recentActivity) return [];
    if (activityFilter === 'paid') return data.recentActivity.filter((item) => item.byYou);
    if (activityFilter === 'owed') return data.recentActivity.filter((item) => item.involveYouAsDebtor);
    return data.recentActivity;
  }, [data, activityFilter]);

  const handleLogout = async () => {
    await logoutEverywhere();
    navigate('/signup');
  };

  const saveProfile = async () => {
    setSaving(true);
    try {
      const response = await fetch(`${API_BASE}/api/account/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ name: profileName, phone: profilePhone })
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to update profile');
      }
      const mergedUser = { ...localUser, name: result.profile.name };
      localStorage.setItem('user', JSON.stringify(mergedUser));
      await fetchOverview();
    } catch (err) {
      alert(err.message || 'Could not update profile');
    } finally {
      setSaving(false);
    }
  };

  const saveUpi = async () => {
    setSaving(true);
    try {
      const response = await fetch(`${API_BASE}/api/account/upi`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ upiId: upiInput })
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to update UPI');
      }
      await fetchOverview();
    } catch (err) {
      alert(err.message || 'Could not update UPI');
    } finally {
      setSaving(false);
    }
  };

  const saveContactDetails = async () => {
    setSaving(true);
    try {
      const profileResponse = await fetch(`${API_BASE}/api/account/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ name: editName, phone: editPhone })
      });
      const profileResult = await profileResponse.json();
      if (!profileResponse.ok || !profileResult.success) {
        throw new Error(profileResult.message || 'Failed to update phone number');
      }

      const cleanedUpi = editUpi.trim();
      const previousUpi = (upiInput || '').trim();
      if (cleanedUpi && cleanedUpi !== previousUpi) {
        const upiResponse = await fetch(`${API_BASE}/api/account/upi`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ upiId: cleanedUpi })
        });
        const upiResult = await upiResponse.json();
        if (!upiResponse.ok || !upiResult.success) {
          throw new Error(upiResult.message || 'Failed to update UPI');
        }
      }

      setShowEditModal(false);
      await fetchOverview();
    } catch (err) {
      alert(err.message || 'Could not update details');
    } finally {
      setSaving(false);
    }
  };

  const toggleNotifications = async () => {
    if (!data) return;
    setSaving(true);
    try {
      const response = await fetch(`${API_BASE}/api/account/notifications`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ enabled: !data.profile.notificationEnabled })
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to update notifications');
      }
      await fetchOverview();
    } catch (err) {
      alert(err.message || 'Could not update notifications');
    } finally {
      setSaving(false);
    }
  };

  const payViaUpi = (person) => {
    if (!person.upiId) {
      alert(`UPI ID missing for ${person.name}`);
      return;
    }
    const uri = `upi://pay?pa=${encodeURIComponent(person.upiId)}&pn=${encodeURIComponent(person.name)}&am=${encodeURIComponent(person.amount)}&cu=INR&tn=${encodeURIComponent('Splitter settlement')}`;
    window.location.href = uri;
  };

  const remindPerson = (person) => {
    alert(`Reminder queued for ${person.name}.`);
  };

  const handleShareUpi = async () => {
    const upiId = data?.profile?.upiId;
    if (!upiId) {
      alert('Add UPI ID first');
      return;
    }
    const link = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(data.profile.name)}&cu=INR`;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (loading) {
    return <LoadingSpinner fullScreen />;
  }

  if (error || !data) {
    return (
      <div className="accounts-page error-wrap">
        <p>{error || 'Something went wrong'}</p>
        <button className="primary-btn" onClick={fetchOverview}>Retry</button>
      </div>
    );
  }

  const netClass =
    data.summary.netBalance > 0 ? 'pos' : data.summary.netBalance < 0 ? 'neg' : 'neu';

  return (
    <div className="accounts-page">
      <section className="card profile-card">
        <div className="profile-head">
          <img src={getAvatar(data.profile.avatar)} alt={data.profile.name} className="avatar" onError={(e) => { e.currentTarget.src = DEFAULT_AVATAR; }} />
          <div>
            <div className="name-row">
              <h2>{data.profile.name}</h2>
              <button className="edit-pen-btn" onClick={() => setShowEditModal(true)} title="Edit phone and UPI">
                <Pencil size={14} />
              </button>
            </div>
            <p>{data.profile.email}</p>
            <p>{data.profile.phone || 'No phone added'}</p>
            <p>{data.profile.upiId || 'No UPI ID added'}</p>
          </div>
        </div>

        <div className="pill-row">
          <span className={`pill ${data.profile.upiVerified ? 'ok' : 'warn'}`}>
            {data.profile.upiVerified ? <CheckCircle2 size={14} /> : <Settings size={14} />}
            {data.profile.upiVerified ? 'UPI verified' : 'UPI not verified'}
          </span>
          <span className={`pill ${data.profile.hasFcmToken ? 'ok' : 'warn'}`}>
            <Bell size={14} /> {data.profile.hasFcmToken ? 'Device linked' : 'Device not linked'}
          </span>
        </div>

        <div className="action-row">
          <button className="secondary-btn" onClick={handleShareUpi}>
            {copied ? <CheckCircle2 size={16} /> : <Copy size={16} />}
            {copied ? 'Copied' : 'Share UPI link'}
          </button>
          <button className="secondary-btn" onClick={handleShareUpi}>
            <QrCode size={16} /> Share payment QR/link
          </button>
        </div>
      </section>

      <section className="card summary-card">
        <h3>Balance Summary</h3>
        <div className="summary-grid">
          <div className="metric pos">
            <span>You are owed</span>
            <strong>{formatCurrency(data.summary.youAreOwed)}</strong>
          </div>
          <div className="metric neg">
            <span>You owe</span>
            <strong>{formatCurrency(data.summary.youOwe)}</strong>
          </div>
          <div className={`metric ${netClass}`}>
            <span>Net balance</span>
            <strong>{formatCurrency(data.summary.netBalance)}</strong>
          </div>
        </div>
      </section>

      <section className="card two-col">
        <div>
          <h3>You owe</h3>
          {data.peopleBalances.youOwe.length === 0 ? <p className="muted">All settled</p> : (
            data.peopleBalances.youOwe.map((person) => (
              <div key={person.userId} className="person-row">
                <div className="left">
                  <img src={getAvatar(person.avatar)} alt={person.name} onError={(e) => { e.currentTarget.src = DEFAULT_AVATAR; }} />
                  <div>
                    <strong>{person.name}</strong>
                    <span>{formatCurrency(person.amount)}</span>
                  </div>
                </div>
                <button className="pay-btn" onClick={() => payViaUpi(person)}>Pay</button>
              </div>
            ))
          )}
        </div>

        <div>
          <h3>You are owed</h3>
          {data.peopleBalances.youAreOwed.length === 0 ? <p className="muted">No pending receivables</p> : (
            data.peopleBalances.youAreOwed.map((person) => (
              <div key={person.userId} className="person-row">
                <div className="left">
                  <img src={getAvatar(person.avatar)} alt={person.name} onError={(e) => { e.currentTarget.src = DEFAULT_AVATAR; }} />
                  <div>
                    <strong>{person.name}</strong>
                    <span>{formatCurrency(person.amount)}</span>
                  </div>
                </div>
                <button className="remind-btn" onClick={() => remindPerson(person)}>Remind</button>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="card">
        <h3>Recent Activity</h3>
        <div className="filters">
          <button className={activityFilter === 'all' ? 'active' : ''} onClick={() => setActivityFilter('all')}>All</button>
          <button className={activityFilter === 'paid' ? 'active' : ''} onClick={() => setActivityFilter('paid')}>Paid by you</button>
          <button className={activityFilter === 'owed' ? 'active' : ''} onClick={() => setActivityFilter('owed')}>Owed to you</button>
        </div>
        <div className="timeline">
          {filteredActivity.length === 0 ? <p className="muted">No activity yet</p> : filteredActivity.map((item) => (
            <button className="timeline-item" key={item.id} onClick={() => item.groupName && navigate('/grouplist')}>
              <div className="icon">
                {item.type === 'settlement' ? <RefreshCw size={16} /> : <IndianRupee size={16} />}
              </div>
              <div className="content">
                <strong>{item.title}</strong>
                <span>{item.groupName} · {toRelativeTime(item.date)}</span>
              </div>
            </button>
          ))}
        </div>
      </section>

      <section className="card">
        <h3>Group-wise balances</h3>
        <div className="group-list">
          {data.groupBalances.length === 0 ? <p className="muted">No groups yet</p> : data.groupBalances.map((group) => (
            <button className="group-row" key={group.groupId} onClick={() => navigate(`/groupsDetails/${group.groupId}`)}>
              <div className="left">
                <img src={getAvatar(group.avatar)} alt={group.name} onError={(e) => { e.currentTarget.src = DEFAULT_AVATAR; }} />
                <div>
                  <strong>{group.name}</strong>
                  <span><Users size={12} /> {group.memberCount} members</span>
                </div>
              </div>
              <span className={group.balance >= 0 ? 'pos' : 'neg'}>
                {group.balance >= 0 ? '+' : '-'}{formatCurrency(Math.abs(group.balance))}
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="card action-center">
        <h3>Settlement Center</h3>
        <div className="action-row">
          <button className="primary-btn" onClick={() => navigate('/grouplist')}>Settle with person</button>
          <button className="primary-btn ghost" onClick={() => navigate('/grouplist')}>Settle entire group</button>
          <button className="primary-btn ghost" onClick={() => navigate('/grouplist')}>Make partial payment</button>
        </div>
        <p className="smart-tip">Smart suggestion: pay highest outstanding first for quickest debt reduction.</p>
      </section>

      <section className="card">
        <h3>Notifications</h3>
        <div className="action-row">
          <button className="secondary-btn" onClick={toggleNotifications} disabled={saving}>
            <Bell size={16} />
            {data.profile.notificationEnabled ? 'Disable notifications' : 'Enable notifications'}
          </button>
        </div>
        <div className="timeline">
          {data.notifications.length === 0 ? <p className="muted">No notifications</p> : data.notifications.map((item) => (
            <div className="timeline-item" key={item.id}>
              <div className="icon"><Bell size={16} /></div>
              <div className="content">
                <strong>{item.title}</strong>
                <span>{item.subtitle}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="card settings-card">
        <h3>Settings</h3>
        <div className="action-row">
          <button className="secondary-btn" onClick={() => setShowEditModal(true)}><Pencil size={16} /> Edit phone/UPI</button>
          <button className="secondary-btn" onClick={handleShareUpi}><Link2 size={16} /> Share UPI</button>
          <button className="danger-btn" onClick={handleLogout}><LogOut size={16} /> Logout</button>
        </div>
      </section>

      {showEditModal && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-sheet edit-modal-shell" onClick={(e) => e.stopPropagation()}>
            <div className="modal-top edit-modal-top">
              <div>
                <h3>Edit contact details</h3>
                <p className="edit-modal-subtitle">Update your phone number and UPI ID</p>
              </div>
              <button className="close-btn" onClick={() => setShowEditModal(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="form-grid edit-modal-form">
              <label>
                <span>Name</span>
                <input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Enter name" />
              </label>
              <label>
                <span>Phone Number</span>
                <input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} placeholder="Enter phone number" />
              </label>
              <label>
                <span>UPI ID</span>
                <input value={editUpi} onChange={(e) => setEditUpi(e.target.value)} placeholder="name@bank" />
              </label>
            </div>
            <div className="modal-action-row">
              <button className="secondary-btn save-btn" onClick={() => setShowEditModal(false)} disabled={saving}>Cancel</button>
              <button className="primary-btn save-btn" onClick={saveContactDetails} disabled={saving}>
                {saving ? 'Saving...' : 'Save changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ height: 90 }} />
      <BottomNav />
    </div>
  );
}

export default Accounts;
