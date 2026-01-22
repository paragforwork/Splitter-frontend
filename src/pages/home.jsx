import React, { useState, useEffect } from 'react';
import BottomNav from '../components/bottomNav.jsx';

import '../styles/home.css';
import { Plus, Camera, Users, Receipt, ArrowRight, X, Briefcase, Home as HomeIcon, Heart, Globe, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Home = () => {
  const navigate = useNavigate();

  // Get user from localStorage
  const [user, setUser] = useState(null);
  
  const [recentActivity] = useState([
    { id: 1, text: "Rahul added 'Dinner at Taj'", amount: "You owe ₹400", time: "2h ago", type: "expense" },
    { id: 2, text: "Amit settled 'Goa Trip'", amount: "You got ₹2,000", time: "5h ago", type: "settlement" },
    { id: 3, text: "Sneha added 'Uber'", amount: "You owe ₹150", time: "1d ago", type: "expense" }
  ]);

  const [groups] = useState([
    { id: 1, name: "Goa Trip", type: "TRIP", oweAmount: 500, status: "owe" },
    { id: 2, name: "Flat 101", type: "HOME", oweAmount: 0, status: "settled" },
    { id: 3, name: "Office Lunch", type: "OTHER", oweAmount: 1200, status: "owed" }
  ]);

  const [groupType,setGroupType]= useState('OTHER');  
  const [groupName,setGroupName]= useState('');
  const [showGroupModal,setShowGroupModal]= useState(false);  
  const [loading,setLoading]= useState(false);

  // Check authentication on mount
  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        const parsedUser = JSON.parse(userData);
        setUser({
          name: parsedUser.name || "User",
          totalBalance: 4500,
          currency: "₹"
        });
      } catch (error) {
        console.error("Error parsing user data:", error);
        setUser({
          name: "User",
          totalBalance: 4500,
          currency: "₹"
        });
      }
    }
  }, []);

  const handleLogout = () => {
    localStorage.clear();
    navigate('/signup');
  };

  const handleCreateGroup = async() =>{
    setLoading(true);
    
    // Validate group name
    if(!groupName.trim()){
      alert("Group name cannot be empty");
      setLoading(false);
      return;
    }
    
    try {
      const token = localStorage.getItem('authToken');
      
      // Check if token exists
      if (!token) {
        alert("You are not logged in. Please login first.");
        localStorage.clear();
        navigate('/signup');
        return;
      }
      
      const response=await fetch('http://localhost:4000/api/groups',{
        method:'POST',
        headers:{
          'Content-Type':'application/json',
          'Authorization':`Bearer ${token}`
        },
        body:JSON.stringify({
          name:groupName,
          type:groupType
        })
      });

      const data=await response.json();
      
      // Handle authentication errors
      if (response.status === 401 || response.status === 403) {
        alert("Your session has expired. Please login again.");
        localStorage.clear();
        navigate('/signup');
        return;
      }
      
      if(response.ok){
        //alert(data.message || "Group created successfully!");
        setShowGroupModal(false);
        setGroupName('');
        setGroupType('OTHER');
        navigate(`/groups/${data.group._id}`);
      }
      else{
       alert(data.message || "Failed to create group. Please try again.");  
      }
    } catch (error) {
     console.error("Error creating group:",error);
     alert("Network error. Please check your connection and try again."); 
    }finally{
      setLoading(false);
    } 
  }

  return (
    <div className="home-container">
      
      {/* 1. HEADER */}
      <header className="home-header">
        <div className="welcome-text">
          <h1>Hello, {user?.name || "User"}</h1>
          <p>Here is your expense overview</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <button 
            onClick={handleLogout}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: '#666',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              fontSize: '14px'
            }}
            title="Logout"
          >
            <LogOut size={20} />
          </button>
          <div className="profile-pic">
            <img src={`https://ui-avatars.com/api/?name=${user?.name || 'User'}&background=random`} alt="Profile" />
          </div>
        </div>
      </header>

      {/* 2. HERO CARD (Balance) */}
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
        <div className="action-btn">
          <div className="icon-box purple"><Camera size={24} color="#fff" /></div>
          <span>Scan Bill</span>
        </div>
      </section>

      {/* 4. GROUPS CAROUSEL */}
      <section className="groups-section">
        <div className="section-title">
          <h3>Your Groups</h3>
          <span className="see-all">See All</span>
        </div>
        
        <div className="groups-scroll">
          {groups.map(group => (
            <div key={group.id} className="group-card">
              <div className="group-icon">{group.name.charAt(0)}</div>
              <h4>{group.name}</h4>
              <p className={group.status === 'owe' ? 'text-red' : 'text-green'}>
                {group.status === 'owe' ? `Pay ₹${group.oweAmount}` : `Get ₹${group.oweAmount}`}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* 5. RECENT ACTIVITY LIST */}
      <section className="activity-section">
        <h3>Recent Activity</h3>
        <div className="activity-list">
          {recentActivity.map(item => (
            <div key={item.id} className="activity-item">
              <div className={`activity-icon ${item.type}`}>
                {item.type === 'settlement' ? <Receipt size={20} /> : <Receipt size={20} />}
              </div>
              <div className="activity-info">
                <p className="activity-text">{item.text}</p>
                <span className="activity-time">{item.time}</span>
              </div>
              <div className="activity-amount">
                <span className={item.amount.includes("owe") ? "text-red" : "text-green"}>
                  {item.amount}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Spacer for Bottom Nav */}
      <div style={{height: '80px'}}></div>

      {/* 6. BOTTOM NAVIGATION */}
      <BottomNav />


      {/* CREATE GROUP MODAL */}

      {showGroupModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            
            {/* Modal Header */}
            <div className="modal-header">
              <h3>Create New Group</h3>
              <button className="close-btn" onClick={() => setShowGroupModal(false)}>
                <X size={24} />
              </button>
            </div>

            {/* Input: Name */}
            <div className="form-group">
              <label>Group Name</label>
              <input 
                type="text" 
                placeholder="e.g. Goa Trip, Flat 101" 
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
              />
            </div>

            {/* Input: Type Selection */}
            <div className="form-group">
              <label>Group Type</label>
              <div className="type-grid">
                {[
                  { id: 'TRIP', label: 'Trip', icon: <Globe size={18}/> },
                  { id: 'HOME', label: 'Home', icon: <HomeIcon size={18}/> },
                  { id: 'COUPLE', label: 'Couple', icon: <Heart size={18}/> },
                  { id: 'OTHER', label: 'Other', icon: <Briefcase size={18}/> }
                ].map((type) => (
                  <div 
                    key={type.id}
                    className={`type-option ${groupType === type.id ? 'selected' : ''}`}
                    onClick={() => setGroupType(type.id)}
                  >
                    {type.icon}
                    <span>{type.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Submit Button */}
            <button 
              className="create-btn" 
              onClick={handleCreateGroup}
              disabled={loading}
            >
              {loading ? "Creating..." : "Create Group"}
            </button>

          </div>
        </div>
      )}

    </div>
  );
};

export default Home;