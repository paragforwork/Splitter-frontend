import React, { useEffect, useMemo, useState } from 'react';
import BottomNav from '../components/BottomNav.jsx';
import LoadingSpinner from '../components/loadingSpinner.jsx';
import '../styles/home.css';
import {
  ArrowRight,
  BellRing,
  Briefcase,
  Camera,
  Globe,
  HandCoins,
  Heart,
  Home as HomeIcon,
  LogOut,
  Plus,
  Receipt,
  UserPlus,
  Users
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getApiBase } from '../lib/apiBase.js';
import { logoutEverywhere } from '../lib/authSession.js';

const API_BASE = getApiBase();
const formatCurrency = (value) => `₹${Number(value || 0).toLocaleString('en-IN')}`;

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  return 'Good Evening';
};

const getTimeAgo = (dateValue) => {
  const ms = Date.now() - new Date(dateValue).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
};

const Home = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [account, setAccount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [activityFilter, setActivityFilter] = useState('all');
  const [expandedId, setExpandedId] = useState(null);

  const [showGroupModal, setShowGroupModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [groupType, setGroupType] = useState('OTHER');
  const [groupName, setGroupName] = useState('');
  const [joinCode, setJoinCode] = useState('');

  const token = localStorage.getItem('authToken');

  const fetchHomeData = async () => {
    setLoading(true);
    setError('');
    try {
      const userData = JSON.parse(localStorage.getItem('user') || '{}');
      setUser(userData);

      const response = await fetch(`${API_BASE}/api/account/overview`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to load home data');
      }
      setAccount(data.account);
    } catch (err) {
      setError(err.message || 'Unable to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) {
      navigate('/signup');
      return;
    }
    fetchHomeData();
  }, []);

  const summary = account?.summary || { youAreOwed: 0, youOwe: 0, netBalance: 0 };
  const peopleBalances = account?.peopleBalances || { youOwe: [], youAreOwed: [] };
  const groups = account?.groupBalances || [];
  const activity = account?.recentActivity || [];

  const smartCTA = summary.netBalance < 0 ? 'Pay Now' : summary.netBalance > 0 ? 'Request Money' : 'Settle Up';
  const netClass = summary.netBalance > 0 ? 'green-gradient' : summary.netBalance < 0 ? 'red-gradient' : 'neutral-gradient';

  const microInsight = `${peopleBalances.youAreOwed.length} people owe you · You owe ${peopleBalances.youOwe.length} people`;

  const priorityGroups = useMemo(() => {
    return [...groups]
      .sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance))
      .slice(0, 3);
  }, [groups]);

  const pendingActions = useMemo(() => {
    const actions = [];
    peopleBalances.youOwe.slice(0, 2).forEach((person) => {
      actions.push({
        id: `owe-${person.userId}`,
        text: `${person.name} requested ${formatCurrency(person.amount)} from you`,
        action: () => navigate('/accounts')
      });
    });
    priorityGroups
      .filter((g) => g.balance < 0)
      .slice(0, 2)
      .forEach((group) => {
        actions.push({
          id: `group-${group.groupId}`,
          text: `You haven’t settled ${group.name}`,
          action: () => navigate(`/groupsDetails/${group.groupId}`)
        });
      });
    return actions.slice(0, 4);
  }, [peopleBalances, priorityGroups, navigate]);

  const filteredActivity = useMemo(() => {
    if (activityFilter === 'expense') return activity.filter((item) => item.type === 'expense');
    if (activityFilter === 'settlement') return activity.filter((item) => item.type === 'settlement');
    return activity;
  }, [activity, activityFilter]);

  const monthlySpend = useMemo(() => {
    const now = new Date();
    return activity
      .filter((item) => item.byYou && item.type === 'expense')
      .filter((item) => {
        const d = new Date(item.date);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      })
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);
  }, [activity]);

  const topPerson = useMemo(() => {
    const counts = new Map();
    activity.forEach((item) => {
      const match = item.title.match(/^([A-Za-z]+)/);
      const person = item.byYou ? 'You' : match?.[1] || 'Friend';
      counts.set(person, (counts.get(person) || 0) + 1);
    });
    const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
    return sorted[0]?.[0] || 'friends';
  }, [activity]);

  const handleLogout = async () => {
    await logoutEverywhere();
    navigate('/signup');
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      alert('Group name cannot be empty');
      return;
    }
    setBusy(true);
    try {
      const response = await fetch(`${API_BASE}/api/groups`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ name: groupName.trim(), type: groupType })
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to create group');
      }
      setShowGroupModal(false);
      setGroupName('');
      setGroupType('OTHER');
      navigate(`/groupsDetails/${data.group._id}`);
    } catch (err) {
      alert(err.message || 'Could not create group');
    } finally {
      setBusy(false);
    }
  };

  const handleJoinGroup = async () => {
    if (!joinCode.trim() || joinCode.trim().length < 6) {
      alert('Please enter a valid 6-character code');
      return;
    }
    setBusy(true);
    try {
      const response = await fetch(`${API_BASE}/api/groups/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ shareCode: joinCode.trim().toUpperCase() })
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to join group');
      }
      setShowJoinModal(false);
      setJoinCode('');
      navigate(`/groupsDetails/${data.groupId}`);
    } catch (err) {
      alert(err.message || 'Could not join group');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return <LoadingSpinner fullScreen />;
  }

  if (error || !account) {
    return (
      <div className="home-container" style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 10 }}>
        <p style={{ color: '#f87171' }}>{error || 'Something went wrong'}</p>
        <button className="create-btn" onClick={fetchHomeData}>Retry</button>
      </div>
    );
  }

  return (
    <div className="home-container">
      <header className="home-header">
        <div className="welcome-text">
          <h1>{getGreeting()}, {user?.name?.split(' ')[0] || 'User'} 👋</h1>
          <p>Where you stand right now</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={handleLogout} style={{ background: 'transparent', border: 'none', color: '#94a3b8' }}>
            <LogOut size={20} />
          </button>
          <div className="profile-pic">
            <img src={account.profile.avatar} alt="Profile" />
          </div>
        </div>
      </header>

      <section className="hero-section">
        <div className={`balance-card ${netClass}`}>
          <span>Net Position</span>
          <h2>{formatCurrency(Math.abs(summary.netBalance))}</h2>
          <p>{summary.netBalance > 0 ? 'You are in credit' : summary.netBalance < 0 ? 'You need to settle' : 'You are settled'}</p>
          <div className="summary-inline">
            <div><small>You are owed</small><strong>{formatCurrency(summary.youAreOwed)}</strong></div>
            <div><small>You owe</small><strong>{formatCurrency(summary.youOwe)}</strong></div>
          </div>
          <button className="settle-btn" onClick={() => navigate('/accounts')}>
            {smartCTA} <ArrowRight size={16} style={{ marginLeft: 5 }} />
          </button>
          <p style={{ marginTop: 10, fontSize: 12 }}>{microInsight}</p>
        </div>
      </section>

      {pendingActions.length > 0 && (
        <section className="activity-section">
          <div className="section-title">
            <h3>Pending Actions</h3>
            <BellRing size={16} color="#f59e0b" />
          </div>
          <div className="activity-list">
            {pendingActions.map((item) => (
              <button key={item.id} className="activity-item" onClick={item.action}>
                <div className="activity-icon expense"><BellRing size={18} /></div>
                <div className="activity-info">
                  <p className="activity-text">{item.text}</p>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="quick-actions quick-actions-grid">
        <button className="action-btn" onClick={() => navigate('/grouplist')}>
          <div className="icon-box orange"><Plus size={24} color="#fff" /></div>
          <span>Add Expense</span>
        </button>
        <button className="action-btn" onClick={() => navigate('/accounts')}>
          <div className="icon-box blue"><HandCoins size={24} color="#fff" /></div>
          <span>Settle Up</span>
        </button>
        <button className="action-btn" onClick={() => setShowGroupModal(true)}>
          <div className="icon-box purple"><Users size={24} color="#fff" /></div>
          <span>Split with Friend</span>
        </button>
        <button className="action-btn" onClick={() => alert('Bill scan coming soon')}>
          <div className="icon-box blue"><Camera size={24} color="#fff" /></div>
          <span>Scan Bill</span>
        </button>
      </section>

      <section className="groups-section">
        <div className="section-title">
          <h3>People Balances</h3>
          <span className="see-all" onClick={() => navigate('/accounts')}>See All</span>
        </div>
        <div className="activity-list">
          {[...peopleBalances.youOwe.slice(0, 2), ...peopleBalances.youAreOwed.slice(0, 2)].slice(0, 4).map((person) => {
            const isOwe = peopleBalances.youOwe.some((p) => p.userId === person.userId);
            return (
              <button key={person.userId} className="activity-item" onClick={() => navigate('/accounts')}>
                <div className={`activity-icon ${isOwe ? 'expense' : 'settlement'}`}>
                  <img src={person.avatar || account.profile.avatar} alt={person.name} style={{ width: 28, height: 28, borderRadius: '50%' }} />
                </div>
                <div className="activity-info">
                  <p className="activity-text">{person.name}</p>
                  <span className={isOwe ? 'text-red' : 'text-green'}>
                    {isOwe ? `You owe ${formatCurrency(person.amount)}` : `Owes you ${formatCurrency(person.amount)}`}
                  </span>
                </div>
              </button>
            );
          })}
          {peopleBalances.youOwe.length + peopleBalances.youAreOwed.length === 0 && (
            <div style={{ color: '#94a3b8', fontSize: 13 }}>No person-wise balance pending</div>
          )}
        </div>
      </section>

      <section className="groups-section">
        <div className="section-title">
          <h3>Priority Groups</h3>
          <span className="see-all" onClick={() => navigate('/grouplist')}>See All</span>
        </div>
        <div className="groups-scroll">
          {priorityGroups.length > 0 ? priorityGroups.map((group) => (
            <div key={group.groupId} className="group-card" onClick={() => navigate(`/groupsDetails/${group.groupId}`)} style={{ cursor: 'pointer' }}>
              <div className="group-icon">{group.name.charAt(0).toUpperCase()}</div>
              <h4>{group.name}</h4>
              <p style={{ color: '#94a3b8' }}>{group.memberCount} members · Updated recently</p>
              <p className={group.balance < 0 ? 'text-red' : group.balance > 0 ? 'text-green' : ''}>
                {group.balance === 0 ? 'Settled' : `${group.balance < 0 ? 'Pay' : 'Get'} ${formatCurrency(Math.abs(group.balance))}`}
              </p>
              {group.balance < 0 && <button className="settle-btn" style={{ marginTop: 10 }} onClick={(e) => { e.stopPropagation(); navigate(`/groupsDetails/${group.groupId}`); }}>Pay {formatCurrency(Math.abs(group.balance))}</button>}
            </div>
          )) : (
            <div style={{ padding: '0 20px', color: '#94a3b8', fontSize: '14px' }}>No groups yet. Create or join one!</div>
          )}
        </div>
      </section>

      <section className="activity-section">
        <div className="section-title">
          <h3>Recent Activity</h3>
        </div>
        <div className="filters">
          <button className={activityFilter === 'all' ? 'active' : ''} onClick={() => setActivityFilter('all')}>All</button>
          <button className={activityFilter === 'expense' ? 'active' : ''} onClick={() => setActivityFilter('expense')}>Expenses</button>
          <button className={activityFilter === 'settlement' ? 'active' : ''} onClick={() => setActivityFilter('settlement')}>Settlements</button>
        </div>
        <div className="activity-list">
          {filteredActivity.slice(0, 8).map((item) => (
            <button key={item.id} className="activity-item" onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}>
              <div className={`activity-icon ${item.type}`}>
                <Receipt size={18} />
              </div>
              <div className="activity-info">
                <p className="activity-text">{item.title}</p>
                <span className="activity-time">{item.groupName} · {getTimeAgo(item.date)}</span>
                {expandedId === item.id && (
                  <div style={{ marginTop: 8, fontSize: 12, color: '#94a3b8' }}>
                    <div>Who paid: {item.byYou ? 'You' : 'Friend'}</div>
                    <div>Amount: {formatCurrency(item.amount)}</div>
                    <div>Details: Split details visible in group page</div>
                  </div>
                )}
              </div>
              <div className="activity-amount">
                <span className={item.involveYouAsDebtor ? 'text-red' : 'text-green'}>
                  {formatCurrency(item.amount)}
                </span>
              </div>
            </button>
          ))}
        </div>
      </section>

      <section className="activity-section">
        <div className="section-title"><h3>Insights</h3></div>
        <div className="activity-list">
          <div className="activity-item">
            <div className="activity-icon settlement"><Receipt size={18} /></div>
            <div className="activity-info">
              <p className="activity-text">You spent {formatCurrency(monthlySpend)} this month</p>
              <span className="activity-time">Top category: Mixed expenses</span>
            </div>
          </div>
          <div className="activity-item">
            <div className="activity-icon expense"><Users size={18} /></div>
            <div className="activity-info">
              <p className="activity-text">You mostly spend with {topPerson}</p>
              <span className="activity-time">Based on your latest activity</span>
            </div>
          </div>
        </div>
      </section>

      <div style={{ height: '88px' }} />
      <BottomNav />

      {showGroupModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Create New Group</h3>
              <button className="close-btn" onClick={() => setShowGroupModal(false)}>×</button>
            </div>
            <div className="form-group">
              <label>Group Name</label>
              <input type="text" placeholder="e.g. Goa Trip" value={groupName} onChange={(e) => setGroupName(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Group Type</label>
              <div className="type-grid">
                {[
                  { id: 'TRIP', label: 'Trip', icon: <Globe size={18} /> },
                  { id: 'HOME', label: 'Home', icon: <HomeIcon size={18} /> },
                  { id: 'COUPLE', label: 'Couple', icon: <Heart size={18} /> },
                  { id: 'OTHER', label: 'Other', icon: <Briefcase size={18} /> }
                ].map((type) => (
                  <div key={type.id} className={`type-option ${groupType === type.id ? 'selected' : ''}`} onClick={() => setGroupType(type.id)}>
                    {type.icon}<span>{type.label}</span>
                  </div>
                ))}
              </div>
            </div>
            <button className="create-btn" onClick={handleCreateGroup} disabled={busy}>
              {busy ? 'Creating...' : 'Create Group'}
            </button>
          </div>
        </div>
      )}

      {showJoinModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Join Group</h3>
              <button className="close-btn" onClick={() => setShowJoinModal(false)}>×</button>
            </div>
            <div className="form-group">
              <label>Enter Group Code</label>
              <input
                type="text"
                placeholder="e.g. X7K9P2"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                style={{ textAlign: 'center', fontSize: '20px', letterSpacing: '2px', fontWeight: 'bold', textTransform: 'uppercase' }}
                maxLength={6}
              />
            </div>
            <button className="create-btn" onClick={handleJoinGroup} disabled={busy} style={{ background: '#7c3aed' }}>
              {busy ? 'Joining...' : 'Join Group'}
            </button>
          </div>
        </div>
      )}

      {!showJoinModal && (
        <button
          onClick={() => setShowJoinModal(true)}
          style={{
            position: 'fixed',
            right: 18,
            bottom: 90,
            zIndex: 1001,
            width: 52,
            height: 52,
            borderRadius: '50%',
            border: '1px solid #334155',
            background: '#7c3aed',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <UserPlus size={22} />
        </button>
      )}
    </div>
  );
};

export default Home;
