import React, { useState, useEffect } from 'react';
import BottomNav from '../components/BottomNav.jsx';
import '../styles/home.css';
import { Plus, UserPlus, Users, Receipt, ArrowRight, X, Briefcase, Home as HomeIcon, Heart, Globe, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Home = () => {
  const navigate = useNavigate();

  // --- STATES ---
  const [user, setUser] = useState(null);
  const [groups, setGroups] = useState([]); // <--- Now empty initially
  
  // Modal States
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  
  // Form Data
  const [groupType, setGroupType] = useState('OTHER');  
  const [groupName, setGroupName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [loading, setLoading] = useState(false);

  // You can also fetch this dynamically later, keeping static for now
  const [recentActivity] = useState([
    { id: 1, text: "Rahul added 'Dinner at Taj'", amount: "You owe ₹400", time: "2h ago", type: "expense" },
    { id: 2, text: "Amit settled 'Goa Trip'", amount: "You got ₹2,000", time: "5h ago", type: "settlement" },
  ]);

  // --- 1. INITIALIZATION & FETCHING ---
  useEffect(() => {
    // 1. Get User
    const userData = localStorage.getItem('user');
    let parsedUser = null;
    if (userData) {
      try {
        parsedUser = JSON.parse(userData);
        setUser({ 
            ...parsedUser, 
            totalBalance: 4500, // You can fetch this real total later
            currency: "₹" 
        });
      } catch (error) { console.error(error); }
    }

    // 2. Fetch Groups (Only if we have a token)
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) return; // Don't fetch if not logged in

      const response = await fetch('http://localhost:4000/api/groups/allgroups', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await response.json();
      if (data.success) {
        setGroups(data.groups);
      }
    } catch (error) {
      console.log("Failed to load groups", error);
    }
  };

  // --- 2. HELPER: CALCULATE CARD BALANCE ---
  // Returns the amount the current user owes/is owed in a specific group
  const getGroupStatus = (group) => {
    const currentUserId = user?._id || user?.id || JSON.parse(localStorage.getItem('user'))?.id;
    if (!currentUserId || !group.simplifyDebts) return { amount: 0, status: 'settled' };

    let balance = 0;
    group.simplifyDebts.forEach(debt => {
      // If I am the payer ('from'), I owe money (negative)
      if (debt.from === currentUserId) balance -= debt.amount;
      // If I am the receiver ('to'), I get money (positive)
      if (debt.to === currentUserId) balance += debt.amount;
    });

    if (balance === 0) return { amount: 0, status: 'settled' };
    return {
      amount: Math.abs(balance),
      status: balance > 0 ? 'owed' : 'owe' // 'owed' means I get money, 'owe' means I pay
    };
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate('/signup');
  };

  // --- HANDLER: CREATE GROUP ---
  const handleCreateGroup = async() => {
    setLoading(true);
    if(!groupName.trim()){ alert("Group name cannot be empty"); setLoading(false); return; }
    
    try {
      const token = localStorage.getItem('authToken');
      if (!token) { navigate('/signup'); return; }
      
      const response = await fetch('http://localhost:4000/api/groups', {
        method: 'POST',
        headers: { 'Content-Type':'application/json', 'Authorization':`Bearer ${token}` },
        body: JSON.stringify({ name: groupName, type: groupType })
      });

      const data = await response.json();
      
      if(response.ok){
        setShowGroupModal(false);
        setGroupName('');
        // Refresh list after creation
        fetchGroups(); 
        navigate(`/group/${data.group._id}`);
      } else {
        alert(data.message || "Failed to create group.");  
      }
    } catch (error) {
      alert("Network error."); 
    } finally {
      setLoading(false);
    } 
  };

  // --- HANDLER: JOIN GROUP ---
  const handleJoinGroup = async () => {
    if(!joinCode.trim() || joinCode.length < 6) {
      alert("Please enter a valid 6-character code");
      return;
    }
    setLoading(true);

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('http://localhost:4000/api/groups/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ shareCode: joinCode.toUpperCase() })
      });

      const data = await response.json();

      if (response.ok) {
        setShowJoinModal(false);
        setJoinCode('');
        fetchGroups(); // Refresh list
        navigate(`/group/${data.groupId}`);
      } else {
        alert(data.message || "Failed to join group");
      }
    } catch (error) {
      alert("Server connection failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="home-container">
      
      {/* 1. HEADER */}
      <header className="home-header">
        <div className="welcome-text">
          <h1>Hello, {user?.name || "User"}</h1>
          <p>Here is your expense overview</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <button onClick={handleLogout} style={{ background: 'transparent', border: 'none', color: '#666' }}>
            <LogOut size={20} />
          </button>
          <div className="profile-pic">
            <img src={`https://ui-avatars.com/api/?name=${user?.name || 'User'}&background=random`} alt="Profile" />
          </div>
        </div>
      </header>

      {/* 2. HERO CARD */}
      <section className="hero-section">
        <div className={`balance-card ${user?.totalBalance >= 0 ? 'green-gradient' : 'red-gradient'}`}>
          <span>Total Balance</span>
          <h2>{user?.currency} {Math.abs(user?.totalBalance || 0)}</h2>
          <p>{user?.totalBalance >= 0 ? "you are owed" : "you owe"}</p>
          <button className="settle-btn">
            Settle Up <ArrowRight size={16} style={{marginLeft: '5px'}}/>
          </button>
        </div>
      </section>

      {/* 3. QUICK ACTIONS */}
      <section className="quick-actions">
        <div className="action-btn">
          <div className="icon-box orange"><Plus size={24} color="#fff" /></div>
          <span>Add Expense</span>
        </div>
        <div className="action-btn" onClick={() => setShowGroupModal(true)}>
          <div className="icon-box blue"><Users size={24} color="#fff" /></div>
          <span>Create Group</span>
        </div>
        <div className="action-btn" onClick={() => setShowJoinModal(true)}>
          <div className="icon-box purple">
             <UserPlus size={24} color="#fff" />
          </div>
          <span>Join Group</span>
        </div>
      </section>

      {/* 4. GROUPS CAROUSEL (UPDATED) */}
      <section className="groups-section">
        <div className="section-title">
          <h3>Your Groups</h3>
          <span className="see-all">See All</span>
        </div>
        
        <div className="groups-scroll">
          {groups.length > 0 ? (
            groups.map(group => {
              // Calculate status for this specific group
              const { amount, status } = getGroupStatus(group);
              
              return (
                <div 
                  key={group._id} 
                  className="group-card"
                  onClick={() => navigate(`/group/${group._id}`)} // Make clickable
                  style={{ cursor: 'pointer' }}
                >
                  {/* Icon Letter */}
                  <div className="group-icon">{group.name.charAt(0).toUpperCase()}</div>
                  
                  <h4>{group.name}</h4>
                  
                  {/* Dynamic Status Text */}
                  {status === 'settled' ? (
                    <p style={{ color: '#94a3b8' }}>Settled up</p>
                  ) : (
                    <p className={status === 'owe' ? 'text-red' : 'text-green'}>
                      {status === 'owe' ? `Pay ₹${amount}` : `Get ₹${amount}`}
                    </p>
                  )}
                </div>
              );
            })
          ) : (
            <div style={{ padding: '0 20px', color: '#94a3b8', fontSize: '14px' }}>
              No groups yet. Create or join one!
            </div>
          )}
        </div>
      </section>

      {/* 5. RECENT ACTIVITY */}
      <section className="activity-section">
         <h3>Recent Activity</h3>
         <div className="activity-list">
           {recentActivity.map(item => (
             <div key={item.id} className="activity-item">
               <div className={`activity-icon ${item.type}`}>
                 <Receipt size={20} />
               </div>
               <div className="activity-info">
                 <p className="activity-text">{item.text}</p>
                 <span className="activity-time">{item.time}</span>
               </div>
               <div className="activity-amount">
                 <span className={item.amount.includes("owe") ? "text-red" : "text-green"}>{item.amount}</span>
               </div>
             </div>
           ))}
         </div>
      </section>

      <div style={{height: '80px'}}></div>
      <BottomNav />

      {/* --- MODALS (Unchanged logic, kept for completeness) --- */}
      {showGroupModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Create New Group</h3>
              <button className="close-btn" onClick={() => setShowGroupModal(false)}><X size={24} /></button>
            </div>
            <div className="form-group">
              <label>Group Name</label>
              <input type="text" placeholder="e.g. Goa Trip" value={groupName} onChange={(e) => setGroupName(e.target.value)} />
            </div>
             <div className="form-group">
              <label>Group Type</label>
              <div className="type-grid">
                {[
                  { id: 'TRIP', label: 'Trip', icon: <Globe size={18}/> },
                  { id: 'HOME', label: 'Home', icon: <HomeIcon size={18}/> },
                  { id: 'COUPLE', label: 'Couple', icon: <Heart size={18}/> },
                  { id: 'OTHER', label: 'Other', icon: <Briefcase size={18}/> }
                ].map((type) => (
                  <div key={type.id} className={`type-option ${groupType === type.id ? 'selected' : ''}`} onClick={() => setGroupType(type.id)}>
                    {type.icon}<span>{type.label}</span>
                  </div>
                ))}
              </div>
            </div>
            <button className="create-btn" onClick={handleCreateGroup} disabled={loading}>
              {loading ? "Creating..." : "Create Group"}
            </button>
          </div>
        </div>
      )}

      {showJoinModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Join Group</h3>
              <button className="close-btn" onClick={() => setShowJoinModal(false)}><X size={24} /></button>
            </div>
            <div className="form-group">
              <label>Enter Group Code</label>
              <input 
                type="text" placeholder="e.g. X7K9P2" value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                style={{ textAlign: 'center', fontSize: '20px', letterSpacing: '2px', fontWeight: 'bold', textTransform: 'uppercase' }}
                maxLength={6}
              />
            </div>
            <p style={{fontSize:'12px', color:'#94a3b8', textAlign:'center', marginBottom:'20px'}}>
              Ask your friend for the 6-character code found in their group details.
            </p>
            <button className="create-btn" onClick={handleJoinGroup} disabled={loading} style={{background: '#7c3aed'}}>
              {loading ? "Joining..." : "Join Group"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;