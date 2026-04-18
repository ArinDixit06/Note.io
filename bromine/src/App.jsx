import React, { useEffect, useMemo, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import Sidebar from './components/Sidebar';
import NoteList from './components/NoteList';
import NoteEditor from './components/NoteEditor';
import NewNoteButton from './components/NewNoteButton';
import { fetchNotes, createNote, updateNote, deleteNote } from './api';
import {
  DEFAULT_PROFILE,
  loadNoteMeta,
  loadProfile,
  mergeNoteWithMeta,
  saveNoteMeta,
  saveProfile,
  upsertNoteMeta,
} from './profile';
import './App.css';

const VIEW_LABELS = {
  all: 'All Notes',
  favorites: 'Favorites',
  archived: 'Archive',
  owned: 'My Pages',
};

const emptyNoteState = [];

const sortNotes = (items) =>
  [...items].sort((a, b) => {
    const aTime = new Date(a.updatedAt || a.createdAt || 0).getTime();
    const bTime = new Date(b.updatedAt || b.createdAt || 0).getTime();
    return bTime - aTime;
  });

function App() {
  const [profile, setProfile] = useState(DEFAULT_PROFILE);
  const [noteMeta, setNoteMeta] = useState({});
  const [notes, setNotes] = useState(emptyNoteState);
  const [selectedNoteId, setSelectedNoteId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeView, setActiveView] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const storedProfile = loadProfile();
    const storedMeta = loadNoteMeta();
    setProfile(storedProfile);
    setNoteMeta(storedMeta);
  }, []);

  useEffect(() => {
    loadNotes();
  }, []);

  useEffect(() => {
    saveProfile(profile);
  }, [profile]);

  useEffect(() => {
    saveNoteMeta(noteMeta);
  }, [noteMeta]);

  const hydrateNotes = (rawNotes, metaMap = noteMeta, currentProfile = profile) =>
    sortNotes(
      (Array.isArray(rawNotes) ? rawNotes : []).map((note) =>
        mergeNoteWithMeta(note, metaMap, currentProfile)
      )
    );

  const loadNotes = async () => {
    try {
      const currentProfile = loadProfile();
      const currentMeta = loadNoteMeta();
      const data = await fetchNotes();
      setProfile(currentProfile);
      setNoteMeta(currentMeta);
      setNotes(hydrateNotes(data, currentMeta, currentProfile));
    } catch (error) {
      console.error('Failed to load notes:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const selectedNote = useMemo(
    () => notes.find((note) => note._id === selectedNoteId) || null,
    [notes, selectedNoteId]
  );

  const filteredNotes = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return notes.filter((note) => {
      if (activeView === 'favorites' && !note.favorite) return false;
      if (activeView === 'archived' && !note.archived) return false;
      if (activeView === 'all' && note.archived) return false;
      if (activeView === 'owned' && note.profileId !== profile.id) return false;

      if (!query) return true;

      const haystack = [
        note.title,
        note.content?.replace(/<[^>]+>/g, ' '),
        note.workspace,
        note.status,
        ...(note.tags || []),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [activeView, notes, profile.id, searchQuery]);

  const workspaceStats = useMemo(() => {
    const favorites = notes.filter((note) => note.favorite && !note.archived).length;
    const archived = notes.filter((note) => note.archived).length;
    const owned = notes.filter((note) => note.profileId === profile.id).length;
    const active = notes.filter((note) => !note.archived).length;

    return { favorites, archived, owned, active };
  }, [notes, profile.id]);

  const recentNotes = useMemo(
    () =>
      sortNotes(notes.filter((note) => !note.archived)).slice(0, 3),
    [notes]
  );

  const updateLocalNoteState = (updatedNote) => {
    setNotes((prevNotes) =>
      hydrateNotes(
        prevNotes.map((note) => (note._id === updatedNote._id ? updatedNote : note))
      )
    );
    setNoteMeta((prevMeta) => upsertNoteMeta(prevMeta, updatedNote, profile));
  };

  const handleCreate = async () => {
    try {
      const localId = uuidv4();
      const defaultNote = {
        localId,
        title: 'Untitled',
        content: '<p></p>',
        coverImage: '',
      };

      const createdNote = await createNote(defaultNote);
      const enrichedNote = mergeNoteWithMeta(
        {
          ...createdNote,
          localId,
          title: createdNote.title || defaultNote.title,
          content: createdNote.content || defaultNote.content,
          coverImage: createdNote.coverImage || '',
          workspace: profile.workspaceName,
          status: 'Draft',
          ownerName: profile.fullName,
          ownerRole: profile.role,
          profileId: profile.id,
        },
        noteMeta,
        profile
      );

      setNotes((prevNotes) => hydrateNotes([enrichedNote, ...prevNotes]));
      setNoteMeta((prevMeta) => upsertNoteMeta(prevMeta, enrichedNote, profile));
      setSelectedNoteId(enrichedNote._id);
    } catch (error) {
      console.error('Error creating note:', error);
      window.alert('Could not create note. Check the API and try again.');
    }
  };

  const handleUpdate = async (updatedNote) => {
    const optimisticNote = {
      ...updatedNote,
      profileId: updatedNote.profileId || profile.id,
      ownerName: updatedNote.ownerName || profile.fullName,
      ownerRole: updatedNote.ownerRole || profile.role,
    };

    updateLocalNoteState(optimisticNote);

    try {
      const savedNote = await updateNote(optimisticNote._id, optimisticNote);
      updateLocalNoteState({
        ...optimisticNote,
        ...savedNote,
      });
    } catch (error) {
      console.error('Error updating note:', error);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this note?')) {
      return;
    }

    try {
      await deleteNote(id);
      setNotes((prevNotes) => prevNotes.filter((note) => note._id !== id));
      setNoteMeta((prevMeta) => {
        const nextMeta = { ...prevMeta };
        delete nextMeta[id];
        return nextMeta;
      });

      if (selectedNoteId === id) {
        setSelectedNoteId(null);
      }
    } catch (error) {
      console.error('Error deleting note:', error);
    }
  };

  const handleProfileChange = (patch) => {
    setProfile((currentProfile) => ({ ...currentProfile, ...patch }));
    setNotes((currentNotes) =>
      currentNotes.map((note) =>
        note.profileId === profile.id
          ? {
              ...note,
              ownerName: patch.fullName || note.ownerName,
              ownerRole: patch.role || note.ownerRole,
            }
          : note
      )
    );
  };

  const handleNavigate = (noteOrId) => {
    const noteId = typeof noteOrId === 'string' ? noteOrId : noteOrId?._id;
    if (!noteId) {
      return;
    }

    setSelectedNoteId(noteId);
  };

  return (
    <div className="app-layout">
      <Sidebar
        profile={profile}
        stats={workspaceStats}
        activeView={activeView}
        onViewChange={setActiveView}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onProfileChange={handleProfileChange}
        isOpen={isSidebarOpen}
        toggleSidebar={() => setIsSidebarOpen((value) => !value)}
      />

      <main className="main-content">
        {selectedNote ? (
          <NoteEditor
            note={selectedNote}
            profile={profile}
            onUpdate={handleUpdate}
            onDelete={handleDelete}
            onBack={() => setSelectedNoteId(null)}
            allNotes={notes}
            onNavigate={handleNavigate}
          />
        ) : (
          <div className="dashboard">
            <div className="dashboard-hero">
              <div>
                <p className="eyebrow">Workspace Profile</p>
                <h1>{profile.workspaceName}</h1>
                <p className="hero-copy">
                  {profile.fullName} is steering this space as {profile.role}. Build pages,
                  capture systems, and organize work around a single profile identity.
                </p>
              </div>
              <div className="hero-actions">
                <NewNoteButton onClick={handleCreate} />
                <div className="hero-accent" style={{ '--profile-accent': profile.accent }} />
              </div>
            </div>

            <section className="stats-grid">
              <article className="stat-card">
                <span>Active pages</span>
                <strong>{workspaceStats.active}</strong>
                <p>Live notes visible in the current workspace.</p>
              </article>
              <article className="stat-card">
                <span>Owned by profile</span>
                <strong>{workspaceStats.owned}</strong>
                <p>Pages tied directly to {profile.fullName}.</p>
              </article>
              <article className="stat-card">
                <span>Favorites</span>
                <strong>{workspaceStats.favorites}</strong>
                <p>Reference pages surfaced for quick access.</p>
              </article>
              <article className="stat-card">
                <span>Archive</span>
                <strong>{workspaceStats.archived}</strong>
                <p>Pages hidden from the active workspace stream.</p>
              </article>
            </section>

            <section className="dashboard-section">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Current View</p>
                  <h2>{VIEW_LABELS[activeView] || 'Workspace'}</h2>
                </div>
                <p className="section-copy">
                  Profile-aware filters apply across dashboard cards, search, and the editor.
                </p>
              </div>

              {isLoading ? (
                <p className="empty-state">Loading your notes...</p>
              ) : (
                <NoteList
                  notes={filteredNotes}
                  onNoteClick={handleNavigate}
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
              </div>

              <div className="recent-list">
                {recentNotes.length ? (
                  recentNotes.map((note) => (
                    <button
                      key={note._id}
                      className="recent-item"
                      onClick={() => handleNavigate(note)}
                    >
                      <span>{note.title || 'Untitled'}</span>
                      <small>
                        {note.workspace} · {note.status}
                      </small>
                    </button>
                  ))
                ) : (
                  <p className="empty-state">Create your first page to populate recent activity.</p>
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
