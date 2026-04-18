import React from 'react';

const navItems = [
  { id: 'all', label: 'All Pages', icon: '[]' },
  { id: 'owned', label: 'Created By Me', icon: '@' },
  { id: 'favorites', label: 'Favorites', icon: '*' },
  { id: 'archived', label: 'Archive', icon: '#' },
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
      >
        {isOpen ? '<' : '>'}
      </button>

      <aside className={`sidebar ${isOpen ? '' : 'collapsed'}`}>
        <div className="brand">
          <p>Workspace Switcher</p>
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

          <div className="workspace-member-strip">
            {members.slice(0, 5).map((member) => (
              <div key={member.membershipId} className="member-pill" title={`${member.fullName} · ${member.role}`}>
                <span>{member.avatarSeed}</span>
              </div>
            ))}
            {members.length > 5 ? <small>+{members.length - 5}</small> : null}
          </div>
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
            placeholder="Search pages, tags, status"
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
            <p>Account</p>
            <small>Passwordless identity with visible workspace context</small>
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
            <small>Identity lives in the workspace layer</small>
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
            <small>Stay logged in and move between contexts instantly</small>
          </div>

          <label>
            <span>Name</span>
            <input
              type="text"
              value={newWorkspaceDraft.name}
              onChange={(event) => onNewWorkspaceDraftChange({ name: event.target.value })}
              placeholder="Studio, Personal, Marketing..."
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
          <button className="button" onClick={onLogout}>
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
