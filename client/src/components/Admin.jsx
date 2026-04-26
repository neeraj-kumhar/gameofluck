import API_BASE_URL from '../config';
import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import './Admin.css';

const Admin = ({ balance, setBalance, gameConfig, setGameConfig }) => {
  const [activeTab, setActiveTab] = useState('config');
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [fundsInput, setFundsInput] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [liveLogs, setLiveLogs] = useState([]);

  useEffect(() => {
    if (activeTab !== 'monitor') return;

    const socket = io(API_BASE_URL);

    socket.emit('join-game', 'color-prediction');
    socket.emit('join-game', 'aviator');
    socket.emit('join-game', 'marble-race');

    const addLog = (game, msg, type = 'info') => {
      setLiveLogs(prev => [{ id: Date.now() + Math.random(), time: new Date().toLocaleTimeString(), game, msg, type }, ...prev].slice(0, 50));
    };

    socket.on('game-result', (data) => {
      if (data.crashPoint !== undefined) {
        addLog('Aviator', `Crash Point: ${data.crashPoint}x`, 'danger');
      } else if (data.color !== undefined) {
        addLog('Color Prediction', `Result: ${data.color.join(', ')} (${data.number})`, 'success');
      }
    });

    socket.on('game-state', (data) => {
      if (data.winnerId !== undefined && data.phase === 'RESULT') {
        const lastHistory = data.history[0];
        if (lastHistory) {
          setLiveLogs(prev => {
            const isDuplicate = prev.some(l => l.game === 'Marble Race' && l.msg.includes(lastHistory.marble.name) && (Date.now() - l.id < 5000));
            if (isDuplicate) return prev;
            return [{ id: Date.now(), time: new Date().toLocaleTimeString(), game: 'Marble Race', msg: `Winner: ${lastHistory.marble.name}`, type: 'success' }, ...prev].slice(0, 50);
          });
        }
      }
    });

    addLog('System', 'Connected to Live Game Engines...', 'info');

    return () => {
      socket.disconnect();
    };
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'users') fetchUsers();
    if (activeTab === 'stats') fetchStats();
  }, [activeTab]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/users`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      if (data.success) setUsers(data.data);
    } catch (err) {
      console.error('Fetch users failed', err);
    }
    setLoading(false);
  };

  const fetchStats = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/stats`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      if (data.success) setStats(data.data);
    } catch (err) {
      console.error('Fetch stats failed', err);
    }
  };

  const handleUpdateUserBalance = async (userId, newBalance) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/users/${userId}/balance`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ amount: newBalance })
      });
      const data = await res.json();
      if (data.success) {
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, balance: newBalance } : u));
        alert('Balance updated successfully!');
      }
    } catch (err) {
      alert('Failed to update balance');
    }
  };

  const updateConfig = (key, value) => {
    setGameConfig(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const filteredUsers = users.filter(u =>
    u.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="admin-container animate-fade-in">
      <div className="admin-header">
        <div className="header-main">
          <h2>🛡️ Platform Control Center</h2>
          <p>Master Administration Dashboard</p>
        </div>
        <div className="admin-tabs">
          <button className={activeTab === 'config' ? 'active' : ''} onClick={() => setActiveTab('config')}>🎛️ Game Config</button>
          <button className={activeTab === 'users' ? 'active' : ''} onClick={() => setActiveTab('users')}>👥 Users</button>
          <button className={activeTab === 'stats' ? 'active' : ''} onClick={() => setActiveTab('stats')}>📊 Stats</button>
          <button className={activeTab === 'monitor' ? 'active' : ''} onClick={() => setActiveTab('monitor')}>📡 Live Monitor</button>
        </div>
      </div>

      <div className="admin-content-area">
        {activeTab === 'config' && (
          <div className="admin-grid">
            {/* RTP Control */}
            <div className="admin-card">
              <h3>1. Global RTP Control (All Games)</h3>
              <p className="admin-desc">Dynamically enforces House Edge across all synchronized games (including Mines & Chicken).</p>
              <div className="slider-container">
                <div className="slider-header">
                  <span>Tight</span>
                  <span className="highlight-text">{gameConfig.rtp}% RTP</span>
                  <span>Loose</span>
                </div>
                <input
                  type="range" min="80" max="99" step="1"
                  value={gameConfig.rtp}
                  onChange={(e) => updateConfig('rtp', parseInt(e.target.value))}
                  className="admin-range"
                />
              </div>
            </div>

            {/* Mines Game Control */}
            <div className="admin-card">
              <h3>2. Mines Algorithm Control</h3>
              <p className="admin-desc">Control the outcome strategy specifically for the Mines game.</p>
              <div className="admin-input-group">
                <select
                  className="admin-select"
                  value={gameConfig.mines?.mode || 'random'}
                  onChange={(e) => setGameConfig(prev => ({
                    ...prev,
                    mines: { ...(prev.mines || {}), mode: e.target.value }
                  }))}
                >
                  <option value="random">🎲 Pure Random (Fair)</option>
                  <option value="force_loss">📉 Force Loss (Mine on 2nd Click)</option>
                  <option value="force_win">🚀 Force Win (No Mines)</option>
                  <option value="house_edge">🏠 House Edge (Profit Limit)</option>
                </select>
              </div>
            </div>

            {/* Chicken Game Control */}
            <div className="admin-card">
              <h3>3. Chicken Algorithm Control</h3>
              <p className="admin-desc">Control the outcome strategy specifically for the Chicken game.</p>
              <div className="admin-input-group">
                <select
                  className="admin-select"
                  value={gameConfig.chicken?.mode || 'random'}
                  onChange={(e) => setGameConfig(prev => ({
                    ...prev,
                    chicken: { ...(prev.chicken || {}), mode: e.target.value }
                  }))}
                >
                  <option value="random">🎲 Pure Random (Fair)</option>
                  <option value="force_loss">📉 Force Loss (Crash Early)</option>
                  <option value="force_win">🚀 Force Win (No Crashes)</option>
                  <option value="house_edge">🏠 House Edge (Profit Limit)</option>
                </select>
              </div>
            </div>

            <div className="admin-card" style={{ gridColumn: 'span 2' }}>
              <p style={{ textAlign: 'center', opacity: 0.6 }}>Additional per-game toggles are active in the background simulation engine.</p>
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="admin-users-view">
            <div className="users-header-actions">
              <input
                type="text"
                placeholder="Search users by name or email..."
                className="admin-search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <button className="admin-btn-refresh" onClick={fetchUsers}>🔄 Refresh</button>
            </div>

            <div className="admin-table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Username</th>
                    <th>Email</th>
                    <th>Balance</th>
                    <th>Role</th>
                    <th>Registered</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan="6" style={{ textAlign: 'center', padding: '50px' }}>Loading platform users...</td></tr>
                  ) : filteredUsers.map(u => (
                    <tr key={u.id}>
                      <td>{u.username}</td>
                      <td>{u.email}</td>
                      <td className="highlight-text">₹ {u.balance.toFixed(2)}</td>
                      <td><span className={`role-badge ${u.role}`}>{u.role}</span></td>
                      <td>{new Date(u.createdAt).toLocaleDateString()}</td>
                      <td>
                        <button className="btn-edit" onClick={() => setSelectedUser(u)}>🖊️ Edit Balance</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {selectedUser && (
              <div className="admin-modal-overlay">
                <div className="admin-modal">
                  <h3>Edit Balance: {selectedUser.username}</h3>
                  <div className="modal-body">
                    <p>Current: <span className="highlight-text">₹ {selectedUser.balance.toFixed(2)}</span></p>
                    <input
                      type="number"
                      placeholder="New absolute balance..."
                      className="modal-input"
                      value={fundsInput}
                      onChange={(e) => setFundsInput(e.target.value)}
                    />
                  </div>
                  <div className="modal-footer">
                    <button className="admin-btn btn-success" onClick={() => {
                      handleUpdateUserBalance(selectedUser.id, parseFloat(fundsInput));
                      setSelectedUser(null);
                      setFundsInput('');
                    }}>Update</button>
                    <button className="admin-btn btn-warning" onClick={() => setSelectedUser(null)}>Cancel</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'stats' && (
          <div className="admin-stats-view">
            {stats ? (
              <div className="stats-cards">
                <div className="stat-card-premium">
                  <div className="stat-icon">👥</div>
                  <div className="stat-info">
                    <span className="stat-label">Total Users</span>
                    <span className="stat-val">{stats.totalUsers}</span>
                  </div>
                </div>
                <div className="stat-card-premium">
                  <div className="stat-icon">💰</div>
                  <div className="stat-info">
                    <span className="stat-label">Total Circulation</span>
                    <span className="stat-val">₹ {stats.totalBalance?.toLocaleString()}</span>
                  </div>
                </div>
                <div className="stat-card-premium">
                  <div className="stat-icon">🧾</div>
                  <div className="stat-info">
                    <span className="stat-label">Transactions</span>
                    <span className="stat-val">{stats.totalTransactions}</span>
                  </div>
                </div>
                <div className="stat-card-premium">
                  <div className="stat-icon">🟢</div>
                  <div className="stat-info">
                    <span className="stat-label">System Status</span>
                    <span className="stat-val">{stats.systemHealth.toUpperCase()}</span>
                  </div>
                </div>
              </div>
            ) : <p>Loading real-time stats...</p>}
          </div>
        )}

        {activeTab === 'monitor' && (
          <div className="admin-monitor-view">
            <div className="monitor-header">
              <h3 style={{ margin: 0 }}>📡 Live Engine Broadcast</h3>
              <button className="admin-btn-refresh" onClick={() => setLiveLogs([])}>🧹 Clear Console</button>
            </div>
            <div className="terminal-window">
              {liveLogs.length === 0 ? (
                <div className="terminal-line placeholder">Waiting for engine broadcasts...</div>
              ) : (
                liveLogs.map((log) => (
                  <div key={log.id} className={`terminal-line ${log.type}`}>
                    <span className="log-time">[{log.time}]</span>
                    <span className="log-game">[{log.game}]</span>
                    <span className="log-msg">{log.msg}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      <div className="rules-footer">
        <span className="icon">🛡️</span>
        <div>
          <strong>Safety Framework Active</strong>: Platform-wide configuration adjustments are successfully routed through centralized probability distribution mathematics.
        </div>
      </div>
    </div>
  );
};

export default Admin;
