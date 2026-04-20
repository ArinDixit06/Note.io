const express = require('express');
const cors = require('cors');
const http = require('http');
const { randomBytes } = require('crypto');
const { createClient } = require('@supabase/supabase-js');
const { WebSocketServer, WebSocket } = require('ws');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '25mb' }));
const server = http.createServer(app);

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, APP_URL } = process.env;
const PUBLIC_APP_URL = APP_URL || 'https://note-io-eight.vercel.app';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in server environment');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const SESSION_TTL_DAYS = 30;
const LOGIN_TTL_MINUTES = 15;
const WORD_BANK = [
  'amber', 'anchor', 'aster', 'bloom', 'branch', 'breeze', 'candle', 'cedar', 'cinder', 'citrus',
  'cloud', 'coast', 'coral', 'delta', 'ember', 'field', 'flint', 'glow', 'grove', 'harbor',
  'honey', 'ink', 'iris', 'lagoon', 'lilac', 'linen', 'maple', 'meadow', 'moss', 'north',
  'olive', 'opal', 'orbit', 'paper', 'pearl', 'petal', 'pine', 'quartz', 'ripple', 'river',
  'saffron', 'sage', 'shore', 'signal', 'solstice', 'sprout', 'stone', 'sunrise', 'thistle', 'willow',
];

const ensureArray = (value) => (Array.isArray(value) ? value : []);
const sanitizeFileName = (value = '') => String(value || '').replace(/[\\/:*?"<>|]+/g, '_').trim();
const normalizeBase64 = (value = '') => String(value || '').replace(/^data:application\/pdf;base64,/i, '').replace(/\s+/g, '');
const normalizeAccessLevel = (value = '') => (String(value || '').trim().toLowerCase() === 'viewer' ? 'viewer' : 'editor');

const getInitials = (value = '') =>
  value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('') || 'BR';

const formatDisplayNameFromEmail = (email) => {
  const local = String(email || '')
    .split('@')[0]
    .replace(/[._-]+/g, ' ')
    .trim();

  if (!local) {
    return 'Bromine User';
  }

  return local.replace(/\b\w/g, (letter) => letter.toUpperCase());
};

const slugify = (value = '') =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || `workspace-${randomBytes(3).toString('hex')}`;

const generateLoginCode = () => {
  const picks = new Set();

  while (picks.size < 4) {
    picks.add(WORD_BANK[Math.floor(Math.random() * WORD_BANK.length)]);
  }

  return Array.from(picks).join(' ');
};

const generateToken = (size = 24) => randomBytes(size).toString('hex');

const addMinutes = (date, minutes) => {
  const next = new Date(date);
  next.setMinutes(next.getMinutes() + minutes);
  return next.toISOString();
};

const addDays = (date, days) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next.toISOString();
};

const getSessionToken = (req) => {
  const authHeader = req.get('authorization');

  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice('Bearer '.length).trim();
  }

  return req.get('x-session-token') || req.body?.sessionToken || req.query?.sessionToken || null;
};

const getWorkspaceId = (req) =>
  req.get('x-workspace-id') || req.body?.workspaceId || req.query?.workspaceId || null;

const mapAccount = (row) => ({
  id: row.id,
  email: row.email,
  fullName: row.full_name,
  title: row.title,
  avatarSeed: row.avatar_seed,
  discoverable: row.discoverable,
  onboardedAt: row.onboarded_at,
  createdAt: row.created_at,
  lastLoginAt: row.last_login_at,
});

const mapWorkspace = (workspace, membership) => ({
  id: workspace.id,
  name: workspace.name,
  slug: workspace.slug,
  icon: workspace.icon,
  accent: workspace.accent,
  useCase: workspace.use_case,
  createdAt: workspace.created_at,
  updatedAt: workspace.updated_at,
  role: membership?.role || 'member',
  title: membership?.title || '',
  membershipId: membership?.id || null,
  joinedAt: membership?.joined_at || null,
});

const mapMember = (membership, account) => ({
  id: account.id,
  membershipId: membership.id,
  email: account.email,
  fullName: account.full_name,
  title: membership.title || account.title || '',
  role: membership.role,
  avatarSeed: account.avatar_seed,
  joinedAt: membership.joined_at,
  lastActiveAt: membership.last_active_at,
});

const mapNote = (row, accountMap = {}) => ({
  _id: row.id,
  workspaceId: row.workspace_id,
  workspaceName: row.workspace_name || row.workspace || null,
  workspaceIcon: row.workspace_icon || '[]',
  workspace: row.workspace_name || row.workspace || null,
  folderId: row.folder_id,
  folderName: row.folder_name || null,
  localId: row.local_id,
  title: row.title,
  content: row.content,
  coverImage: row.cover_image,
  status: row.status,
  tags: ensureArray(row.tags),
  favorite: Boolean(row.is_favorite),
  archived: Boolean(row.is_archived),
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  lastViewedAt: row.last_viewed_at,
  createdByAccountId: row.created_by_account_id,
  lastEditedByAccountId: row.last_edited_by_account_id,
  ownerName: accountMap[row.created_by_account_id]?.full_name || 'Unknown',
  ownerRole: accountMap[row.created_by_account_id]?.title || '',
  lastEditedByName: accountMap[row.last_edited_by_account_id]?.full_name || 'Unknown',
  attachmentCount: Number(row.attachment_count || 0),
  isShared: Boolean(row.is_shared),
  canEdit: row.can_edit !== false,
  canDelete: Boolean(row.can_delete),
  accessLevel: row.access_level || 'editor',
  sharedByAccountId: row.shared_by_account_id || null,
});

const mapFolder = (row) => ({
  id: row.id,
  workspaceId: row.workspace_id,
  name: row.name,
  color: row.color,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const mapAttachment = (row, includeData = false) => ({
  id: row.id,
  noteId: row.note_id,
  workspaceId: row.workspace_id,
  fileName: row.file_name,
  mimeType: row.mime_type,
  fileSizeBytes: row.file_size_bytes,
  createdAt: row.created_at,
  highlights: ensureArray(row.highlights_json),
  ...(includeData
    ? {
        dataBase64: row.data_base64,
        sourceDataBase64: row.source_data_base64 || row.data_base64,
      }
    : {}),
});

const sendServerError = (res, error) =>
  res.status(error.statusCode || 500).json({ error: error.message || 'Unexpected server error' });

const ensureSuccess = (result) => {
  if (result.error) {
    throw result.error;
  }

  return result.data;
};

const maybeSingle = (result) => {
  if (result.error && result.error.code !== 'PGRST116') {
    throw result.error;
  }

  return result.data || null;
};

const getAccountByEmail = async (email) =>
  maybeSingle(
    await supabase
      .from('accounts')
      .select('*')
      .eq('email', email)
      .maybeSingle()
  );

const createAccount = async (email) => {
  const fullName = formatDisplayNameFromEmail(email);

  return ensureSuccess(
    await supabase
      .from('accounts')
      .insert({
        email,
        full_name: fullName,
        title: 'New member',
        avatar_seed: getInitials(fullName),
      })
      .select()
      .single()
  );
};

const ensureAccount = async (email) => {
  const normalizedEmail = String(email || '').trim().toLowerCase();

  if (!normalizedEmail) {
    const error = new Error('Email is required');
    error.statusCode = 400;
    throw error;
  }

  return (await getAccountByEmail(normalizedEmail)) || createAccount(normalizedEmail);
};

const loadWorkspacesForAccount = async (accountId) => {
  const memberships = ensureSuccess(
    await supabase
      .from('workspace_members')
      .select('*')
      .eq('account_id', accountId)
      .order('joined_at', { ascending: true })
  );

  if (!memberships.length) {
    return [];
  }

  const workspaceIds = memberships.map((membership) => membership.workspace_id);
  const workspaces = ensureSuccess(
    await supabase
      .from('workspaces')
      .select('*')
      .in('id', workspaceIds)
  );

  const workspaceMap = new Map(workspaces.map((workspace) => [workspace.id, workspace]));

  return memberships
    .map((membership) => {
      const workspace = workspaceMap.get(membership.workspace_id);
      return workspace ? mapWorkspace(workspace, membership) : null;
    })
    .filter(Boolean)
    .sort((a, b) => a.name.localeCompare(b.name));
};

const loadSessionContext = async (accountId) => {
  const account = ensureSuccess(
    await supabase
      .from('accounts')
      .select('*')
      .eq('id', accountId)
      .single()
  );
  const workspaces = await loadWorkspacesForAccount(accountId);

  return {
    account: mapAccount(account),
    workspaces,
    needsOnboarding: !account.onboarded_at || workspaces.length === 0,
  };
};

const createSession = async (accountId) => {
  const token = generateToken(32);
  const now = new Date();

  const session = ensureSuccess(
    await supabase
      .from('sessions')
      .insert({
        account_id: accountId,
        token,
        expires_at: addDays(now, SESSION_TTL_DAYS),
      })
      .select()
      .single()
  );

  await ensureSuccess(
    await supabase
      .from('accounts')
      .update({ last_login_at: now.toISOString() })
      .eq('id', accountId)
  );

  const context = await loadSessionContext(accountId);

  return {
    sessionToken: session.token,
    ...context,
  };
};

const getSession = async (token) =>
  maybeSingle(
    await supabase
      .from('sessions')
      .select('*')
      .eq('token', token)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle()
  );

const requireSession = async (req, res) => {
  try {
    const token = getSessionToken(req);

    if (!token) {
      res.status(401).json({ error: 'Session token is required' });
      return null;
    }

    const session = await getSession(token);

    if (!session) {
      res.status(401).json({ error: 'Session is invalid or expired' });
      return null;
    }

    req.session = session;
    return session;
  } catch (error) {
    sendServerError(res, error);
    return null;
  }
};

const requireWorkspaceAccess = async (req, res, workspaceIdOverride = null) => {
  const session = await requireSession(req, res);

  if (!session) {
    return null;
  }

  const workspaceId = workspaceIdOverride || getWorkspaceId(req);

  if (!workspaceId) {
    res.status(400).json({ error: 'workspaceId is required' });
    return null;
  }

  const membership = maybeSingle(
    await supabase
      .from('workspace_members')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('account_id', session.account_id)
      .maybeSingle()
  );

  if (!membership) {
    res.status(403).json({ error: 'You do not have access to this workspace' });
    return null;
  }

  const workspace = ensureSuccess(
    await supabase
      .from('workspaces')
      .select('*')
      .eq('id', workspaceId)
      .single()
  );

  return { session, workspace, membership };
};

const getWorkspaceMembership = async (workspaceId, accountId) =>
  maybeSingle(
    await supabase
      .from('workspace_members')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('account_id', accountId)
      .maybeSingle()
  );

const getWorkspacesByIds = async (workspaceIds) => {
  const uniqueIds = Array.from(new Set(workspaceIds.filter(Boolean)));

  if (!uniqueIds.length) {
    return {};
  }

  const workspaces = ensureSuccess(
    await supabase
      .from('workspaces')
      .select('*')
      .in('id', uniqueIds)
  );

  return workspaces.reduce((accumulator, workspace) => {
    accumulator[workspace.id] = workspace;
    return accumulator;
  }, {});
};

const getFoldersByWorkspaceIds = async (workspaceIds) => {
  const uniqueIds = Array.from(new Set(workspaceIds.filter(Boolean)));

  if (!uniqueIds.length) {
    return {};
  }

  const folders = ensureSuccess(
    await supabase
      .from('folders')
      .select('*')
      .in('workspace_id', uniqueIds)
  );

  return folders.reduce((accumulator, folder) => {
    accumulator[folder.id] = folder;
    return accumulator;
  }, {});
};

const getNoteAccessForAccount = async (noteId, accountId) => {
  const note = maybeSingle(
    await supabase
      .from('notes')
      .select('*')
      .eq('id', noteId)
      .maybeSingle()
  );

  if (!note) {
    return { errorCode: 404, errorMessage: 'Note not found' };
  }

  const [workspace, membership, collaboration] = await Promise.all([
    maybeSingle(
      await supabase
        .from('workspaces')
        .select('*')
        .eq('id', note.workspace_id)
        .maybeSingle()
    ),
    getWorkspaceMembership(note.workspace_id, accountId),
    maybeSingle(
      await supabase
        .from('note_collaborators')
        .select('*')
        .eq('note_id', note.id)
        .eq('account_id', accountId)
        .not('accepted_at', 'is', null)
        .is('revoked_at', null)
        .maybeSingle()
    ),
  ]);

  if (!membership && !collaboration) {
    return { errorCode: 403, errorMessage: 'You do not have access to this note' };
  }

  return {
    note,
    workspace,
    membership,
    collaboration,
    canEdit: Boolean(membership || collaboration?.access_level === 'editor'),
    canDelete: Boolean(membership || note.created_by_account_id === accountId),
  };
};

const requireNoteAccess = async (req, res, noteId) => {
  const session = await requireSession(req, res);

  if (!session) {
    return null;
  }

  try {
    const access = await getNoteAccessForAccount(noteId, session.account_id);

    if (access.errorCode) {
      res.status(access.errorCode).json({ error: access.errorMessage });
      return null;
    }

    return {
      session,
      ...access,
    };
  } catch (error) {
    sendServerError(res, error);
    return null;
  }
};

const getAccountsByIds = async (ids) => {
  const uniqueIds = Array.from(new Set(ids.filter(Boolean)));

  if (!uniqueIds.length) {
    return {};
  }

  const accounts = ensureSuccess(
    await supabase
      .from('accounts')
      .select('*')
      .in('id', uniqueIds)
  );

  return accounts.reduce((accumulator, account) => {
    accumulator[account.id] = account;
    return accumulator;
  }, {});
};

const getFoldersByWorkspaceId = async (workspaceId) =>
  ensureSuccess(
    await supabase
      .from('folders')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('name', { ascending: true })
  );

const getFolderById = async (workspaceId, folderId) => {
  if (!folderId) {
    return null;
  }

  return maybeSingle(
    await supabase
      .from('folders')
      .select('*')
      .eq('id', folderId)
      .eq('workspace_id', workspaceId)
      .maybeSingle()
  );
};

const requireFolderInWorkspace = async (workspaceId, folderId) => {
  if (!folderId) {
    return null;
  }

  const folder = await getFolderById(workspaceId, folderId);

  if (!folder) {
    const error = new Error('Folder not found in this workspace');
    error.statusCode = 400;
    throw error;
  }

  return folder;
};

const getAttachmentMetaByNoteIds = async (workspaceId, noteIds) => {
  const uniqueNoteIds = Array.from(new Set(noteIds.filter(Boolean)));

  if (!uniqueNoteIds.length) {
    return {};
  }

  let query = supabase
    .from('note_attachments')
    .select('id, note_id, workspace_id, file_name, mime_type, file_size_bytes, created_at, highlights_json')
    .in('note_id', uniqueNoteIds)
    .order('created_at', { ascending: true });

  if (workspaceId) {
    query = query.eq('workspace_id', workspaceId);
  }

  const attachments = ensureSuccess(await query);

  return attachments.reduce((accumulator, attachment) => {
    const key = attachment.note_id;
    if (!accumulator[key]) {
      accumulator[key] = [];
    }

    accumulator[key].push(mapAttachment(attachment));
    return accumulator;
  }, {});
};

const getAttachmentById = async (workspaceId, noteId, attachmentId) =>
  maybeSingle(
    await supabase
      .from('note_attachments')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('note_id', noteId)
      .eq('id', attachmentId)
      .maybeSingle()
  );

const createMagicPreview = (email, loginCode, magicToken, expiresAt) => ({
  email,
  loginCode,
  magicToken,
  magicLinkUrl: `${PUBLIC_APP_URL}/login/magic?token=${magicToken}`,
  expiresAt,
});

const createShareUrl = (token) => `${PUBLIC_APP_URL}/?share=${encodeURIComponent(token)}`;

const socketRooms = new Map();

const addSocketToRoom = (noteId, socket) => {
  const room = socketRooms.get(noteId) || new Set();
  room.add(socket);
  socketRooms.set(noteId, room);
};

const removeSocketFromRoom = (noteId, socket) => {
  if (!noteId || !socketRooms.has(noteId)) {
    return;
  }

  const room = socketRooms.get(noteId);
  room.delete(socket);

  if (!room.size) {
    socketRooms.delete(noteId);
  }
};

const sendSocketEvent = (socket, payload) => {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(payload));
  }
};

const broadcastToNoteRoom = (noteId, payload) => {
  const room = socketRooms.get(noteId);

  if (!room?.size) {
    return;
  }

  room.forEach((socket) => sendSocketEvent(socket, payload));
};

const buildLiveNotePayload = async (note) => {
  const [accountMap, attachmentMap, workspaceMap] = await Promise.all([
    getAccountsByIds([note.created_by_account_id, note.last_edited_by_account_id]),
    getAttachmentMetaByNoteIds(note.workspace_id, [note.id]),
    getWorkspacesByIds([note.workspace_id]),
  ]);

  const workspaceRow = workspaceMap[note.workspace_id];
  const folder = await getFolderById(note.workspace_id, note.folder_id);

  const mappedNote = mapNote(
    {
      ...note,
      workspace_name: workspaceRow?.name || null,
      workspace_icon: workspaceRow?.icon || '[]',
      folder_name: folder?.name || null,
      attachment_count: attachmentMap[note.id]?.length || 0,
    },
    accountMap
  );

  return {
    ...mappedNote,
    attachments: attachmentMap[note.id] || [],
  };
};

app.post('/api/auth/request-login', async (req, res) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    await ensureAccount(email);

    const loginCode = generateLoginCode();
    const magicToken = generateToken();
    const expiresAt = addMinutes(new Date(), LOGIN_TTL_MINUTES);

    await ensureSuccess(
      await supabase
        .from('auth_requests')
        .insert({
          email,
          login_code: loginCode,
          magic_token: magicToken,
          expires_at: expiresAt,
        })
    );

    res.json({
      message: 'Magic link and 4-word code generated.',
      delivery: createMagicPreview(email, loginCode, magicToken, expiresAt),
    });
  } catch (error) {
    sendServerError(res, error);
  }
});

app.get('/api/auth/inbox', async (req, res) => {
  try {
    const email = String(req.query?.email || '').trim().toLowerCase();

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const requestRow = maybeSingle(
      await supabase
        .from('auth_requests')
        .select('*')
        .eq('email', email)
        .is('consumed_at', null)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .maybeSingle()
    );

    if (!requestRow) {
      return res.status(404).json({ error: 'No pending login email found' });
    }

    res.json({
      delivery: createMagicPreview(
        requestRow.email,
        requestRow.login_code,
        requestRow.magic_token,
        requestRow.expires_at
      ),
    });
  } catch (error) {
    sendServerError(res, error);
  }
});

app.post('/api/auth/verify-code', async (req, res) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const code = String(req.body?.code || '').trim().toLowerCase();

    if (!email || !code) {
      return res.status(400).json({ error: 'Email and code are required' });
    }

    const requestRow = maybeSingle(
      await supabase
        .from('auth_requests')
        .select('*')
        .eq('email', email)
        .eq('login_code', code)
        .is('consumed_at', null)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .maybeSingle()
    );

    if (!requestRow) {
      return res.status(400).json({ error: 'Invalid or expired login code' });
    }

    await ensureSuccess(
      await supabase
        .from('auth_requests')
        .update({ consumed_at: new Date().toISOString() })
        .eq('id', requestRow.id)
    );

    const account = await ensureAccount(email);
    res.json(await createSession(account.id));
  } catch (error) {
    sendServerError(res, error);
  }
});

app.post('/api/auth/verify-magic-link', async (req, res) => {
  try {
    const token = String(req.body?.token || '').trim();

    if (!token) {
      return res.status(400).json({ error: 'Magic token is required' });
    }

    const requestRow = maybeSingle(
      await supabase
        .from('auth_requests')
        .select('*')
        .eq('magic_token', token)
        .is('consumed_at', null)
        .gt('expires_at', new Date().toISOString())
        .maybeSingle()
    );

    if (!requestRow) {
      return res.status(400).json({ error: 'Invalid or expired magic link' });
    }

    await ensureSuccess(
      await supabase
        .from('auth_requests')
        .update({ consumed_at: new Date().toISOString() })
        .eq('id', requestRow.id)
    );

    const account = await ensureAccount(requestRow.email);
    res.json(await createSession(account.id));
  } catch (error) {
    sendServerError(res, error);
  }
});

app.get('/api/auth/session', async (req, res) => {
  try {
    const session = await requireSession(req, res);

    if (!session) {
      return;
    }

    res.json({
      sessionToken: session.token,
      ...(await loadSessionContext(session.account_id)),
    });
  } catch (error) {
    sendServerError(res, error);
  }
});

app.post('/api/auth/logout', async (req, res) => {
  try {
    const session = await requireSession(req, res);

    if (!session) {
      return;
    }

    await ensureSuccess(
      await supabase
        .from('sessions')
        .delete()
        .eq('id', session.id)
    );

    res.json({ message: 'Logged out' });
  } catch (error) {
    sendServerError(res, error);
  }
});

app.post('/api/onboarding/complete', async (req, res) => {
  try {
    const session = await requireSession(req, res);

    if (!session) {
      return;
    }

    const fullName = String(req.body?.fullName || '').trim();
    const title = String(req.body?.title || '').trim();
    const useCase = String(req.body?.useCase || 'personal').trim();
    const workspaceName = String(req.body?.workspaceName || '').trim();
    const workspaceIcon = String(req.body?.workspaceIcon || '[]').trim() || '[]';
    const accent = String(req.body?.accent || '#d89a5b').trim() || '#d89a5b';

    if (!fullName || !workspaceName) {
      return res.status(400).json({ error: 'fullName and workspaceName are required' });
    }

    await ensureSuccess(
      await supabase
        .from('accounts')
        .update({
          full_name: fullName,
          title: title || 'Workspace builder',
          avatar_seed: getInitials(fullName),
          onboarded_at: new Date().toISOString(),
        })
        .eq('id', session.account_id)
    );

    const workspace = ensureSuccess(
      await supabase
        .from('workspaces')
        .insert({
          name: workspaceName,
          slug: slugify(workspaceName),
          icon: workspaceIcon,
          accent,
          use_case: useCase,
          created_by: session.account_id,
        })
        .select()
        .single()
    );

    await ensureSuccess(
      await supabase
        .from('workspace_members')
        .insert({
          workspace_id: workspace.id,
          account_id: session.account_id,
          role: 'owner',
          title: title || 'Owner',
        })
    );

    res.json({
      sessionToken: session.token,
      ...(await loadSessionContext(session.account_id)),
    });
  } catch (error) {
    sendServerError(res, error);
  }
});

app.patch('/api/account', async (req, res) => {
  try {
    const session = await requireSession(req, res);

    if (!session) {
      return;
    }

    const payload = {
      ...(req.body?.fullName !== undefined ? { full_name: String(req.body.fullName).trim() || 'Bromine User' } : {}),
      ...(req.body?.title !== undefined ? { title: String(req.body.title).trim() || 'Workspace builder' } : {}),
      ...(req.body?.discoverable !== undefined ? { discoverable: Boolean(req.body.discoverable) } : {}),
    };

    if (payload.full_name) {
      payload.avatar_seed = getInitials(payload.full_name);
    }

    await ensureSuccess(
      await supabase
        .from('accounts')
        .update(payload)
        .eq('id', session.account_id)
    );

    res.json({
      sessionToken: session.token,
      ...(await loadSessionContext(session.account_id)),
    });
  } catch (error) {
    sendServerError(res, error);
  }
});

app.get('/api/workspaces', async (req, res) => {
  try {
    const session = await requireSession(req, res);

    if (!session) {
      return;
    }

    res.json(await loadWorkspacesForAccount(session.account_id));
  } catch (error) {
    sendServerError(res, error);
  }
});

app.post('/api/workspaces', async (req, res) => {
  try {
    const session = await requireSession(req, res);

    if (!session) {
      return;
    }

    const name = String(req.body?.name || '').trim();
    const icon = String(req.body?.icon || '[]').trim() || '[]';
    const accent = String(req.body?.accent || '#d89a5b').trim() || '#d89a5b';
    const useCase = String(req.body?.useCase || 'team').trim();
    const title = String(req.body?.title || 'Owner').trim();

    if (!name) {
      return res.status(400).json({ error: 'Workspace name is required' });
    }

    const workspace = ensureSuccess(
      await supabase
        .from('workspaces')
        .insert({
          name,
          slug: slugify(name),
          icon,
          accent,
          use_case: useCase,
          created_by: session.account_id,
        })
        .select()
        .single()
    );

    await ensureSuccess(
      await supabase
        .from('workspace_members')
        .insert({
          workspace_id: workspace.id,
          account_id: session.account_id,
          role: 'owner',
          title,
        })
    );

    res.json(mapWorkspace(workspace, { role: 'owner', title }));
  } catch (error) {
    sendServerError(res, error);
  }
});

app.patch('/api/workspaces/:id', async (req, res) => {
  try {
    const access = await requireWorkspaceAccess(req, res, req.params.id);

    if (!access) {
      return;
    }

      const payload = {
      ...(req.body?.name ? { name: String(req.body.name).trim(), slug: slugify(String(req.body.name)) } : {}),
      ...(req.body?.icon !== undefined ? { icon: String(req.body.icon).trim() || '[]' } : {}),
      ...(req.body?.accent !== undefined ? { accent: String(req.body.accent).trim() || '#d89a5b' } : {}),
      ...(req.body?.useCase !== undefined ? { use_case: String(req.body.useCase).trim() || 'team' } : {}),
    };

    const workspace = ensureSuccess(
      await supabase
        .from('workspaces')
        .update(payload)
        .eq('id', req.params.id)
        .select()
        .single()
    );

    res.json(mapWorkspace(workspace, access.membership));
  } catch (error) {
    sendServerError(res, error);
  }
});

app.get('/api/workspaces/:id/members', async (req, res) => {
  try {
    const access = await requireWorkspaceAccess(req, res, req.params.id);

    if (!access) {
      return;
    }

    const memberships = ensureSuccess(
      await supabase
        .from('workspace_members')
        .select('*')
        .eq('workspace_id', req.params.id)
        .order('joined_at', { ascending: true })
    );

    const accountMap = await getAccountsByIds(memberships.map((membership) => membership.account_id));
    res.json(
      memberships
        .map((membership) => {
          const account = accountMap[membership.account_id];
          return account ? mapMember(membership, account) : null;
        })
        .filter(Boolean)
    );
  } catch (error) {
    sendServerError(res, error);
  }
});

app.get('/api/folders', async (req, res) => {
  try {
    const access = await requireWorkspaceAccess(req, res);

    if (!access) {
      return;
    }

    const folders = await getFoldersByWorkspaceId(access.workspace.id);
    res.json(folders.map(mapFolder));
  } catch (error) {
    sendServerError(res, error);
  }
});

app.post('/api/folders', async (req, res) => {
  try {
    const access = await requireWorkspaceAccess(req, res);

    if (!access) {
      return;
    }

    const name = String(req.body?.name || '').trim();
    const color = String(req.body?.color || '#d89a5b').trim() || '#d89a5b';

    if (!name) {
      return res.status(400).json({ error: 'Folder name is required' });
    }

    const folder = ensureSuccess(
      await supabase
        .from('folders')
        .insert({
          workspace_id: access.workspace.id,
          name,
          color,
          created_by_account_id: access.session.account_id,
        })
        .select()
        .single()
    );

    res.json(mapFolder(folder));
  } catch (error) {
    sendServerError(res, error);
  }
});

app.get('/api/notes', async (req, res) => {
  try {
    const access = await requireWorkspaceAccess(req, res);

    if (!access) {
      return;
    }

    const workspaceNotes = ensureSuccess(
      await supabase
        .from('notes')
        .select('*')
        .eq('workspace_id', access.workspace.id)
        .order('updated_at', { ascending: false })
    );
    const collaboratorRows = ensureSuccess(
      await supabase
        .from('note_collaborators')
        .select('note_id, access_level, added_by_account_id')
        .eq('account_id', access.session.account_id)
        .not('accepted_at', 'is', null)
        .is('revoked_at', null)
    );
    const sharedNoteIds = collaboratorRows
      .map((row) => row.note_id)
      .filter((noteId) => !workspaceNotes.some((note) => note.id === noteId));
    const sharedNotes = sharedNoteIds.length
      ? ensureSuccess(
          await supabase
            .from('notes')
            .select('*')
            .in('id', sharedNoteIds)
            .order('updated_at', { ascending: false })
        )
      : [];
    const notes = [...workspaceNotes, ...sharedNotes];
    const folderMap = await getFoldersByWorkspaceIds(notes.map((note) => note.workspace_id));
    const workspaceMap = await getWorkspacesByIds(notes.map((note) => note.workspace_id));
    const collaboratorMap = collaboratorRows.reduce((accumulator, row) => {
      accumulator[row.note_id] = row;
      return accumulator;
    }, {});

    const attachmentMap = await getAttachmentMetaByNoteIds(
      null,
      notes.map((note) => note.id)
    );
    const accountMap = await getAccountsByIds(
      notes.flatMap((note) => [
        note.created_by_account_id,
        note.last_edited_by_account_id,
        collaboratorMap[note.id]?.added_by_account_id,
      ])
    );

    res.json(
      notes.map((note) => ({
        ...mapNote(
          {
            ...note,
            workspace_name: workspaceMap[note.workspace_id]?.name || access.workspace.name,
            workspace_icon: workspaceMap[note.workspace_id]?.icon || '[]',
            folder_name: note.folder_id ? folderMap[note.folder_id]?.name || null : null,
            attachment_count: attachmentMap[note.id]?.length || 0,
            is_shared: Boolean(note.workspace_id !== access.workspace.id && collaboratorMap[note.id]),
            can_edit: Boolean(note.workspace_id === access.workspace.id || collaboratorMap[note.id]?.access_level === 'editor'),
            can_delete: Boolean(note.workspace_id === access.workspace.id || note.created_by_account_id === access.session.account_id),
            access_level: collaboratorMap[note.id]?.access_level || 'editor',
            shared_by_account_id: collaboratorMap[note.id]?.added_by_account_id || null,
          },
          accountMap
        ),
        attachments: attachmentMap[note.id] || [],
      }))
    );
  } catch (error) {
    sendServerError(res, error);
  }
});

app.post('/api/notes', async (req, res) => {
  try {
    const access = await requireWorkspaceAccess(req, res);

    if (!access) {
      return;
    }

    const { localId, title = 'Untitled', content = '', coverImage = '', status = 'Draft', tags = [] } = req.body;
    const folderId = req.body?.folderId || null;

    if (!localId) {
      return res.status(400).json({ error: 'localId is required' });
    }

    const folder = await requireFolderInWorkspace(access.workspace.id, folderId);

    const note = ensureSuccess(
      await supabase
        .from('notes')
        .upsert(
          {
            workspace_id: access.workspace.id,
            folder_id: folder?.id || null,
            local_id: localId,
            title,
            content,
            cover_image: coverImage,
            status,
            tags: ensureArray(tags),
            is_favorite: Boolean(req.body?.favorite),
            is_archived: Boolean(req.body?.archived),
            created_by_account_id: access.session.account_id,
            last_edited_by_account_id: access.session.account_id,
            last_viewed_at: req.body?.lastViewedAt || null,
          },
          {
            onConflict: 'workspace_id,local_id',
          }
        )
        .select()
        .single()
    );

    const accountMap = await getAccountsByIds([note.created_by_account_id, note.last_edited_by_account_id]);
    const responsePayload = {
      ...mapNote(
        {
          ...note,
          workspace_name: access.workspace.name,
          workspace_icon: access.workspace.icon,
          folder_name: folder?.name || null,
          attachment_count: 0,
          can_edit: true,
          can_delete: true,
        },
        accountMap
      ),
      attachments: [],
    };

    res.json(responsePayload);
  } catch (error) {
    sendServerError(res, error);
  }
});

app.put('/api/notes/:id', async (req, res) => {
  try {
    const access = await requireNoteAccess(req, res, req.params.id);

    if (!access) {
      return;
    }

    if (!access.canEdit) {
      return res.status(403).json({ error: 'You do not have edit access to this note' });
    }

    const folderId = req.body?.folderId === undefined ? undefined : req.body.folderId || null;
    const folder = folderId === undefined ? null : await requireFolderInWorkspace(access.note.workspace_id, folderId);
    const payload = {
      ...(req.body?.localId ? { local_id: req.body.localId } : {}),
      ...(folderId !== undefined ? { folder_id: folder?.id || null } : {}),
      ...(req.body?.title !== undefined ? { title: req.body.title } : {}),
      ...(req.body?.content !== undefined ? { content: req.body.content } : {}),
      ...(req.body?.coverImage !== undefined ? { cover_image: req.body.coverImage } : {}),
      ...(req.body?.status !== undefined ? { status: req.body.status } : {}),
      ...(req.body?.tags !== undefined ? { tags: ensureArray(req.body.tags) } : {}),
      ...(req.body?.favorite !== undefined ? { is_favorite: Boolean(req.body.favorite) } : {}),
      ...(req.body?.archived !== undefined ? { is_archived: Boolean(req.body.archived) } : {}),
      ...(req.body?.lastViewedAt !== undefined ? { last_viewed_at: req.body.lastViewedAt } : {}),
      last_edited_by_account_id: access.session.account_id,
    };

    const note = ensureSuccess(
      await supabase
        .from('notes')
        .update(payload)
        .eq('id', req.params.id)
        .select()
        .single()
    );

    const accountMap = await getAccountsByIds([note.created_by_account_id, note.last_edited_by_account_id]);
    const attachmentMap = await getAttachmentMetaByNoteIds(note.workspace_id, [note.id]);
    const workspaceMap = await getWorkspacesByIds([note.workspace_id]);
    const workspaceRow = workspaceMap[note.workspace_id] || access.workspace;
    const responsePayload = {
      ...mapNote(
        {
          ...note,
          workspace_name: workspaceRow?.name || null,
          workspace_icon: workspaceRow?.icon || '[]',
          folder_name:
            folderId !== undefined
              ? folder?.name || null
              : (await getFolderById(note.workspace_id, note.folder_id))?.name || null,
          attachment_count: attachmentMap[note.id]?.length || 0,
          is_shared: Boolean(access.collaboration),
          can_edit: access.canEdit,
          can_delete: access.canDelete,
          access_level: access.collaboration?.access_level || 'editor',
          shared_by_account_id: access.collaboration?.added_by_account_id || null,
        },
        accountMap
      ),
      attachments: attachmentMap[note.id] || [],
    };

    res.json(responsePayload);

    buildLiveNotePayload(note)
      .then((liveNote) => {
        broadcastToNoteRoom(note.id, {
          type: 'note.updated',
          senderAccountId: access.session.account_id,
          note: liveNote,
        });
      })
      .catch(() => {});
  } catch (error) {
    sendServerError(res, error);
  }
});

app.post('/api/notes/:id/share-links', async (req, res) => {
  try {
    const access = await requireNoteAccess(req, res, req.params.id);

    if (!access) {
      return;
    }

    if (!access.canEdit) {
      return res.status(403).json({ error: 'You do not have permission to share this note' });
    }

    const accessLevel = normalizeAccessLevel(req.body?.accessLevel);
    const token = generateToken(24);

    const shareLink = ensureSuccess(
      await supabase
        .from('note_share_links')
        .insert({
          note_id: access.note.id,
          created_by_account_id: access.session.account_id,
          workspace_id: access.note.workspace_id,
          token,
          access_level: accessLevel,
        })
        .select()
        .single()
    );

    res.json({
      id: shareLink.id,
      noteId: access.note.id,
      accessLevel: shareLink.access_level,
      shareUrl: createShareUrl(shareLink.token),
      token: shareLink.token,
      createdAt: shareLink.created_at,
    });
  } catch (error) {
    sendServerError(res, error);
  }
});

app.post('/api/share-links/:token/accept', async (req, res) => {
  try {
    const session = await requireSession(req, res);

    if (!session) {
      return;
    }

    const shareLink = maybeSingle(
      await supabase
        .from('note_share_links')
        .select('*')
        .eq('token', req.params.token)
        .is('revoked_at', null)
        .maybeSingle()
    );

    if (!shareLink) {
      return res.status(404).json({ error: 'Collaborative link not found or no longer active' });
    }

    const note = maybeSingle(
      await supabase
        .from('notes')
        .select('*')
        .eq('id', shareLink.note_id)
        .maybeSingle()
    );

    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }

    const membership = await getWorkspaceMembership(note.workspace_id, session.account_id);

    if (!membership) {
      await ensureSuccess(
        await supabase
          .from('note_collaborators')
          .upsert(
            {
              note_id: note.id,
              workspace_id: note.workspace_id,
              account_id: session.account_id,
              access_level: shareLink.access_level,
              added_by_account_id: shareLink.created_by_account_id,
              accepted_at: new Date().toISOString(),
              revoked_at: null,
            },
            { onConflict: 'note_id,account_id' }
          )
      );
    }

    const [accountMap, attachmentMap, workspaceMap] = await Promise.all([
      getAccountsByIds([note.created_by_account_id, note.last_edited_by_account_id, shareLink.created_by_account_id]),
      getAttachmentMetaByNoteIds(note.workspace_id, [note.id]),
      getWorkspacesByIds([note.workspace_id]),
    ]);

    const workspaceRow = workspaceMap[note.workspace_id];

    res.json({
      noteId: note.id,
      note: {
        ...mapNote(
          {
            ...note,
            workspace_name: workspaceRow?.name || null,
            workspace_icon: workspaceRow?.icon || '[]',
            attachment_count: attachmentMap[note.id]?.length || 0,
            is_shared: !membership,
            can_edit: true,
            can_delete: Boolean(membership || note.created_by_account_id === session.account_id),
            access_level: shareLink.access_level,
            shared_by_account_id: shareLink.created_by_account_id,
          },
          accountMap
        ),
        attachments: attachmentMap[note.id] || [],
      },
    });
  } catch (error) {
    sendServerError(res, error);
  }
});

app.get('/api/notes/:id/attachments', async (req, res) => {
  try {
    const access = await requireNoteAccess(req, res, req.params.id);

    if (!access) {
      return;
    }

    const attachments = ensureSuccess(
      await supabase
        .from('note_attachments')
        .select('*')
        .eq('note_id', req.params.id)
        .order('created_at', { ascending: true })
    );

    res.json(attachments.map((attachment) => mapAttachment(attachment, true)));
  } catch (error) {
    sendServerError(res, error);
  }
});

app.post('/api/notes/:id/attachments', async (req, res) => {
  try {
    const access = await requireNoteAccess(req, res, req.params.id);

    if (!access) {
      return;
    }

    if (!access.canEdit) {
      return res.status(403).json({ error: 'You do not have edit access to this note' });
    }

    const fileName = sanitizeFileName(req.body?.fileName);
    const mimeType = String(req.body?.mimeType || '').trim().toLowerCase();
    const dataBase64 = normalizeBase64(req.body?.dataBase64);
    const fileSizeBytes = Number(req.body?.fileSizeBytes || 0);

    if (!fileName || !dataBase64 || !fileSizeBytes) {
      return res.status(400).json({ error: 'fileName, fileSizeBytes, and dataBase64 are required' });
    }

    if (mimeType !== 'application/pdf') {
      return res.status(400).json({ error: 'Only PDF attachments are supported' });
    }

    if (fileSizeBytes > 10 * 1024 * 1024) {
      return res.status(400).json({ error: 'PDF attachments must be 10 MB or smaller' });
    }

    const attachment = ensureSuccess(
      await supabase
        .from('note_attachments')
        .insert({
          workspace_id: access.note.workspace_id,
          note_id: req.params.id,
          file_name: fileName,
          mime_type: mimeType,
          file_size_bytes: fileSizeBytes,
          data_base64: dataBase64,
          source_data_base64: dataBase64,
          highlights_json: [],
          created_by_account_id: access.session.account_id,
        })
        .select()
        .single()
    );

    res.json(mapAttachment(attachment, true));
  } catch (error) {
    sendServerError(res, error);
  }
});

app.get('/api/notes/:noteId/attachments/:attachmentId/download', async (req, res) => {
  try {
    const access = await requireNoteAccess(req, res, req.params.noteId);

    if (!access) {
      return;
    }

    const attachment = await getAttachmentById(access.note.workspace_id, req.params.noteId, req.params.attachmentId);

    if (!attachment) {
      return res.status(404).json({ error: 'Attachment not found' });
    }

    res.setHeader('Content-Type', attachment.mime_type || 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${sanitizeFileName(attachment.file_name) || 'attachment.pdf'}"`);
    res.send(Buffer.from(attachment.data_base64, 'base64'));
  } catch (error) {
    sendServerError(res, error);
  }
});

app.put('/api/notes/:noteId/attachments/:attachmentId/highlights', async (req, res) => {
  try {
    const access = await requireNoteAccess(req, res, req.params.noteId);

    if (!access) {
      return;
    }

    if (!access.canEdit) {
      return res.status(403).json({ error: 'You do not have edit access to this note' });
    }

    const attachment = await getAttachmentById(access.note.workspace_id, req.params.noteId, req.params.attachmentId);

    if (!attachment) {
      return res.status(404).json({ error: 'Attachment not found' });
    }

    const nextDataBase64 = normalizeBase64(req.body?.dataBase64);
    const nextSourceBase64 = normalizeBase64(req.body?.sourceDataBase64) || attachment.source_data_base64 || attachment.data_base64;
    const highlights = ensureArray(req.body?.highlights);

    if (!nextDataBase64) {
      return res.status(400).json({ error: 'dataBase64 is required' });
    }

    const updatedAttachment = ensureSuccess(
      await supabase
        .from('note_attachments')
        .update({
          data_base64: nextDataBase64,
          source_data_base64: nextSourceBase64,
          highlights_json: highlights,
        })
        .eq('id', req.params.attachmentId)
        .eq('note_id', req.params.noteId)
        .eq('workspace_id', access.note.workspace_id)
        .select()
        .single()
    );

    res.json(mapAttachment(updatedAttachment, true));
  } catch (error) {
    sendServerError(res, error);
  }
});

app.delete('/api/notes/:noteId/attachments/:attachmentId', async (req, res) => {
  try {
    const access = await requireNoteAccess(req, res, req.params.noteId);

    if (!access) {
      return;
    }

    if (!access.canEdit) {
      return res.status(403).json({ error: 'You do not have edit access to this note' });
    }

    const attachment = await getAttachmentById(access.note.workspace_id, req.params.noteId, req.params.attachmentId);

    if (!attachment) {
      return res.status(404).json({ error: 'Attachment not found' });
    }

    await ensureSuccess(
      await supabase
        .from('note_attachments')
        .delete()
        .eq('id', req.params.attachmentId)
        .eq('note_id', req.params.noteId)
        .eq('workspace_id', access.note.workspace_id)
    );

    res.json({ message: 'Attachment deleted' });
  } catch (error) {
    sendServerError(res, error);
  }
});

app.delete('/api/notes/:id', async (req, res) => {
  try {
    const access = await requireNoteAccess(req, res, req.params.id);

    if (!access) {
      return;
    }

    if (!access.canDelete) {
      return res.status(403).json({ error: 'You do not have permission to delete this note' });
    }

    await ensureSuccess(
      await supabase
        .from('notes')
        .delete()
        .eq('id', req.params.id)
    );

    res.json({ message: 'Note deleted' });
  } catch (error) {
    sendServerError(res, error);
  }
});

const wss = new WebSocketServer({ server, path: '/ws/notes' });

wss.on('connection', async (socket, request) => {
  let joinedNoteId = null;

  try {
    const requestUrl = new URL(request.url, `http://${request.headers.host || 'localhost'}`);
    const sessionToken = requestUrl.searchParams.get('sessionToken');
    const noteId = requestUrl.searchParams.get('noteId');

    if (!sessionToken || !noteId) {
      socket.close(1008, 'sessionToken and noteId are required');
      return;
    }

    const session = await getSession(sessionToken);

    if (!session) {
      socket.close(1008, 'Session is invalid or expired');
      return;
    }

    const access = await getNoteAccessForAccount(noteId, session.account_id);

    if (access.errorCode) {
      socket.close(1008, access.errorMessage);
      return;
    }

    joinedNoteId = noteId;
    socket.noteId = noteId;
    socket.accountId = session.account_id;
    addSocketToRoom(noteId, socket);
    sendSocketEvent(socket, {
      type: 'socket.ready',
      noteId,
      accountId: session.account_id,
      canEdit: access.canEdit,
    });
  } catch (error) {
    socket.close(1011, 'Failed to initialize live connection');
    return;
  }

  socket.on('close', () => {
    removeSocketFromRoom(joinedNoteId, socket);
  });

  socket.on('error', () => {
    removeSocketFromRoom(joinedNoteId, socket);
  });

  socket.on('message', (rawMessage) => {
    try {
      const payload = JSON.parse(String(rawMessage || '{}'));

      if (payload?.type === 'ping') {
        sendSocketEvent(socket, { type: 'pong', noteId: joinedNoteId });
      }
    } catch {
      // Ignore malformed client messages.
    }
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
