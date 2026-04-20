const API_BASE = import.meta.env.VITE_API_URL || 'https://note-io-5hpc.onrender.com/api';
const SOCKET_BASE = import.meta.env.VITE_SOCKET_URL || API_BASE.replace(/\/api\/?$/, '');

const parseResponse = async (response, fallbackMessage) => {
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(payload?.error || fallbackMessage);
  }

  return payload;
};

const withSession = (sessionToken, extraHeaders = {}) => ({
  ...extraHeaders,
  authorization: `Bearer ${sessionToken}`,
});

const withWorkspace = (sessionToken, workspaceId, extraHeaders = {}) =>
  withSession(sessionToken, {
    'x-workspace-id': workspaceId,
    ...extraHeaders,
  });

export const requestLogin = async (email) => {
  const response = await fetch(`${API_BASE}/auth/request-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });

  return parseResponse(response, 'Failed to request login');
};

export const fetchInboxPreview = async (email) => {
  const response = await fetch(`${API_BASE}/auth/inbox?email=${encodeURIComponent(email)}`);
  return parseResponse(response, 'Failed to load inbox preview');
};

export const verifyCode = async (email, code) => {
  const response = await fetch(`${API_BASE}/auth/verify-code`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, code }),
  });

  return parseResponse(response, 'Failed to verify code');
};

export const verifyMagicLink = async (token) => {
  const response = await fetch(`${API_BASE}/auth/verify-magic-link`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  });

  return parseResponse(response, 'Failed to verify magic link');
};

export const fetchSession = async (sessionToken) => {
  const response = await fetch(`${API_BASE}/auth/session`, {
    headers: withSession(sessionToken),
  });

  return parseResponse(response, 'Failed to restore session');
};

export const logoutSession = async (sessionToken) => {
  const response = await fetch(`${API_BASE}/auth/logout`, {
    method: 'POST',
    headers: withSession(sessionToken),
  });

  return parseResponse(response, 'Failed to log out');
};

export const completeOnboarding = async (sessionToken, payload) => {
  const response = await fetch(`${API_BASE}/onboarding/complete`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...withSession(sessionToken),
    },
    body: JSON.stringify(payload),
  });

  return parseResponse(response, 'Failed to complete onboarding');
};

export const updateAccount = async (sessionToken, payload) => {
  const response = await fetch(`${API_BASE}/account`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...withSession(sessionToken),
    },
    body: JSON.stringify(payload),
  });

  return parseResponse(response, 'Failed to update account');
};

export const fetchWorkspaceMembers = async (sessionToken, workspaceId) => {
  const response = await fetch(`${API_BASE}/workspaces/${workspaceId}/members`, {
    headers: withSession(sessionToken),
  });

  return parseResponse(response, 'Failed to load workspace members');
};

export const createWorkspace = async (sessionToken, payload) => {
  const response = await fetch(`${API_BASE}/workspaces`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...withSession(sessionToken),
    },
    body: JSON.stringify(payload),
  });

  return parseResponse(response, 'Failed to create workspace');
};

export const updateWorkspace = async (sessionToken, workspaceId, payload) => {
  const response = await fetch(`${API_BASE}/workspaces/${workspaceId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...withSession(sessionToken),
    },
    body: JSON.stringify(payload),
  });

  return parseResponse(response, 'Failed to update workspace');
};

export const fetchNotes = async (sessionToken, workspaceId) => {
  const response = await fetch(`${API_BASE}/notes`, {
    headers: withWorkspace(sessionToken, workspaceId),
  });

  return parseResponse(response, 'Failed to fetch notes');
};

export const fetchFolders = async (sessionToken, workspaceId) => {
  const response = await fetch(`${API_BASE}/folders`, {
    headers: withWorkspace(sessionToken, workspaceId),
  });

  return parseResponse(response, 'Failed to fetch folders');
};

export const createFolder = async (sessionToken, workspaceId, payload) => {
  const response = await fetch(`${API_BASE}/folders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...withWorkspace(sessionToken, workspaceId),
    },
    body: JSON.stringify({
      workspaceId,
      ...payload,
    }),
  });

  return parseResponse(response, 'Failed to create folder');
};

export const createNote = async (sessionToken, workspaceId, note) => {
  const response = await fetch(`${API_BASE}/notes`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...withWorkspace(sessionToken, workspaceId),
    },
    body: JSON.stringify({
      workspaceId,
      ...note,
    }),
  });

  return parseResponse(response, 'Failed to create note');
};

export const updateNote = async (sessionToken, workspaceId, noteId, note) => {
  const response = await fetch(`${API_BASE}/notes/${noteId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...withWorkspace(sessionToken, workspaceId),
    },
    body: JSON.stringify({
      workspaceId,
      localId: note.localId,
      title: note.title,
      content: note.content,
      coverImage: note.coverImage,
      folderId: note.folderId,
      status: note.status,
      tags: note.tags,
      favorite: note.favorite,
      archived: note.archived,
      lastViewedAt: note.lastViewedAt,
    }),
  });

  return parseResponse(response, 'Failed to update note');
};

export const createNoteShareLink = async (sessionToken, workspaceId, noteId, payload = {}) => {
  const response = await fetch(`${API_BASE}/notes/${noteId}/share-links`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...withWorkspace(sessionToken, workspaceId),
    },
    body: JSON.stringify(payload),
  });

  return parseResponse(response, 'Failed to create note share link');
};

export const acceptNoteShareLink = async (sessionToken, token) => {
  const response = await fetch(`${API_BASE}/share-links/${encodeURIComponent(token)}/accept`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...withSession(sessionToken),
    },
  });

  return parseResponse(response, 'Failed to accept note share link');
};

export const deleteNote = async (sessionToken, workspaceId, noteId) => {
  const response = await fetch(`${API_BASE}/notes/${noteId}`, {
    method: 'DELETE',
    headers: withWorkspace(sessionToken, workspaceId),
  });

  return parseResponse(response, 'Failed to delete note');
};

export const fetchNoteAttachments = async (sessionToken, workspaceId, noteId) => {
  const response = await fetch(`${API_BASE}/notes/${noteId}/attachments`, {
    headers: withWorkspace(sessionToken, workspaceId),
  });

  return parseResponse(response, 'Failed to fetch note attachments');
};

export const uploadNoteAttachment = async (sessionToken, workspaceId, noteId, payload) => {
  const response = await fetch(`${API_BASE}/notes/${noteId}/attachments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...withWorkspace(sessionToken, workspaceId),
    },
    body: JSON.stringify(payload),
  });

  return parseResponse(response, 'Failed to upload PDF');
};

export const deleteNoteAttachment = async (sessionToken, workspaceId, noteId, attachmentId) => {
  const response = await fetch(`${API_BASE}/notes/${noteId}/attachments/${attachmentId}`, {
    method: 'DELETE',
    headers: withWorkspace(sessionToken, workspaceId),
  });

  return parseResponse(response, 'Failed to delete PDF');
};

export const saveNoteAttachmentHighlights = async (sessionToken, workspaceId, noteId, attachmentId, payload) => {
  const response = await fetch(`${API_BASE}/notes/${noteId}/attachments/${attachmentId}/highlights`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...withWorkspace(sessionToken, workspaceId),
    },
    body: JSON.stringify(payload),
  });

  return parseResponse(response, 'Failed to save PDF highlights');
};

export const getAttachmentDownloadUrl = (sessionToken, workspaceId, noteId, attachmentId) =>
  `${API_BASE}/notes/${noteId}/attachments/${attachmentId}/download?workspaceId=${encodeURIComponent(workspaceId)}&sessionToken=${encodeURIComponent(sessionToken)}`;

export const getNoteSocketUrl = (sessionToken, noteId) => {
  const baseUrl = new URL(SOCKET_BASE);
  baseUrl.protocol = baseUrl.protocol === 'https:' ? 'wss:' : 'ws:';
  baseUrl.pathname = '/ws/notes';
  baseUrl.searchParams.set('sessionToken', sessionToken);
  baseUrl.searchParams.set('noteId', noteId);
  return baseUrl.toString();
};
