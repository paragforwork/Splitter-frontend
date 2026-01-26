import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Users, ChevronRight, QrCode, Plus, 
  Share2, Copy, Check, X 
} from 'lucide-react';
import '../styles/group.css';
import BottomNav from '../components/BottomNav';

const GroupDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  // --- STATES ---
  const [group, setGroup] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal & Copy States
  const [showShareModal, setShowShareModal] = useState(false);
  const [copied, setCopied] = useState(false);

  const currentUserId = JSON.parse(localStorage.getItem('user'))?.id;

  // --- FETCH DATA ---
  useEffect(() => {
    const fetchGroupData = async () => {
      try {
        const token = localStorage.getItem('authToken');
        const response = await fetch(`http://localhost:4000/api/groups/${id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();

        if (response.ok) {
          setGroup(data.group);
          setExpenses(data.expenses);
        } else {
          setError(data.message);
        }
      } catch (err) {
        setError("Server connection failed");
      } finally {
        setLoading(false);
      }
    };
    fetchGroupData();
  }, [id]);

  // --- HANDLERS ---
  const getExpenseSubtext = (expense) => {
    const payerName = expense.paidBy._id === currentUserId ? "You" : expense.paidBy.name.split(' ')[0];
    if (expense.isSettlement) {
      const receiverObj = expense.shares[0]?.user;
      const receiverName = receiverObj?._id === currentUserId ? "You" : receiverObj?.name.split(' ')[0];
      return `${payerName} paid ${receiverName}`;
    }
    return `${payerName} paid ₹${expense.amount}`;
  };

  const handleCopyCode = () => {
    if (group?.shareCode) {
      navigator.clipboard.writeText(group.shareCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000); // Reset after 2s
    }
  };

  if (loading) return <div className="group-container loading-state">Loading...</div>;
  if (error) return <div className="group-container error-state">{error}</div>;

  return (
    <div className="group-container">
      
      {/* 1. HEADER */}
      <div className="group-header">
        <button className="icon-btn" onClick={() => navigate(-1)}>
          <ArrowLeft size={24} />
        </button>
        <div className="header-info">
          <h2>{group.name}</h2>
          <span className="badge">{group.type}</span>
        </div>
        
        {/* SHARE BUTTON */}
        <button className="icon-btn" onClick={() => setShowShareModal(true)}>
          <Share2 size={22} />
        </button>
      </div>

      {/* 2. SUMMARY CARD */}
      <section className="summary-section">
        <div className={`summary-card ${group.myBalance >= 0 ? 'green-card' : 'red-card'}`}>
          <div className="balance-info">
            <span className="label">Your Position</span>
            <div className="balance-amount">
              {group.myBalance === 0 ? "Settled up" : (group.myBalance > 0 ? "You are owed" : "You owe")}
              <span className="amount">₹{Math.abs(group.myBalance)}</span>
            </div>
          </div>
          <button className="settle-action-btn" onClick={() => navigate(`/group/${id}/settle`)}>
            Settle Up <ChevronRight size={16} />
          </button>
        </div>

        <button className="members-btn" onClick={() => navigate(`/group/${id}/members`)}>
          <div className="btn-content">
            <div className="icon-bg"><Users size={20} /></div>
            <span>View Members ({group.members.length})</span>
          </div>
          <ChevronRight size={18} color="#94a3b8" />
        </button>
      </section>

      {/* 3. EXPENSES FEED */}
      <section className="expenses-feed">
        <div className="feed-header">
          <h3>Expenses</h3>
          <button className="scan-btn"><QrCode size={16} /> Scan</button>
        </div>

        <div className="feed-list">
          {expenses.length > 0 ? (
            expenses.map(expense => (
              <div key={expense._id} className="expense-item">
                <div className="expense-left">
                  <div className={`date-box ${expense.isSettlement ? 'settle-date' : ''}`}>
                     <span className="day">{new Date(expense.date).getDate()}</span>
                     <span className="month">{new Date(expense.date).toLocaleString('default', { month: 'short' })}</span>
                  </div>
                  <div className="expense-details">
                    <h4>{expense.description}</h4>
                    <span className="paid-by">{getExpenseSubtext(expense)}</span>
                  </div>
                </div>
                <div className="expense-right">
                  <span className={`amount-tag ${expense.isSettlement ? 'green' : 'neutral'}`}>
                    {expense.isSettlement ? 'Settlement' : `₹${expense.amount}`}
                  </span>
                </div>
              </div>
            ))
          ) : (
             <div className="empty-feed">No expenses yet</div>
          )}
        </div>
      </section>

      {/* 4. FAB */}
      <div className="fab-container">
        <button className="fab-btn" onClick={() => navigate(`/group/${id}/add-expense`)}>
          <Plus size={28} />
          <span>Add Expense</span>
        </button>
      </div>

      {/* --- SHARE CODE MODAL --- */}
      {showShareModal && (
        <div className="modal-overlay">
          <div className="modal-content share-modal">
            <div className="modal-header">
              <h3>Invite Friends</h3>
              <button className="close-btn" onClick={() => setShowShareModal(false)}>
                <X size={24} />
              </button>
            </div>
            
            <p className="modal-desc">
              Share this code with your friends to let them join <strong>{group.name}</strong>.
            </p>

            <div className="code-box" onClick={handleCopyCode}>
              <span className="the-code">{group.shareCode || "NO-CODE"}</span>
              <div className="copy-icon">
                {copied ? <Check size={20} color="#10b981" /> : <Copy size={20} />}
              </div>
            </div>

            <div className="modal-footer">
              {copied ? <span className="success-text">Copied to clipboard!</span> : <span>Tap code to copy</span>}
            </div>
          </div>
        </div>
      )}

      <div style={{height: '80px'}}></div>
      <BottomNav />
    </div>
  );
};

export default GroupDetails;