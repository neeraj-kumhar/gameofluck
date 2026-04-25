import React from 'react';
import './Navbar.css';

const Navbar = ({ navigate, toggleSidebar, user }) => {
  return (
    <nav className="navbar">
      <div className="navbar-logo">
        <button className="mobile-menu-btn" onClick={toggleSidebar}>☰</button>
        <h2 onClick={() => { navigate('home'); toggleSidebar && window.innerWidth <= 768 && toggleSidebar(); }} style={{cursor: 'pointer', margin: 0}}>GAME OF LUCK</h2>
      </div>
      <div className="navbar-nav">
        <a href="#sports" className="nav-item">Sports</a>
        <a href="#casino" className="nav-item">Casino</a>
        <a href="#slots" className="nav-item">Slots</a>
        <a href="#table" className="nav-item">Table</a>
      </div>
      <div className="navbar-actions">
        {user ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="nav-balance-box" onClick={() => navigate('recharge')}>
              ₹{user.balance?.toFixed(2)}
              <span className="balance-add-icon">+</span>
            </div>
            
            <div className="user-nav-box" onClick={() => navigate('profile')}>
              <span className="nav-username">{user.username}</span>
              <div className="nav-avatar">
                  {user.username.charAt(0).toUpperCase()}
              </div>
            </div>
          </div>
        ) : (
          <>
            <button 
                className="btn btn-outline" 
                style={{ marginRight: '10px' }}
                onClick={() => navigate('login')}
            >
                Login
            </button>
            <button 
                className="btn btn-primary"
                onClick={() => navigate('signup')}
            >
                Sign Up
            </button>
          </>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
