import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Plus, Search, Users, 
  ChevronRight, ArrowUpRight, ArrowDownLeft ,X,Briefcase, Home as HomeIcon, Heart, Globe, LogOut
} from 'lucide-react';
import '../styles/groupList.css'; // Separate CSS file

const GroupsList = () => {
  const navigate = useNavigate();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showGroupModal,setShowGroupModal]= useState(false);  
  const [groupName, setGroupName] = useState('');
  const [groupType, setGroupType] = useState('OTHER');
  
  // You need the current user's ID to calculate their specific balance
  // Assuming you saved user info in localStorage during login
  const currentUser = JSON.parse(localStorage.getItem('user')); 

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    try {
      const token = localStorage.getItem('authToken');
      
      if (!token) {
        console.error("No token found. Please login.");
        navigate('/signup');
        return;
      }
      
      const res = await fetch('http://localhost:4000/api/groups/allgroups', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      
      if (data.success) {
        setGroups(data.groups);
      } else if (data.expired || data.invalid) {
        // Token is invalid or expired, redirect to login
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        navigate('/signup');
      }
    } catch (err) {
      console.error("Failed to fetch groups", err);
    } finally {
      setLoading(false);
    }
  };

  // --- HELPER: Calculate My Balance in a Group ---
  const getGroupBalance = (group) => {
    if (!currentUser || !group.simplifyDebts) return 0;

    let balance = 0;
    
    // 1. Check if I owe anyone (Negative)
    group.simplifyDebts.forEach(debt => {
      if (debt.from === currentUser.id) {
        balance -= debt.amount;
      }
      // 2. Check if anyone owes me (Positive)
      if (debt.to === currentUser.id) {
        balance += debt.amount;
      }
    });

    return balance;
  };

  // Filter groups based on search
  const filteredGroups = groups.filter(g => 
    g.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
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
        navigate(`/groupsDetails/${data.group._id}`);
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
    <div className="groups-page-container">
      
      {/* 1. HEADER */}
      <div className="page-header">
        <button className="icon-btn" onClick={() => navigate(-1)}>
          <ArrowLeft size={24} />
        </button>
        <h2>My Groups</h2>
        <button className="icon-btn" onClick={() => setShowGroupModal(true)}>
          <Plus size={24} color="var(--primary)" />
        </button>
      </div>

      {/* 2. SEARCH BAR */}
      <div className="search-container">
        <Search size={20} className="search-icon" />
        <input 
          type="text" 
          placeholder="Search groups..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* 3. GROUPS LIST */}
      <div className="groups-grid">
        {loading ? (
          <p className="loading-text">Loading groups...</p>
        ) : filteredGroups.length > 0 ? (
          filteredGroups.map(group => {
            const balance = getGroupBalance(group);
            
            return (
              <div 
                key={group._id} 
                className="group-list-card"
                onClick={() => navigate(`/groupsDetails/${group._id}`)}
              >
                {/* Left: Avatar & Info */}
                <div className="card-left">
                  <div className="group-avatar-lg">
                    <img src={group.avatar} alt={group.name} />
                  </div>
                  <div className="group-info">
                    <h3>{group.name}</h3>
                    <div className="meta-row">
                      <span className="badge-sm">{group.type}</span>
                      <span className="member-count">
                        <Users size={12} /> {group.members.length}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: Balance Status */}
                <div className="card-right">
                  {balance === 0 ? (
                    <span className="status-settled">Settled</span>
                  ) : (
                    <div className={`balance-tag ${balance > 0 ? 'green' : 'red'}`}>
                      <span className="lbl">{balance > 0 ? 'Get' : 'Pay'}</span>
                      <span className="val">₹{Math.abs(balance)}</span>
                    </div>
                  )}
                  <ChevronRight size={18} className="arrow-icon" />
                </div>
              </div>
            );
          })
        ) : (
          <div className="empty-state">
            <p>No groups found.</p>
            <button onClick={() => navigate('/create-group')}>Create one?</button>
          </div>
        )}
      </div>
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

export default GroupsList;