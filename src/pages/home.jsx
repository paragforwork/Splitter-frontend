import React, { useState } from 'react';
import BottomNav from '../components/bottomNav.jsx';
import { Plus, Camera, UserPlus, Receipt, ArrowRight,Users } from 'lucide-react';
import '../styles/home.css';

const Home = () => {
  
  const [user] = useState({
    name: "Rahul",
    totalBalance: 4500, // Positive = You are owed, Negative = You owe
    currency: "₹"
  });

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

  return (
    <div className="home-container">
      
      {/* 1. HEADER */}
      <header className="home-header">
        <div className="welcome-text">
          <h1>Hello, {user.name}</h1>
          <p>Here is your expense overview</p>
        </div>
        <div className="profile-pic">
          <img src="https://ui-avatars.com/api/?name=Rahul+Kumar&background=random" alt="Profile" />
        </div>
      </header>

      {/* 2. HERO CARD (Balance) */}
      <section className="hero-section">
        <div className={`balance-card ${user.totalBalance >= 0 ? 'green-gradient' : 'red-gradient'}`}>
          <span>Total Balance</span>
          <h2>{user.currency} {Math.abs(user.totalBalance)}</h2>
          <p>{user.totalBalance >= 0 ? "you are owed" : "you owe"}</p>
          
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
        <div className="action-btn">
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
    </div>
  );
};

export default Home;