import React from 'react';

const NoteItem = ({ note, onClick, onContextMenu }) => {
  // Format: "Jan 12, 2026"
  const date = new Date(note.updatedAt || Date.now()).toLocaleDateString("en-US", {
    month: 'short', 
    day: 'numeric',
    year: 'numeric'
  });

  // Strip HTML tags for the preview text
  const plainText = note.content ? note.content.replace(/<[^>]+>/g, '') : "";

  return (
    <div 
      className="note-card" 
      onClick={() => onClick(note)}
      onContextMenu={(e) => onContextMenu(e, note)}
    >
      <div className="note-card-header">
        <h3>{note.title || "Untitled"}</h3>
      </div>
      <div className="note-card-preview">
        {plainText || "No additional text"}
      </div>
      <div className="note-card-footer">
        <span>{date}</span>
      </div>
    </div>
  );
};

export default NoteItem;