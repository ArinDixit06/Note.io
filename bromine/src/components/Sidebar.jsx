import React from 'react';

const Sidebar = ({ onHome, isOpen, toggleSidebar }) => {
  return (
    <>
      {/* 1. The Toggle Button 
         It sits outside the sidebar div so it doesn't disappear when collapsed.
         The CSS class .sidebar-toggle-btn (provided in App.css) positions it.
      */}
      <button 
        className="sidebar-toggle-btn" 
        onClick={toggleSidebar}
        title={isOpen ? "Close Sidebar" : "Open Sidebar"}
      >
        {/* You can swap these arrows for an icon like ☰ if you prefer */}
        {isOpen ? '◀' : '▶'}
      </button>

      {/* 2. The Sidebar Container
         Dynamically adds the 'collapsed' class based on the isOpen prop.
      */}
      <div className={`sidebar ${isOpen ? '' : 'collapsed'}`}>
        <div className="brand">
          <h2>Bromine / Workspace</h2>
        </div>
        
        <div className="menu">
          <button onClick={onHome} className="menu-item active">
            <span style={{fontSize: '16px'}}>📄</span> All Notes
          </button>
          <button className="menu-item">
            <span style={{fontSize: '16px'}}>🌟</span> Favorites
          </button>
          <button className="menu-item">
            <span style={{fontSize: '16px'}}>🗑️</span> Trash
          </button>
        </div>
      </div>
    </>
  );
};

export default Sidebar;