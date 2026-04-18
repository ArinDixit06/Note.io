import React, { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import Sidebar from './components/Sidebar';
import NoteList from './components/NoteList';
import NoteEditor from './components/NoteEditor';
import NewNoteButton from './components/NewNoteButton';
import {
  completeOnboarding,
  createNote,
  createWorkspace,
  deleteNote,
  fetchInboxPreview,
  fetchNotes,
  fetchSession,
  fetchWorkspaceMembers,
  logoutSession,
  requestLogin,
  updateAccount,
  updateNote,
  updateWorkspace,
  verifyCode,
  verifyMagicLink,
} from './api';
import {
  clearSessionToken,
  clearWorkspaceId,
  loadActiveWorkspaceId,
  loadSessionToken,
  saveActiveWorkspaceId,
  saveSessionToken,
} from './profile';
import './App.css';

const VIEW_LABELS = {
  all: 'All Pages',
  favorites: 'Favorites',
  archived: 'Archive',
  owned: 'Created By Me',
};

const USE_CASES = [
  {
    id: 'personal',
    label: 'Individual',
    copy: 'A private system for thinking, planning, and keeping your own work in motion.',
  },
  {
    id: 'school',
    label: 'School',
    copy: 'Coursework, study plans, and shared project spaces with a quieter academic structure.',
  },
  {
    id: 'team',
    label: 'Team',
    copy: 'Shared plans, meeting notes, ownership trails, and workspace identity for collaborators.',
  },
];

const TEMPLATE_LIBRARY = {
  personal: [
    'Weekly reset',
    'Reading pipeline',
    'Idea bank',
    'Decision log',
    'Life dashboard',
  ],
  school: [
    'Semester tracker',
    'Assignment planner',
    'Research notebook',
    'Study sprint board',
    'Class notes hub',
  ],
  team: [
    'Leadership brief',
    'Project home',
    'Marketing launch plan',
    'Hiring loop tracker',
    'Meeting pulse log',
  ],
};

const DEFAULT_NEW_WORKSPACE = {
  name: '',
  icon: '[]',
  accent: '#d89a5b',
  useCase: 'team',
};
const EMPTY_ARRAY = [];

const sortNotes = (items) =>
  [...items].sort((a, b) => {
    const aTime = new Date(a.updatedAt || a.createdAt || 0).getTime();
    const bTime = new Date(b.updatedAt || b.createdAt || 0).getTime();
    return bTime - aTime;
  });

const getWorkspaceBlurb = (workspace) => {
  if (!workspace) {
    return 'A workspace-centered knowledge system with passwordless access and ambient identity.';
  }

  if (workspace.useCase === 'team') {
    return 'The current teamspace keeps ownership, presence, and planning inside a shared context instead of scattered accounts.';
  }

  if (workspace.useCase === 'school') {
    return 'This study-focused workspace keeps coursework, project pages, and reference material moving through a single system.';
  }

  return 'This personal workspace is built for focused capture, reflection, and quiet momentum across your own pages.';
};

function LoginScreen({
  email,
  onEmailChange,
  code,
  onCodeChange,
  pendingDelivery,
  statusMessage,
  isSubmitting,
  onRequestLogin,
  onVerifyCode,
  onUseMagicLink,
}) {
  return (
    <div className="auth-shell">
      <section className="auth-card">
        <div className="auth-intro">
          <p className="eyebrow">Passwordless Access</p>
          <h1>Enter Bromine through your workspace, not a forgotten password.</h1>
          <p className="hero-copy">
            Request one email and Bromine generates both a 4-word login code and a magic link. In
            this build, the delivery appears instantly so you can test the flow without email
            infrastructure.
          </p>
        </div>

        <div className="auth-form">
          <label>
            <span>Email</span>
            <input
              type="email"
              value={email}
              onChange={(event) => onEmailChange(event.target.value)}
              placeholder="you@workspace.com"
            />
          </label>

          <div className="auth-actions">
            <button className="new-note-btn" onClick={onRequestLogin} disabled={isSubmitting}>
              {isSubmitting ? 'Sending...' : 'Send login email'}
            </button>
          </div>

          <label>
            <span>4-word login code</span>
            <input
              type="text"
              value={code}
              onChange={(event) => onCodeChange(event.target.value)}
              placeholder="sage ember paper coast"
            />
          </label>

          <div className="auth-actions">
            <button className="button" onClick={onVerifyCode} disabled={isSubmitting}>
              Verify code
            </button>
          </div>

          {statusMessage ? <p className="auth-status">{statusMessage}</p> : null}
        </div>
      </section>

      <section className="delivery-card">
        <div className="delivery-header">
          <p className="eyebrow">Bromine Mail</p>
          <h2>Simulated delivery preview</h2>
        </div>
        {pendingDelivery ? (
          <div className="delivery-preview">
            <div className="delivery-row">
              <span>To</span>
              <strong>{pendingDelivery.email}</strong>
            </div>
            <div className="delivery-row">
              <span>4-word code</span>
              <strong>{pendingDelivery.loginCode}</strong>
            </div>
            <div className="delivery-row">
              <span>Magic token</span>
              <strong>{pendingDelivery.magicToken.slice(0, 16)}...</strong>
            </div>
            <div className="delivery-row">
              <span>Expires</span>
              <strong>{new Date(pendingDelivery.expiresAt).toLocaleString()}</strong>
            </div>
            <div className="auth-actions">
              <button className="button" onClick={onUseMagicLink}>
                Use magic link instantly
              </button>
            </div>
          </div>
        ) : (
          <p className="empty-state">Request a login email to preview the magic link and code here.</p>
        )}
      </section>
    </div>
  );
}

function OnboardingScreen({ account, draft, onChange, onSubmit, isSubmitting }) {
  const templates = TEMPLATE_LIBRARY[draft.useCase] || TEMPLATE_LIBRARY.personal;

  return (
    <div className="onboarding-shell">
      <section className="onboarding-card">
        <div className="auth-intro">
          <p className="eyebrow">Workspace Identity</p>
          <h1>Shape the first workspace while the account is still fresh.</h1>
          <p className="hero-copy">
            Bromine keeps login friction low and moves the real identity work into onboarding.
            Choose the context, define the workspace, and the starter system adapts around it.
          </p>
        </div>

        <div className="onboarding-grid">
          <label>
            <span>Your name</span>
            <input
              type="text"
              value={draft.fullName}
              onChange={(event) => onChange({ fullName: event.target.value })}
            />
          </label>
          <label>
            <span>Role or title</span>
            <input
              type="text"
              value={draft.title}
              onChange={(event) => onChange({ title: event.target.value })}
              placeholder="Design lead, Student, Founder..."
            />
          </label>
          <label>
            <span>Workspace name</span>
            <input
              type="text"
              value={draft.workspaceName}
              onChange={(event) => onChange({ workspaceName: event.target.value })}
              placeholder={`${account?.fullName || 'Your'} Workspace`}
            />
          </label>
          <label>
            <span>Workspace icon</span>
            <input
              type="text"
              value={draft.workspaceIcon}
              onChange={(event) => onChange({ workspaceIcon: event.target.value })}
              placeholder="[]"
            />
          </label>
          <label>
            <span>Accent</span>
            <input
              type="text"
              value={draft.accent}
              onChange={(event) => onChange({ accent: event.target.value })}
              placeholder="#d89a5b"
            />
          </label>
        </div>

        <div className="use-case-grid">
          {USE_CASES.map((item) => (
            <button
              key={item.id}
              className={`use-case-card ${draft.useCase === item.id ? 'active' : ''}`}
              onClick={() => onChange({ useCase: item.id })}
            >
              <strong>{item.label}</strong>
              <span>{item.copy}</span>
            </button>
          ))}
        </div>

        <div className="template-preview">
          <div>
            <p className="eyebrow">Curated Starter Templates</p>
            <h2>{draft.useCase === 'team' ? 'Shared system' : draft.useCase === 'school' ? 'Academic system' : 'Personal system'}</h2>
          </div>
          <div className="template-chip-grid">
            {templates.map((template) => (
              <span key={template} className="property-chip property-chip-brown">
                {template}
              </span>
            ))}
          </div>
        </div>

        <div className="auth-actions">
          <button className="new-note-btn" onClick={onSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Building workspace...' : 'Create workspace'}
          </button>
        </div>
      </section>
    </div>
  );
}

function App() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [sessionToken, setSessionToken] = useState(() => loadSessionToken());
  const [sessionData, setSessionData] = useState(null);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState(() => loadActiveWorkspaceId());
  const [members, setMembers] = useState([]);
  const [notes, setNotes] = useState([]);
  const [selectedNoteId, setSelectedNoteId] = useState(null);
  const [isBooting, setIsBooting] = useState(true);
  const [isWorkspaceLoading, setIsWorkspaceLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeView, setActiveView] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginCode, setLoginCode] = useState('');
  const [pendingDelivery, setPendingDelivery] = useState(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [creatorDraft, setCreatorDraft] = useState({ fullName: '', title: '' });
  const [workspaceDraft, setWorkspaceDraft] = useState({ name: '', icon: '[]', accent: '#d89a5b', useCase: 'team' });
  const [newWorkspaceDraft, setNewWorkspaceDraft] = useState(DEFAULT_NEW_WORKSPACE);
  const [onboardingDraft, setOnboardingDraft] = useState({
    fullName: '',
    title: '',
    workspaceName: '',
    workspaceIcon: '[]',
    accent: '#d89a5b',
    useCase: 'personal',
  });

  const deferredSearchQuery = useDeferredValue(searchQuery);

  const workspaces = sessionData?.workspaces ?? EMPTY_ARRAY;
  const currentWorkspace = useMemo(() => {
    if (!workspaces.length) {
      return null;
    }

    return workspaces.find((workspace) => workspace.id === activeWorkspaceId) || workspaces[0];
  }, [activeWorkspaceId, workspaces]);

  const selectedNote = useMemo(
    () => notes.find((note) => note._id === selectedNoteId) || null,
    [notes, selectedNoteId]
  );

  const filteredNotes = useMemo(() => {
    const query = deferredSearchQuery.trim().toLowerCase();

    return notes.filter((note) => {
      if (activeView === 'favorites' && !note.favorite) return false;
      if (activeView === 'archived' && !note.archived) return false;
      if (activeView === 'all' && note.archived) return false;
      if (activeView === 'owned' && note.createdByAccountId !== sessionData?.account?.id) return false;

      if (!query) return true;

      const haystack = [note.title, note.content?.replace(/<[^>]+>/g, ' '), note.status, ...(note.tags || [])]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [activeView, deferredSearchQuery, notes, sessionData?.account?.id]);

  const workspaceStats = useMemo(() => {
    const favorites = notes.filter((note) => note.favorite && !note.archived).length;
    const archived = notes.filter((note) => note.archived).length;
    const owned = notes.filter((note) => note.createdByAccountId === sessionData?.account?.id).length;
    const active = notes.filter((note) => !note.archived).length;

    return { favorites, archived, owned, active };
  }, [notes, sessionData?.account?.id]);

  const recentNotes = useMemo(() => sortNotes(notes.filter((note) => !note.archived)).slice(0, 4), [notes]);

  const applySessionPayload = (payload) => {
    setSessionData(payload);
    setSessionToken(payload.sessionToken);
    saveSessionToken(payload.sessionToken);

    const rememberedWorkspaceId = loadActiveWorkspaceId();
    const nextWorkspaceId =
      payload.workspaces.find((workspace) => workspace.id === rememberedWorkspaceId)?.id ||
      payload.workspaces[0]?.id ||
      null;

    setActiveWorkspaceId(nextWorkspaceId);
    saveActiveWorkspaceId(nextWorkspaceId);
    setCreatorDraft({
      fullName: payload.account.fullName || '',
      title: payload.account.title || '',
    });
    setWorkspaceDraft({
      name: payload.workspaces[0]?.name || '',
      icon: payload.workspaces[0]?.icon || '[]',
      accent: payload.workspaces[0]?.accent || '#d89a5b',
      useCase: payload.workspaces[0]?.useCase || 'team',
    });
    setOnboardingDraft((currentDraft) => ({
      ...currentDraft,
      fullName: payload.account.fullName || '',
      title: payload.account.title || '',
      workspaceName: payload.account.fullName ? `${payload.account.fullName.split(' ')[0]}'s Workspace` : 'Bromine Space',
    }));
  };

  useEffect(() => {
    let active = true;

    const boot = async () => {
      const magicToken = searchParams.get('token');

      try {
        if (magicToken) {
          const payload = await verifyMagicLink(magicToken);
          if (!active) return;
          applySessionPayload(payload);
          setStatusMessage('Magic link verified.');
          setSearchParams({});
          return;
        }

        if (!sessionToken) {
          return;
        }

        const payload = await fetchSession(sessionToken);
        if (!active) return;
        applySessionPayload(payload);
      } catch (error) {
        if (!active) return;
        clearSessionToken();
        clearWorkspaceId();
        setSessionToken(null);
        setSessionData(null);
        setStatusMessage(error.message);
      } finally {
        if (active) {
          setIsBooting(false);
        }
      }
    };

    boot();

    return () => {
      active = false;
    };
  }, [searchParams, sessionToken, setSearchParams]);

  useEffect(() => {
    if (!currentWorkspace) {
      return;
    }

    setWorkspaceDraft({
      name: currentWorkspace.name,
      icon: currentWorkspace.icon,
      accent: currentWorkspace.accent,
      useCase: currentWorkspace.useCase,
    });
  }, [currentWorkspace]);

  useEffect(() => {
    if (!sessionData?.account) {
      return;
    }

    setCreatorDraft({
      fullName: sessionData.account.fullName,
      title: sessionData.account.title,
    });
  }, [sessionData]);

  useEffect(() => {
    let active = true;

    const loadWorkspaceContext = async () => {
      if (!sessionToken || !currentWorkspace || sessionData?.needsOnboarding) {
        return;
      }

      setIsWorkspaceLoading(true);

      try {
        const [membersPayload, notesPayload] = await Promise.all([
          fetchWorkspaceMembers(sessionToken, currentWorkspace.id),
          fetchNotes(sessionToken, currentWorkspace.id),
        ]);

        if (!active) return;
        setMembers(membersPayload);
        setNotes(sortNotes(notesPayload));
      } catch (error) {
        if (!active) return;
        setStatusMessage(error.message);
      } finally {
        if (active) {
          setIsWorkspaceLoading(false);
        }
      }
    };

    loadWorkspaceContext();

    return () => {
      active = false;
    };
  }, [currentWorkspace, sessionData?.needsOnboarding, sessionToken]);

  const handleRequestLogin = async () => {
    setIsSubmitting(true);
    setStatusMessage('');

    try {
      const payload = await requestLogin(loginEmail);
      setPendingDelivery(payload.delivery);
      setLoginCode(payload.delivery.loginCode);
      setStatusMessage('Login email generated. Use the code or the magic link preview.');
      try {
        const inbox = await fetchInboxPreview(loginEmail);
        setPendingDelivery(inbox.delivery);
      } catch {
        // Ignore inbox refresh errors when the preview is already available.
      }
    } catch (error) {
      setStatusMessage(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyCode = async () => {
    setIsSubmitting(true);
    setStatusMessage('');

    try {
      const payload = await verifyCode(loginEmail, loginCode);
      applySessionPayload(payload);
    } catch (error) {
      setStatusMessage(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMagicPreview = async () => {
    if (!pendingDelivery?.magicToken) {
      return;
    }

    setIsSubmitting(true);
    setStatusMessage('');

    try {
      const payload = await verifyMagicLink(pendingDelivery.magicToken);
      applySessionPayload(payload);
    } catch (error) {
      setStatusMessage(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOnboarding = async () => {
    if (!sessionToken) {
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = await completeOnboarding(sessionToken, onboardingDraft);
      applySessionPayload(payload);
    } catch (error) {
      setStatusMessage(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAccountSave = async () => {
    if (!sessionToken) {
      return;
    }

    try {
      const payload = await updateAccount(sessionToken, creatorDraft);
      applySessionPayload(payload);
      setStatusMessage('Account updated.');
    } catch (error) {
      setStatusMessage(error.message);
    }
  };

  const handleWorkspaceSave = async () => {
    if (!sessionToken || !currentWorkspace) {
      return;
    }

    try {
      const updatedWorkspace = await updateWorkspace(sessionToken, currentWorkspace.id, workspaceDraft);
      const nextWorkspaces = workspaces.map((workspace) =>
        workspace.id === updatedWorkspace.id ? { ...workspace, ...updatedWorkspace } : workspace
      );
      setSessionData((currentData) => ({ ...currentData, workspaces: nextWorkspaces }));
      setStatusMessage('Workspace updated.');
    } catch (error) {
      setStatusMessage(error.message);
    }
  };

  const handleCreateWorkspace = async () => {
    if (!sessionToken || !newWorkspaceDraft.name.trim()) {
      return;
    }

    try {
      const workspace = await createWorkspace(sessionToken, newWorkspaceDraft);
      setSessionData((currentData) => ({
        ...currentData,
        workspaces: [...currentData.workspaces, workspace].sort((a, b) => a.name.localeCompare(b.name)),
      }));
      setActiveWorkspaceId(workspace.id);
      saveActiveWorkspaceId(workspace.id);
      setNewWorkspaceDraft(DEFAULT_NEW_WORKSPACE);
      setStatusMessage('Workspace created.');
    } catch (error) {
      setStatusMessage(error.message);
    }
  };

  const handleLogout = async () => {
    try {
      if (sessionToken) {
        await logoutSession(sessionToken);
      }
    } catch {
      // Ignore logout failures when clearing local state.
    }

    clearSessionToken();
    clearWorkspaceId();
    setSessionToken(null);
    setSessionData(null);
    setMembers([]);
    setNotes([]);
    setSelectedNoteId(null);
    setPendingDelivery(null);
  };

  const handleCreateNote = async () => {
    if (!sessionToken || !currentWorkspace) {
      return;
    }

    try {
      const note = await createNote(sessionToken, currentWorkspace.id, {
        localId: uuidv4(),
        title: 'Untitled',
        content: '<p></p>',
        coverImage: '',
        status: 'Draft',
        tags: [],
        favorite: false,
        archived: false,
      });

      setNotes((currentNotes) => sortNotes([note, ...currentNotes]));
      setSelectedNoteId(note._id);
    } catch (error) {
      setStatusMessage(error.message);
    }
  };

  const handleUpdateNote = async (updatedNote) => {
    if (!sessionToken || !currentWorkspace) {
      return;
    }

    setNotes((currentNotes) =>
      sortNotes(currentNotes.map((note) => (note._id === updatedNote._id ? updatedNote : note)))
    );

    try {
      const savedNote = await updateNote(sessionToken, currentWorkspace.id, updatedNote._id, updatedNote);
      setNotes((currentNotes) =>
        sortNotes(currentNotes.map((note) => (note._id === savedNote._id ? savedNote : note)))
      );
    } catch (error) {
      setStatusMessage(error.message);
    }
  };

  const handleDeleteNote = async (noteId) => {
    if (!sessionToken || !currentWorkspace) {
      return;
    }

    try {
      await deleteNote(sessionToken, currentWorkspace.id, noteId);
      setNotes((currentNotes) => currentNotes.filter((note) => note._id !== noteId));
      if (selectedNoteId === noteId) {
        setSelectedNoteId(null);
      }
    } catch (error) {
      setStatusMessage(error.message);
    }
  };

  if (isBooting) {
    return (
      <div className="auth-shell">
        <section className="auth-card">
          <p className="eyebrow">Booting Bromine</p>
          <h1>Restoring session and workspace context.</h1>
        </section>
      </div>
    );
  }

  if (!sessionData) {
    return (
      <LoginScreen
        email={loginEmail}
        onEmailChange={setLoginEmail}
        code={loginCode}
        onCodeChange={setLoginCode}
        pendingDelivery={pendingDelivery}
        statusMessage={statusMessage}
        isSubmitting={isSubmitting}
        onRequestLogin={handleRequestLogin}
        onVerifyCode={handleVerifyCode}
        onUseMagicLink={handleMagicPreview}
      />
    );
  }

  if (sessionData.needsOnboarding) {
    return (
      <OnboardingScreen
        account={sessionData.account}
        draft={onboardingDraft}
        onChange={(patch) => setOnboardingDraft((current) => ({ ...current, ...patch }))}
        onSubmit={handleOnboarding}
        isSubmitting={isSubmitting}
      />
    );
  }

  return (
    <div className="app-layout">
      <Sidebar
        account={sessionData.account}
        currentWorkspace={currentWorkspace}
        workspaces={workspaces}
        members={members}
        stats={workspaceStats}
        activeView={activeView}
        onViewChange={setActiveView}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        workspaceDraft={workspaceDraft}
        onWorkspaceDraftChange={(patch) => setWorkspaceDraft((current) => ({ ...current, ...patch }))}
        onWorkspaceSave={handleWorkspaceSave}
        creatorDraft={creatorDraft}
        onCreatorDraftChange={(patch) => setCreatorDraft((current) => ({ ...current, ...patch }))}
        onAccountSave={handleAccountSave}
        newWorkspaceDraft={newWorkspaceDraft}
        onNewWorkspaceDraftChange={(patch) => setNewWorkspaceDraft((current) => ({ ...current, ...patch }))}
        onCreateWorkspace={handleCreateWorkspace}
        onWorkspaceSelect={(workspaceId) => {
          setActiveWorkspaceId(workspaceId);
          saveActiveWorkspaceId(workspaceId);
          setSelectedNoteId(null);
        }}
        onLogout={handleLogout}
        isOpen={isSidebarOpen}
        toggleSidebar={() => setIsSidebarOpen((value) => !value)}
      />

      <main className="main-content">
        {selectedNote ? (
          <NoteEditor
            key={selectedNote._id}
            note={selectedNote}
            account={sessionData.account}
            workspace={currentWorkspace}
            members={members}
            onUpdate={handleUpdateNote}
            onDelete={handleDeleteNote}
            onBack={() => setSelectedNoteId(null)}
            allNotes={notes}
            onNavigate={(noteOrId) => {
              const nextId = typeof noteOrId === 'string' ? noteOrId : noteOrId?._id;
              if (nextId) {
                setSelectedNoteId(nextId);
              }
            }}
          />
        ) : (
          <div className="dashboard">
            <div className="dashboard-hero">
              <div>
                <p className="eyebrow">Current Workspace</p>
                <h1>
                  {currentWorkspace?.icon || '[]'} {currentWorkspace?.name}
                </h1>
                <p className="hero-copy">{getWorkspaceBlurb(currentWorkspace)}</p>
              </div>
              <div className="hero-actions">
                <NewNoteButton onClick={handleCreateNote} />
                <div className="hero-accent" style={{ '--profile-accent': currentWorkspace?.accent || '#d89a5b' }} />
              </div>
            </div>

            <section className="stats-grid">
              <article className="stat-card">
                <span>Active pages</span>
                <strong>{workspaceStats.active}</strong>
                <p>Pages visible in this workspace right now.</p>
              </article>
              <article className="stat-card">
                <span>Owned by you</span>
                <strong>{workspaceStats.owned}</strong>
                <p>Pages where your account is the creator of record.</p>
              </article>
              <article className="stat-card">
                <span>Members present</span>
                <strong>{members.length}</strong>
                <p>Ambient collaborators connected to this workspace.</p>
              </article>
              <article className="stat-card">
                <span>Archive</span>
                <strong>{workspaceStats.archived}</strong>
                <p>Pages hidden from the active working set.</p>
              </article>
            </section>

            <section className="dashboard-section">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Current View</p>
                  <h2>{VIEW_LABELS[activeView] || 'Workspace'}</h2>
                </div>
                <p className="section-copy">
                  {statusMessage || 'Workspace-scoped filters and search now operate inside the current context only.'}
                </p>
              </div>

              {isWorkspaceLoading ? (
                <p className="empty-state">Loading workspace context...</p>
              ) : (
                <NoteList
                  notes={filteredNotes}
                  onNoteClick={(note) => setSelectedNoteId(note._id)}
                  emptyMessage={`No pages found in ${VIEW_LABELS[activeView] || 'this view'}.`}
                />
              )}
            </section>

            <section className="dashboard-section dashboard-secondary">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Recent Pages</p>
                  <h2>Quick Return</h2>
                </div>
                <p className="section-copy">
                  Ownership, last editor, and workspace identity stay visible without leaving the page flow.
                </p>
              </div>

              <div className="recent-list">
                {recentNotes.length ? (
                  recentNotes.map((note) => (
                    <button
                      key={note._id}
                      className="recent-item"
                      onClick={() => setSelectedNoteId(note._id)}
                    >
                      <span>{note.title || 'Untitled'}</span>
                      <small>
                        {note.ownerName} · {note.status} · {note.lastEditedByName}
                      </small>
                    </button>
                  ))
                ) : (
                  <p className="empty-state">Create the first page in this workspace to seed the system.</p>
                )}
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
