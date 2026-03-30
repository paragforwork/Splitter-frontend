import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Receipt, Upload } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import LoadingSpinner from '../components/loadingSpinner.jsx';
import { getApiBase } from '../lib/apiBase.js';
import '../styles/addExpense.css';

const API_BASE = getApiBase();
const toMoney = (v) => Math.round(Number(v || 0) * 100) / 100;
const fmt = (v) => `₹${Number(v || 0).toLocaleString('en-IN')}`;

const AddExpense = () => {
  const navigate = useNavigate();
  const { id: groupId } = useParams();
  const token = localStorage.getItem('authToken');
  const currentUserId = JSON.parse(localStorage.getItem('user') || '{}')?.id;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [group, setGroup] = useState(null);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [paidBy, setPaidBy] = useState('');
  const [splitType, setSplitType] = useState('equal');
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [shares, setShares] = useState({});
  const [percentages, setPercentages] = useState({});
  const [receiptUrl, setReceiptUrl] = useState('');

  const fetchGroup = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_BASE}/api/groups/${groupId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Could not load group');
      }
      setGroup(data.group);
      const memberIds = data.group.members.map((member) => member._id);
      setSelectedMembers(memberIds);
      setPaidBy(currentUserId || memberIds[0]);
    } catch (err) {
      setError(err.message || 'Failed to load group');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) {
      navigate('/signup');
      return;
    }
    fetchGroup();
  }, [groupId]);

  const totalAmount = toMoney(amount);
  const selected = useMemo(() => {
    if (!group) return [];
    return group.members.filter((m) => selectedMembers.includes(m._id));
  }, [group, selectedMembers]);

  const equalShares = useMemo(() => {
    if (!totalAmount || selected.length === 0) return [];
    const totalCents = Math.round(totalAmount * 100);
    const base = Math.floor(totalCents / selected.length);
    const remainder = totalCents - base * selected.length;
    return selected.map((member, idx) => ({
      user: member._id,
      owedAmount: (base + (idx === selected.length - 1 ? remainder : 0)) / 100
    }));
  }, [totalAmount, selected]);

  const exactShares = useMemo(() => {
    return selected.map((member) => ({
      user: member._id,
      owedAmount: toMoney(shares[member._id] || 0)
    }));
  }, [selected, shares]);

  const percentageShares = useMemo(() => {
    return selected.map((member) => {
      const pct = Number(percentages[member._id] || 0);
      return {
        user: member._id,
        percent: pct,
        owedAmount: toMoney((totalAmount * pct) / 100)
      };
    });
  }, [selected, percentages, totalAmount]);

  const activeShares = splitType === 'equal' ? equalShares : splitType === 'exact' ? exactShares : percentageShares;

  const exactSum = toMoney(exactShares.reduce((sum, s) => sum + Number(s.owedAmount || 0), 0));
  const percentSum = toMoney(percentageShares.reduce((sum, s) => sum + Number(s.percent || 0), 0));
  const activeSum = toMoney(activeShares.reduce((sum, s) => sum + Number(s.owedAmount || 0), 0));

  const validationError = useMemo(() => {
    if (!description.trim()) return 'Description is required';
    if (!totalAmount || totalAmount <= 0) return 'Amount must be greater than 0';
    if (!paidBy) return 'Select who paid';
    if (!selectedMembers.includes(paidBy)) return 'Paid by user must be included in split';
    if (selected.length === 0) return 'Select at least one member';
    if (splitType === 'exact' && activeSum !== totalAmount) return 'Exact split must equal total amount';
    if (splitType === 'percentage' && percentSum !== 100) return 'Percentages must add to 100';
    if (activeSum !== totalAmount) return 'Split total must match amount';
    return '';
  }, [description, totalAmount, paidBy, selectedMembers, selected.length, splitType, activeSum, percentSum]);

  const livePreview = useMemo(() => {
    const mine = activeShares.find((s) => s.user === currentUserId);
    const myShare = Number(mine?.owedAmount || 0);
    if (!paidBy || !currentUserId) return 'Preview unavailable';
    if (paidBy === currentUserId) {
      const others = toMoney(totalAmount - myShare);
      return others > 0 ? `You get ${fmt(others)}` : 'You are settled';
    }
    return myShare > 0 ? `You owe ${fmt(myShare)}` : 'You are settled';
  }, [activeShares, paidBy, currentUserId, totalAmount]);

  const toggleMember = (memberId) => {
    if (selectedMembers.includes(memberId)) {
      const next = selectedMembers.filter((id) => id !== memberId);
      setSelectedMembers(next);
      if (paidBy === memberId && next.length > 0) setPaidBy(next[0]);
      return;
    }
    setSelectedMembers([...selectedMembers, memberId]);
  };

  const onSubmit = async () => {
    if (validationError) {
      alert(validationError);
      return;
    }

    setSaving(true);
    try {
      const normalizedShares = activeShares.map((s) => ({
        user: s.user,
        owedAmount: toMoney(s.owedAmount)
      }));

      const response = await fetch(`${API_BASE}/api/expenses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          groupId,
          description: description.trim(),
          amount: totalAmount,
          paidBy,
          splitType,
          shares: normalizedShares,
          receiptUrl: receiptUrl.trim() || null
        })
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to create expense');
      }

      navigate(`/groupsDetails/${groupId}`);
    } catch (err) {
      alert(err.message || 'Could not create expense');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSpinner fullScreen />;
  if (error || !group) {
    return (
      <div className="add-expense-page center">
        <p>{error || 'Something went wrong'}</p>
        <button className="submit-btn" onClick={fetchGroup}>Retry</button>
      </div>
    );
  }

  return (
    <div className="add-expense-page">
      <div className="header-row">
        <button className="icon-btn" onClick={() => navigate(-1)}><ArrowLeft size={20} /></button>
        <h2>Add Expense</h2>
      </div>

      <section className="expense-card">
        <label>
          <span>Description</span>
          <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Dinner, cab, groceries..." />
        </label>
        <label>
          <span>Total amount</span>
          <input type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
        </label>
        <label>
          <span>Paid by</span>
          <select value={paidBy} onChange={(e) => setPaidBy(e.target.value)}>
            {group.members.map((member) => (
              <option key={member._id} value={member._id}>{member.name}</option>
            ))}
          </select>
        </label>
      </section>

      <section className="expense-card">
        <h3>Members involved</h3>
        <div className="member-grid">
          {group.members.map((member) => (
            <button
              key={member._id}
              className={`member-pill ${selectedMembers.includes(member._id) ? 'active' : ''}`}
              onClick={() => toggleMember(member._id)}
            >
              {member.name}
            </button>
          ))}
        </div>
      </section>

      <section className="expense-card">
        <h3>Split type</h3>
        <div className="split-tabs">
          {['equal', 'exact', 'percentage'].map((type) => (
            <button key={type} className={splitType === type ? 'active' : ''} onClick={() => setSplitType(type)}>
              {type}
            </button>
          ))}
        </div>

        {splitType === 'equal' && (
          <p className="hint">Equal split auto-calculated for {selected.length} members.</p>
        )}

        {splitType === 'exact' && (
          <div className="split-list">
            {selected.map((member) => (
              <label key={member._id} className="split-row">
                <span>{member.name}</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={shares[member._id] || ''}
                  onChange={(e) => setShares({ ...shares, [member._id]: e.target.value })}
                />
              </label>
            ))}
            <p className={`hint ${exactSum === totalAmount ? 'ok' : 'bad'}`}>Total: {fmt(exactSum)} / {fmt(totalAmount)}</p>
          </div>
        )}

        {splitType === 'percentage' && (
          <div className="split-list">
            {selected.map((member) => (
              <label key={member._id} className="split-row">
                <span>{member.name}</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={percentages[member._id] || ''}
                  onChange={(e) => setPercentages({ ...percentages, [member._id]: e.target.value })}
                />
              </label>
            ))}
            <p className={`hint ${percentSum === 100 ? 'ok' : 'bad'}`}>Percent: {percentSum}% / 100%</p>
          </div>
        )}
      </section>

      <section className="expense-card">
        <h3><Receipt size={16} /> Receipt (optional)</h3>
        <label>
          <span>Receipt image URL</span>
          <input value={receiptUrl} onChange={(e) => setReceiptUrl(e.target.value)} placeholder="https://..." />
        </label>
        <p className="hint"><Upload size={14} /> You can later replace this with file upload.</p>
      </section>

      <section className="expense-card preview-card">
        <h3>Live Preview</h3>
        <p className="preview-text">{livePreview}</p>
      </section>

      {validationError && <p className="error-text">{validationError}</p>}

      <button className="submit-btn" onClick={onSubmit} disabled={saving || Boolean(validationError)}>
        {saving ? 'Saving expense...' : 'Add Expense'}
      </button>
    </div>
  );
};

export default AddExpense;
