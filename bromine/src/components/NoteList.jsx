// components/NoteList.jsx

import React from 'react';

const NoteList = ({ notes, onNoteClick, onDelete }) => {
  if (!notes.length) {
    return (
      <div style={{textAlign:'center', marginTop: '50px', color: '#999'}}>
        <p>No notes yet. Create one to get started!</p>
      </div>
    );
  }

  return (
    <div className="note-grid">
      {notes.map((note) => {
        // Strip HTML tags for the preview text
        const previewText = note.content.replace(/<[^>]+>/g, '') || "No content";
        
        // Determine style for the cover div
        const coverStyle = {};
        if (note.coverImage) {
           if (note.coverImage.startsWith('http')) {
               coverStyle.backgroundImage = `url(${note.coverImage})`;
           } else {
               // It's a gradient or hex color
               coverStyle.background = note.coverImage;
           }
        } else {
           // Default fallback pattern if no cover
           coverStyle.background = `repeating-linear-gradient(
              45deg,
              #f7f7f5,
              #f7f7f5 10px,
              #f0f0f0 10px,
              #f0f0f0 20px
            )`;
        }

        return (
          <div 
            key={note._id} 
            className="note-card"
            onClick={() => onNoteClick(note)}
          >
            {/* 1. The Cover Half */}
            <div className="note-card-cover" style={coverStyle}></div>
            
            {/* 2. The Content Half */}
            <div className="note-card-content">
              <h3>{note.title || "Untitled"}</h3>
              <div className="note-card-preview">
                {previewText.slice(0, 100)}
              </div>
              <div className="note-card-footer">
                {new Date(note.createdAt).toLocaleDateString()}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default NoteList;