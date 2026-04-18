import React from 'react';

const navItems = [
  { id: 'all', label: 'All Notes', icon: 'Pages' },
  { id: 'owned', label: 'My Pages', icon: 'Owned' },
  { id: 'favorites', label: 'Favorites', icon: 'Starred' },
  { id: 'archived', label: 'Archive', icon: 'Vault' },
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
          <p>Bromine</p>
          <h2>{profile.workspaceName}</h2>
        </div>

        <section className="profile-card">
          <div className="profile-avatar" style={{ '--profile-accent': profile.accent }}>
            {profile.avatarSeed}
          </div>
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
            placeholder="Search titles, tags, status..."
          />
        </label>

        <nav className="menu">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={`menu-item ${activeView === item.id ? 'active' : ''}`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <section className="profile-settings">
          <div className="settings-heading">
            <p>Profile System</p>
            <small>Core workspace identity</small>
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
            <span>Accent</span>
            <input
              type="color"
              value={profile.accent}
              onChange={(event) => onProfileChange({ accent: event.target.value })}
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
