import React from 'react';

const navItems = [
  {
    id: 'all',
    label: 'All Pages',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="1" y="1" width="6" height="6" rx="1.5" fill="currentColor" />
        <rect x="9" y="1" width="6" height="6" rx="1.5" fill="currentColor" />
        <rect x="1" y="9" width="6" height="6" rx="1.5" fill="currentColor" />
        <rect x="9" y="9" width="6" height="6" rx="1.5" fill="currentColor" />
      </svg>
    ),
  },
  {
    id: 'owned',
    label: 'Created By Me',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="5" r="3" fill="currentColor" />
        <path d="M2 13c0-3.314 2.686-6 6-6s6 2.686 6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: 'favorites',
    label: 'Favorites',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M8 1.5l1.854 3.756 4.146.603-3 2.924.708 4.129L8 10.802l-3.708 1.95L5 8.783 2 5.859l4.146-.603L8 1.5z" fill="currentColor" />
      </svg>
    ),
  },
  {
    id: 'archived',
    label: 'Archive',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="1" y="2" width="14" height="3.5" rx="1" fill="currentColor" />
        <path d="M2 6h12v7a1 1 0 01-1 1H3a1 1 0 01-1-1V6z" fill="currentColor" opacity="0.6" />
        <path d="M6 9h4" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
];

const Sidebar = ({
  account,
  currentWorkspace,
  workspaces,
  members,
  stats,
  activeView,
  onViewChange,
  searchQuery,
  onSearchChange,
  workspaceDraft,
  onWorkspaceDraftChange,
  onWorkspaceSave,
  creatorDraft,
  onCreatorDraftChange,
  onAccountSave,
  newWorkspaceDraft,
  onNewWorkspaceDraftChange,
  onCreateWorkspace,
  onWorkspaceSelect,
  onLogout,
  isOpen,
  toggleSidebar,
}) => {
  return (
    <>
      <button
        className="sidebar-toggle-btn"
        onClick={toggleSidebar}
        title={isOpen ? 'Close Sidebar' : 'Open Sidebar'}
        aria-label={isOpen ? 'Close Sidebar' : 'Open Sidebar'}
      >
        {isOpen ? (
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M8 2L2 8M2 2l6 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        ) : (
          <svg width="12" height="10" viewBox="0 0 12 10" fill="none">
            <path d="M1 1.5h10M1 5h10M1 8.5h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        )}
      </button>

      <aside className={`sidebar ${isOpen ? '' : 'collapsed'}`}>
        <div className="brand">
          <p>Workspace</p>
          <h2>{currentWorkspace?.name || 'Bromine'}</h2>
        </div>

        <section className="workspace-switcher">
          <label className="workspace-select">
            <span>Active workspace</span>
            <select
              value={currentWorkspace?.id || ''}
              onChange={(event) => onWorkspaceSelect(event.target.value)}
            >
              {workspaces.map((workspace) => (
                <option key={workspace.id} value={workspace.id}>
                  {workspace.icon} {workspace.name}
                </option>
              ))}
            </select>
          </label>

          {members.length > 0 && (
            <div className="workspace-member-strip">
              {members.slice(0, 5).map((member) => (
                <div
                  key={member.membershipId}
                  className="member-pill"
                  title={`${member.fullName} · ${member.role}`}
                >
                  {member.avatarSeed}
                </div>
              ))}
              {members.length > 5 ? (
                <small style={{ fontSize: 11, color: 'var(--apple-text-tertiary)', marginLeft: 4 }}>
                  +{members.length - 5}
                </small>
              ) : null}
            </div>
          )}
        </section>

        <section className="profile-card">
          <div className="profile-avatar">{account?.avatarSeed || 'BR'}</div>
          <div className="profile-copy">
            <strong>{account?.fullName || 'Bromine User'}</strong>
            <span>{account?.title || 'Workspace builder'}</span>
          </div>
        </section>

        <label className="sidebar-search">
          <span>Quick Find</span>
          <input
            type="text"
            value={searchQuery}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search pages, tags, status…"
          />
        </label>

        <nav className="menu" role="navigation" aria-label="Workspace navigation">
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
            <p>Account</p>
            <small>Passwordless identity</small>
          </div>

          <label>
            <span>Name</span>
            <input
              type="text"
              value={creatorDraft.fullName}
              onChange={(event) => onCreatorDraftChange({ fullName: event.target.value })}
            />
          </label>
          <label>
            <span>Role</span>
            <input
              type="text"
              value={creatorDraft.title}
              onChange={(event) => onCreatorDraftChange({ title: event.target.value })}
            />
          </label>
          <button className="button" onClick={onAccountSave}>
            Save account
          </button>
        </section>

        <section className="profile-settings">
          <div className="settings-heading">
            <p>Current Workspace</p>
            <small>Identity &amp; appearance</small>
          </div>

          <label>
            <span>Name</span>
            <input
              type="text"
              value={workspaceDraft.name}
              onChange={(event) => onWorkspaceDraftChange({ name: event.target.value })}
            />
          </label>
          <label>
            <span>Icon</span>
            <input
              type="text"
              value={workspaceDraft.icon}
              onChange={(event) => onWorkspaceDraftChange({ icon: event.target.value })}
            />
          </label>
          <label>
            <span>Accent</span>
            <input
              type="text"
              value={workspaceDraft.accent}
              onChange={(event) => onWorkspaceDraftChange({ accent: event.target.value })}
            />
          </label>
          <button className="button" onClick={onWorkspaceSave}>
            Save workspace
          </button>
        </section>

        <section className="profile-settings">
          <div className="settings-heading">
            <p>Add Workspace</p>
            <small>Switch contexts instantly</small>
          </div>

          <label>
            <span>Name</span>
            <input
              type="text"
              value={newWorkspaceDraft.name}
              onChange={(event) => onNewWorkspaceDraftChange({ name: event.target.value })}
              placeholder="Studio, Personal, Marketing…"
            />
          </label>
          <label>
            <span>Icon</span>
            <input
              type="text"
              value={newWorkspaceDraft.icon}
              onChange={(event) => onNewWorkspaceDraftChange({ icon: event.target.value })}
            />
          </label>
          <button className="button" onClick={onCreateWorkspace}>
            Create workspace
          </button>
          <button className="button" onClick={onLogout} style={{ marginTop: 2, color: 'var(--apple-text-secondary)' }}>
            Log out
          </button>
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

