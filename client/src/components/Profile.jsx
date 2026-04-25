import React from 'react';
import './Admin.css';

const Profile = ({ user, setUser, navigate }) => {
    if (!user) {
        navigate('login');
        return null;
    }

    const handleLogout = () => {
        localStorage.removeItem('token');
        setUser(null);
        navigate('home');
    };

    return (
        <div className="admin-container animate-fade-in" style={{ maxWidth: '600px', margin: '40px auto' }}>
            <div className="admin-header">
                <h2>👤 User Profile</h2>
                <p>Manage your account and view your balance</p>
            </div>

            <div className="admin-card">
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '30px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '20px' }}>
                    <div style={{ 
                        width: '80px', 
                        height: '80px', 
                        borderRadius: '50%', 
                        background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '32px',
                        marginRight: '20px',
                        boxShadow: '0 4px 15px rgba(0, 242, 254, 0.3)'
                    }}>
                        {user.username.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <h3 style={{ margin: 0, fontSize: '24px' }}>{user.username}</h3>
                        <p style={{ color: '#94a3b8', margin: '5px 0 0 0', fontSize: '14px' }}>Member since {new Date().toLocaleDateString()}</p>
                    </div>
                </div>

                <div className="admin-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '30px' }}>
                    <div style={{ backgroundColor: 'rgba(255,255,255,0.03)', padding: '15px', borderRadius: '8px' }}>
                        <span style={{ color: '#64748b', fontSize: '12px', display: 'block', marginBottom: '5px' }}>USER ID</span>
                        <span style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>#{user.id.toString().slice(-6).toUpperCase()}</span>
                    </div>
                    <div style={{ backgroundColor: 'rgba(255,255,255,0.03)', padding: '15px', borderRadius: '8px' }}>
                        <span style={{ color: '#64748b', fontSize: '12px', display: 'block', marginBottom: '5px' }}>EMAIL</span>
                        <span style={{ fontWeight: 'bold' }}>{user.email}</span>
                    </div>
                </div>

                <div style={{ 
                    background: 'rgba(16, 185, 129, 0.1)', 
                    border: '1px solid rgba(16, 185, 129, 0.2)', 
                    padding: '20px', 
                    borderRadius: '12px',
                    marginBottom: '30px',
                    textAlign: 'center'
                }}>
                    <span style={{ color: '#10b981', fontSize: '14px', display: 'block', marginBottom: '5px' }}>Available Balance</span>
                    <span style={{ fontSize: '36px', fontWeight: 'bold', color: '#10b981' }}>₹ {user.balance.toFixed(2)}</span>
                </div>

                <div style={{ display: 'flex', gap: '15px' }}>
                    <button 
                        className="admin-btn btn-success" 
                        style={{ flex: 1, padding: '12px' }}
                        onClick={() => navigate('home')}
                    >
                        🎮 Start Playing
                    </button>
                    <button 
                        className="admin-btn btn-warning" 
                        style={{ flex: 1, padding: '12px', backgroundColor: 'transparent', border: '1px solid #f59e0b' }}
                        onClick={handleLogout}
                    >
                        🚪 Logout
                    </button>
                </div>
            </div>

            <div className="admin-card" style={{ marginTop: '20px' }}>
                <h3>🛡️ Security Settings</h3>
                <p style={{ color: '#94a3b8', fontSize: '14px' }}>Two-factor authentication and password management (Coming Soon)</p>
            </div>
        </div>
    );
};

export default Profile;
