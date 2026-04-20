import React from 'react';

const toneOrder = ['gray', 'brown', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink', 'red'];

const getTagTone = (value = '') => {
  const index = value.length % toneOrder.length;
  return toneOrder[index];
};

const getStatusTone = (status = '') => {
  const normalized = status.toLowerCase();

  if (normalized.includes('publish')) return 'green';
  if (normalized.includes('review')) return 'blue';
  if (normalized.includes('block')) return 'red';
  if (normalized.includes('draft')) return 'gray';
  return 'brown';
};

const NoteList = ({ notes, currentFolder, onNoteClick, emptyMessage = 'No notes yet. Create one to get started!' }) => {
  if (!notes.length) {
    return <p className="empty-state">{emptyMessage}</p>;
  }

  return (
    <div className="note-list">
      {notes.map((note) => {
        const previewText = note.content?.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() || 'No content yet.';

        return (
          <button key={note._id} className="note-row" onClick={() => onNoteClick(note)}>
            <div className="note-row-main">
              <div className="note-row-title">
                <span className="note-row-icon">{note.favorite ? '⭐' : '📄'}</span>
                <span>{note.title || 'Untitled'}</span>
              </div>
              <div className="note-row-meta">
                <span>{note.ownerName}</span>
                <span>{note.workspace}</span>
                <span>{new Date(note.updatedAt || note.createdAt || 0).toLocaleDateString()}</span>
              </div>
            </div>

            <div className="note-row-preview">{previewText.slice(0, 140)}</div>

            <div className="note-row-properties">
              {note.folderName ? (
                <span className="property-chip property-chip-brown">{note.folderName}</span>
              ) : currentFolder ? (
                <span className="property-chip property-chip-gray">No folder</span>
              ) : null}
              <span className={`property-chip property-chip-${getStatusTone(note.status)}`}>
                {note.status}
              </span>
              {(note.tags || []).slice(0, 3).map((tag) => (
                <span key={`${note._id}-${tag}`} className={`property-chip property-chip-${getTagTone(tag)}`}>
                  {tag}
                </span>
              ))}
              {note.archived ? <span className="property-chip property-chip-gray">Archived</span> : null}
              {note.isShared ? <span className="property-chip property-chip-blue">Shared</span> : null}
              {note.attachmentCount ? (
                <span className="property-chip property-chip-red">{note.attachmentCount} PDF</span>
              ) : null}
            </div>
          </button>
        );
      })}
    </div>
  );
};

export default NoteList;
