import React, { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import Sidebar from './components/Sidebar';
import NoteList from './components/NoteList';
import NoteEditor from './components/NoteEditor';
import NewNoteButton from './components/NewNoteButton';
import {
  acceptNoteShareLink,
  completeOnboarding,
  createFolder,
  createNote,
  createNoteShareLink,
  createWorkspace,
  deleteNoteAttachment,
  deleteNote,
  fetchFolders,
  fetchInboxPreview,
  fetchNoteAttachments,
  fetchNotes,
  fetchSession,
  fetchWorkspaceMembers,
  getAttachmentDownloadUrl,
  getNoteSocketUrl,
  logoutSession,
  requestLogin,
  saveNoteAttachmentHighlights,
  uploadNoteAttachment,
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

/* ── Toast Notification ──────────────────────────────────────── */
function Toast({ message, tone = 'error', onDismiss }) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 4000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div
      role="alert"
      aria-live="assertive"
      style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        zIndex: 9999,
        maxWidth: 380,
        padding: '13px 16px',
        borderRadius: 14,
        background: tone === 'error' ? '#fff' : '#fff',
        border: `1px solid ${tone === 'error' ? 'rgba(255,59,48,0.18)' : 'rgba(0,113,227,0.18)'}`,
        boxShadow: 'none',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        animation: 'fadeUp 200ms cubic-bezier(0.25,0.46,0.45,0.94) both',
        backdropFilter: 'blur(20px)',
      }}
    >
      <span style={{
        flexShrink: 0,
        width: 20, height: 20,
        borderRadius: '50%',
        background: tone === 'error' ? '#ffebee' : '#e3f2fd',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginTop: 1,
      }}>
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          {tone === 'error'
            ? <path d="M5 1v4M5 8v.5" stroke="#c62828" strokeWidth="1.6" strokeLinecap="round" />
            : <path d="M2 5l2 2 4-4" stroke="#1565c0" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />}
        </svg>
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#1d1d1f', letterSpacing: '-0.01em' }}>
          {tone === 'error' ? 'Something went wrong' : 'Success'}
        </p>
        <p style={{ margin: '2px 0 0', fontSize: 12, color: '#6e6e73', lineHeight: 1.5 }}>{message}</p>
      </div>
      <button
        onClick={onDismiss}
        style={{
          flexShrink: 0, width: 20, height: 20, borderRadius: '50%',
          background: 'rgba(0,0,0,0.06)', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
          <path d="M1 1l6 6M7 1L1 7" stroke="#6e6e73" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}

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
const DEFAULT_NEW_FOLDER = {
  name: '',
  color: '#d89a5b',
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

const normalizeAuthMessage = (message, fallback = 'Something went wrong. Try again.') => {
  if (!message) {
    return fallback;
  }

  const lowered = message.trim().toLowerCase();

  if (
    lowered === 'failed to fetch' ||
    lowered.includes('networkerror') ||
    lowered.includes('load failed') ||
    lowered.includes('network request failed')
  ) {
    return fallback;
  }

  return message;
};

function LoginScreen({
  email,
  onEmailChange,
  code,
  onCodeChange,
  pendingDelivery,
  statusMessage,
  statusTone,
  isSubmitting,
  onRequestLogin,
  onVerifyCode,
  onUseMagicLink,
}) {
  const hasDelivery = Boolean(pendingDelivery);

  return (
    <div className="auth-shell">
      <section className="auth-hero">
        <p className="eyebrow">Quiet workspace access</p>
        <h2>Work begins the moment you arrive.</h2>
        <p className="hero-copy">
          Bromine keeps the sign-in flow minimal so the workspace stays the focus. Request a link,
          check your email, and continue.
        </p>
      </section>

      <section className="auth-card">
        <div className="auth-intro">
          <p className="eyebrow">Passwordless access</p>
          <h1>Log in to Bromine</h1>
          <p className="hero-copy">A calm, direct login flow with one email and one short code.</p>
        </div>

        <div className="auth-form">
          <label>
            <span>Email</span>
            <input
              type="email"
              value={email}
              onChange={(event) => onEmailChange(event.target.value)}
              placeholder="Enter your email"
            />
          </label>

          <div className="auth-actions">
            <button className="auth-primary-button" onClick={onRequestLogin} disabled={isSubmitting}>
              {isSubmitting ? (
                <span className="auth-button-content">
                  <span className="auth-spinner" aria-hidden="true" />
                  Sending
                </span>
              ) : (
                'Continue with email'
              )}
            </button>
          </div>

          {hasDelivery ? (
            <div className="auth-step-card">
              <div className="auth-step-copy">
                <p className="auth-step-label">Step 2</p>
                <p className="auth-step-message">We sent a login link and code to your email.</p>
              </div>

              <label>
                <span>Code</span>
                <input
                  type="text"
                  value={code}
                  onChange={(event) => onCodeChange(event.target.value)}
                  placeholder="Enter code"
                />
              </label>

              <p className="auth-helper">Check your email for a 4-word code.</p>

              <div className="auth-actions">
                <button className="auth-secondary-button" onClick={onVerifyCode} disabled={isSubmitting}>
                  Verify
                </button>
                {pendingDelivery?.magicToken ? (
                  <button className="auth-link-button" onClick={onUseMagicLink} disabled={isSubmitting}>
                    Use magic link
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}

          {statusMessage ? <p className={`auth-status auth-status-${statusTone}`}>{statusMessage}</p> : null}
        </div>
      </section>

      <section className="delivery-card auth-delivery-card">
        <div className="delivery-header">
          <p className="eyebrow">Delivery</p>
          <h2>Email status</h2>
        </div>
        {pendingDelivery ? (
          <div className="delivery-preview">
            <div className="delivery-row">
              <span>Email</span>
              <strong>{pendingDelivery.email}</strong>
            </div>
            <div className="delivery-row">
              <span>Code</span>
              <strong>{pendingDelivery.loginCode}</strong>
            </div>
            <div className="delivery-row">
              <span>Expires</span>
              <strong>{new Date(pendingDelivery.expiresAt).toLocaleString()}</strong>
            </div>
          </div>
        ) : (
          <p className="empty-state">Request a login email to reveal the latest code and delivery status here.</p>
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
  const [folders, setFolders] = useState([]);
  const [notes, setNotes] = useState([]);
  const [selectedNoteId, setSelectedNoteId] = useState(null);
  const [isBooting, setIsBooting] = useState(true);
  const [isWorkspaceLoading, setIsWorkspaceLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeView, setActiveView] = useState('all');
  const [activeFolderId, setActiveFolderId] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginCode, setLoginCode] = useState('');
  const [pendingDelivery, setPendingDelivery] = useState(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [statusTone, setStatusTone] = useState('neutral');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState(null);
  const [isAcceptingShareLink, setIsAcceptingShareLink] = useState(false);
  const noteSocketRef = useRef(null);
  const noteSocketNoteIdRef = useRef(null);

  const showToast = useCallback((message, tone = 'error') => {
    setToast({ message, tone, id: Date.now() });
  }, []);
  const [creatorDraft, setCreatorDraft] = useState({ fullName: '', title: '' });
  const [workspaceDraft, setWorkspaceDraft] = useState({ name: '', icon: '[]', accent: '#d89a5b', useCase: 'team' });
  const [newWorkspaceDraft, setNewWorkspaceDraft] = useState(DEFAULT_NEW_WORKSPACE);
  const [newFolderDraft, setNewFolderDraft] = useState(DEFAULT_NEW_FOLDER);
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
  const activeWorkspaceForRequests = currentWorkspace?.id || workspaces[0]?.id || '';

  const selectedNote = useMemo(
    () => notes.find((note) => note._id === selectedNoteId) || null,
    [notes, selectedNoteId]
  );
  const currentFolder = useMemo(
    () => folders.find((folder) => folder.id === activeFolderId) || null,
    [activeFolderId, folders]
  );

  const filteredNotes = useMemo(() => {
    const query = deferredSearchQuery.trim().toLowerCase();

    return notes.filter((note) => {
      if (activeView === 'favorites' && !note.favorite) return false;
      if (activeView === 'archived' && !note.archived) return false;
      if (activeView === 'all' && note.archived) return false;
      if (activeView === 'owned' && note.createdByAccountId !== sessionData?.account?.id) return false;
      if (activeFolderId !== 'all' && note.folderId !== activeFolderId) return false;

      if (!query) return true;

      const haystack = [note.title, note.content?.replace(/<[^>]+>/g, ' '), note.status, ...(note.tags || [])]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [activeFolderId, activeView, deferredSearchQuery, notes, sessionData?.account?.id]);

  const workspaceStats = useMemo(() => {
    const favorites = notes.filter((note) => note.favorite && !note.archived).length;
    const archived = notes.filter((note) => note.archived).length;
    const owned = notes.filter((note) => note.createdByAccountId === sessionData?.account?.id).length;
    const active = notes.filter((note) => !note.archived).length;
    const pdfs = notes.reduce((total, note) => total + (note.attachmentCount || note.attachments?.length || 0), 0);

    return { favorites, archived, owned, active, folders: folders.length, pdfs };
  }, [folders.length, notes, sessionData?.account?.id]);

  const recentNotes = useMemo(() => sortNotes(notes.filter((note) => !note.archived)).slice(0, 4), [notes]);

  const mergeNotePatch = useCallback((noteId, updater) => {
    setNotes((currentNotes) =>
      sortNotes(
        currentNotes.map((note) => {
          if (note._id !== noteId) {
            return note;
          }

          const patch = typeof updater === 'function' ? updater(note) : updater;
          return {
            ...note,
            ...patch,
          };
        })
      )
    );
  }, []);

  const closeNoteSocket = useCallback(() => {
    if (noteSocketRef.current) {
      noteSocketRef.current.close();
      noteSocketRef.current = null;
    }

    noteSocketNoteIdRef.current = null;
  }, []);

  const openNoteSocket = useCallback(
    (noteId) => {
      if (!sessionToken || !noteId) {
        closeNoteSocket();
        return;
      }

      if (noteSocketRef.current && noteSocketNoteIdRef.current === noteId) {
        return;
      }

      closeNoteSocket();

      const socket = new WebSocket(getNoteSocketUrl(sessionToken, noteId));
      noteSocketRef.current = socket;
      noteSocketNoteIdRef.current = noteId;

      socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);

          if (payload?.type !== 'note.updated' || !payload.note?._id) {
            return;
          }

          if (payload.senderAccountId === sessionData?.account?.id) {
            return;
          }

          setNotes((currentNotes) =>
            sortNotes(
              currentNotes.map((note) =>
                note._id === payload.note._id
                  ? {
                      ...note,
                      ...payload.note,
                      attachments: payload.note.attachments ?? note.attachments,
                      attachmentCount: payload.note.attachmentCount ?? note.attachmentCount,
                      liveSyncAt: Date.now(),
                    }
                  : note
              )
            )
          );
        } catch {
          // Ignore malformed realtime messages.
        }
      };

      socket.onerror = () => {
        setStatusMessage((currentMessage) => currentMessage || 'Live note sync is temporarily unavailable.');
      };

      socket.onclose = () => {
        if (noteSocketRef.current === socket) {
          noteSocketRef.current = null;
          noteSocketNoteIdRef.current = null;
        }
      };
    },
    [closeNoteSocket, sessionData?.account?.id, sessionToken]
  );

  const selectNote = useCallback(
    (noteId) => {
      openNoteSocket(noteId);
      setSelectedNoteId(noteId);
    },
    [openNoteSocket]
  );

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
      const shareToken = searchParams.get('share');

      try {
        if (magicToken) {
          const payload = await verifyMagicLink(magicToken);
          if (!active) return;
          applySessionPayload(payload);
          setStatusTone('success');
          setStatusMessage('Magic link verified.');
          setSearchParams(shareToken ? { share: shareToken } : {});
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
        setStatusTone('error');
        setStatusMessage(normalizeAuthMessage(error.message));
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
    let active = true;

    const acceptShare = async () => {
      const shareToken = searchParams.get('share');

      if (!shareToken || !sessionToken || !currentWorkspace || sessionData?.needsOnboarding || isAcceptingShareLink) {
        return;
      }

      setIsAcceptingShareLink(true);

      try {
        const payload = await acceptNoteShareLink(sessionToken, shareToken);
        const notesPayload = await fetchNotes(sessionToken, currentWorkspace.id);

        if (!active) return;

        setNotes(sortNotes(notesPayload));
        setSelectedNoteId(payload.note?._id || payload.noteId || null);
        setStatusTone('success');
        setStatusMessage('Collaborative note added to your all pages list.');
        showToast('Collaborative note added to your all pages list.', 'success');
        setSearchParams({});
      } catch (error) {
        if (!active) return;
        setStatusTone('error');
        setStatusMessage(error.message);
        showToast(error.message || 'Failed to accept collaborative link.');
      } finally {
        if (active) {
          setIsAcceptingShareLink(false);
        }
      }
    };

    acceptShare();

    return () => {
      active = false;
    };
  }, [currentWorkspace, isAcceptingShareLink, searchParams, sessionData?.needsOnboarding, sessionToken, setSearchParams, showToast]);

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
        const [membersPayload, notesPayload, foldersPayload] = await Promise.all([
          fetchWorkspaceMembers(sessionToken, currentWorkspace.id),
          fetchNotes(sessionToken, currentWorkspace.id),
          fetchFolders(sessionToken, currentWorkspace.id),
        ]);

        if (!active) return;
        setMembers(membersPayload);
        setNotes(sortNotes(notesPayload));
        setFolders(foldersPayload);
        setActiveFolderId('all');
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
    setStatusTone('neutral');

    try {
      const payload = await requestLogin(loginEmail);
      setPendingDelivery(payload.delivery);
      setLoginCode(payload.delivery.loginCode);
      setStatusTone('success');
      setStatusMessage('We sent a login link and code to your email.');
      try {
        const inbox = await fetchInboxPreview(loginEmail);
        setPendingDelivery(inbox.delivery);
      } catch {
        // Ignore inbox refresh errors when the preview is already available.
      }
    } catch (error) {
      setStatusTone('error');
      setStatusMessage(normalizeAuthMessage(error.message));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyCode = async () => {
    setIsSubmitting(true);
    setStatusMessage('');
    setStatusTone('neutral');

    try {
      const payload = await verifyCode(loginEmail, loginCode);
      applySessionPayload(payload);
    } catch (error) {
      setStatusTone('error');
      setStatusMessage(normalizeAuthMessage(error.message));
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
    setStatusTone('neutral');

    try {
      const payload = await verifyMagicLink(pendingDelivery.magicToken);
      applySessionPayload(payload);
    } catch (error) {
      setStatusTone('error');
      setStatusMessage(normalizeAuthMessage(error.message));
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

  const handleCreateFolder = async () => {
    if (!sessionToken || !currentWorkspace || !newFolderDraft.name.trim()) {
      return;
    }

    try {
      const folder = await createFolder(sessionToken, currentWorkspace.id, newFolderDraft);
      setFolders((currentFolders) => [...currentFolders, folder].sort((a, b) => a.name.localeCompare(b.name)));
      setActiveFolderId(folder.id);
      setNewFolderDraft(DEFAULT_NEW_FOLDER);
      setStatusMessage('Folder created.');
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
    setFolders([]);
    setNotes([]);
    setSelectedNoteId(null);
    setActiveFolderId('all');
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
        folderId: activeFolderId === 'all' ? null : activeFolderId,
        status: 'Draft',
        tags: [],
        favorite: false,
        archived: false,
      });

      setNotes((currentNotes) => sortNotes([note, ...currentNotes]));
      selectNote(note._id);
    } catch (error) {
      const msg = error.message || 'Failed to create page. The server may be waking up — try again in a moment.';
      setStatusMessage(msg);
      showToast(msg);
    }
  };

  const handleUpdateNote = async (updatedNote) => {
    if (!sessionToken || !activeWorkspaceForRequests) {
      return;
    }

    setNotes((currentNotes) =>
      sortNotes(currentNotes.map((note) => (note._id === updatedNote._id ? updatedNote : note)))
    );

    try {
      const savedNote = await updateNote(sessionToken, activeWorkspaceForRequests, updatedNote._id, updatedNote);
      setNotes((currentNotes) =>
        sortNotes(currentNotes.map((note) => (note._id === savedNote._id ? savedNote : note)))
      );
    } catch (error) {
      setStatusMessage(error.message);
    }
  };

  useEffect(() => {
    openNoteSocket(selectedNote?._id || null);
  }, [openNoteSocket, selectedNote?._id]);

  useEffect(() => () => closeNoteSocket(), [closeNoteSocket]);

  const handleLoadAttachments = useCallback(async (noteId) => {
    if (!sessionToken || !activeWorkspaceForRequests || !noteId) {
      return;
    }

    try {
      const attachments = await fetchNoteAttachments(sessionToken, activeWorkspaceForRequests, noteId);
      mergeNotePatch(noteId, {
        attachments,
        attachmentCount: attachments.length,
      });
    } catch (error) {
      setStatusMessage(error.message);
    }
  }, [activeWorkspaceForRequests, mergeNotePatch, sessionToken]);

  const handleUploadAttachment = async (noteId, file) => {
    if (!sessionToken || !activeWorkspaceForRequests || !noteId || !file) {
      return;
    }

    if (file.type !== 'application/pdf') {
      throw new Error('Only PDF files are supported.');
    }

    if (file.size > 10 * 1024 * 1024) {
      throw new Error('PDF attachments must be 10 MB or smaller.');
    }

    const dataBase64 = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || '').split(',')[1] || '');
      reader.onerror = () => reject(new Error('Failed to read PDF file.'));
      reader.readAsDataURL(file);
    });

    const attachment = await uploadNoteAttachment(sessionToken, activeWorkspaceForRequests, noteId, {
      fileName: file.name,
      mimeType: file.type,
      fileSizeBytes: file.size,
      dataBase64,
    });

    mergeNotePatch(noteId, (note) => {
      const attachments = [...(note.attachments || []), attachment];
      return {
        attachments,
        attachmentCount: attachments.length,
      };
    });
  };

  const handleDeleteAttachment = async (noteId, attachmentId) => {
    if (!sessionToken || !activeWorkspaceForRequests) {
      return;
    }

    await deleteNoteAttachment(sessionToken, activeWorkspaceForRequests, noteId, attachmentId);
    mergeNotePatch(noteId, (note) => {
      const attachments = (note.attachments || []).filter((attachment) => attachment.id !== attachmentId);
      return {
        attachments,
        attachmentCount: attachments.length,
      };
    });
  };

  const handleSaveAttachmentHighlights = async (noteId, attachmentId, payload) => {
    if (!sessionToken || !activeWorkspaceForRequests) {
      return;
    }

    const attachment = await saveNoteAttachmentHighlights(
      sessionToken,
      activeWorkspaceForRequests,
      noteId,
      attachmentId,
      payload
    );

    mergeNotePatch(noteId, (note) => ({
      attachments: (note.attachments || []).map((currentAttachment) =>
        currentAttachment.id === attachmentId ? attachment : currentAttachment
      ),
    }));
  };

  useEffect(() => {
    if (!selectedNote || !selectedNote.attachmentCount) {
      return;
    }

    const hasAttachmentData = (selectedNote.attachments || []).every((attachment) => attachment.dataBase64);

    if (hasAttachmentData) {
      return;
    }

    handleLoadAttachments(selectedNote._id);
  }, [handleLoadAttachments, selectedNote]);

  const handleDeleteNote = async (noteId) => {
    if (!sessionToken || !activeWorkspaceForRequests) {
      return;
    }

    try {
      await deleteNote(sessionToken, activeWorkspaceForRequests, noteId);
      setNotes((currentNotes) => currentNotes.filter((note) => note._id !== noteId));
      if (selectedNoteId === noteId) {
        setSelectedNoteId(null);
      }
    } catch (error) {
      setStatusMessage(error.message);
    }
  };

  const handleCreateShareLink = async (noteId) => {
    if (!sessionToken || !activeWorkspaceForRequests || !noteId) {
      throw new Error('A workspace session is required to create a collaborative link.');
    }

    return createNoteShareLink(sessionToken, activeWorkspaceForRequests, noteId, {
      accessLevel: 'editor',
    });
  };

  if (isBooting) {
    return (
      <div className="boot-shell">
        <section className="boot-card" aria-live="polite">
          <div className="boot-card-glow" aria-hidden="true" />
          <div className="boot-signal" aria-hidden="true">
            <span className="boot-signal-core" />
            <span className="boot-signal-ring boot-signal-ring-a" />
            <span className="boot-signal-ring boot-signal-ring-b" />
          </div>
          <div className="boot-copy">
            <p className="eyebrow">Booting Bromine</p>
            <h1>Restoring session and workspace context.</h1>
            <p className="boot-description">
              Pulling your workspace state, recent notes, and session context into place.
            </p>
          </div>
          <div className="boot-progress" aria-hidden="true">
            <span className="boot-progress-bar" />
          </div>
          <div className="boot-status-row">
            <span className="boot-status-pill">Secure startup</span>
            <span className="boot-status-text">Synchronizing your last active workspace</span>
          </div>
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
        statusTone={statusTone}
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
      {toast && (
        <Toast
          key={toast.id}
          message={toast.message}
          tone={toast.tone}
          onDismiss={() => setToast(null)}
        />
      )}
      <Sidebar
        account={sessionData.account}
        currentWorkspace={currentWorkspace}
        workspaces={workspaces}
        members={members}
        folders={folders}
        stats={workspaceStats}
        activeView={activeView}
        onViewChange={setActiveView}
        activeFolderId={activeFolderId}
        onFolderSelect={setActiveFolderId}
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
        newFolderDraft={newFolderDraft}
        onNewFolderDraftChange={(patch) => setNewFolderDraft((current) => ({ ...current, ...patch }))}
        onCreateFolder={handleCreateFolder}
        onWorkspaceSelect={(workspaceId) => {
          setActiveWorkspaceId(workspaceId);
          saveActiveWorkspaceId(workspaceId);
          setSelectedNoteId(null);
          setActiveFolderId('all');
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
            workspace={
              selectedNote.workspaceId === currentWorkspace?.id
                ? currentWorkspace
                : {
                    id: selectedNote.workspaceId,
                    name: selectedNote.workspaceName || selectedNote.workspace || 'Shared workspace',
                    icon: selectedNote.workspaceIcon || '[]',
                  }
            }
            members={selectedNote.workspaceId === currentWorkspace?.id ? members : EMPTY_ARRAY}
            folders={selectedNote.workspaceId === currentWorkspace?.id ? folders : EMPTY_ARRAY}
            onUpdate={handleUpdateNote}
            onDelete={handleDeleteNote}
            onUploadAttachment={handleUploadAttachment}
            onDeleteAttachment={handleDeleteAttachment}
            onSaveAttachmentHighlights={handleSaveAttachmentHighlights}
            onCreateShareLink={handleCreateShareLink}
            getAttachmentDownloadUrl={(noteId, attachmentId) =>
              getAttachmentDownloadUrl(sessionToken, activeWorkspaceForRequests, noteId, attachmentId)
            }
            onBack={() => selectNote(null)}
            allNotes={notes}
            onNavigate={(noteOrId) => {
              const nextId = typeof noteOrId === 'string' ? noteOrId : noteOrId?._id;
              if (nextId) {
                selectNote(nextId);
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
                <span>Folders / PDFs</span>
                <strong>{workspaceStats.folders} / {workspaceStats.pdfs}</strong>
                <p>Workspace folders and attached PDFs currently indexed.</p>
              </article>
            </section>

            <section className="dashboard-section">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Current View</p>
                  <h2>{VIEW_LABELS[activeView] || 'Workspace'}</h2>
                </div>
                <p className="section-copy">
                  {statusMessage || (currentFolder
                    ? `Showing pages currently inside ${currentFolder.name}.`
                    : 'Workspace-scoped filters and search now operate inside the current context only.')}
                </p>
              </div>

              {isWorkspaceLoading ? (
                <p className="empty-state">Loading workspace context...</p>
              ) : (
                <NoteList
                  notes={filteredNotes}
                  currentFolder={currentFolder}
                  onNoteClick={(note) => selectNote(note._id)}
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
                      onClick={() => selectNote(note._id)}
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
