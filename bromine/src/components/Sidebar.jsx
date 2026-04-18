import React from 'react';

const navItems = [
  { id: 'all', label: 'All Notes', icon: '📄' },
  { id: 'owned', label: 'My Pages', icon: '🙋' },
  { id: 'favorites', label: 'Favorites', icon: '⭐' },
  { id: 'archived', label: 'Archive', icon: '🗃️' },
];

const Sidebar = ({
  profile,
  stats,
  activeView,
  onViewChange,
  searchQuery,
  onSearchChange,
  onProfileChange,
  isOpen,
  toggleSidebar,
}) => {
  return (
    <>
      <button
        className="sidebar-toggle-btn"
        onClick={toggleSidebar}
        title={isOpen ? 'Close Sidebar' : 'Open Sidebar'}
      >
        {isOpen ? '‹' : '›'}
      </button>

      <aside className={`sidebar ${isOpen ? '' : 'collapsed'}`}>
        <div className="brand">
          <p>Workspace</p>
          <h2>{profile.workspaceName}</h2>
        </div>

        <section className="profile-card">
          <div className="profile-avatar">{profile.avatarSeed}</div>
          <div className="profile-copy">
            <strong>{profile.fullName}</strong>
            <span>{profile.role}</span>
          </div>
        </section>

        <label className="sidebar-search">
          <span>Quick Find</span>
          <input
            type="text"
            value={searchQuery}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search pages"
          />
        </label>

        <nav className="menu">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={`menu-item ${activeView === item.id ? 'active' : ''}`}
            >
              <span className="menu-icon">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <section className="profile-settings">
          <div className="settings-heading">
            <p>Profile System</p>
            <small>Core identity across every page</small>
          </div>

          <label>
            <span>Name</span>
            <input
              type="text"
              value={profile.fullName}
              onChange={(event) => onProfileChange({ fullName: event.target.value })}
            />
          </label>
          <label>
            <span>Role</span>
            <input
              type="text"
              value={profile.role}
              onChange={(event) => onProfileChange({ role: event.target.value })}
            />
          </label>
          <label>
            <span>Workspace</span>
            <input
              type="text"
              value={profile.workspaceName}
              onChange={(event) => onProfileChange({ workspaceName: event.target.value })}
            />
          </label>
          <label>
            <span>Email</span>
            <input
              type="email"
              value={profile.email}
              onChange={(event) => onProfileChange({ email: event.target.value })}
            />
          </label>
        </section>

        <section className="sidebar-summary">
          <div>
            <span>Owned</span>
            <strong>{stats.owned}</strong>
          </div>
          <div>
            <span>Starred</span>
            <strong>{stats.favorites}</strong>
          </div>
          <div>
            <span>Archive</span>
            <strong>{stats.archived}</strong>
          </div>
        </section>
      </aside>
    </>
  );
};

export default Sidebar;
