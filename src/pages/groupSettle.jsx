import React, { useEffect, useMemo, useState } from 'react';
import { AppLauncher } from '@capacitor/app-launcher';
import { ArrowLeft, CheckCircle2, IndianRupee, Wallet } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import LoadingSpinner from '../components/loadingSpinner.jsx';
import { getApiBase } from '../lib/apiBase.js';
import '../styles/groupSettle.css';

const API_BASE = getApiBase();
const formatCurrency = (value) => `₹${Number(value || 0).toLocaleString('en-IN')}`;

const GroupSettle = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const token = localStorage.getItem('authToken');
  const currentUserId = JSON.parse(localStorage.getItem('user') || '{}')?.id;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [group, setGroup] = useState(null);
  const [confirmModal, setConfirmModal] = useState(null);
  const [pendingTx, setPendingTx] = useState(null);
  const [saving, setSaving] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [historyError, setHistoryError] = useState('');

  const fetchGroup = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_BASE}/api/groups/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to load settle workflow');
      }
      setGroup(result.group);
    } catch (err) {
      setError(err.message || 'Unable to load settle workflow');
    } finally {
      setLoading(false);
    }
  };

  const fetchPaymentHistory = async () => {
    setHistoryLoading(true);
    setHistoryError('');
    try {
      const response = await fetch(`${API_BASE}/api/payments/history?groupId=${id}&limit=12`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to load payment history');
      }
      setPaymentHistory(result.history || []);
    } catch (err) {
      setHistoryError(err.message || 'Unable to load payment history');
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    fetchGroup();
    fetchPaymentHistory();
  }, [id]);

  const settlementData = useMemo(() => {
    if (!group || !currentUserId) return { owe: [], get: [] };
    const owe = [];
    const get = [];

    (group.simplifyDebts || []).forEach((debt) => {
      const fromId = debt.from?._id?.toString?.() || debt.from?.toString?.();
      const toId = debt.to?._id?.toString?.() || debt.to?.toString?.();
      const amount = Number(debt.amount || 0);
      if (!amount) return;

      if (fromId === currentUserId) {
        const other = group.members.find((m) => m._id.toString() === toId);
        owe.push({ person: other, amount });
      }
      if (toId === currentUserId) {
        const other = group.members.find((m) => m._id.toString() === fromId);
        get.push({ person: other, amount });
      }
    });

    return { owe, get };
  }, [group, currentUserId]);

  const openUpiPayment = async (entry) => {
    if (!entry?.person?._id || !entry?.amount) return;
    if (!entry?.person?.upi_id) {
      alert('Receiver UPI ID is missing. Use manual settle for now.');
      return;
    }

    try {
      const intentRes = await fetch(`${API_BASE}/api/payments/intent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          groupId: id,
          receiverId: entry.person._id,
          upiId: entry.person.upi_id,
          amount: Number(entry.amount),
          note: `Settlement for ${group.name}`
        })
      });
      const intentData = await intentRes.json();
      if (!intentRes.ok || !intentData.success) {
        throw new Error(intentData.message || 'Could not initiate UPI payment');
      }

      const txPayload = {
        groupId: id,
        receiverId: entry.person._id,
        amount: Number(entry.amount),
        note: `Settlement for ${group.name}`,
        transactionRef: intentData.transactionRef
      };
      setPendingTx(txPayload);

      const launchResult = await AppLauncher.openUrl({ url: intentData.upiLink });
      if (!launchResult?.completed) {
        throw new Error('Could not open UPI app. Please check if a UPI app is installed.');
      }
      setConfirmModal(txPayload);
    } catch (err) {
      alert(err.message || 'UPI launch failed');
    }
  };

  const confirmPayment = async (statusValue) => {
    if (!confirmModal) return;
    setSaving(true);
    try {
      const response = await fetch(`${API_BASE}/api/payments/confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          ...confirmModal,
          status: statusValue,
          source: 'manual'
        })
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Could not save settlement');
      }

      setConfirmModal(null);
      setPendingTx(null);
      await fetchGroup();
      await fetchPaymentHistory();
      if (statusValue === 'YES') alert('Settlement recorded successfully');
      if (statusValue !== 'YES') alert('Marked as not completed. No settlement added.');
    } catch (err) {
      alert(err.message || 'Confirmation failed');
    } finally {
      setSaving(false);
    }
  };

  const markManualSettlement = async (entry) => {
    try {
      const manualTx = {
        groupId: id,
        receiverId: entry.person._id,
        amount: Number(entry.amount),
        note: `Manual settlement for ${group.name}`,
        transactionRef: `MANUAL-${Date.now()}-${Math.floor(Math.random() * 10000)}`
      };
      setConfirmModal(manualTx);
    } catch (err) {
      alert(err.message || 'Unable to start manual settlement');
    }
  };

  const retryPayment = async (item) => {
    if (!item?.receiver?.id || !item?.amount || !item?.receiver?.upi_id) {
      alert('Cannot retry this payment. Receiver UPI ID is unavailable.');
      return;
    }
    const retryEntry = {
      person: {
        _id: item.receiver.id,
        name: item.receiver.name,
        upi_id: item.receiver.upi_id
      },
      amount: Number(item.amount)
    };
    await openUpiPayment(retryEntry);
  };

  const formatDateTime = (value) => {
    try {
      return new Date(value).toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return '';
    }
  };

  if (loading) return <LoadingSpinner fullScreen />;
  if (error || !group) {
    return (
      <div className="group-settle-page center">
        <p>{error || 'Something went wrong'}</p>
        <button className="settle-btn-primary" onClick={fetchGroup}>Retry</button>
      </div>
    );
  }

  return (
    <div className="group-settle-page">
      <header className="settle-header">
        <button className="icon-btn" onClick={() => navigate(-1)}>
          <ArrowLeft size={20} />
        </button>
        <div>
          <h2>Settle Up</h2>
          <p>{group.name}</p>
        </div>
      </header>

      <section className="settle-summary">
        <div className="summary-item red">
          <span>You owe</span>
          <strong>{formatCurrency(settlementData.owe.reduce((sum, row) => sum + row.amount, 0))}</strong>
        </div>
        <div className="summary-item green">
          <span>You get</span>
          <strong>{formatCurrency(settlementData.get.reduce((sum, row) => sum + row.amount, 0))}</strong>
        </div>
      </section>

      <section className="settle-card">
        <h3><Wallet size={16} /> Pay to settle</h3>
        {settlementData.owe.length === 0 ? (
          <p className="muted">You don’t owe anyone in this group.</p>
        ) : (
          settlementData.owe.map((entry, index) => (
            <div className="settle-row" key={`${entry.person?._id || index}-owe`}>
              <div className="left">
                <img src={entry.person?.avatar || 'https://cdn-icons-png.flaticon.com/512/149/149071.png'} alt={entry.person?.name || 'member'} />
                <div>
                  <strong>{entry.person?.name || 'Member'}</strong>
                  <span>{formatCurrency(entry.amount)}</span>
                </div>
              </div>
              <div className="btn-col">
                <button className="settle-btn-primary" onClick={() => openUpiPayment(entry)}>
                  <IndianRupee size={14} /> Pay via UPI
                </button>
                <button className="settle-btn-secondary" onClick={() => markManualSettlement(entry)}>
                  Manual settle
                </button>
              </div>
            </div>
          ))
        )}
      </section>

      <section className="settle-card">
        <h3><CheckCircle2 size={16} /> Pending receipts</h3>
        {settlementData.get.length === 0 ? (
          <p className="muted">No one owes you currently.</p>
        ) : (
          settlementData.get.map((entry, index) => (
            <div className="settle-row" key={`${entry.person?._id || index}-get`}>
              <div className="left">
                <img src={entry.person?.avatar || 'https://cdn-icons-png.flaticon.com/512/149/149071.png'} alt={entry.person?.name || 'member'} />
                <div>
                  <strong>{entry.person?.name || 'Member'}</strong>
                  <span>{formatCurrency(entry.amount)}</span>
                </div>
              </div>
              <button className="settle-btn-secondary" onClick={() => alert(`Reminder workflow ready for ${entry.person?.name || 'member'}`)}>
                Remind
              </button>
            </div>
          ))
        )}
      </section>

      <section className="settle-card">
        <h3>Payment history</h3>
        {historyLoading ? (
          <p className="muted">Loading history...</p>
        ) : historyError ? (
          <div className="history-error">
            <p className="muted">{historyError}</p>
            <button className="settle-btn-secondary" onClick={fetchPaymentHistory}>Retry load</button>
          </div>
        ) : paymentHistory.length === 0 ? (
          <p className="muted">No payment attempts yet.</p>
        ) : (
          paymentHistory.map((item) => {
            const canRetry = item.status === 'failed' || item.status === 'cancelled';
            return (
              <div className="history-row" key={item.id}>
                <div className="history-left">
                  <strong>{item.receiver?.name || 'Member'}</strong>
                  <span>{formatCurrency(item.amount)} • {formatDateTime(item.createdAt)}</span>
                  <small>{item.transactionRef}</small>
                </div>
                <div className="history-right">
                  <span className={`history-status ${item.status}`}>{item.status}</span>
                  {canRetry && (
                    <button className="settle-btn-secondary" onClick={() => retryPayment(item)}>
                      Retry
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </section>

      {confirmModal && (
        <div className="modal-overlay" onClick={() => !saving && setConfirmModal(null)}>
          <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Confirm payment</h3>
            <p>Did you complete the payment in your UPI app?</p>
            {pendingTx?.transactionRef && <small>Ref: {pendingTx.transactionRef}</small>}
            <div className="confirm-actions">
              <button className="settle-btn-secondary" onClick={() => confirmPayment('NO')} disabled={saving}>No, not completed</button>
              <button className="settle-btn-primary" onClick={() => confirmPayment('YES')} disabled={saving}>
                {saving ? 'Saving...' : 'Yes, completed'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GroupSettle;
