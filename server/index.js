const express = require('express');
const cors = require('cors');
const { randomBytes } = require('crypto');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, APP_URL } = process.env;

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
});

const sendServerError = (res, error) => res.status(500).json({ error: error.message || 'Unexpected server error' });

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

const createMagicPreview = (email, loginCode, magicToken, expiresAt) => ({
  email,
  loginCode,
  magicToken,
  magicLinkUrl: `${APP_URL || 'http://localhost:5173'}/login/magic?token=${magicToken}`,
  expiresAt,
});

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

app.get('/api/notes', async (req, res) => {
  try {
    const access = await requireWorkspaceAccess(req, res);

    if (!access) {
      return;
    }

    const notes = ensureSuccess(
      await supabase
        .from('notes')
        .select('*')
        .eq('workspace_id', access.workspace.id)
        .order('updated_at', { ascending: false })
    );

    const accountMap = await getAccountsByIds(
      notes.flatMap((note) => [note.created_by_account_id, note.last_edited_by_account_id])
    );

    res.json(
      notes.map((note) => ({
        ...mapNote(note, accountMap),
        workspace: access.workspace.name,
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

    if (!localId) {
      return res.status(400).json({ error: 'localId is required' });
    }

    const note = ensureSuccess(
      await supabase
        .from('notes')
        .upsert(
          {
            workspace_id: access.workspace.id,
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
    res.json({
      ...mapNote(note, accountMap),
      workspace: access.workspace.name,
    });
  } catch (error) {
    sendServerError(res, error);
  }
});

app.put('/api/notes/:id', async (req, res) => {
  try {
    const access = await requireWorkspaceAccess(req, res);

    if (!access) {
      return;
    }

    const payload = {
      ...(req.body?.localId ? { local_id: req.body.localId } : {}),
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
        .eq('workspace_id', access.workspace.id)
        .select()
        .single()
    );

    const accountMap = await getAccountsByIds([note.created_by_account_id, note.last_edited_by_account_id]);
    res.json({
      ...mapNote(note, accountMap),
      workspace: access.workspace.name,
    });
  } catch (error) {
    sendServerError(res, error);
  }
});

app.delete('/api/notes/:id', async (req, res) => {
  try {
    const access = await requireWorkspaceAccess(req, res);

    if (!access) {
      return;
    }

    await ensureSuccess(
      await supabase
        .from('notes')
        .delete()
        .eq('id', req.params.id)
        .eq('workspace_id', access.workspace.id)
    );

    res.json({ message: 'Note deleted' });
  } catch (error) {
    sendServerError(res, error);
  }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
