const PROFILE_STORAGE_KEY = 'bromine.userProfile';
const NOTE_META_STORAGE_KEY = 'bromine.noteMeta';

export const DEFAULT_PROFILE = {
  id: 'profile-default',
  fullName: 'Ari Morgan',
  role: 'Workspace Architect',
  email: 'ari@bromine.app',
  workspaceName: 'Bromine Lab',
  focus: 'Product strategy, knowledge capture, and delivery systems',
  themeTone: 'Signal',
  accent: '#f97316',
  avatarSeed: 'AM',
};

export const DEFAULT_NOTE_META = {
  favorite: false,
  archived: false,
  status: 'Draft',
  tags: [],
  workspace: 'General',
  parentId: null,
  lastViewedAt: null,
};

export const loadProfile = () => {
  try {
    const stored = window.localStorage.getItem(PROFILE_STORAGE_KEY);
    return stored ? { ...DEFAULT_PROFILE, ...JSON.parse(stored) } : DEFAULT_PROFILE;
  } catch (error) {
    console.error('Failed to read profile:', error);
    return DEFAULT_PROFILE;
  }
};

export const saveProfile = (profile) => {
  window.localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
};

export const loadNoteMeta = () => {
  try {
    const stored = window.localStorage.getItem(NOTE_META_STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    console.error('Failed to read note metadata:', error);
    return {};
  }
};

export const saveNoteMeta = (metaMap) => {
  window.localStorage.setItem(NOTE_META_STORAGE_KEY, JSON.stringify(metaMap));
};

export const getMetaKey = (note) => note?._id || note?.localId;

export const mergeNoteWithMeta = (note, metaMap, profile) => {
  const meta = metaMap[getMetaKey(note)] || {};

  return {
    ...note,
    profileId: meta.profileId || profile.id,
    ownerName: meta.ownerName || profile.fullName,
    ownerRole: meta.ownerRole || profile.role,
    favorite: Boolean(meta.favorite),
    archived: Boolean(meta.archived),
    status: meta.status || DEFAULT_NOTE_META.status,
    tags: Array.isArray(meta.tags) ? meta.tags : DEFAULT_NOTE_META.tags,
    workspace: meta.workspace || DEFAULT_NOTE_META.workspace,
    parentId: meta.parentId || DEFAULT_NOTE_META.parentId,
    lastViewedAt: meta.lastViewedAt || null,
  };
};

export const upsertNoteMeta = (metaMap, note, profile) => {
  const key = getMetaKey(note);

  if (!key) {
    return metaMap;
  }

  return {
    ...metaMap,
    [key]: {
      ...DEFAULT_NOTE_META,
      ...(metaMap[key] || {}),
      profileId: note.profileId || profile.id,
      ownerName: note.ownerName || profile.fullName,
      ownerRole: note.ownerRole || profile.role,
      favorite: Boolean(note.favorite),
      archived: Boolean(note.archived),
      status: note.status || DEFAULT_NOTE_META.status,
      tags: Array.isArray(note.tags) ? note.tags : DEFAULT_NOTE_META.tags,
      workspace: note.workspace || DEFAULT_NOTE_META.workspace,
      parentId: note.parentId || DEFAULT_NOTE_META.parentId,
      lastViewedAt: note.lastViewedAt || null,
    },
  };
};
