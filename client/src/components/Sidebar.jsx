import React from 'react';
import './Sidebar.css';

const Sidebar = ({ navigate, isOpen, closeSidebar, activeRoute, user }) => {
  const groups = [
    {
      label: 'LIVE EVENTS',
      items: [
        { icon: '🎨', name: 'Color Prediction', route: 'color-prediction', tag: 'LIVE' },
        { icon: '🚀', name: 'Aviator', route: 'aviator', tag: 'LIVE' },
        { icon: '🏁', name: 'Marble Race', route: 'marble-race', tag: 'LIVE' },
        { icon: '🏏', name: 'Cricket', route: 'cricket', tag: 'LIVE' },
      ]
    },
    {
      label: 'ORIGINALS',
      items: [
        { icon: '💣', name: 'Mines', route: 'mines' },
        { icon: '🐔', name: 'Chicken', route: 'chicken' },
        { icon: '🔮', name: 'Marble Drop', route: 'marble-drop' },
      ]
    }
  ];

  return (
    <>
      <div className={`sidebar-backdrop ${isOpen ? 'active' : ''}`} onClick={closeSidebar}></div>
      <aside className={`sidebar ${isOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-menu">
          {groups.map((group, gIndex) => (
            <div key={gIndex} className="sidebar-group">
              <h3 className="sidebar-group-label">{group.label}</h3>
              {group.items.map((cat, index) => (
                <div 
                  key={index} 
                  className={`sidebar-item ${activeRoute === cat.route ? 'active' : ''}`} 
                  onClick={() => cat.route && navigate(cat.route)}
                  style={cat.route ? {cursor: 'pointer'} : {}}
                >
                  <span className="sidebar-icon">{cat.icon}</span>
                  <span className="sidebar-name">{cat.name}</span>
                  {cat.tag && <span className="sidebar-tag">{cat.tag}</span>}
                </div>
              ))}
            </div>
          ))}

          {user && user.role === 'admin' && (
            <div style={{ marginTop: 'auto', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '10px' }}>
              <div 
                className={`sidebar-item admin-sidebar-item ${activeRoute === 'admin' ? 'active' : ''}`} 
                onClick={() => navigate('admin')}
              >
                <span className="sidebar-icon">⚙️</span>
                <span className="sidebar-name">Admin</span>
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
