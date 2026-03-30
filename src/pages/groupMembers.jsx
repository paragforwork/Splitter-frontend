import React, { useEffect, useState } from 'react';
import { ArrowLeft, ChevronRight, Users } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import LoadingSpinner from '../components/loadingSpinner.jsx';
import { getApiBase } from '../lib/apiBase.js';
import '../styles/groupMembers.css';

const API_BASE = getApiBase();
const formatCurrency = (value) => `₹${Number(value || 0).toLocaleString('en-IN')}`;

const GroupMembers = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const token = localStorage.getItem('authToken');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);

  const fetchMembers = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_BASE}/api/groups/${id}/members`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to load members');
      }
      setData(result);
    } catch (err) {
      setError(err.message || 'Unable to load members');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, [id]);

  if (loading) return <LoadingSpinner fullScreen />;
  if (error || !data) {
    return (
      <div className="group-members-page center">
        <p>{error || 'Something went wrong'}</p>
        <button className="retry-btn" onClick={fetchMembers}>Retry</button>
      </div>
    );
  }

  return (
    <div className="group-members-page">
      <div className="members-header">
        <button className="icon-btn" onClick={() => navigate(-1)}>
          <ArrowLeft size={20} />
        </button>
        <div>
          <h2>{data.group.name}</h2>
          <p><Users size={13} /> {data.members.length} members</p>
        </div>
      </div>

      <div className="members-list">
        {data.members.map((member) => (
          <button
            key={member.id}
            className="member-card"
            onClick={() => navigate(`/groupsDetails/${id}/members/${member.id}`)}
          >
            <div className="left">
              <img src={member.avatar} alt={member.name} />
              <div>
                <strong>{member.name}</strong>
                <small>{member.expensesPaidCount} expenses paid • {formatCurrency(member.totalPaid)} total</small>
              </div>
            </div>
            <div className="right">
              <span className={member.netInGroup >= 0 ? 'pos' : 'neg'}>
                {member.netInGroup >= 0 ? '+' : '-'}{formatCurrency(Math.abs(member.netInGroup))}
              </span>
              <ChevronRight size={18} />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default GroupMembers;
