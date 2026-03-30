import React from 'react';
import { Home, Users, Activity, User } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import '../styles/home.css';

const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Helper to check active state
  const isActive = (path) => location.pathname === path;

  return (
    <div className="bottom-nav-container">
      <div className="nav-item" onClick={() => navigate('/')}>
        <Home size={24} color={isActive('/') ? '#4361ee' : '#94a3b8'} />
        <span className={isActive('/') ? 'active-text' : ''}>Home</span>
      </div>

      <div className="nav-item" onClick={() => navigate('/grouplist')}>
        <Users size={24} color={isActive('/grouplist') ? '#4361ee' : '#94a3b8'} />
        <span className={isActive('/grouplist') ? 'active-text' : ''}>Groups</span>
      </div>

      {/* Center FAB Placeholder (Optional visual gap for the 'Add' button if desired) */}
      
      <div className="nav-item" onClick={() => navigate('/dashboard')}>
        <Activity size={24} color={isActive('/dashboard') ? '#4361ee' : '#94a3b8'} />
        <span className={isActive('/dashboard') ? 'active-text' : ''}>Activity</span>
      </div>

      <div className="nav-item" onClick={() => navigate('/accounts')}>
        <User size={24} color={isActive('/accounts') ? '#4361ee' : '#94a3b8'} />
        <span className={isActive('/accounts') ? 'active-text' : ''}>Account</span>
      </div>
    </div>
  );
};

export default BottomNav;
