import React, { useEffect, useState } from 'react';
import { ArrowLeft, CalendarDays, IndianRupee, ReceiptText } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import LoadingSpinner from '../components/loadingSpinner.jsx';
import { getApiBase } from '../lib/apiBase.js';
import '../styles/memberTransactions.css';

const API_BASE = getApiBase();
const formatCurrency = (value) => `₹${Number(value || 0).toLocaleString('en-IN')}`;

const MemberTransactions = () => {
  const { id, memberId } = useParams();
  const navigate = useNavigate();
  const token = localStorage.getItem('authToken');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);

  const fetchTransactions = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_BASE}/api/groups/${id}/members/${memberId}/transactions`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to load member transactions');
      }
      setData(result);
    } catch (err) {
      setError(err.message || 'Unable to load transactions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [id, memberId]);

  if (loading) return <LoadingSpinner fullScreen />;
  if (error || !data) {
    return (
      <div className="member-trans-page center">
        <p>{error || 'Something went wrong'}</p>
        <button className="retry-btn" onClick={fetchTransactions}>Retry</button>
      </div>
    );
  }

  return (
    <div className="member-trans-page">
      <div className="mt-header">
        <button className="icon-btn" onClick={() => navigate(-1)}>
          <ArrowLeft size={20} />
        </button>
        <div className="profile">
          <img src={data.member.avatar} alt={data.member.name} />
          <div>
            <h2>{data.member.name}</h2>
            <p>{data.group.name}</p>
          </div>
        </div>
      </div>

      <section className="summary">
        <div>
          <span>Total paid</span>
          <strong>{formatCurrency(data.summary.totalPaid)}</strong>
        </div>
        <div>
          <span>Total share</span>
          <strong>{formatCurrency(data.summary.totalShare)}</strong>
        </div>
        <div>
          <span>Net</span>
          <strong className={data.summary.net >= 0 ? 'pos' : 'neg'}>
            {data.summary.net >= 0 ? '+' : '-'}{formatCurrency(Math.abs(data.summary.net))}
          </strong>
        </div>
      </section>

      <section className="tx-list">
        {data.transactions.length === 0 ? (
          <div className="empty">No transactions for this member yet.</div>
        ) : (
          data.transactions.map((tx) => (
            <div key={tx.id} className="tx-card">
              <div className="top">
                <h4>{tx.description}</h4>
                <span>{tx.isSettlement ? 'Settlement' : 'Expense'}</span>
              </div>
              <div className="meta">
                <span><IndianRupee size={14} /> Amount {formatCurrency(tx.amount)}</span>
                <span><ReceiptText size={14} /> Share {formatCurrency(tx.memberShare)}</span>
                <span><CalendarDays size={14} /> {new Date(tx.date).toLocaleString()}</span>
              </div>
              <div className="chip-row">
                {tx.paidByMember ? (
                  <span className="chip green">Paid by {data.member.name}</span>
                ) : (
                  <span className="chip red">Paid by {tx.paidBy?.name || 'Member'}</span>
                )}
              </div>
            </div>
          ))
        )}
      </section>
    </div>
  );
};

export default MemberTransactions;
