import React from 'react';

const buildCoverStyle = (coverImage) => {
  if (!coverImage) {
    return {
      background:
        'linear-gradient(135deg, rgba(249,115,22,0.18), rgba(8,145,178,0.12) 55%, rgba(15,23,42,0.9))',
    };
  }

  if (coverImage.startsWith('http')) {
    return {
      backgroundImage: `url(${coverImage})`,
    };
  }

  return {
    background: coverImage,
  };
};

const NoteList = ({ notes, onNoteClick, emptyMessage = 'No notes yet. Create one to get started!' }) => {
  if (!notes.length) {
    return <p className="empty-state">{emptyMessage}</p>;
  }

  return (
    <div className="note-grid">
      {notes.map((note) => {
        const previewText = note.content?.replace(/<[^>]+>/g, ' ').trim() || 'No content yet.';

        return (
          <article key={note._id} className="note-card" onClick={() => onNoteClick(note)}>
            <div className="note-card-cover" style={buildCoverStyle(note.coverImage)}>
              <span className="note-status-chip">{note.status}</span>
              {note.favorite ? <span className="favorite-badge">Starred</span> : null}
            </div>

            <div className="note-card-content">
              <div className="note-card-meta">
                <small>{note.workspace}</small>
                <small>{note.ownerName}</small>
              </div>
              <h3>{note.title || 'Untitled'}</h3>
              <div className="note-card-preview">{previewText.slice(0, 120)}</div>
              <div className="note-card-tags">
                {(note.tags || []).slice(0, 3).map((tag) => (
                  <span key={`${note._id}-${tag}`}>{tag}</span>
                ))}
              </div>
              <div className="note-card-footer">
                <span>{new Date(note.updatedAt || note.createdAt || Date.now()).toLocaleDateString()}</span>
                <span>{note.archived ? 'Archived' : 'Live'}</span>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
};

export default NoteList;
