import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import BottomNav from '../components/bottomNav.jsx';
import '../styles/group.css';

function Group() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [group, setGroup] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchGroup = async () => {
            try {
                const token = localStorage.getItem('authToken');
                
                if (!token) {
                    setError("You are not logged in. Please login first.");
                    localStorage.clear();
                    setTimeout(() => navigate('/signup'), 2000);
                    return;
                }
                
                const response = await fetch(`http://localhost:4000/api/groups/${id}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                const data = await response.json();
                
                // Handle authentication errors
                if (response.status === 401 || response.status === 403) {
                    setError("Your session has expired. Please login again.");
                    localStorage.clear();
                    setTimeout(() => navigate('/signup'), 2000);
                    return;
                }
                
                if (response.ok) {
                    setGroup(data.group);
                } else {
                    setError(data.message || "Failed to load group");
                }
            } catch (err) {
                console.error("Error fetching group:", err);
                setError("Network error. Please check your connection.");
            } finally {
                setLoading(false);
            }
        };

        fetchGroup();
    }, [id, navigate]);

    if (loading) {
        return (
            <div className="loading-container">
                Loading...
            </div>
        );
    }

    if (error) {
        return (
            <div className="error-container">
                <p className="error-message">{error}</p>
                <button className="error-button" onClick={() => navigate('/')}>Go Back Home</button>
            </div>
        );
    }

    return (
        <div className="group-page">
            <div className="group-header">
                <h2 className="group-title">Group: {group?.name}</h2>
                <div className="group-info">
                    <p className="group-info-item">
                        <span className="group-info-label">Type:</span> {group?.type}
                    </p>
                    <p className="group-info-item">
                        <span className="group-info-label">Members:</span> {group?.members?.length || 0}
                    </p>
                    <p className="group-info-item">
                        <span className="group-info-label">Created:</span> {new Date(group?.createdAt).toLocaleDateString()}
                    </p>
                </div>
            </div>
            
            <div className="expenses-section">
                <h3 className="expenses-title">Expenses</h3>
                <p className="no-expenses">No expenses yet. Add your first expense!</p>
            </div>

            <BottomNav />
        </div>
    );
}

export default Group;
