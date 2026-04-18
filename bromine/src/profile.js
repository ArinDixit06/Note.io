const SESSION_TOKEN_KEY = 'bromine.sessionToken';
const ACTIVE_WORKSPACE_KEY = 'bromine.activeWorkspaceId';

export const loadSessionToken = () => {
  try {
    return window.localStorage.getItem(SESSION_TOKEN_KEY);
  } catch (error) {
    console.error('Failed to read session token:', error);
    return null;
  }
};

export const saveSessionToken = (token) => {
  if (!token) {
    window.localStorage.removeItem(SESSION_TOKEN_KEY);
    return;
  }

  window.localStorage.setItem(SESSION_TOKEN_KEY, token);
};

export const clearSessionToken = () => {
  window.localStorage.removeItem(SESSION_TOKEN_KEY);
};

export const loadActiveWorkspaceId = () => {
  try {
    return window.localStorage.getItem(ACTIVE_WORKSPACE_KEY);
  } catch (error) {
    console.error('Failed to read workspace id:', error);
    return null;
  }
};

export const saveActiveWorkspaceId = (workspaceId) => {
  if (!workspaceId) {
    window.localStorage.removeItem(ACTIVE_WORKSPACE_KEY);
    return;
  }

  window.localStorage.setItem(ACTIVE_WORKSPACE_KEY, workspaceId);
};

export const clearWorkspaceId = () => {
  window.localStorage.removeItem(ACTIVE_WORKSPACE_KEY);
};
